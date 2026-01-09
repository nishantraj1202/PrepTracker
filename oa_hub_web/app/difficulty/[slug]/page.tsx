import React from "react";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { QuestionCard } from "@/components/QuestionCard";
import { BarChart } from "lucide-react";
import Link from "next/link";
import { type Question } from "@/types";
import { API_URL } from "@/lib/utils";

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
    try {
        const res = await fetch(`${API_URL}/api/questions?difficulty=${difficulty}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        return [];
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const difficultyName = slug.charAt(0).toUpperCase() + slug.slice(1);

    return {
        title: `${difficultyName} Coding Interview Questions | PrepTracker`,
        description: `Practice ${difficultyName}-level coding interview questions. Perfect for ${difficultyName === 'Easy' ? 'beginners' : difficultyName === 'Medium' ? 'intermediate practice' : 'advanced prep'}.`,
    };
}

export default async function DifficultyPage({ params }: PageProps) {
    const { slug } = await params;
    const questions = await getQuestionsByDifficulty(slug);
    const difficultyName = slug.charAt(0).toUpperCase() + slug.slice(1);

    const colorClass =
        slug.toLowerCase() === 'easy' ? 'text-green-500' :
            slug.toLowerCase() === 'medium' ? 'text-yellow-500' :
                'text-red-500';

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll">
                    <div className="bg-dark-900 border-b border-dark-800 py-12 px-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center gap-3 text-gray-400 mb-2">
                                <BarChart className="w-6 h-6" />
                                <span className="font-bold tracking-wide uppercase text-sm">Difficulty Hub</span>
                            </div>
                            <h1 className={`text-4xl font-bold mb-4 ${colorClass}`}>{difficultyName} Questions</h1>
                            <p className="text-gray-400 max-w-2xl text-lg">
                                Filtered collection of <strong>{difficultyName}</strong> problems.
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
                                <h3 className="text-xl font-bold text-gray-500">No questions found.</h3>
                                <Link href="/" className="text-brand hover:underline mt-2 inline-block">Browse all</Link>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
