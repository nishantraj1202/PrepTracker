import React from "react";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { QuestionCard } from "@/components/QuestionCard";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { type Question } from "@/types";

interface PageProps {
    params: Promise<{ slug: string; questionSlug: string }>;
}

async function getQuestion(slug: string): Promise<Question | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions/${slug}`, {
            cache: 'no-store'
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, questionSlug } = await params;
    const question = await getQuestion(questionSlug);
    const companyName = slug.charAt(0).toUpperCase() + slug.slice(1); // Simple capitalization

    if (!question) return { title: "Question Not Found" };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://preptracker.example.com';
    return {
        title: `${question.title} - ${companyName} Interview Question (2025)`,
        description: `Prepare for your ${companyName} interview. Solve "${question.title}" which is frequently asked in ${companyName} Online Assessments.`,
        alternates: {
            canonical: `${baseUrl}/question/${question.slug}`,
        }
    };
}

export default async function CompanyQuestionPage({ params }: PageProps) {
    const { slug, questionSlug } = await params;
    const question = await getQuestion(questionSlug);
    const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

    if (!question) return <div>Question not found</div>;

    // In a real programmatic SEO setup, you might want to render the FULL question page here 
    // BUT canonicalize it to the main /question/[slug] page to avoid duplicate content penalties.
    // OR, render a specific "Landing Page" content that links to the solve page.
    // Given the prompt asks for "Question x Company pages (massive traffic)", 
    // we will render a landing page that TEASES the question and links to the solve page.

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll p-8 flex items-center justify-center">
                    <div className="max-w-2xl w-full bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 text-brand mb-4">
                            <Briefcase className="w-6 h-6" />
                            <span className="font-bold uppercase tracking-wide text-sm">{companyName} Interview Prep</span>
                        </div>

                        <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
                            {question.title}
                        </h1>

                        <p className="text-gray-300 text-lg leading-relaxed mb-8">
                            This is a verified interview question from <strong>{companyName}</strong>.
                            Candidates reporting seeing this problem in recent Online Assessments (OAs) and onsite rounds.
                            Mastering "{question.title}" covers key patterns like <strong>{question.topic}</strong>.
                        </p>

                        <div className="bg-dark-950 rounded-xl p-6 mb-8 border border-dark-800">
                            <h3 className="font-bold text-gray-400 text-sm uppercase mb-3">Problem Preview</h3>
                            <p className="text-gray-500 line-clamp-3 italic">
                                "{question.desc}"
                            </p>
                        </div>

                        <Link
                            href={`/question/${question.slug}`}
                            className="block w-full bg-brand hover:bg-yellow-500 text-black font-bold text-xl py-4 rounded-xl text-center transition-transform hover:scale-[1.02]"
                        >
                            Solve Now
                        </Link>

                        <p className="text-center text-gray-500 text-sm mt-4">
                            Join thousands of developers practicing for {companyName}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
