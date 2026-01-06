const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oa_hub');
        console.log("DB Connected");

        console.log("\n--- COMPANIES ---");
        const companies = await mongoose.connection.db.collection('companies').find({}).toArray();
        console.log(JSON.stringify(companies, null, 2));

        console.log("\n--- QUESTIONS (Approved) ---");
        const questions = await mongoose.connection.db.collection('questions').find({ status: 'approved' }).project({ title: 1, company: 1, status: 1 }).toArray();
        console.log(JSON.stringify(questions, null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
