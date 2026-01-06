const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String, // URL friendly name e.g. "google", "uber"
        required: true,
        unique: true,
        lowercase: true
    },
    logo: {
        type: String, // Tailwind color class or image URL
        default: "bg-gray-700"
    },
    subscribers: {
        type: String, // e.g. "250K"
        default: "0"
    },
    description: {
        type: String,
        default: "Tech company"
    },
    // We can virtually populate questions, but for now we'll just query Question model by company name
}, {
    timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
