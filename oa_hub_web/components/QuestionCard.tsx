"use client";

import React from "react";
import Link from "next/link";
import { type Question } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
    question: Question;
    // Removed legacy filter prop to enforce Entity Page navigation
}

export function QuestionCard({ question }: QuestionCardProps) {
    const companySlug = question.company.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="group block">
            <Link href={`/question/${question.slug || question.id}`} className="cursor-pointer">
                {/* Thumbnail Area */}
                <div className="relative w-full aspect-video bg-dark-800 rounded-lg overflow-hidden border border-transparent group-hover:border-dark-600 mb-2 transition-all">
                    <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg", question.img)}>
                            {question.company[0]}
                        </div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        {question.duration}
                    </div>
                </div>
            </Link>

            {/* Meta Area */}
            <div className="flex gap-3">
                <Link
                    href={`/company/${companySlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity",
                        question.img
                    )}
                    title={`Visit ${question.company} Page`}
                >
                    {question.company[0]}
                </Link>
                <div>
                    <h3 className="text-white font-bold text-sm leading-tight group-hover:text-brand line-clamp-2 mb-1 transition-colors">
                        <Link href={`/question/${question.slug || question.id}`}>{question.title}</Link>
                    </h3>
                    <div className="text-gray-400 text-xs">
                        <Link
                            href={`/company/${companySlug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-white transition-colors cursor-pointer inline-block"
                        >
                            {question.company}
                        </Link>
                        <p className="text-[10px] text-gray-500 mt-1 flex justify-between items-center">
                            <span>Online Assessment</span>
                            <span className="text-gray-600">
                                {question.date ? new Date(question.date).toLocaleDateString() : 'Recent'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
