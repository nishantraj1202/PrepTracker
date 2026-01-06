const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Question = require('../models/Question');
const Company = require('../models/Company');

// Load environment variables (from parent dir where .env usually is in dev, or root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DUMP_PATH = path.join(__dirname, '../../mydb_dump.json');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

const importData = async () => {
    await connectDB();

    try {
        if (!fs.existsSync(DUMP_PATH)) {
            throw new Error(`Dump file not found at: ${DUMP_PATH}`);
        }

        const rawData = fs.readFileSync(DUMP_PATH, 'utf-8');
        const dbDump = JSON.parse(rawData);

        // Handle different dump structures. Sometimes dump is direct array or wrapped in { data: ... }
        // Looking at user's file content view, it has { data: { questions: [], companies: [] } }
        const data = dbDump.data || dbDump;
        const questions = data.questions || [];
        const companies = data.companies || []; // Although inspecting file only showed questions array in "data", checking just in case

        console.log(`Found ${questions.length} questions and ${companies.length} companies to process.`);

        // 1. Import Companies (if any, creating strictly from Question company list if needed could be done in server.js logic, 
        //    but here we assume dump might have them or we rely on Questions to exist first)
        //    Actually, Question model requires company name. The Company model is separate.

        // Let's iterate questions and upsert them.
        let qCount = 0;
        let cCount = 0;

        for (const q of questions) {
            // Remove _id to avoid collision if importing into a new DB, or keep if trying to restore exactly
            // Better to delete _id and let Mongo generate or find by slug. 
            // If we want to preserve exact ID, we can keep it, but upserting by slug is safer for merging.
            delete q._id;
            delete q.__v;

            // Ensure unique slug if missing (should be in dump though)
            if (!q.slug) {
                q.slug = q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }

            // Safe defaults
            if (!q.status) q.status = 'approved';
            if (!q.views) q.views = "0";
            if (!q.likes) q.likes = "0%";

            // Update or Insert
            await Question.findOneAndUpdate(
                { slug: q.slug },
                q,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            qCount++;
            process.stdout.write('.');
        }
        console.log(`\nProcessed ${qCount} questions.`);

        // Import Companies if explicitly in dump
        for (const c of companies) {
            delete c._id;
            delete c.__v;
            if (!c.slug) {
                c.slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            }
            await Company.findOneAndUpdate(
                { slug: c.slug },
                c,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            cCount++;
        }
        if (cCount > 0) console.log(`Processed ${cCount} companies.`);

        // Additionally, ensure companies named in Questions exist in Company collection
        console.log("Ensuring all referenced companies exist...");
        const distinctCompanies = [...new Set(questions.map(q => q.company))];
        for (const compName of distinctCompanies) {
            if (!compName) continue;
            const slug = compName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            // Check existence
            const exists = await Company.findOne({ slug: slug });
            if (!exists) {
                await Company.create({
                    name: compName,
                    slug: slug,
                    description: `${compName} company profile.`
                });
                console.log(`+ Auto-created company: ${compName}`);
            }
        }

        console.log('Data Import Successfully Completed!');
        process.exit();

    } catch (err) {
        console.error(`Import Failed: ${err.message}`);
        process.exit(1);
    }
};

importData();
