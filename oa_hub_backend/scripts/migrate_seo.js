const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('../models/Question');
const connectDB = require('../config/db');

dotenv.config({ path: '../.env' });

const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

const migrate = async () => {
    await connectDB();

    const questions = await Question.find({});

    for (const q of questions) {
        let slug = q.slug;

        // Generate slug if missing
        if (!slug) {
            slug = generateSlug(q.title);

            // Handle collision
            const existing = await Question.findOne({ slug, _id: { $ne: q._id } });
            if (existing) {
                slug = `${slug}-${q._id.toString().slice(-4)}`;
            }
        }

        // Populate rich content SEO fields
        const updateData = {
            slug: slug,
            approach: q.approach || `### Approach for ${q.title}\n\nThis is a standard problem that can be solved using efficient data structures.\n\n**Algorithm:**\n1. Initialize variables.\n2. Iterate through the input.\n3. Return the result.`,
            complexity: q.complexity?.time ? q.complexity : { time: "O(n)", space: "O(1)" },
            tags: ["Array", "Interview", q.company]
        };

        if (q.topic === "System Design") {
            updateData.complexity = { time: "N/A", space: "N/A" };
            updateData.approach = "### System Design\n\nDiscussion on scalability, availability, and reliability.";
        }

        await Question.updateOne({ _id: q._id }, { $set: updateData });
        console.log(`Updated: ${q.title} -> /question/${slug}`);
    }

    console.log("Migration complete.");
    process.exit();
};

migrate();
