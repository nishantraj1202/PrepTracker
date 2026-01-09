const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Question = require('./models/Question');
const Company = require('./models/Company');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
app.use((req, res, next) => { console.log(`[${new Date().toISOString()}] Incoming: ${req.method} ${req.url}`); next(); });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Helper function to parse test case input/output from AI extraction
function parseTestCase(tc) {
    if (!tc) return tc;

    const parsed = { ...tc };

    // Parse input field
    if (typeof tc.input === 'string') {
        let inputStr = tc.input.trim();

        // Remove variable names like "nums = ", "target = ", "root = ", etc.
        inputStr = inputStr.replace(/\w+\s*=\s*/g, '');

        // Split by comma, but preserve commas inside brackets
        const parts = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < inputStr.length; i++) {
            const char = inputStr[i];
            if (char === '[') depth++;
            if (char === ']') depth--;

            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) parts.push(current.trim());

        // Parse each part
        parsed.input = parts.map(part => {
            try {
                // Try to parse as JSON
                return JSON.parse(part);
            } catch {
                // If it's a plain value (not parseable), try to infer type
                if (part === 'null') return null;
                if (part === 'true') return true;
                if (part === 'false') return false;
                if (!isNaN(part)) return Number(part);
                // Remove quotes if it's a string
                return part.replace(/^["']|["']$/g, '');
            }
        });
    }

    // Parse output field
    if (typeof tc.output === 'string') {
        let outputStr = tc.output.trim();

        // Remove variable names if any
        outputStr = outputStr.replace(/\w+\s*=\s*/g, '');

        try {
            parsed.output = JSON.parse(outputStr);
        } catch {
            // If it's a plain value
            if (outputStr === 'null') parsed.output = null;
            else if (outputStr === 'true') parsed.output = true;
            else if (outputStr === 'false') parsed.output = false;
            else if (!isNaN(outputStr)) parsed.output = Number(outputStr);
            else parsed.output = outputStr.replace(/^["']|["']$/g, '');
        }
    }

    return parsed;
}

// Initialize Groq
const Groq = require('groq-sdk');
let groq = null;
const API_KEY = process.env.GROQ_API_KEY;
if (API_KEY) {
    groq = new Groq({ apiKey: API_KEY });
} else {
    console.warn("GROQ_API_KEY is missing. AI features will be disabled.");
}

// Initialize Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- ROUTES ---

// AI Extraction Route
// 0. Extract Question from Image (Supports Multi-page)
app.post('/api/admin/extract/image', async (req, res) => {
    try {
        console.log("Debug: Extraction Request Received");
        console.log("Debug: Body Type:", typeof req.body, "IsArray:", Array.isArray(req.body));
        console.log("Debug: Headers CT:", req.get('Content-Type'));
        console.log("Debug: Headers CL:", req.get('Content-Length'));
        console.log("Debug: Body Preview:", JSON.stringify(req.body).substring(0, 100));
        console.log("Debug Body Keys:", Object.keys(req.body));

        if (!groq) {
            return res.status(503).json({ error: "AI Service Unconfigured (Missing API Key)" });
        }

        const { image, images } = req.body;
        // Normalize to array
        const imageList = images || (image ? [image] : []);
        console.log("Debug: Image List Length:", imageList.length);

        if (imageList.length === 0) {
            return res.status(400).json({
                error: `DEBUG_ERR: No content received. Type: ${typeof req.body}. Keys: [${Object.keys(req.body).join(', ')}]. CT: ${req.get('Content-Type')} CL: ${req.get('Content-Length')}`
            });
        }

        // Use the specific model requested by user
        const targetModel = "meta-llama/llama-4-scout-17b-16e-instruct";
        console.log("Debug: Calling Groq with Model:", targetModel);

        const prompt = "Analyze this image of a coding problem. It may be one of multiple screenshots. Extract visible data into JSON. Fields: 'title' (Title), 'desc' (Full description including Input/Output formats. Markdown), 'constraints' (ONLY mathematical bounds/limits starting with bullets. Do NOT include input format text here.), 'company', 'topic', 'difficulty', 'testCases' (Array of {input, output}), 'snippets' (Code).";

        // Limit to 5 images to prevent browser timeout (5 * 3s = 15s + processing time)
        const limitedImages = imageList.slice(0, 5);
        console.log(`Debug: Processing ${limitedImages.length} images sequentially...`);

        let mergedJson = {
            title: "",
            desc: "",
            constraints: "",
            company: "",
            topic: "",
            difficulty: "",
            testCases: [],
            snippets: {}
        };

        let errorLog = [];

        // Sequential Processing with Retry
        for (const [idx, img] of limitedImages.entries()) {
            let success = false;
            let attempts = 0;

            while (!success && attempts < 3) { // 3 Retries
                try {
                    console.log(`Debug: Scanning Image ${idx + 1}/${limitedImages.length} (Attempt ${attempts + 1})...`);
                    const completion = await groq.chat.completions.create({
                        model: targetModel,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    { type: "image_url", image_url: { url: img } }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 2048,
                        top_p: 1,
                        stream: false,
                        response_format: { type: "json_object" }
                    });

                    let result = completion.choices[0].message.content.trim();
                    const firstBrace = result.indexOf('{');
                    const lastBrace = result.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        result = result.substring(firstBrace, lastBrace + 1);
                        const json = JSON.parse(result);

                        // MERGE LOGIC
                        if (!mergedJson.title && json.title) mergedJson.title = json.title;
                        if (json.desc) mergedJson.desc += "\n\n" + (Array.isArray(json.desc) ? json.desc.join('\n') : json.desc);
                        if (json.constraints) mergedJson.constraints += "\n" + (Array.isArray(json.constraints) ? json.constraints.join('\n') : json.constraints);
                        if (!mergedJson.company && json.company) mergedJson.company = json.company;
                        if (!mergedJson.topic && json.topic) mergedJson.topic = Array.isArray(json.topic) ? json.topic[0] : json.topic;
                        if (!mergedJson.difficulty && json.difficulty) mergedJson.difficulty = json.difficulty;

                        // Parse and merge test cases
                        if (json.testCases && Array.isArray(json.testCases)) {
                            const parsedTestCases = json.testCases.map(parseTestCase);
                            mergedJson.testCases = [...mergedJson.testCases, ...parsedTestCases];
                        }

                        if (json.snippets) mergedJson.snippets = { ...mergedJson.snippets, ...json.snippets };
                    }
                    success = true; // Succeeded
                } catch (innerErr) {
                    console.error(`Debug: Failed to scan image ${idx + 1} (Attempt ${attempts + 1}):`, innerErr.message);
                    attempts++;
                    if (attempts < 3) {
                        // Exponential backoff: 2s, 4s, 8s
                        const wait = Math.pow(2, attempts) * 1000;
                        console.log(`Waiting ${wait}ms before retry...`);
                        await new Promise(r => setTimeout(r, wait));
                    } else {
                        errorLog.push(`Img ${idx + 1} Failed: ${innerErr.message}`);
                    }
                }
            }
            // Standard delay between images if success (to be safe)
            if (success) await new Promise(r => setTimeout(r, 2000));
        }

        // Post-Processing & Formatting
        if (!mergedJson.title || mergedJson.title.trim().length === 0) mergedJson.title = "Untitled Scanned Scene";
        if (!mergedJson.company) mergedJson.company = "Unknown";

        // Normalize Topic to Schema Enum
        const validTopics = ['Arrays', 'Strings', 'Arrays/Strings', 'Matrix', 'LinkedList', 'Trees', 'Graphs', 'DP', 'System Design', 'Heaps', 'Backtracking', 'Other'];
        let topic = (mergedJson.topic || "Arrays").trim();

        // Fix common AI mismatches
        if (topic === "String") topic = "Strings";
        if (topic === "Linked List") topic = "LinkedList";
        if (topic === "Dynamic Programming") topic = "DP";

        // Final validation
        if (!validTopics.includes(topic)) {
            console.log(`Debug: Invalid Topic '${topic}' detected. Defaulting to 'Other'.`);
            topic = "Other";
        }
        console.log(`Debug: Final Topic for Response: '${topic}'`);
        mergedJson.topic = topic;

        if (!mergedJson.difficulty) mergedJson.difficulty = "Medium";

        // Append Errors to Desc for visibility
        if (errorLog.length > 0) {
            mergedJson.desc += `\n\n**Debug Errors:**\n${errorLog.join('\n')}`;
        }

        // Clean Constraints (Bulletizer)
        if (mergedJson.constraints) {
            // Ensure the very first line starts with a bullet if not already
            if (!mergedJson.constraints.trim().startsWith('-') && !mergedJson.constraints.trim().startsWith('*')) {
                mergedJson.constraints = '- ' + mergedJson.constraints;
            }

            mergedJson.constraints = mergedJson.constraints
                .replace(/(\d+)\s+(?=\d+\s*<)/g, "$1\n- ") // Split consecutive numbers followed by comparison
                .replace(/(\W)\s+(?=\d+\s*<)/g, "$1\n- ") // Split end of logic to start of next logic
                .replace(/\n(?=[^-])/g, "\n- "); // Ensure all newlines are followed by bullets

            // Advanced Filter: Remove lines that look like description text (too long, no numbers/operators)
            const constraintLines = mergedJson.constraints.split('\n');
            const validLines = constraintLines.filter(line => {
                const clean = line.replace(/^- /, '').trim();
                // Keep if it has mathematical operators OR is short (< 100 chars) AND has numbers
                const isMath = /[<>=]/.test(clean);
                const isShortAndNumbered = clean.length < 80 && /\d/.test(clean);
                return isMath || isShortAndNumbered;
            });
            mergedJson.constraints = validLines.join('\n');
        }

        res.json(mergedJson);
    } catch (err) {
        console.error("AI Extraction Error:", err);
        // Fallback: If AI fails, return partial data instead of 500 so user can manually fill
        res.status(200).json({
            title: `Extraction Failed - Manual Edit Required ${new Date().toISOString()}`,
            desc: "AI Extraction Failed. Please enter manually.",
            company: "Unknown",
            topic: "Arrays",
            difficulty: "Medium",
            testCases: [],
            constraints: ""
        });
    }
});

// 1. Get All Questions (User Perspective: Browse Feed)
app.get('/api/questions', async (req, res) => {
    try {
        const { company, topic, difficulty } = req.query;
        let query = { status: 'approved' };

        if (company) {
            // Support partial match for multi-company questions (e.g. "Google, Microsoft")
            query.company = { $regex: new RegExp(company, 'i') };
        }
        if (topic) {
            // Topic is usually consistent case (Arrays, Strings), but regex is safer
            query.topic = { $regex: new RegExp(`^${topic}$`, 'i') };
        }
        if (difficulty) {
            query.difficulty = { $regex: new RegExp(`^${difficulty}$`, 'i') };
        }

        const questions = await Question.find(query).sort({ date: -1 });
        const formatted = questions.map(q => ({
            ...q.toObject(),
            id: q._id
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. Get Company Profile (Entity View)
app.get('/api/companies/:slug', async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        const company = await Company.findOne({ slug });

        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        // Fetch questions for this company (Partial Match for "Google, Microsoft")
        const questions = await Question.find({
            company: { $regex: new RegExp(company.name, 'i') },
            status: 'approved'
        }).sort({ date: -1 });
        const formattedQuestions = questions.map(q => ({ ...q.toObject(), id: q._id }));

        res.json({
            company: { ...company.toObject(), id: company._id },
            questions: formattedQuestions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 3. Get All Companies (For Directories/Sitemap)
app.get('/api/companies', async (req, res) => {
    try {
        const companies = await Company.find().sort({ name: 1 });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 4. Get Single Question
// 4. Get Single Question (Public - Approved Only)
app.get('/api/questions/:id', async (req, res) => {
    try {
        const idOrSlug = req.params.id;
        let question;

        // Try finding by ID first
        if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
            question = await Question.findOne({ _id: idOrSlug, status: 'approved' });
        }

        // If not found by ID, try slug
        if (!question) {
            question = await Question.findOne({ slug: idOrSlug, status: 'approved' });
        }

        if (question) {
            res.json({ ...question.toObject(), id: question._id });
        } else {
            res.status(404).json({ error: "Question not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 4a. Get Single Question (Admin - Any Status)
app.get('/api/admin/questions/:id', async (req, res) => {
    try {
        const id = req.params.id; // Admin usually uses ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const question = await Question.findById(id);

        if (question) {
            res.json({ ...question.toObject(), id: question._id });
        } else {
            res.status(404).json({ error: "Question not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 5. Post Question (Admin Perspective: Add Content)
app.post('/api/questions', async (req, res) => {
    try {
        let { title, company, topic, difficulty, desc, constraints, snippets, date, img, slug, testCases, images, status } = req.body;

        // Cloudinary Upload for Base64 Images
        let processedImages = [];
        if (images && Array.isArray(images)) {
            for (let image of images) {
                if (image.startsWith('data:image')) {
                    try {
                        const uploadRes = await cloudinary.uploader.upload(image, {
                            folder: "oa_hub_uploads",
                        });
                        console.log("Uploaded to Cloudinary:", uploadRes.secure_url);
                        processedImages.push(uploadRes.secure_url);
                    } catch (upErr) {
                        console.error("Cloudinary Upload Error:", upErr.message);
                        // Fallback: keep original base64 if upload fails (e.g. invalid keys)
                        processedImages.push(image);
                    }
                } else {
                    processedImages.push(image);
                }
            }
        }

        // Apply Defaults for "Quick Submit" (Pending Mode)
        // Check strict empty strings because frontend might send ""
        if (!title || (typeof title === 'string' && title.trim() === "")) {
            title = `Snapshot Upload ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`;
            status = 'pending';
        }
        if (!desc || (typeof desc === 'string' && desc.trim() === "")) desc = "See attached screenshots for problem description.";
        if (!company || (typeof company === 'string' && company.trim() === "")) company = "Unknown";
        if (!topic || (typeof topic === 'string' && topic.trim() === "")) topic = "Arrays";
        if (!difficulty || (typeof difficulty === 'string' && difficulty.trim() === "")) difficulty = "Medium";

        console.log("Debug: Final Data for Create:", { title, company, topic, difficulty, desc, status });

        // Auto-generate slug if not provided
        let questionSlug = slug;
        if (!questionSlug && title) {
            questionSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        // Ensure slug uniqueness
        const existing = await Question.findOne({ slug: questionSlug });
        if (existing) {
            questionSlug = `${questionSlug}-${Math.floor(Math.random() * 1000)}`;
        }

        const newQuestion = await Question.create({
            slug: questionSlug,
            title,
            company,
            topic,
            difficulty,
            desc,
            constraints: constraints || "",
            snippets: snippets || {},
            testCases: testCases || [], // Expecting array of {input, output} objects
            date: date || Date.now(),
            img: img || 'bg-gray-800', // Default color
            images: processedImages, // Use Cloudinary URLs
            status: status || 'pending', // Allow setting status
            views: '0',
            likes: '0%'
        });

        // Sync with Company Collection if created with approved status (Case-Insensitive)
        if (newQuestion.status === 'approved' && newQuestion.company && newQuestion.company.trim() !== "" && newQuestion.company.toLowerCase() !== "unknown") {
            // Split by comma to support multiple companies (e.g. "Google, Microsoft")
            const companyNames = newQuestion.company.split(',').map(c => c.trim()).filter(c => c !== "");

            for (const companyName of companyNames) {
                const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

                // Find or create company (case-insensitive search)
                let company = await Company.findOne({
                    name: { $regex: new RegExp(`^${companyName}$`, 'i') }
                });

                if (!company) {
                    // Create new company if it doesn't exist
                    try {
                        company = await Company.create({
                            name: companyName,
                            slug: companySlug,
                            logo: 'bg-gray-700',
                            subscribers: '0',
                            description: `Questions from ${companyName}`
                        });
                        console.log(`Created new company: ${companyName}`);
                    } catch (createErr) {
                        // Handle duplicate slug error (in case slug already exists with different name)
                        if (createErr.code === 11000) {
                            console.log(`Company slug ${companySlug} already exists, skipping creation`);
                        } else {
                            console.error('Error creating company:', createErr);
                        }
                    }
                } else {
                    console.log(`Company ${companyName} already exists`);
                }
            }
        }

        res.status(201).json(newQuestion);
    } catch (err) {
        console.error("Submission Error:", err);
        res.status(400).json({ error: 'Invalid data', details: err.message, validation: err.errors });
    }
});

// 5a. Update Question (Admin Perspective: Edit Content)
app.put('/api/questions/:id', async (req, res) => {
    try {
        const { title, company, topic, difficulty, desc, constraints, snippets, date, img, slug, testCases } = req.body;

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            {
                title,
                company,
                topic,
                difficulty,
                desc,
                constraints: constraints || "",
                snippets: snippets || {},
                testCases: testCases || [],
                img: img || 'bg-gray-800',
                slug: slug // Usually slug shouldn't change, but allowing fixes if needed
            },
            { new: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json(updatedQuestion);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid data', details: err.message });
    }
});

// 6. Admin: Get Pending Questions
app.get('/api/admin/questions', async (req, res) => {
    try {
        const questions = await Question.find({ status: 'pending' }).sort({ date: -1 });
        const formatted = questions.map(q => ({
            ...q.toObject(),
            id: q._id
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 7. Admin: Approve Question
app.put('/api/admin/questions/:id/approve', async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            { status: 'approved' },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        // Sync with Company Collection (Case-Insensitive)
        if (question.company && question.company.trim() !== "" && question.company.toLowerCase() !== "unknown") {
            // Split by comma to support multiple companies
            const companyNames = question.company.split(',').map(c => c.trim()).filter(c => c !== "");

            for (const companyName of companyNames) {
                const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

                // Find or create company (case-insensitive search)
                let company = await Company.findOne({
                    name: { $regex: new RegExp(`^${companyName}$`, 'i') }
                });

                if (!company) {
                    // Create new company if it doesn't exist
                    try {
                        company = await Company.create({
                            name: companyName,
                            slug: companySlug,
                            logo: 'bg-gray-700',
                            subscribers: '0',
                            description: `Questions from ${companyName}`
                        });
                        console.log(`Created new company: ${companyName}`);
                    } catch (createErr) {
                        // Handle duplicate slug error (in case slug already exists with different name)
                        if (createErr.code === 11000) {
                            console.log(`Company slug ${companySlug} already exists, skipping creation`);
                        } else {
                            console.error('Error creating company:', createErr);
                        }
                    }
                } else {
                    console.log(`Company ${companyName} already exists`);
                }
            }
        }

        res.json(question);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 8. Admin: Reject/Delete Question
app.delete('/api/admin/questions/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json({ message: "Question deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to format JS values to C++ literals
// Helper: Convert JS values to C++ literals
function toCppLiteral(val) {
    if (val === null || val === undefined) return "0";
    if (Array.isArray(val)) {
        if (val.length === 0) return "{}";
        const cppElements = val.map(toCppLiteral).join(", ");
        return `{${cppElements}}`;
    }
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'boolean') return val ? "true" : "false";
    return val.toString();
}

// Import Runner
const { runCode } = require('./judge/runner');

// Helper: Generate C++ Driver
function generateCppDriver(userCode, testCases) {
    let mainBody = `
    Solution sol;
    int passed = 0;
    int total = ${testCases.length};
    `;

    testCases.forEach((tc, idx) => {
        // Ensure input is an array
        const inputs = Array.isArray(tc.input) ? tc.input : [tc.input];
        const args = inputs.map(arg => {
            if (Array.isArray(arg)) return `vector<int>${toCppLiteral(arg)}`;
            return toCppLiteral(arg);
        }).join(", ");

        // Custom Run
        if (tc.output === null) {
            mainBody += `
            {
                cout << "Test Case ${idx + 1}: RUNNING..." << endl;
                auto result = sol.solution(${args});
                cout << "Result: ";
                print(result);
                cout << endl;
            }
            `;
        }
        // Judged Run
        else {
            const expected = toCppLiteral(tc.output);
            if (Array.isArray(tc.output)) {
                mainBody += `
                {
                    vector<int> result = sol.solution(${args});
                    vector<int> expected = vector<int>${expected};
                    if (result == expected) {
                        cout << "Test Case ${idx + 1}: PASSED" << endl;
                        cout << "Expected: "; print(expected); cout << " Got: "; print(result); cout << endl;
                        passed++;
                    } else {
                        cout << "Test Case ${idx + 1}: FAILED" << endl;
                        cout << "Expected: "; print(expected); cout << " Got: "; print(result); cout << endl;
                    }
                }
                `;
            } else {
                mainBody += `
                {
                    auto result = sol.solution(${args});
                    auto expected = ${expected};
                    if (result == expected) {
                        cout << "Test Case ${idx + 1}: PASSED" << endl;
                        cout << "Expected: " << expected << " Got: " << result << endl;
                        passed++;
                    } else {
                        cout << "Test Case ${idx + 1}: FAILED" << endl;
                        cout << "Expected: " << expected << " Got: " << result << endl;
                    }
                }
                `;
            }
        }
    });

    if (testCases.length > 0 && testCases[0].output !== null) {
        mainBody += `
        if (passed == total) cout << "VERDICT: ACCEPTED" << endl;
        else cout << "VERDICT: WRONG ANSWER" << endl;
        `;
    } else {
        mainBody += `cout << "VERDICT: CUSTOM RUN COMPLETE" << endl;`;
    }

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <unordered_map>
using namespace std;

// Print Helper
template<typename T>
void print(T val) { cout << val; }
template<typename T>
void print(vector<T> val) {
    cout << "[";
    for(int i=0; i<val.size(); ++i) {
        if(i>0) cout << ",";
        print(val[i]);
    }
    cout << "]";
}

${userCode}

int main() {
    ${mainBody}
    return 0;
}
    `;
}

// Helper: Generate Python Driver
function generatePythonDriver(userCode, testCases) {
    const testCasesJson = JSON.stringify(testCases);
    return `
import sys
import json

${userCode}

def run_tests():
    # Use json.loads to safely parse JSON into Python objects (null -> None, true -> True)
    test_cases = json.loads('''${testCasesJson}''')
    passed = 0
    total = len(test_cases)
    
    try:
        sol = Solution()
    except:

        print("VERDICT: RUNTIME ERROR")
        print("Could not initialize Solution class")
        return

    for i, tc in enumerate(test_cases):
        inputs = tc['input']
        expected = tc.get('output') 
        
        try:
            # Call solution(*inputs)
            result = sol.solution(*inputs)
            
            if expected is None:
                # Custom Run
                print(f"Test Case {i+1}: CUSTOM")
                print(f"Result: {result}")
            else:
                # Judged Run
                if result == expected:
                    print(f"Test Case {i+1}: PASSED")
                    print(f"Expected: {expected}, Got: {result}")
                    passed += 1
                else:
                    print(f"Test Case {i+1}: FAILED")
                    print(f"Expected: {expected}, Got: {result}")
        except Exception as e:
            print(f"Test Case {i+1}: RUNTIME ERROR")
            print(e)
            
    # Only print Verdict if not custom
    if len(test_cases) > 0 and test_cases[0].get('output') is not None:
        if passed == total:
            print("VERDICT: ACCEPTED")
        else:
            print("VERDICT: WRONG ANSWER")
    else:
        print("VERDICT: CUSTOM RUN COMPLETE")

if __name__ == "__main__":
    run_tests()
`;
}


// Helper: Format values to Java literals
// Helper: Format values to Java literals
function toJavaLiteral(val) {
    if (val === null || val === undefined) return "0";
    if (Array.isArray(val)) {
        if (val.length === 0) return "new int[]{}"; // Assumption: int array for now
        // Heuristic: check first element type
        if (typeof val[0] === 'string') {
            const elements = val.map(toJavaLiteral).join(", ");
            return `new String[]{${elements}}`;
        }
        const elements = val.map(toJavaLiteral).join(", ");
        return `new int[]{${elements}}`;
    }
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'boolean') return val ? "true" : "false";
    return val.toString();
}

// Helper: Generate Java Driver
function generateJavaDriver(userCode, testCases) {
    let mainBody = `
        Solution sol = new Solution();
        int passed = 0;
        int total = ${testCases.length};
    `;

    testCases.forEach((tc, idx) => {
        // Ensure input is an array
        const inputs = Array.isArray(tc.input) ? tc.input : [tc.input];
        const args = inputs.map(toJavaLiteral).join(", ");

        // Handle Custom Input (null output)
        if (tc.output === null) {
            mainBody += `
           {
               System.out.println("Test Case ${idx + 1}: RUNNING...");
               try {
                    // Check return type dynamically slightly hard in Java without more reflection or assumption.
                    // Assuming similar return types to standard problem.
                    // Let's print generically.
                    // Actually, 'sol.solution' returns a specific type. System.out.println can handle objects/primitives.
                    // But arrays need Arrays.toString().
                    
                    // Since we don't know the exact return type here easily without parsing user code, 
                    // we can wrap execution and try to print nicely if it's an array.
                    // But 'sol.solution' call is the issue if we don't assign it to variable of correct type.
                    // Wait, we can use 'var' in Java 10+. The Dockerfile says OpenJDK 17. So 'var' works.
                    
                    var result = sol.solution(${args});
                    
                    if (result != null && result.getClass().isArray()) {
                        if (result instanceof int[]) System.out.println("Result: " + Arrays.toString((int[])result));
                        else if (result instanceof double[]) System.out.println("Result: " + Arrays.toString((double[])result));
                        else if (result instanceof boolean[]) System.out.println("Result: " + Arrays.toString((boolean[])result));
                        else System.out.println("Result: " + Arrays.deepToString((Object[])result));
                    } else {
                        System.out.println("Result: " + result);
                    }
               } catch(Exception e) {
                    System.out.println("Runtime Error: " + e.getMessage());
               }
           }
           `;
        } else {
            const expected = toJavaLiteral(tc.output);

            // Output comparison logic (arrays vs primitives)
            let compareLogic = "";
            let expectedPrint = "";
            let resultPrint = "";

            if (Array.isArray(tc.output)) {
                compareLogic = `Arrays.equals(result, expected)`;
                expectedPrint = `Arrays.toString(expected)`;
                resultPrint = `Arrays.toString(result)`;

                mainBody += `
               {
                   int[] result = sol.solution(${args});
                   int[] expected = ${expected};
                   if (${compareLogic}) {
                       System.out.println("Test Case ${idx + 1}: PASSED");
                       System.out.println("Expected: " + ${expectedPrint} + " Got: " + ${resultPrint});
                       passed++;
                   } else {
                       System.out.println("Test Case ${idx + 1}: FAILED");
                       System.out.println("Expected: " + ${expectedPrint} + " Got: " + ${resultPrint});
                   }
               }
               `;
            } else {
                compareLogic = `result == expected`;
                if (typeof tc.output === 'string') compareLogic = `result.equals(expected)`;

                mainBody += `
               {
                   var result = sol.solution(${args});
                   var expected = ${expected};
                   if (${compareLogic}) {
                       System.out.println("Test Case ${idx + 1}: PASSED");
                       System.out.println("Expected: " + expected + " Got: " + result);
                       passed++;
                   } else {
                       System.out.println("Test Case ${idx + 1}: FAILED");
                       System.out.println("Expected: " + expected + " Got: " + result);
                   }
               }
               `;
            }
        }
    });

    if (testCases.length > 0 && testCases[0].output !== null) {
        mainBody += `
            if (passed == total) System.out.println("VERDICT: ACCEPTED");
            else System.out.println("VERDICT: WRONG ANSWER");
        `;
    } else {
        mainBody += `System.out.println("VERDICT: CUSTOM RUN COMPLETE");`;
    }

    return `
import java.util.*;
import java.io.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        try {
            ${mainBody}
        } catch (Exception e) {
            System.out.println("VERDICT: RUNTIME ERROR");
            e.printStackTrace();
        }
    }
}
    `;
}

// Reference Solutions (Trusted Python Code)
// Used to calculate Expected Output for Custom Inputs at runtime.
const references = {
    "Two Sum": `
class Solution:
    def solution(self, nums, target):
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`,
    "Find the Missing Number": `
class Solution:
    def solution(self, nums):
        n = len(nums)
        expected = n * (n + 1) // 2
        actual = sum(nums)
        return expected - actual
`,
    "Group Anagrams": `
class Solution:
    def solution(self, strs):
        groups = {}
        for s in strs:
            key = "".join(sorted(s))
            if key not in groups:
                groups[key] = []
            groups[key].append(s)
        # Sort for deterministic comparison
        result = list(groups.values())
        for group in result:
            group.sort()
        result.sort(key=lambda x: (len(x), x[0] if x else ""))
        return result
`,
    "Longest Substring No Repeats": `
class Solution:
    def solution(self, s):
        used = {}
        max_len = 0
        left = 0
        for i, char in enumerate(s):
            if char in used and left <= used[char]:
                left = used[char] + 1
            else:
                max_len = max(max_len, i - left + 1)
            used[char] = i
        return max_len
`,
    "Merge k Sorted Lists": `
import heapq
class Solution:
    def solution(self, lists):
        # Flatten and sort (simple reference implementation)
        merged = []
        for lst in lists:
            merged.extend(lst)
        merged.sort()
        return merged
`,
    "Reverse Linked List Group K": `
class Solution:
    def solution(self, head, k):
        # Array manipulation reference
        if not head or k <= 1:
            return head
        
        result = []
        n = len(head)
        for i in range(0, n, k):
            chunk = head[i:i+k]
            if len(chunk) == k:
                chunk.reverse()
            result.extend(chunk)
        return result
`
};

// 4. Code Execution Engine
app.post('/api/execute', async (req, res) => {
    const { code, language, questionId, customInput } = req.body;
    const vm = require('vm');

    try {
        const question = await Question.findById(questionId);
        if (!question) {
            return res.json({ status: "error", logs: ["> Question not found."] });
        }

        if (question.topic === "System Design") {
            return res.json({
                status: "accepted",
                logs: ["> System Design questions are architectural.", "> No automated tests available.", "VERDICT: SUBMITTED"]
            });
        }

        // Determine Test Cases to Run
        let testCases = question.testCases || [];
        let isCustomRun = false;

        // Handle Custom Input
        console.log("Debug: Received customInput:", JSON.stringify(customInput));
        if (customInput && Array.isArray(customInput)) {
            isCustomRun = true;
            console.log("Debug: Processing as Custom Run");
            // Override test cases with User Input, Output null (initially)
            testCases = [{
                input: customInput,
                output: null
            }];
        } else if (!testCases || testCases.length === 0) {
            return res.json({ status: "error", logs: ["> No test cases configured for this question.", "> Execution passed trivially (0/0), but this is likely an error."] });
        }

        console.log(`Debug: Question Title: "${question.title}"`);
        console.log("Debug: Available References:", Object.keys(references));

        // Helper: Generate JavaScript Driver
        function generateJsDriver(userCode, testCases) {
            let mainBody = `
    const sol = solution;
    let passed = 0;
    const total = ${testCases.length};
    `;

            testCases.forEach((tc, idx) => {
                // Format args for JS call
                // Ensure input is an array
                const inputs = Array.isArray(tc.input) ? tc.input : [tc.input];
                const args = inputs.map(arg => JSON.stringify(arg)).join(", ");

                // Custom Run (output is null)
                if (tc.output === null) {
                    mainBody += `
            try {
                console.log("Test Case ${idx + 1}: RUNNING...");
                const result = sol(${args});
                // Helper to print result nicely
                const printRes = (res) => {
                    if (Array.isArray(res)) return JSON.stringify(res);
                    return res;
                };
                console.log("Result: " + printRes(result));
            } catch (e) {
                console.log("Test Case ${idx + 1}: RUNTIME ERROR");
                console.log(e.toString());
            }
            `;
                }
                // Judged Run
                else {
                    const expected = JSON.stringify(tc.output);
                    mainBody += `
            try {
                const result = sol(${args});
                const expected = ${expected};
                
                // Deep equality check helper
                const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
                
                if (isEqual(result, expected)) {
                    console.log("Test Case ${idx + 1}: PASSED");
                    console.log("Expected: " + JSON.stringify(expected) + " Got: " + JSON.stringify(result));
                    passed++;
                } else {
                    console.log("Test Case ${idx + 1}: FAILED");
                    console.log("Expected: " + JSON.stringify(expected) + " Got: " + JSON.stringify(result));
                }
            } catch (e) {
                console.log("Test Case ${idx + 1}: RUNTIME ERROR");
                console.log(e.toString());
            }
            `;
                }
            });

            if (testCases.length > 0 && testCases[0].output !== null) {
                mainBody += `
        if (passed === total) console.log("VERDICT: ACCEPTED");
        else console.log("VERDICT: WRONG ANSWER");
        `;
            } else {
                mainBody += `console.log("VERDICT: CUSTOM RUN COMPLETE");`;
            }

            return `
${userCode}

// Driver Code
(function() {
    ${mainBody}
})();
    `;
        }

        // --- EXECUTION ---
        if (['cpp', 'python', 'java', 'javascript'].includes(language)) {
            let fullSource = "";

            // 1. Prepare User Driver
            if (language === 'cpp') {
                try { fullSource = generateCppDriver(code, testCases); }
                catch (e) { return res.json({ status: "error", logs: ["Error generating C++ driver: " + e.message] }); }
            } else if (language === 'python') {
                fullSource = generatePythonDriver(code, testCases);
            } else if (language === 'java') {
                fullSource = generateJavaDriver(code, testCases);
            } else if (language === 'javascript') {
                fullSource = generateJsDriver(code, testCases);
            }

            // 2. Run User Code
            // We run this first. If it's a Custom Run, we might ALSO run the Reference Code.
            const userResultPromise = runCode(language, fullSource, "");

            let referenceResultPromise = Promise.resolve(null);

            // 3. Run Reference Code (If Custom Run && Reference Exists)
            if (isCustomRun) {
                console.log(`Debug: Checking reference for "${question.title}"`);
                if (references[question.title]) {
                    console.log("Debug: Reference found, executing...");
                    const refCode = references[question.title];
                    // Always use Python driver for reference since our references are Python
                    const refDriver = generatePythonDriver(refCode, testCases);
                    referenceResultPromise = runCode('python', refDriver, "");
                } else {
                    console.log("Debug: No reference found.");
                }
            }

            // Await both
            const [userResult, refResult] = await Promise.all([userResultPromise, referenceResultPromise]);

            console.log("Debug: User Result status:", userResult.status);
            if (refResult) {
                console.log("Debug: Ref Result stdout:", refResult.stdout);
                console.log("Debug: Ref Result stderr:", refResult.stderr);
            } else {
                console.log("Debug: Ref Result is null");
            }

            // 4. Process User Output
            const logs = userResult.stdout.split('\n').filter(l => l.trim());
            if (userResult.stderr) logs.push(`STDERR: ${userResult.stderr} `);

            let status = "wrong_answer";
            if (userResult.status === 'TLE') status = 'time_limit_exceeded';
            else if (userResult.status === 'CE') status = 'compilation_error';
            else if (userResult.status === 'RE') status = 'runtime_error';
            else if (userResult.stdout.includes("VERDICT: ACCEPTED")) status = "accepted";
            else if (userResult.stdout.includes("VERDICT: CUSTOM RUN COMPLETE")) status = "custom_run_complete";

            // 5. Compare with Reference Output (if available)
            if (refResult && refResult.stdout) {
                // Parse "Result: ..." from Ref Output
                const refLines = refResult.stdout.split('\n');
                const refResultLine = refLines.find(l => l.includes("Result: "));

                if (refResultLine) {
                    const expectedOutput = refResultLine.split("Result: ")[1].trim();

                    // Parse "Result: ..." from User Output
                    const userResultLine = logs.find(l => l.includes("Result: "));
                    const userOutput = userResultLine ? userResultLine.split("Result: ")[1].trim() : null;

                    logs.push(`Expected: ${expectedOutput}`);
                    console.log(`Debug: Mismatch Check - User: ${userOutput}, Exp: ${expectedOutput}`);

                    // Simple string comparison for Verdict (Robust enough for basic types)
                    if (userOutput === expectedOutput) {
                        logs.push("VERDICT: ACCEPTED (Matches Reference)");
                        status = "accepted";
                    } else {
                        logs.push(`VERDICT: WRONG ANSWER (Mismatch)`);
                        status = "wrong_answer"; // Override status
                    }
                } else {
                    console.log("Debug: Could not find 'Result:' in Ref execution");
                }
            }

            return res.json({ status, logs });
        }

    } catch (error) {
        console.error("Execution API Error:", error);
        return res.json({ status: "error", logs: ["> Internal Server Error"] });
    }
});



app.use((err, req, res, next) => {
    console.error("Global Error Caught:", err.message);
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: "Image too large (Payload > 200MB). Try fewer/smaller images." });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: "Invalid JSON format in request." });
    }
    res.status(500).json({ error: "Global Server Error: " + err.message });
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
