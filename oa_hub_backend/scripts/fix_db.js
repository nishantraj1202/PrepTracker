const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('../models/Question');
const connectDB = require('../config/db');

dotenv.config({ path: '../.env' }); // Adjust path if needed, usually .env is in root of backend

const fixQuestions = async () => {
    await connectDB();

    const updates = [
        {
            title: "Find the Missing Number",
            testCases: [
                { input: [[3, 0, 1]], output: 2 },
                { input: [[0, 1]], output: 2 },
                { input: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], output: 8 }
            ]
        },
        {
            title: "Merge k Sorted Lists", // Hard to demo with simple array input/output in this C++ driver without custom struct parsing
            // Skip or add dummy
        },
        {
            title: "Two Sum",
            testCases: [
                { input: [[2, 7, 11, 15], 9], output: [0, 1] },
                { input: [[3, 2, 4], 6], output: [1, 2] },
                { input: [[3, 3], 6], output: [0, 1] }
            ]
        },
        {
            title: "Valid Palindrome",
            testCases: [
                { input: ["A man, a plan, a canal: Panama"], output: true },
                { input: ["race a car"], output: false },
                { input: [" "], output: true }
            ]
        }
    ];

    for (const update of updates) {
        if (!update.testCases) continue;

        const res = await Question.updateMany(
            { title: update.title },
            { $set: { testCases: update.testCases } }
        );
        console.log(`Updated ${update.title}: ${res.modifiedCount} docs`);
    }

    // Handle System Design - Ensure they stay as is or get a flag? 
    // We'll handle them in backend logic to skip execution.

    console.log("Database patch complete.");
    process.exit();
};

fixQuestions();
