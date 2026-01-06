const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../models/Company');
const connectDB = require('../config/db');

dotenv.config({ path: '../.env' });

const companies = [
    {
        name: "Google",
        slug: "google",
        logo: "bg-blue-600",
        subscribers: "1.2M",
        description: "Organizing the world's information."
    },
    {
        name: "Amazon",
        slug: "amazon",
        logo: "bg-yellow-600",
        subscribers: "950K",
        description: "Earth's most customer-centric company."
    },
    {
        name: "Uber",
        slug: "uber",
        logo: "bg-neutral-800",
        subscribers: "250K",
        description: "We reimagine the way the world moves."
    },
    {
        name: "Microsoft",
        slug: "microsoft",
        logo: "bg-sky-600",
        subscribers: "800K",
        description: "Empowering every person and every organization."
    },
    {
        name: "Netflix",
        slug: "netflix",
        logo: "bg-red-600",
        subscribers: "500K",
        description: "See what's next."
    },
    {
        name: "Meta",
        slug: "meta",
        logo: "bg-blue-800",
        subscribers: "700K",
        description: "Giving people the power to build community."
    },
    {
        name: "Apple",
        slug: "apple",
        logo: "bg-neutral-700",
        subscribers: "1.5M",
        description: "Think different."
    }
];

const seedCompanies = async () => {
    await connectDB();

    // Clear existing (optional, but good for reliable seed)
    await Company.deleteMany({});

    await Company.insertMany(companies);

    console.log("Companies seeded successfully.");
    process.exit();
};

seedCompanies();
