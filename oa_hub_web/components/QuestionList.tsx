"use client";

import React from "react";
import Link from "next/link";
import { type Question } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock } from "lucide-react";

interface QuestionListProps {
    questions: Question[];
}

export function QuestionList({ questions }: QuestionListProps) {
    const formatDate = (dateString?: string | Date) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case "easy": return "text-green-400 bg-green-400/10 border-green-400/20";
            case "medium": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
            case "hard": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
        }
    };

    return (
        <div className="w-full overflow-hidden rounded-xl border border-dark-800 bg-dark-900/50">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-dark-800 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium w-full">Title</th>
                        <th className="px-6 py-4 font-medium whitespace-nowrap">Topic</th>
                        <th className="px-6 py-4 font-medium whitespace-nowrap">Difficulty</th>
                        <th className="px-6 py-4 font-medium whitespace-nowrap">Posted</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                    {questions.map((q) => (
                        <tr key={q._id || q.id} className="group hover:bg-dark-800/50 transition-colors">
                            <td className="px-6 py-4">
                                {q.status === 'approved' ? (
                                    <CheckCircle className="w-5 h-5 text-brand" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <Link href={`/question/${q.slug || q._id}`} className="block group-hover:translate-x-1 transition-transform">
                                    <div className="font-medium text-gray-200 group-hover:text-brand transition-colors text-base mb-1">
                                        {q.title}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide", q.img?.replace('bg-', 'bg-') || "bg-gray-700")}>
                                            {q.company}
                                        </span>
                                    </div>
                                </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className="text-gray-400 text-sm bg-dark-800 px-2.5 py-1 rounded-md border border-dark-700">
                                        {q.topic}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", getDifficultyColor(q.difficulty))}>
                                    {q.difficulty}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDate(q.date || q.createdAt)}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
