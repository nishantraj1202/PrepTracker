
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('./models/Question');
const Company = require('./models/Company');
const axios = require('axios');

// Load env vars
dotenv.config();

// Connect to DB directly for cleanup
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/oa_hub')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

async function testmultiCompanySync() {
    const API_URL = 'http://localhost:5000/api';
    const MULTI_COMPANY_STR = 'GoogleTestMulti, AmazonTestMulti, MetaTestMulti';
    const TEST_SLUG = 'test-multi-company-sync';

    console.log("=== Testing Multi-Company Sync ===");

    // Clean up previous runs
    await Question.deleteMany({ slug: TEST_SLUG });
    await Company.deleteMany({ name: { $in: ['GoogleTestMulti', 'AmazonTestMulti', 'MetaTestMulti'] } });

    try {
        // 1. Create Question with Multi Companies
        console.log(`Creating question with company: "${MULTI_COMPANY_STR}"...`);
        const res = await axios.post(`${API_URL}/questions`, {
            title: 'Multi Company Test Question',
            desc: 'Description',
            company: MULTI_COMPANY_STR,
            status: 'approved',
            topic: 'Arrays',
            difficulty: 'Easy',
            slug: TEST_SLUG
        });

        console.log("Question created via API. Status:", res.status);

        // 2. Check if Companies were created
        await new Promise(r => setTimeout(r, 2000)); // Wait for async sync

        const companies = await Company.find({
            name: { $in: ['GoogleTestMulti', 'AmazonTestMulti', 'MetaTestMulti'] }
        });

        console.log(`Found ${companies.length} companies created (Expected 3).`);
        companies.forEach(c => console.log(` - ${c.name}`));

        if (companies.length === 3) {
            console.log("✅ SUCCESS: All companies created automatically.");
        } else {
            console.error("❌ FAILURE: Missing companies.");
        }

        // 3. Verify Query (GET /api/companies/:slug)
        console.log("\n=== Verifying Search/Query Logic ===");
        // Check if "AmazonTestMulti" page shows this question
        const amazonSlug = 'amazontestmulti';
        const companyRes = await axios.get(`${API_URL}/companies/${amazonSlug}`);

        const foundQuestion = companyRes.data.questions.find(q => q.slug === TEST_SLUG);
        if (foundQuestion) {
            console.log("✅ SUCCESS: Question found in 'AmazonTestMulti' company page.");
        } else {
            console.error("❌ FAILURE: Question NOT found in company page.");
        }

    } catch (e) {
        console.error("Test Failed:", e.message);
        if (e.response) console.error("Response data:", e.response.data);
    }
}

// Run tests
(async () => {
    await new Promise(r => setTimeout(r, 1000));
    await testmultiCompanySync();
    mongoose.disconnect();
})();
