const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
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

app.use(cors(
    {
        origin: ["http://localhost:3000", "https://prep-tracker-12.vercel.app"],
        credentials: true
    }
));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

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
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};

const isCloudinaryConfigured = Object.values(cloudinaryConfig).every(val => !!val);

if (isCloudinaryConfigured) {
    cloudinary.config(cloudinaryConfig);
    console.log("Cloudinary Configured Successfully");
} else {
    console.warn("⚠️  WARNING: Cloudinary is NOT configured. Image uploads will fail or use fallbacks.");
    console.warn("   Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env");
}

// --- HELPERS ---
async function ensureCompanyExists(companyName) {
    if (!companyName || companyName === "Unknown") return;
    try {
        // clean name
        const name = companyName.trim();
        // check case-insensitive
        const existing = await Company.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (!existing) {
            console.log(`Debug: Auto-creating company '${name}'...`);
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            // Ensure slug is unique enough (simple append if needed, but usually unlikely conflict for new legit companies)
            // For simplicity, just try create.
            await Company.create({
                name: name,
                slug: slug,
                description: `${name} company profile.`
            });
            console.log(`Debug: Company '${name}' created.`);
        }
    } catch (err) {
        console.error(`Debug: Failed to ensure company '${companyName}' exists:`, err.message);
    }
}

// --- ROUTES ---

