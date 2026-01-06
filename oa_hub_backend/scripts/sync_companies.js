const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../models/Company');
const Question = require('../models/Question');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oa_hub');
        console.log("DB Connected");

        const questions = await Question.find({ status: 'approved' });
        console.log(`Found ${questions.length} approved questions.`);

        for (const q of questions) {
            if (!q.company || q.company === 'Unknown') continue;

            const name = q.company.trim();
            const existing = await Company.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

            if (!existing) {
                console.log(`Creating company: ${name}`);
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                await Company.create({
                    name: name,
                    slug: slug,
                    description: `${name} company profile.`
                });
            } else {
                console.log(`Company exists: ${name}`);
            }
        }

        console.log("Sync Complete");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
