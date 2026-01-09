"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { Play, Volume2, Settings, Maximize, X, Loader2, RefreshCw } from "lucide-react";
import { type Question } from "@/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateSignatures } from "@/lib/signatureGenerator";

interface CodePlayerProps {
    question: Question;
}

const CPP_TEMPLATE = (title: string) => `class Solution {
public:
    // Solve: ${title}
    
    // TODO: Define your function here based on the problem
    // example: 
    // int solve(vector<int>& nums) {
    //     return 0;
    // }
};`;

const JS_TEMPLATE = `/**
 * @param {any[]} args
 * @return {any}
 */
function solution(args) {
    // Write your solution here
    
}`;

const PYTHON_TEMPLATE = `class Solution:
    def solution(self, args):
        # Write your Python code here
        pass
`;

const JAVA_TEMPLATE = `class Solution {
    public void solution() {
        // Write your Java code here
    }
}`;



export function CodePlayer({ question }: CodePlayerProps) {
    const [consoleOpen, setConsoleOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [language, setLanguage] = useState<"cpp" | "javascript" | "python" | "java">("cpp"); // Default to C++ as requested
    const [code, setCode] = useState(CPP_TEMPLATE(question.title));
    const [activeCase, setActiveCase] = useState(0);
    const [activeTab, setActiveTab] = useState<'scenes' | 'roleplay'>('scenes');
    const [customInput, setCustomInput] = useState("[2,7,11,15]\n9");
    const [lastRunMode, setLastRunMode] = useState<'scenes' | 'roleplay' | null>(null);
    const [consoleHeight, setConsoleHeight] = useState(300); // Resizable height
    const [isConsoleDragging, setIsConsoleDragging] = useState(false);
    const consoleRef = useRef<HTMLDivElement>(null);
    const consolePanelRef = useRef<HTMLDivElement>(null);

    // Handle console (vertical) resize drag
    useEffect(() => {
        if (!isConsoleDragging) return;

        const handleConsoleDrag = (e: MouseEvent) => {
            if (!consolePanelRef.current) return;
            const containerRect = consolePanelRef.current.getBoundingClientRect();
            const newHeight = containerRect.bottom - e.clientY;
            // Clamp between 100px and 80% of container height
            const clampedHeight = Math.min(Math.max(newHeight, 100), containerRect.height * 0.8);
            setConsoleHeight(clampedHeight);
        };

        const handleConsoleDragEnd = () => {
            setIsConsoleDragging(false);
        };

        document.addEventListener('mousemove', handleConsoleDrag);
        document.addEventListener('mouseup', handleConsoleDragEnd);

        return () => {
            document.removeEventListener('mousemove', handleConsoleDrag);
            document.removeEventListener('mouseup', handleConsoleDragEnd);
        };
    }, [isConsoleDragging]);

    // Generate dynamic templates based on test cases
    const signatures = useMemo(() => {
        return generateSignatures(question.testCases || []);
    }, [JSON.stringify(question.testCases)]);

    // Update code template when language changes
    useEffect(() => {
        if (question.snippets && question.snippets[language]) {
            setCode(question.snippets[language]!);
        } else {
            // Use generated signatures based on test cases
            setCode(signatures[language]);
        }
    }, [language, question.title, JSON.stringify(question.snippets), signatures]);

    // Helper: Parse logs to find status and output for a specific test case
    const getTestCaseResult = (index: number) => {
        const caseNum = index + 1;
        const statusLog = logs.find(l => l.startsWith(`Test Case ${caseNum}:`));

        if (!statusLog) return { status: 'pending', output: null };

        const isPassed = statusLog.includes("PASSED");

        // If passed, output matches expected
        if (isPassed) {
            return {
                status: 'passed',
                output: JSON.stringify(question.testCases?.[index]?.output)
            };
        }

        // If failed, try to capture "Got: ..." from the next line or same block
        const failIndex = logs.indexOf(statusLog);
        const detailLog = logs[failIndex + 1]; // usually next line
        if (detailLog && detailLog.includes("Got:")) {
            const gotPart = detailLog.split("Got: ")[1];
            return { status: 'failed', output: gotPart };
        }

        return { status: 'failed', output: "Error or unknown" };
    };

    const runCode = async () => {
        setConsoleOpen(true);
        setIsRunning(true);
        setLogs([`> Sending ${language}...`]);
        setActiveCase(0);
        setLastRunMode(activeTab);

        try {
            const response = await fetch('http://localhost:5000/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language,
                    questionId: question.id,
                    customInput: activeTab === 'roleplay' ? customInput.split('\n').filter(line => line.trim() !== "").map(line => {
                        try { return JSON.parse(line); } catch { return line; }
                    }) : undefined
                })
            });

            const data = await response.json();

            if (data.logs) {
                setLogs(data.logs);
            } else {
                setLogs(["> Error executing code.", JSON.stringify(data)]);
            }
        } catch (error) {
            setLogs(["> Server Connection Error"]);
        } finally {
            setIsRunning(false);
            // Scroll to bottom but wait for UI update
            setTimeout(() => {
                if (consoleRef.current) {
                    // consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
                }
            }, 100);
        }
    };

    // Resizable Split Pane Logic
    const [leftWidth, setLeftWidth] = useState(35); // Percentage
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // Constrain between 20% and 80%
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                setLeftWidth(newLeftWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);


    return (
        <div className="w-full bg-[#1e1e1e] border border-dark-700 rounded-sm overflow-hidden flex flex-col relative group aspect-[16/10] min-h-[500px] shadow-2xl">

            {/* Editor Area */}
            <div ref={containerRef} className="flex-1 flex flex-row relative overflow-hidden">

                {/* Problem Description (Left Panel) */}
                <div
                    style={{ width: `${leftWidth}%` }}
                    className="hidden md:block bg-dark-800 border-r border-dark-700 overflow-y-auto custom-scroll p-6 text-sm text-gray-300 leading-relaxed border-t-4 border-brand shrink-0"
                >
                    <h3 className="font-bold text-white mb-4 text-2xl">{question.title}</h3>

                    {/* Display Screenshots (HIDDEN as per new design) */}
                    {/* {question.images && question.images.length > 0 && (
                        <div className="mb-6 grid grid-cols-1 gap-4">
                            {question.images.map((img, idx) => (
                                <div key={idx} className="relative w-full border border-dark-600 rounded-lg overflow-hidden bg-dark-900 group">
                                    <img
                                        src={img}
                                        alt={`Scenario ${idx + 1}`}
                                        className="w-full h-auto object-contain max-h-[600px]"
                                        loading="lazy"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        Image {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )} */}

                    <div className="prose prose-invert prose-sm max-w-none 
                        prose-headings:text-gray-100 prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-6
                        prose-p:text-gray-300 prose-p:leading-7 prose-p:mb-4
                        prose-strong:text-white prose-strong:font-bold
                        prose-code:bg-[#282828] prose-code:text-[#e6e6e6] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-[#282828] prose-pre:border prose-pre:border-dark-600 prose-pre:rounded-lg prose-pre:p-4
                        prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:mb-2
                        ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {question.desc}
                        </ReactMarkdown>
                    </div>

                    {/* Examples */}
                    <div className="mt-8 space-y-6">
                        {question.testCases?.slice(0, 3).map((tc, i) => (
                            <div key={i}>
                                <h3 className="text-white font-bold text-base mb-3">Example {i + 1}:</h3>
                                <div className="bg-[#282828] rounded-lg p-4 font-mono text-sm border-l-2 border-dark-600 shadow-sm transition-all hover:border-brand/50 hover:bg-[#2a2a2a]">
                                    <div className="flex gap-3 mb-2">
                                        <span className="text-gray-500 font-medium select-none min-w-[50px]">Input:</span>
                                        <span className="text-gray-200">{JSON.stringify(tc.input)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-gray-500 font-medium select-none min-w-[50px]">Output:</span>
                                        <span className="text-gray-200">{JSON.stringify(tc.output)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Constraints */}
                    {question.constraints && (
                        <div className="mt-8 pt-6 border-t border-dark-700">
                            <h3 className="text-white font-bold text-base mb-4">Constraints:</h3>
                            <div className="prose prose-invert prose-sm max-w-none 
                                     prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:mb-1
                                     prose-code:bg-[#282828] prose-code:text-[#e6e6e6] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
                                ">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {question.constraints}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Drag Handle */}
                <div
                    className={cn(
                        "w-1 bg-[#1a1a1a] hover:bg-brand cursor-col-resize z-20 flex items-center justify-center transition-colors delay-75",
                        isDragging && "bg-brand w-1.5"
                    )}
                    onMouseDown={handleMouseDown}
                >
                    {/* Tiny handle Grip */}
                    <div className="h-8 w-0.5 bg-gray-600 rounded-full" />
                </div>

                {/* Code Editor (Right Panel) */}
                <div ref={consolePanelRef} className="flex-1 flex flex-col bg-[#0f0f0f] relative overflow-hidden">

                    {/* Language Selector Overlay */}
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="bg-dark-800 text-gray-300 text-[10px] font-mono border border-dark-600 rounded px-2 py-1 hover:border-brand focus:outline-none cursor-pointer"
                        >
                            <option value="cpp">C++ (GCC 9.0)</option>
                            <option value="java">Java (OpenJDK 17)</option>
                            <option value="python">Python 3.9</option>
                            <option value="javascript">JavaScript (Node 20)</option>
                        </select>
                    </div>

                    <Editor
                        height="100%"
                        language={language}
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            fontFamily: "JetBrains Mono",
                            scrollBeyondLastLine: false,
                            lineNumbers: "on",
                            roundedSelection: false,
                            readOnly: false,
                            cursorStyle: "line",
                            padding: { top: 16 }
                        }}
                    />

                    {/* PROFESSIONAL RESULTS CONSOLE (LeetCode Style) */}
                    <div
                        className={cn(
                            "absolute bottom-0 left-0 right-0 z-30 bg-[#1a1a1a] transition-all duration-300 flex flex-col border-t border-dark-600 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]",
                            consoleOpen ? "translate-y-0" : "translate-y-full"
                        )}
                        style={{ height: consoleOpen ? `${consoleHeight}px` : 0 }}
                    >
                        {/* Resize Handle */}
                        <div
                            className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-brand/50 transition-colors z-40 group"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsConsoleDragging(true);
                            }}
                        >
                            <div className="w-12 h-1 bg-gray-600 group-hover:bg-brand rounded-full mx-auto mt-0.5" />
                        </div>
                        {/* Header Controls */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#262626] border-b border-white/5">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setActiveTab('scenes')}
                                    className={cn(
                                        "text-sm font-bold border-b-2 pb-2 -mb-2.5 transition-colors",
                                        activeTab === 'scenes' ? "text-white border-brand" : "text-gray-500 border-transparent hover:text-gray-300"
                                    )}
                                >
                                    Scenes
                                </button>
                                <button
                                    onClick={() => setActiveTab('roleplay')}
                                    className={cn(
                                        "text-sm font-bold border-b-2 pb-2 -mb-2.5 transition-colors",
                                        activeTab === 'roleplay' ? "text-white border-brand" : "text-gray-500 border-transparent hover:text-gray-300"
                                    )}
                                >
                                    Roleplay
                                </button>
                            </div>
                            <button onClick={() => setConsoleOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div ref={consoleRef} className="flex-1 overflow-hidden flex flex-col">
                            {activeTab === 'scenes' ? (
                                isRunning ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Running Code...</span>
                                    </div>
                                ) : logs.length > 0 && lastRunMode === 'scenes' ? (
                                    <div className="flex-1 flex flex-col h-full">
                                        {/* 1. Verdict Header */}
                                        <div className="px-6 py-4 border-b border-white/5">
                                            {logs.some(l => l.includes("ACCEPTED")) ? (
                                                <div className="flex flex-col">
                                                    <h2 className="text-xl font-bold text-brand flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-brand"></span>
                                                        Satisfied
                                                    </h2>
                                                    <div className="flex gap-4 mt-2 text-xs text-gray-400 font-mono">
                                                        <span>Duration: <span className="text-white">12 ms</span></span>
                                                        <span>Load Size: <span className="text-white">6.4 MB</span></span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                        {logs.find(l => l.startsWith("VERDICT:"))?.replace("VERDICT: ", "").replace("WRONG ANSWER", "Blue Balls") || "Premature Exit"}
                                                    </h2>
                                                    {/* Show error logs if available */}
                                                    {!logs.some(l => l.startsWith("Test Case")) && (
                                                        <div className="mt-2 p-3 bg-red-500/10 text-red-400 font-mono text-xs rounded border border-red-500/20 whitespace-pre-wrap max-h-24 overflow-auto">
                                                            {logs.filter(l => !l.startsWith("VERDICT")).join("\n")}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Test Cases Tabs */}
                                        {logs.some(l => l.startsWith("Test Case")) && (
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center gap-2 px-4 pt-4 overflow-x-auto no-scrollbar">
                                                    {question.testCases?.map((tc, i) => {
                                                        const res = getTestCaseResult(i);
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => setActiveCase(i)}
                                                                className={cn(
                                                                    "px-4 py-1.5 rounded-t-lg text-xs font-bold transition-colors border-t border-x border-transparent relative top-[1px]",
                                                                    activeCase === i
                                                                        ? "bg-[#1e1e1e] text-brand border-white/10"
                                                                        : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {res.status === 'passed' && <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>}
                                                                    {res.status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                                                    Scene {i + 1}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* 3. Detailed Case View */}
                                                <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-xs overflow-y-auto border-t border-white/10">
                                                    {question.testCases?.[activeCase] && (
                                                        <div className="space-y-4 max-w-3xl">
                                                            <div className="space-y-1">
                                                                <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Input</span>
                                                                <div className="p-3 bg-[#262626] rounded-md border border-white/5 text-gray-300">
                                                                    {JSON.stringify(question.testCases[activeCase].input)}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Output</span>
                                                                <div className={cn(
                                                                    "p-3 rounded-md border border-white/5",
                                                                    getTestCaseResult(activeCase).status === 'passed' ? "bg-[#262626] text-gray-300" : "bg-red-500/10 text-red-400 border-red-500/20"
                                                                )}>
                                                                    {getTestCaseResult(activeCase).output || "No output provided"}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Expected</span>
                                                                <div className="p-3 bg-[#262626] rounded-md border border-white/5 text-gray-300">
                                                                    {JSON.stringify(question.testCases[activeCase].output)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-700">
                                        <div className="p-4 bg-white/5 rounded-full mb-3">
                                            <Play className="w-6 h-6 opacity-40" />
                                        </div>
                                        <p className="text-xs">Run code to see test results</p>
                                    </div>
                                )
                            ) : (
                                <div className="flex-1 flex flex-col h-full bg-[#1e1e1e]">
                                    {/* Roleplay Input Area */}
                                    {logs.length > 0 && lastRunMode === 'roleplay' && !isRunning ? (
                                        <div className="flex-1 flex flex-col p-4 font-mono text-xs overflow-y-auto">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-gray-300">Roleplay Results</h3>
                                                <button
                                                    onClick={() => setLogs([])}
                                                    className="text-xs text-brand hover:text-white"
                                                >
                                                    Clear & Edit
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Input</span>
                                                    <div className="p-3 bg-[#262626] rounded-md border border-white/5 text-gray-300 whitespace-pre-wrap">
                                                        {customInput}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Output</span>
                                                    <div className="p-3 bg-[#262626] rounded-md border border-white/5 text-gray-300">
                                                        {logs.find(l => l.includes("Result:"))?.split("Result: ")[1] ||
                                                            logs.find(l => l.includes("Got:"))?.split("Got: ")[1] ||
                                                            (logs.some(l => l.includes("PASSED")) ? "Correct Match (Output hidden on pass)" :
                                                                logs.some(l => l.includes("Error") || l.includes("STDERR")) ?
                                                                    <span className="text-red-400 italic">Error occurred (see details below)</span> : "No output generated")
                                                        }
                                                    </div>
                                                </div>

                                                {logs.some(l => l.includes("Expected:")) && (
                                                    <div className="space-y-1">
                                                        <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Expected Output</span>
                                                        <div className="p-3 bg-[#262626] rounded-md border border-white/5 text-gray-400">
                                                            {logs.find(l => l.includes("Expected:"))?.split("Expected: ")[1]?.split(" Got:")[0]}
                                                        </div>
                                                    </div>
                                                )}

                                                {logs.some(l => l.includes("PASSED")) && (
                                                    <div className="p-3 bg-brand/10 text-brand border border-brand/20 rounded-md font-bold text-center">
                                                        Verdict: Satisfied
                                                    </div>
                                                )}

                                                {logs.some(l => l.includes("FAILED")) && (
                                                    <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md font-bold text-center">
                                                        Verdict: Blue Balls
                                                    </div>
                                                )}

                                                {logs.some(l => l.includes("STDERR") || l.includes("RUNTIME ERROR")) && (
                                                    <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                                                        {logs.filter(l => l.includes("STDERR") || l.includes("RUNTIME ERROR") || l.includes("Error")).join("\n")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col p-6">
                                            <p className="text-gray-400 text-xs mb-2">Enter custom inputs (one argument per line):</p>
                                            <textarea
                                                value={customInput}
                                                onChange={(e) => setCustomInput(e.target.value)}
                                                className="flex-1 bg-[#262626] border border-white/10 rounded-md p-3 text-gray-300 font-mono text-sm focus:outline-none focus:border-brand resize-none"
                                                placeholder={`[2,7,11,15]\n9`}
                                            />
                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={runCode}
                                                    disabled={isRunning}
                                                    className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-sm hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isRunning ? "Running..." : "Run Roleplay"}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-dark-600 relative cursor-pointer group/progress">
                <div className="h-full bg-brand w-[69%] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow transform scale-0 group-hover/progress:scale-100 ring-2 ring-brand"></div>
                </div>
            </div>

            {/* Control Bar (Hub Style) */}
            <div className="h-12 bg-dark-800 border-t border-dark-700 flex items-center justify-between px-4 shrink-0 z-40 relative">
                <div className="flex items-center gap-4">
                    {/* Play / Run Button */}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="text-white hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed group mr-2"
                        title="Run Code"
                    >
                        <Play className={cn("w-6 h-6 fill-current", isRunning && "opacity-50")} />
                    </button>

                    {/* Volume (Visual only) */}
                    <div className="group flex items-center gap-2 cursor-pointer">
                        <Volume2 className="w-5 h-5 text-white group-hover:text-brand transition-colors" />
                        <div className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300">
                            <div className="h-1 bg-white/30 rounded-full w-14 ml-1">
                                <div className="h-full bg-brand w-[70%] rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Fake Timer */}
                    <span className="text-xs font-medium text-gray-400 font-mono">
                        00:00 / <span className="text-gray-600">69:42</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Console Toggle */}
                    {/* Console Toggle (Styled as Captions 'CC') */}
                    <button
                        onClick={() => setConsoleOpen(!consoleOpen)}
                        className={cn(
                            "font-bold text-xs flex items-center justify-center w-8 h-6 rounded-[2px] border-2 transition-all mr-1",
                            consoleOpen
                                ? "text-brand border-brand bg-brand/10"
                                : "text-gray-400 border-gray-400 hover:text-white hover:border-white"
                        )}
                        title="Toggle Console (Captions)"
                    >
                        CC
                    </button>

                    <button className="text-gray-400 hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>

                    <button className="text-gray-400 hover:text-white transition-colors">
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div >
    );
}