// AI Extraction Route
// 0. Extract Question from Image (Supports Multi-page)
app.post('/api/admin/extract/image', async (req, res) => {
    try {
        console.log("Debug: Llama 4 Extraction Request Received");

        if (!groq) {
            return res.status(503).json({ error: "AI Service Unconfigured (Missing API Key)" });
        }

        const { image, images } = req.body;
        // Normalize to array
        const imageList = images || (image ? [image] : []);
        console.log("Debug: Image List Length:", imageList.length);

        if (imageList.length === 0) {
            return res.status(400).json({ error: "No images provided" });
        }

        // Use the specific Llama 4 model requested
        const targetModel = "meta-llama/llama-4-scout-17b-16e-instruct";
        console.log("Debug: Calling Groq with Model:", targetModel);

        // Engineered Prompt based on User Request + Application Needs
        const prompt = `You are given an image containing an interview programming question.

Your tasks are:
1) Read and extract all readable text from the image.
2) Convert the extracted content into a clean, text-based problem format.
3) Identify sample test cases directly from the image if they exist.
4) If no test cases are visible in the image, generate minimal valid test cases strictly based on the problem statement.
5) **GRAPH/DIAGRAM HANDLING**: If the image contains a graph, tree, or diagram that is essential to the problem:
   - You MUST describe it clearly in text within the 'problem_description' (e.g., "A graph with nodes 1->2, 2->3...").
   - Do NOT try to include the image itself (the user will handle the image file). JUST DESCRIBE IT TEXTUALLY so the problem is solvable without the image if possible.

STRICT RULES:
- Convert all readable text into text sections.
- Do NOT keep the full image as the problem statement.
- If sample inputs/outputs are visible in the image, extract them EXACTLY.
- ONLY generate test cases if none are visible in the image.
- Generated test cases must be minimal, deterministic, correct, and directly executable.
- Do NOT add edge cases unless clearly implied by constraints.
- Do NOT change the problem meaning.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:

{
  "title": string,
  "difficulty": "Easy" | "Medium" | "Hard" | null,
  "topic": string | null,
  "company": string | null,
  "problem_description": string,
  "input_format": string,
  "output_format": string,
  "constraints": string,
  "examples": [
    {
      "input": string,
      "output": string,
      "explanation": string | null
    }
  ],
  "test_cases": {
    "source": "image" | "ai",
    "cases": [
      {
        "input": any,
        "output": any
      }
    ]
  },
  "snippets": { 
      "cpp": string, 
      "java": string, 
      "python": string, 
      "javascript": string 
  }
}

SPECIAL INSTRUCTIONS:
- 'company': If visible in the image (e.g. tagged, or in title), extract it. Else null.
- 'topic': Infer the most likely algorithm topic (e.g. Arrays, DP, Strings).
- 'snippets': Generate starter code templates for C++, Java, Python, and JS based on the problem signature.
- If a field is not present, return empty string/null.
- Do NOT include markdown blocks or text outside JSON.`;

        // Limit to 5 images to prevent browser timeout
        const limitedImages = imageList.slice(0, 5);
        console.log(`Debug: Processing ${limitedImages.length} images...`);

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

        // Sequential Processing using Llama 4
        for (const [idx, img] of limitedImages.entries()) {
            let success = false;
            let attempts = 0;

            while (!success && attempts < 3) {
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
                        max_tokens: 4096, // Increased for larger JSON
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

                        // MERGE LOGIC - MAP NEW SCHEMA TO APP MODEL
                        if (!mergedJson.title && json.title) mergedJson.title = json.title;

                        // Compose Description from multiple fields
                        let descParts = [];
                        if (json.problem_description) descParts.push(json.problem_description);
                        if (json.input_format) descParts.push(`**Input Format:**\n${json.input_format}`);
                        if (json.output_format) descParts.push(`**Output Format:**\n${json.output_format}`);

                        if (json.examples && Array.isArray(json.examples) && json.examples.length > 0) {
                            descParts.push(`**Examples:**`);
                            json.examples.forEach((ex, i) => {
                                descParts.push(`*Example ${i + 1}*:\nInput: \`${ex.input}\`\nOutput: \`${ex.output}\`\n${ex.explanation ? `Explanation: ${ex.explanation}` : ''}`);
                            });
                        }

                        if (descParts.length > 0) {
                            mergedJson.desc += (mergedJson.desc ? "\n\n---\n\n" : "") + descParts.join('\n\n');
                        }

                        // Constraints
                        if (json.constraints) {
                            mergedJson.constraints += (mergedJson.constraints ? "\n" : "") + json.constraints;
                        }

                        if (!mergedJson.company && json.company) mergedJson.company = json.company;
                        if (!mergedJson.topic && json.topic) mergedJson.topic = json.topic;
                        if (!mergedJson.difficulty && json.difficulty) mergedJson.difficulty = json.difficulty;

                        // Test Cases
                        if (json.test_cases && json.test_cases.cases && Array.isArray(json.test_cases.cases)) {
                            // Normalize to {input: [...], output: ...} if possible, but keep raw structure if simple
                            // App expects {input: any, output: any}
                            mergedJson.testCases = [...mergedJson.testCases, ...json.test_cases.cases];
                        } else if (json.testCases) {
                            // Fallback for older model behavior mixing
                            mergedJson.testCases = [...mergedJson.testCases, ...json.testCases];
                        }

                        if (json.snippets) mergedJson.snippets = { ...mergedJson.snippets, ...json.snippets };
                    }
                    success = true;
                } catch (innerErr) {
                    console.error(`Debug: Failed to scan image ${idx + 1}:`, innerErr.message);
                    attempts++;
                    // Backoff
                    if (attempts < 3) await new Promise(r => setTimeout(r, 1000 * attempts));
                    else errorLog.push(`Img ${idx + 1} Failed: ${innerErr.message}`);
                }
            }
        }

        // Post-Processing
        if (!mergedJson.title) mergedJson.title = "Untitled Generated Problem";
        if (!mergedJson.company) mergedJson.company = "Unknown";
        if (!mergedJson.difficulty) mergedJson.difficulty = "Medium";

        // Normalize Topic
        const validTopics = ['Arrays', 'Strings', 'Arrays/Strings', 'Matrix', 'LinkedList', 'Trees', 'Graphs', 'DP', 'System Design', 'Heaps', 'Backtracking', 'Other'];
        let topic = (mergedJson.topic || "Arrays").trim();
        // Fix common AI variations
        if (topic === "String") topic = "Strings";
        if (topic === "Linked List") topic = "LinkedList";
        if (topic === "Dynamic Programming") topic = "DP";
        if (!validTopics.includes(topic)) topic = "Other";
        mergedJson.topic = topic;

        // Clean Constraints (Ensure Bullets)
        if (mergedJson.constraints) {
            let cons = mergedJson.constraints;
            if (!cons.trim().startsWith('-') && !cons.trim().startsWith('*')) {
                cons = '- ' + cons;
            }
            // Ensure newlines start with bullets
            cons = cons.replace(/\n(?=[^-*])/g, "\n- ");
            mergedJson.constraints = cons;
        }

        // Append errors to desc
        if (errorLog.length > 0) {
            mergedJson.desc += `\n\n**Extraction Errors:**\n${errorLog.join('\n')}`;
        }

        res.json(mergedJson);

    } catch (err) {
        console.error("Llama Extraction Error:", err);
        res.status(200).json({
            title: "Llama Extraction Failed",
            desc: "Server extraction failed. Please enter manually.",
            company: "Unknown",
            topic: "Other",
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
            query.company = { $regex: new RegExp(`^${company}$`, 'i') };
        }
        if (topic) {
            // Topic is usually consistent case (Arrays, Strings), but regex is safer
            query.topic = { $regex: new RegExp(`^${topic}$`, 'i') };
        }
        if (difficulty) {
            query.difficulty = { $regex: new RegExp(`^${difficulty}$`, 'i') };
        }

        const questions = await Question.find(query)
            .select('title company topic difficulty date status slug img views likes')
            .sort({ date: -1 });

        const formatted = questions.map(q => ({
            ...q.toObject(),
            id: q._id,
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

        // Fetch questions for this company (Case Insensitive)
        const questions = await Question.find({
            company: { $regex: new RegExp(`^${company.name}$`, 'i') },
            status: 'approved'
        })
            .select('title company topic difficulty date status slug img views likes')
            .sort({ date: -1 });
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
            // Return full question object (including images for graphs)
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
                    if (!isCloudinaryConfigured) {
                        console.error("❌ Upload Failed: Cloudinary credentials missing in .env");
                        // Decide: Fail the request OR store base64 (DB heavy) or placeholder?
                        // For now, let's keep base64 but warn user this is bad for DB performance
                        console.warn("   Fallback: Storing image as Base64 (High DB usage warning)");
                        processedImages.push(image);
                        continue;
                    }

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

        if (newQuestion.status === 'approved') {
            await ensureCompanyExists(newQuestion.company);
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
        const { title, company, topic, difficulty, desc, constraints, snippets, date, img, slug, testCases, images } = req.body;

        // Cloudinary Upload for Base64 Images (Logic shared with POST)
        console.log(`[PUT] Update Question ${req.params.id}`);
        console.log(`[PUT] Received Images payload length: ${images ? images.length : 'undefined'}`);
        console.log(`[PUT] Received DeletedImages payload length: ${req.body.deletedImages ? req.body.deletedImages.length : 'undefined'}`);


        let processedImages = [];
        if (images && Array.isArray(images)) {
            // ... processing logic remains ...
            for (let image of images) {
                if (image.startsWith('data:image')) {
                    if (!isCloudinaryConfigured) {
                        console.error("❌ Upload Failed: Cloudinary credentials missing in .env");
                        processedImages.push(image);
                        continue;
                    }

                    try {
                        const uploadRes = await cloudinary.uploader.upload(image, {
                            folder: "oa_hub_uploads",
                        });
                        console.log("Uploaded to Cloudinary (Update):", uploadRes.secure_url);
                        processedImages.push(uploadRes.secure_url);
                    } catch (upErr) {
                        console.error("Cloudinary Upload Error:", upErr.message);
                        processedImages.push(image);
                    }
                } else {
                    processedImages.push(image);
                }
            }
        } else if (images === undefined) {
            // If images is NOT present in body, do not overwrite?
            // But admin form sends it always. 
            // If explicitly [], it clears.
            // If undefined, let's play safe and NOT update it to avoid accidental clear if partial update?
            // Actually, admin logic sends it. Let's assume processedImages is the source of truth if images was sent.
        }

        const updateData = {
            title,
            company,
            topic,
            difficulty,
            desc,
            constraints: constraints || "",
            snippets: snippets || {},
            testCases: testCases || [],
            img: img || 'bg-gray-800',
            slug: slug
        };

        // Only update images if it was provided in the request
        if (images !== undefined) {
            updateData.images = processedImages;
        }

        // Handle Explicit Deletions (Cleanup Storage)
        const { deletedImages } = req.body;
        if (deletedImages && Array.isArray(deletedImages) && isCloudinaryConfigured) {
            for (const imgUrl of deletedImages) {
                // Determine Public ID from URL
                // Example: .../oa_hub_uploads/xyz123.jpg -> oa_hub_uploads/xyz123
                try {
                    const urlParts = imgUrl.split('/');
                    const filename = urlParts.pop(); // xyz123.jpg
                    const idWithoutExt = filename.split('.')[0]; // xyz123
                    const folder = "oa_hub_uploads";
                    const publicId = `${folder}/${idWithoutExt}`;

                    await cloudinary.uploader.destroy(publicId);
                    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
                } catch (delErr) {
                    console.error("Failed to delete image from Cloudinary:", delErr.message);
                }
            }
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            updateData,
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
            id: q._id,
            images: [] // Enforce Text-Only in List View
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
            {
                status: 'approved',
                // images: [] // Removed strict text-only enforcement to allow graphs
            },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        // Auto-create Company if not exists
        if (question.company) {
            await ensureCompanyExists(question.company);
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

const { runCode } = require('./judge/runner');

// 4. Code Execution Engine (Raw STDIN Model)
app.post('/api/execute', async (req, res) => {
    const { code, language, questionId, customInput } = req.body;

    try {
        const question = await Question.findById(questionId);
        if (!question && !customInput) {
            return res.json({ status: "error", logs: ["> Question not found."] });
        }

        if (question && question.topic === "System Design") {
            return res.json({
                status: "accepted",
                logs: ["> System Design questions are architectural.", "> No automated tests available.", "VERDICT: SUBMITTED"]
            });
        }

        // Determine Test Cases to Run
        let testCases = [];
        if (question) testCases = question.testCases || [];

        // Handle Custom Input
        let isCustomRun = false;
        if (customInput) {
            isCustomRun = true;
            console.log("Debug: Custom Input Mode:", customInput);
            // Treat customInput as a raw string for STDIN
            testCases = [{
                input: customInput, // String expected
                output: null
            }];
        } else if (!testCases || testCases.length === 0) {
            return res.json({ status: "error", logs: ["> No test cases found."] });
        }

        if (!['cpp', 'python', 'java', 'javascript'].includes(language)) {
            return res.json({ status: "error", logs: ["> Language not supported."] });
        }

        const logs = [];
        let passed = 0;
        let finalStatus = "accepted"; // Optimistic default

        // Execution Loop (Serial)
        for (const [idx, tc] of testCases.entries()) {


            // CRITICAL: Input must be a string. 
            let inputStr = "";
            if (typeof tc.input === 'string') {
                inputStr = tc.input;
            } else if (Array.isArray(tc.input)) {
                // Fallback for legacy DB data: join with newlines
                inputStr = tc.input.map(x => Array.isArray(x) ? x.join(' ') : x).join('\n');
            } else {
                inputStr = String(tc.input);
            }


            logs.push(`Test Case ${idx + 1}: RUNNING...`);

            // Execute using Production Runner
            const result = await runCode(language, code, inputStr);

            if (result.status !== 'AC') {
                logs.push(`Test Case ${idx + 1}: ${result.status} (${result.stderr || "Error"})`);
                finalStatus = result.status === 'TLE' ? 'time_limit_exceeded' : 'runtime_error';
                if (result.status === 'CE') finalStatus = 'compilation_error';

                // Stop on Compilation Error
                if (result.status === 'CE') break;
            } else {
                // Check Output
                if (!isCustomRun && tc.output !== null) {
                    const expectedStr = String(tc.output).trim();
                    const actualStr = result.stdout.trim();

                    if (actualStr === expectedStr) {
                        logs.push(`Test Case ${idx + 1}: PASSED`);
                        passed++;
                    } else {
                        logs.push(`Test Case ${idx + 1}: FAILED`);
                        logs.push(`Expected: ${expectedStr}`);
                        logs.push(`Got: ${actualStr}`);
                        finalStatus = "wrong_answer";
                    }
                } else {
                    logs.push(`Output: ${result.stdout}`);
                    if (!isCustomRun) logs.push("(No expected output provided)");
                }
            }
        }

        // Final Verdict Logic
        if (!isCustomRun) {
            if (finalStatus === "accepted" && passed === testCases.length) {
                logs.push(`VERDICT: ACCEPTED (${passed}/${testCases.length})`);
            } else if (finalStatus === "accepted") {
                finalStatus = "wrong_answer";
                logs.push(`VERDICT: WRONG ANSWER (${passed}/${testCases.length})`);
            } else {
                logs.push(`VERDICT: ${finalStatus.toUpperCase()}`);
            }
        } else {
            logs.push("VERDICT: CUSTOM RUN COMPLETE");
            finalStatus = "custom_run_complete";
        }

        res.json({
            status: finalStatus,
            logs: logs
        });

    } catch (err) {
        console.error("Execution API Error:", err);
        return res.status(500).json({ status: "error", logs: ["Server Error: " + err.message] });
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
