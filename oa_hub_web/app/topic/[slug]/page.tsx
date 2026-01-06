import React from "react";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { QuestionCard } from "@/components/QuestionCard";
import { Layers } from "lucide-react";
import Link from "next/link";
import { type Question } from "@/types";

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getQuestionsByTopic(topic: string): Promise<Question[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions?topic=${topic}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        return [];
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    // Capitalize for title
    const topicName = slug.charAt(0).toUpperCase() + slug.slice(1);

    return {
        title: `Top ${topicName} Interview Questions (2025) | PrepTracker`,
        description: `Master ${topicName} data structures and algorithms with our curated list of real interview questions from top tech companies.`,
        openGraph: {
            title: `${topicName} Interview Questions | PrepTracker`,
            description: `Best ${topicName} problems for coding interviews.`,
        }
    };
}

export default async function TopicPage({ params }: PageProps) {
    const { slug } = await params;
    const questions = await getQuestionsByTopic(slug);
    const topicName = slug.charAt(0).toUpperCase() + slug.slice(1);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll">
                    <div className="bg-dark-900 border-b border-dark-800 py-12 px-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center gap-3 text-brand mb-2">
                                <Layers className="w-6 h-6" />
                                <span className="font-bold tracking-wide uppercase text-sm">Topic Hub</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-4">{topicName} Questions</h1>
                            <p className="text-gray-400 max-w-2xl text-lg">
                                Comprehensive collection of <strong>{slug}</strong> problems frequently asked in technical interviews.
                                Master this pattern to ace your next OA.
                            </p>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto p-8">
                        {questions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
                                {questions.map((q) => (
                                    <div key={q.id}>
                                        <QuestionCard question={q} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <h3 className="text-xl font-bold text-gray-500">No questions found for this topic yet.</h3>
                                <Link href="/" className="text-brand hover:underline mt-2 inline-block">Browse all questions</Link>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
