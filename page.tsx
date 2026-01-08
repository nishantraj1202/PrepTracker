"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    // --- Post Form State ---
    const [formData, setFormData] = useState({
        title: "",
        company: "",
        topic: "Arrays",
        difficulty: "Easy",
        desc: "",
        constraints: "",
        img: "bg-gray-800",
        testCases: JSON.stringify([
            { input: [1, 2, 3], output: 6 }
        ], null, 2)
    });
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // --- Review Panel State ---
    const [activeTab, setActiveTab] = useState<"post" | "review">("post");
    const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // --- Fetch Pending Questions ---
    useEffect(() => {
        if (activeTab === "review") {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/questions`)
                .then(res => res.json())
                .then(data => setPendingQuestions(data))
                .catch(err => console.error("Failed to fetch pending questions", err));
        }
    }, [activeTab, refreshTrigger]);

    // --- Actions ---
    const handleApprove = async (id: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/questions/${id}/approve`, {
                method: 'PUT'
            });
            if (res.ok) {
                setPendingQuestions(prev => prev.filter(q => q.id !== id));
            }
        } catch (err) {
            console.error("Approve failed", err);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/questions/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setPendingQuestions(prev => prev.filter(q => q.id !== id));
            }
        } catch (err) {
            console.error("Reject failed", err);
        }
    };

    // --- Helper: Run AI Extraction ---
    const runAiExtraction = async (imageData: string[]) => {
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/extract/image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: imageData })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.details || "AI Extraction failed");

            // Populate Form
            setFormData(prev => ({
                ...prev,
                title: data.title || prev.title,
                desc: data.desc || prev.desc,
                constraints: data.constraints || prev.constraints,
                company: data.company || prev.company,
                topic: data.topic || prev.topic,
                difficulty: data.difficulty || prev.difficulty,
                testCases: JSON.stringify(data.testCases || [], null, 2)
            }));
        } catch (error: any) {
            console.error(error);
            setAiError(error.message || "Failed to process images");
        } finally {
            setAiLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setImagePreviews([]);
        setDeletedImages([]);

        try {
            // Read all files as Base64
            const promises = Array.from(files).map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const base64Images = await Promise.all(promises);
            setImagePreviews(base64Images);

            // Trigger AI
            await runAiExtraction(base64Images);

        } catch (error: any) {
            console.error(error);
            setAiError("Failed to read image files");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleEdit = async (q: any) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/questions/${q.id}`);
            if (res.ok) {
                const fullQuestion = await res.json();
                q = fullQuestion;
            }
        } catch (err) {
            console.error("Failed to fetch full question data:", err);
        }

        setFormData({
            title: q.title,
            company: q.company,
            topic: q.topic,
            difficulty: q.difficulty,
            desc: q.desc,
            constraints: q.constraints || "",
            img: q.img,
            testCases: JSON.stringify(q.testCases || [], null, 2)
        });
        setEditingId(q.id);
        setDeletedImages([]); // Reset deleted tracker

        // Auto-Show Previews if existing images
        if (q.images && q.images.length > 0) {
            setImagePreviews(q.images);

            // AUTO-EXTRACT: If description is generic placeholder, try to re-extract
            const isGenericDesc = !q.desc || q.desc.includes("See attached screenshots");
            if (isGenericDesc) {
                console.log("Auto-extracting from existing images...");
                runAiExtraction(q.images);
            }
        } else {
            setImagePreviews([]);
        }

        setActiveTab("post");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus("idle");

        try {
            // Parse Test Cases
            let parsedTestCases = [];
            try {
                parsedTestCases = JSON.parse(formData.testCases);
            } catch (err) {
                alert("Invalid JSON in Test Cases");
                setLoading(false);
                return;
            }

            const payload = {
                ...formData,
                testCases: parsedTestCases,
                images: imagePreviews, // Explicitly save current images (or empty array)
                deletedImages: deletedImages // Send tracking of deleted images
            };

            let url = `${process.env.NEXT_PUBLIC_API_URL}/questions`;
            let method = 'POST';

            if (editingId) {
                url = `${process.env.NEXT_PUBLIC_API_URL}/questions/${editingId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStatus("success");
                setFormData({ ...formData, title: "", desc: "", constraints: "", testCases: "[]" }); // Reset some fields
                setEditingId(null);
                setImagePreviews([]); // Clear image previews
                setDeletedImages([]);  // Clear deleted images tracker
                setRefreshTrigger(prev => prev + 1); // Refresh list if looking at review
            } else {
                const errorData = await res.json();
                setStatus("error");
                setAiError(errorData.details || errorData.error || "Failed to post question");
            }
        } catch (error: any) {
            console.error(error);
            setStatus("error");
            setAiError(error.message || "Failed to post question. Please check server connection.");
        } finally {
            setLoading(false);
        }
    };



    // --- Auth State ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState(false);

    // SHA-256 Hash of "admin"
    // To change password, generate a new SHA-256 hash
    const ADMIN_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const encoder = new TextEncoder();
        const data = encoder.encode(passwordInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === ADMIN_HASH) {
            setIsAuthenticated(true);
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-dark-800 p-8 rounded-lg max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                🔒
                            </div>
                            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                            <p className="text-gray-400 text-sm mt-2">Enter the secret key to continue</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Secret Key"
                                    className="w-full bg-black border border-dark-700 rounded px-4 py-3 text-white focus:border-brand focus:outline-none transition-colors"
                                    autoFocus
                                />
                            </div>
                            {authError && (
                                <p className="text-red-500 text-sm text-center">Invalid secret key</p>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-brand hover:bg-yellow-500 text-black font-bold py-3 rounded transition-colors"
                            >
                                Unlock Panel
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8 bg-dark-900">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>

                            {/* Tab Switcher */}
                            <div className="flex bg-dark-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => setActiveTab("post")}
                                    className={cn(
                                        "px-4 py-2 rounded text-sm font-medium transition-colors",
                                        activeTab === "post" ? "bg-brand text-black" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    Post Question
                                </button>
                                <button
                                    onClick={() => setActiveTab("review")}
                                    className={cn(
                                        "px-4 py-2 rounded text-sm font-medium transition-colors relative",
                                        activeTab === "review" ? "bg-brand text-black" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    Review Pending
                                    {pendingQuestions.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                            {pendingQuestions.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === "post" ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={aiLoading}
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {aiLoading ? "Scanning..." : "✨ Auto-Fill from Image (Groq Vision)"}
                                    </button>
                                </div>

                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-400 text-sm">Attached Images ({imagePreviews.length})</span>
                                            <button
                                                type="button"
                                                onClick={() => setImagePreviews([])}
                                                className="text-red-400 text-xs hover:text-red-300 underline"
                                            >
                                                Remove All Images
                                            </button>
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto p-2 bg-dark-900 rounded border border-dark-700">
                                            {imagePreviews.map((src, i) => (
                                                <div key={i} className="relative group flex-shrink-0">
                                                    <img src={src} alt={`Preview ${i}`} className="h-32 w-auto rounded border border-dark-600" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const toDelete = imagePreviews[i];
                                                            // Track deleted image for backend cleanup
                                                            setDeletedImages(prev => [...prev, toDelete]);

                                                            const newImages = [...imagePreviews];
                                                            newImages.splice(i, 1);
                                                            setImagePreviews(newImages);
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                        title="Remove this image"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Error */}
                                {aiError && (
                                    <div className="bg-red-500/10 text-red-500 p-4 rounded border border-red-500/50 mb-6">
                                        <strong>AI Error:</strong> {aiError}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6 bg-dark-800 p-6 rounded-lg border border-dark-700">

                                    {status === "success" && (
                                        <div className="bg-green-500/10 text-green-500 p-4 rounded border border-green-500/50">
                                            Question submitted for review!
                                        </div>
                                    )}
                                    {status === "error" && (
                                        <div className="bg-red-500/10 text-red-500 p-4 rounded border border-red-500/50">
                                            Failed to post question. Please try again.
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Question Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Google"
                                                className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Topic</label>
                                            <select
                                                name="topic"
                                                value={formData.topic}
                                                onChange={handleChange}
                                                className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                            >
                                                <option value="Arrays">Arrays</option>
                                                <option value="Strings">Strings</option>
                                                <option value="LinkedList">LinkedList</option>
                                                <option value="Trees">Trees</option>
                                                <option value="Graphs">Graphs</option>
                                                <option value="DP">Dynamic Programming</option>
                                                <option value="System Design">System Design</option>
                                                <option value="Heaps">Heaps</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Difficulty</label>
                                            <select
                                                name="difficulty"
                                                value={formData.difficulty}
                                                onChange={handleChange}
                                                className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                            >
                                                <option value="Easy">Easy</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Hard">Hard</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Color Theme</label>
                                            <select
                                                name="img"
                                                value={formData.img}
                                                onChange={handleChange}
                                                className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                            >
                                                <option value="bg-blue-600">Blue (Google/Meta)</option>
                                                <option value="bg-yellow-600">Yellow (Amazon)</option>
                                                <option value="bg-red-600">Red (Netflix)</option>
                                                <option value="bg-neutral-800">Black/Dark (Uber)</option>
                                                <option value="bg-sky-600">Sky (Microsoft)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                        <textarea
                                            name="desc"
                                            value={formData.desc}
                                            onChange={handleChange}
                                            required
                                            rows={5}
                                            className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Constraints (Markdown)</label>
                                        <textarea
                                            name="constraints"
                                            value={formData.constraints}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white focus:border-brand focus:outline-none"
                                            placeholder="- 1 <= nums.length <= 10^5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Test Cases (JSON array)</label>
                                        <textarea
                                            name="testCases"
                                            value={formData.testCases}
                                            onChange={handleChange}
                                            required
                                            rows={8}
                                            className="w-full bg-dark-900 border border-dark-700 rounded p-2 text-white font-mono text-xs focus:border-brand focus:outline-none"
                                            placeholder='[{ "input": [1,2], "output": 3 }]'
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-brand hover:bg-yellow-500 text-black font-bold py-3 rounded transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Processing..." : (editingId ? "Update Question" : "Submit for Review")}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingId(null);
                                                setFormData({ ...formData, title: "", desc: "", constraints: "", testCases: "[]" });
                                            }}
                                            className="w-full mt-2 bg-dark-700 hover:bg-dark-600 text-gray-300 font-bold py-2 rounded transition-colors"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}

                                </form>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {pendingQuestions.length === 0 ? (
                                    <div className="text-center text-gray-500 py-12">
                                        No pending questions to review.
                                    </div>
                                ) : (
                                    pendingQuestions.map(q => (
                                        <div key={q.id} className="bg-dark-800 p-4 rounded-lg border border-dark-700 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white mb-1">{q.title}</h3>
                                                    <div className="flex gap-2 text-sm text-gray-400">
                                                        <span className="px-2 py-0.5 bg-dark-700 rounded">{q.company}</span>
                                                        <span className={cn("px-2 py-0.5 rounded",
                                                            q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                                                q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                        )}>{q.difficulty}</span>
                                                        <span className="px-2 py-0.5 bg-dark-700 rounded">{q.topic}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/admin/preview/${q.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-500 rounded text-sm transition-colors"
                                                    >
                                                        Preview
                                                    </Link>
                                                    <button
                                                        onClick={() => handleEdit(q)}
                                                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500 rounded text-sm transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(q.id)}
                                                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded text-sm transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(q.id)}
                                                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-500 rounded text-sm transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-dark-900/50 p-3 rounded text-sm text-gray-300 max-h-32 overflow-y-auto">
                                                {q.desc}
                                            </div>

                                            {/* Accordion for details could/can go here, keeping it simple for now */}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
