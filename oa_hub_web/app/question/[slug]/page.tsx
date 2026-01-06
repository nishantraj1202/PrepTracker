import React from "react";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { CodePlayer } from "@/components/CodePlayer";
import { AuthorCard } from "@/components/AuthorCard";
import { CheckCircle, Share2, ListPlus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type Question } from "@/types";

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getQuestion(slug: string): Promise<Question | null> {
    try {
        const res = await fetch(`http://localhost:5000/api/questions/${slug}`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        return null;
    }
}

async function getUpNext(currentId: string | number): Promise<Question[]> {
    try {
        const res = await fetch('http://localhost:5000/api/questions', { cache: 'no-store' });
        if (!res.ok) return [];
        const all = await res.json();
        return all.filter((q: Question) => q.id !== currentId).slice(0, 5);
    } catch (error) {
        return [];
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const question = await getQuestion(slug);

    if (!question) {
        return {
            title: "Question Not Found",
        };
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://preptracker.example.com';

    return {
        title: `${question.title} - ${question.company} Interview Question`,
        description: `Practice ${question.title} from ${question.company}. ${question.desc.substring(0, 150)}...`,
        openGraph: {
            title: `${question.title} | PrepTracker`,
            description: `Solve ${question.title} online. Real interview question from ${question.company}.`,
        },
        alternates: {
            canonical: `${baseUrl}/question/${slug}`,
        }
    };
}

export default async function QuestionPage({ params }: PageProps) {
    const { slug } = await params;

    // Fetch Data
    const question = await getQuestion(slug);

    if (!question) {
        return (
            <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Question Not Found</h1>
                        <Link href="/" className="text-gray-400 hover:text-brand mt-2 block underline">Return Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    const upNext = await getUpNext(question.id);
    const companySlug = question.company.toLowerCase().replace(/\s+/g, '-');

    // JSON-LD Schema
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "QAPage",
        "mainEntity": {
            "@type": "Question",
            "name": question.title,
            "text": question.desc,
            "answerCount": 1,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": question.approach || "See solution code in the editor.",
                "upvoteCount": parseInt(question.likes) || 0,
            }
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            {/* Inject JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <Navbar />
            <main className="flex-1 flex overflow-hidden">
                {/* Left Column: Code Editor */}
                <div className="flex-1 border-r border-dark-800 bg-dark-900 overflow-hidden flex flex-col">
                    <CodePlayer question={question} />
                </div>

                {/* Right Column: Details & Up Next */}
                <div className="w-[450px] flex flex-col border-l border-dark-800 bg-black overflow-y-auto custom-scroll">

                    {/* Problem Details */}
                    <div className="p-6 border-b border-dark-800">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold text-white tracking-tight">{question.title}</h1>
                                {question.tags?.includes("New") && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-black uppercase">New</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className={cn(
                                    "font-bold px-2 py-0.5 rounded text-xs",
                                    question.difficulty === "Easy" ? "text-green-400 bg-green-400/10" :
                                        question.difficulty === "Medium" ? "text-yellow-400 bg-yellow-400/10" :
                                            "text-red-400 bg-red-400/10"
                                )}>
                                    {question.difficulty}
                                </span>
                                <span>{question.duration}</span>

                                <div className="hidden sm:flex flex-col items-end ml-auto leading-tight">
                                    <span className="text-[10px] text-gray-600">
                                        Published {new Date(question.date || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-green-500 font-medium bg-green-500/10 px-1.5 py-0.5 rounded">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        Updated {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>

                            <div className="text-gray-400 leading-relaxed text-xs line-clamp-2">
                                {question.desc}
                            </div>

                            {/* SEO Content: Approach & Complexity */}
                            {question.approach && (
                                <div className="mt-4 bg-dark-800 p-4 rounded-lg">
                                    <h2 className="text-sm font-bold text-white mb-2">Approach & Intuition</h2>
                                    <div className="text-xs text-gray-400 prose prose-invert max-w-none whitespace-pre-wrap">
                                        {question.approach.replace(/###/g, '')}
                                    </div>
                                </div>
                            )}

                            {question.complexity && (
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-dark-800 p-3 rounded border border-dark-700">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Time Complexity</div>
                                        <div className="text-sm font-mono text-brand">{question.complexity.time}</div>
                                    </div>
                                    <div className="bg-dark-800 p-3 rounded border border-dark-700">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Space Complexity</div>
                                        <div className="text-sm font-mono text-purple-400">{question.complexity.space}</div>
                                    </div>
                                </div>
                            )}

                            {/* Company Link */}
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-800">
                                <Link href={`/company/${companySlug}`} className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 hover:scale-105 transition-transform", question.img)}>
                                    {question.company[0]}
                                </Link>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold">Asked at</div>
                                    <Link href={`/company/${companySlug}`} className="text-white font-bold hover:text-brand transition-colors">
                                        {question.company}
                                    </Link>
                                </div>
                            </div>

                            {/* EEAT: Author Signal */}
                            <div className="mt-8 pt-8 border-t border-dark-800">
                                <AuthorCard />
                            </div>

                        </div>
                    </div>

                    {/* Up Next List */}
                    <div className="p-6">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">Up Next</h3>
                        <div className="space-y-3">
                            {upNext.map(q => (
                                <Link key={q.id} href={`/question/${q.slug || q.id}`} className="flex gap-3 p-2 -mx-2 hover:bg-dark-800 rounded group transition-colors">
                                    <div className="relative w-24 aspect-video bg-dark-800 rounded overflow-hidden shrink-0 border border-dark-700 group-hover:border-brand/50">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]", q.img)}>{q.company[0]}</div>
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-white font-medium text-sm truncate group-hover:text-brand transition-colors">{q.title}</h4>
                                        <p className="text-gray-500 text-xs mt-0.5">{q.company}</p>
                                        <p className="text-[10px] text-gray-600 mt-1">{q.difficulty}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
