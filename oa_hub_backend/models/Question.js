const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    // SEO: URL Friendly ID
    slug: {
        type: String,
        // required: true, // Temporarily optional to allow migration scripts to run without crashing on old docs immediately
        unique: true,
        lowercase: true,
        index: true
    },
    // Core Data
    title: {
        type: String,
        required: [true, 'Please add a question title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    company: {
        type: String,
        required: [true, 'Please add a company name'],
        index: true
    },
    topic: {
        type: String,
        required: true,
        enum: ['Arrays', 'Strings', 'Arrays/Strings', 'Matrix', 'LinkedList', 'Trees', 'Graphs', 'DP', 'System Design', 'Heaps', 'Backtracking', 'Other']
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard']
    },

    // Content
    desc: {
        type: String,
        required: [true, 'Please add a description']
    },
    constraints: {
        type: String,
        default: ""
    },
    // SEO: Rich Content
    approach: {
        type: String, // Markdown explanation
        default: ""
    },
    complexity: {
        time: { type: String, default: "" },
        space: { type: String, default: "" }
    },
    snippets: {
        cpp: { type: String, default: "" },
        java: { type: String, default: "" },
        python: { type: String, default: "" },
        javascript: { type: String, default: "" }
    },
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    tags: [String],

    // Execution Data
    testCases: {
        type: [
            {
                input: { type: mongoose.Schema.Types.Mixed },
                output: { type: mongoose.Schema.Types.Mixed }
            }
        ],
        default: []
    },

    // Metadata
    date: {
        type: Date,
        default: Date.now
    },
    views: {
        type: String,
        default: "0"
    },
    likes: {
        type: String,
        default: "0%"
    },
    duration: {
        type: String,
        default: "Med"
    },
    img: {
        type: String,
        default: "bg-gray-800"
    },
    images: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending',
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Question', QuestionSchema);
