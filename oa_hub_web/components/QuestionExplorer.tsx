"use client";

import React, { useState, useEffect } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { type Question } from "@/types";
import { SearchX, Filter, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuestionExplorer() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedCompany, setSelectedCompany] = useState<string>("All");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
    const [selectedTopic, setSelectedTopic] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState<string>("");

    useEffect(() => {
        // Fetch from Backend
        const fetchQuestions = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/questions');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setQuestions(data);
                    setFilteredQuestions(data);
                } else {
                    console.error("API returned non-array:", data);
                    setQuestions([]);
                    setFilteredQuestions([]);
                }
            } catch (error) {
                console.error("Failed to fetch questions:", error);
                setQuestions([]);
                setFilteredQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = questions || [];

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.title.toLowerCase().includes(query) ||
                q.company.toLowerCase().includes(query)
            );
        }

        if (selectedCompany !== "All") {
            result = result.filter(q => q.company === selectedCompany);
        }

        if (selectedDifficulty !== "All") {
            result = result.filter(q => q.difficulty === selectedDifficulty);
        }

        if (selectedTopic !== "All") {
            result = result.filter(q => q.topic === selectedTopic);
        }

        // Always sort by Date (Latest First)
        result = result.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

        setFilteredQuestions(result);
    }, [selectedCompany, selectedDifficulty, selectedTopic, searchQuery, questions]);

    const companies = ["All", ...Array.from(new Set((questions || []).map(q => q.company))).sort()];
    const difficulties = ["All", "Easy", "Medium", "Hard"];
    const topics = ["All", ...Array.from(new Set((questions || []).map(q => q.topic))).sort()];

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Problem Set...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header & Filters */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">Problem Set</h1>
                        <p className="text-sm text-gray-400">Browse {filteredQuestions.length} interview questions</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-dark-800 text-white text-sm px-4 py-2 pl-10 rounded-lg border border-dark-700 focus:border-brand focus:outline-none w-full md:w-64"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 p-4 bg-dark-800/30 rounded-xl border border-dark-800 items-center">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mr-2">
                        <ListFilter className="w-4 h-4" />
                        <span>Filters:</span>
                    </div>

                    {/* Company Filter Removed */}

                    {/* Topic Filter */}
                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="bg-dark-900 text-white text-sm px-3 py-1.5 rounded-lg border border-dark-700 hover:border-dark-600 focus:border-brand focus:outline-none cursor-pointer transition-colors"
                    >
                        {topics.map(t => <option key={t} value={t}>{t === "All" ? "Topic" : t}</option>)}
                    </select>

                    {/* Difficulty Filter */}
                    <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="bg-dark-900 text-white text-sm px-3 py-1.5 rounded-lg border border-dark-700 hover:border-dark-600 focus:border-brand focus:outline-none cursor-pointer transition-colors"
                    >
                        {difficulties.map(d => <option key={d} value={d}>{d === "All" ? "Difficulty" : d}</option>)}
                    </select>

                    {(selectedDifficulty !== "All" || selectedTopic !== "All" || searchQuery) && (
                        <button
                            onClick={() => {
                                // setSelectedCompany("All");
                                setSelectedDifficulty("All");
                                setSelectedTopic("All");
                                setSearchQuery("");
                            }}
                            className="text-xs text-red-400 hover:text-red-300 ml-auto flex items-center gap-1"
                        >
                            <SearchX className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Grid View (Video Mode) */}
            {filteredQuestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
                    {filteredQuestions.map((q, index) => (
                        <div key={q.id} className="relative group">
                            {/* NEW Badge for the first 2 items */}
                            {index < 2 && (
                                <div className="absolute -top-1 -right-1 z-10 bg-brand text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg animate-pulse">
                                    NEW
                                </div>
                            )}
                            <QuestionCard
                                question={q}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in bg-dark-800/30 rounded-xl border border-dashed border-dark-700">
                    <SearchX className="w-16 h-16 text-gray-700 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">No matches found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
                </div>
            )}
        </div>
    );
}
