
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../models/Company');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/oa_hub')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

async function cleanupCompanies() {
    console.log("=== Starting Field Cleanup ===");

    // Find all companies with a comma in their name
    const badCompanies = await Company.find({ name: /,/ });

    console.log(`Found ${badCompanies.length} companies with commas:`);
    badCompanies.forEach(c => console.log(` - "${c.name}"`));

    for (const badCompany of badCompanies) {
        // Split names
        const correctNames = badCompany.name.split(',').map(s => s.trim()).filter(s => s);

        console.log(`\nProcessing "${badCompany.name}" -> ${JSON.stringify(correctNames)}`);

        for (const name of correctNames) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

            // Check if individual company exists
            const exists = await Company.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            });

            if (!exists) {
                console.log(`Creating missing company: ${name}`);
                try {
                    await Company.create({
                        name: name,
                        slug: slug,
                        logo: badCompany.logo || 'bg-gray-700',
                        subscribers: '0',
                        description: `Questions from ${name}`
                    });
                } catch (e) {
                    console.error(`Error creating ${name}:`, e.message);
                }
            } else {
                console.log(`Company ${name} already exists.`);
            }
        }

        // Delete the bad company entry
        console.log(`Deleting bad entry: "${badCompany.name}"`);
        await Company.deleteOne({ _id: badCompany._id });
    }

    console.log("\n=== Cleanup Complete ===");
}

// Run
(async () => {
    await cleanupCompanies();
    mongoose.disconnect();
})();
