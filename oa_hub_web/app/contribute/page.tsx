"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CodePlayer } from "@/components/CodePlayer";
import { Upload, FileText, ArrowRight, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { cn, API_URL } from "@/lib/utils";

export default function ContributePage() {
    const [step, setStep] = useState<"select" | "input" | "preview" | "success">("select");
    const [mode, setMode] = useState<"image" | "manual" | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    // Form States
    const [imgPreviews, setImgPreviews] = useState<string[]>([]);
    const [company, setCompany] = useState("");
    const [extraInfo, setExtraInfo] = useState("");

    // Manual Form State
    const [manualForm, setManualForm] = useState({
        title: "",
        company: "",
        topic: "Arrays",
        difficulty: "Medium",
        desc: "",
        constraints: "",
        testCases: "[]",
        snippets: { cpp: "", java: "", python: "", javascript: "" }
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            const readers = files.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(readers).then(newPreviews => {
                setImgPreviews(prev => [...prev, ...newPreviews]);
            });
        }
    };

    const removeImage = (index: number) => {
        setImgPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Helper to submit data directly
    const directSubmit = async (data: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    status: 'pending', // Explicitly pending
                    testCases: data.testCases && Array.isArray(data.testCases) ? data.testCases : [],
                    snippets: data.snippets || {}
                })
            });

            if (res.ok) {
                setStep("success");
            } else {
                const err = await res.json();
                alert("Failed to submit: " + (err.details || err.error));
            }
        } catch (error) {
            console.error(error);
            alert("Error submitting.");
        } finally {
            setLoading(false);
        }
    };

    const processImage = async () => {
        if (imgPreviews.length === 0) return;
        setLoading(true);

        try {
            // Call AI Extraction API first
            const extractRes = await fetch(`${API_URL}/api/admin/extract/image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: imgPreviews })
            });

            let extractedData: any = {};
            if (extractRes.ok) {
                extractedData = await extractRes.json();
                console.log("Extracted Data:", extractedData);
            } else {
                console.warn("Extraction failed, submitting with default values.");
            }

            // Prepare final data with extracted content
            const finalData = {
                title: extractedData.title || "", // Let backend default if empty
                company: company || extractedData.company || "Unknown",
                topic: extractedData.topic || "Other",
                difficulty: extractedData.difficulty || "Medium",
                desc: extractedData.desc || extraInfo || "",
                constraints: extractedData.constraints || "",
                testCases: extractedData.testCases || [],
                snippets: extractedData.snippets || {},
                images: imgPreviews, // Include images for backup/review
            };

            // Submit to API
            await directSubmit(finalData);

        } catch (error) {
            console.error(error);
            alert("Error processing submission. Please try again.");
            setLoading(false);
        }
    };

    const processManual = async () => {
        setLoading(true);

        let parsedTestCases = [];
        try { parsedTestCases = JSON.parse(manualForm.testCases); } catch (e) { }

        const finalData = {
            ...manualForm,
            testCases: parsedTestCases,
            date: Date.now()
        };

        // DIRECT SUBMIT (Skip Preview)
        await directSubmit(finalData);
    };

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200 font-sans selection:bg-brand selection:text-black">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-12">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Upload New Scene</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Add a new scene to the archive. All uploads are reviewed securely before going public.
                    </p>
                </div>

                {/* STEP 1: SELECT MODE */}
                {step === "select" && (
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <button
                            onClick={() => { setMode("image"); setStep("input"); }}
                            className="bg-dark-900 border border-dark-800 p-8 rounded-xl hover:border-brand/50 hover:bg-dark-800 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Upload className="w-32 h-32 text-brand" />
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand mb-6 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Upload Scenes</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Upload a screenshot of the scene. We will extract all the action details for you automatically.
                            </p>
                            <span className="text-brand text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                Start Upload <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>

                        <button
                            onClick={() => { setMode("manual"); setStep("input"); }}
                            className="bg-dark-900 border border-dark-800 p-8 rounded-xl hover:border-blue-500/50 hover:bg-dark-800 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-32 h-32 text-blue-500" />
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Manual Script</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Manually write out the script details. Best for when you want full creative control.
                            </p>
                            <span className="text-blue-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                Start Writing <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>
                    </div>
                )}

                {/* STEP 2: INPUT FORM */}
                {step === "input" && (
                    <div className="max-w-3xl mx-auto bg-dark-900 border border-dark-800 rounded-xl p-8 shadow-xl">
                        <button
                            onClick={() => setStep("select")}
                            className="text-sm text-gray-500 hover:text-white mb-6 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Selection
                        </button>

                        {/* MODE: IMAGE UPLOAD */}
                        {mode === "image" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Upload Scene Screenshots</h2>
                                    <p className="text-gray-400 text-sm">We'll scan the first image for content. Add as many scenes as you like.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Company Input */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Studio / Company (Required)</label>
                                        <input
                                            type="text"
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            placeholder="e.g. Brazzers, Google, NaughtyAmerica"
                                            className="w-full bg-dark-950 border border-dark-700 rounded-lg p-3 text-white focus:border-brand focus:outline-none transition-colors"
                                        />
                                    </div>

                                    {/* Image Grid & Dropzone */}
                                    <div className="space-y-4">
                                        {/* Grid mapping previews */}
                                        {imgPreviews.length > 0 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {imgPreviews.map((src, idx) => (
                                                    <div key={idx} className="relative group aspect-video bg-black rounded overflow-hidden border border-dark-700">
                                                        <img src={src} alt={`Scene ${idx}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removeImage(idx)}
                                                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <ArrowLeft className="w-3 h-3 rotate-45" /> {/* Use X icon if available, reusing ArrowLeft for now or just text 'X' to save imports? I'll reuse 'CheckCircle' or import 'X' properly next time, but ArrowLeft is already imported. Flip it? or just 'X' text. */}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="border-2 border-dashed border-dark-700 hover:border-brand/50 rounded-xl p-8 transition-colors text-center relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="space-y-2">
                                                <Upload className="w-10 h-10 text-gray-500 mx-auto" />
                                                <p className="text-gray-300 font-medium">Click to add screenshots</p>
                                                <p className="text-xs text-gray-500">Supports PNG, JPG, WEBP (Multiple allowed)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extra Info */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Additional Context</label>
                                        <textarea
                                            value={extraInfo}
                                            onChange={(e) => setExtraInfo(e.target.value)}
                                            placeholder="Mention any specific details..."
                                            rows={4}
                                            className="w-full bg-dark-950 border border-dark-700 rounded-lg p-3 text-white focus:border-brand focus:outline-none transition-colors resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={processImage}
                                    disabled={!ctxValid() || loading}
                                    className="w-full bg-brand hover:bg-brand/90 text-black font-bold py-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Scanning...</> : "Analyze & Preview"}
                                </button>
                            </div>
                        )}

                        {/* MODE: MANUAL */}
                        {mode === "manual" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Manual Script</h2>
                                    <p className="text-gray-400 text-sm">Fill in the details below.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Scene Title</label>
                                        <input
                                            type="text"
                                            value={manualForm.title}
                                            onChange={e => setManualForm({ ...manualForm, title: e.target.value })}
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Studio</label>
                                        <input
                                            type="text"
                                            value={manualForm.company}
                                            onChange={e => setManualForm({ ...manualForm, company: e.target.value })}
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category (Topic)</label>
                                        <input
                                            type="text"
                                            value={manualForm.topic}
                                            onChange={e => setManualForm({ ...manualForm, topic: e.target.value })}
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description (Markdown)</label>
                                        <textarea
                                            value={manualForm.desc}
                                            onChange={e => setManualForm({ ...manualForm, desc: e.target.value })}
                                            rows={6}
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Constraints / Rules</label>
                                        <textarea
                                            value={manualForm.constraints}
                                            onChange={e => setManualForm({ ...manualForm, constraints: e.target.value })}
                                            rows={3}
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Test Cases (JSON Array)</label>
                                        <textarea
                                            value={manualForm.testCases}
                                            onChange={e => setManualForm({ ...manualForm, testCases: e.target.value })}
                                            rows={4}
                                            placeholder='[{"input": [1,2], "output": 3}]'
                                            className="w-full bg-dark-950 border border-dark-700 rounded px-3 py-2 font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={processManual}
                                    disabled={!manualForm.title || loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Scene"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === "success" && (
                    <div className="max-w-xl mx-auto text-center py-20 px-6">
                        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Scene Uploaded!</h2>
                        <p className="text-gray-400 mb-8">
                            Thank you. Your upload is in the moderation queue.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    setStep("select");
                                    setMode(null);
                                    setImgPreviews([]);
                                    setCompany("");
                                    setExtraInfo("");
                                }}
                                className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded font-bold transition-colors"
                            >
                                Upload Another
                            </button>
                            <a
                                href="/questions"
                                className="px-6 py-3 bg-brand text-black rounded font-bold hover:bg-brand/90 transition-colors"
                            >
                                Browse Questions
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    function ctxValid() {
        if (mode === "image") return imgPreviews.length > 0 && !!company;
        return true;
    }
}
