import React from "react";
import { Navbar } from "@/components/Navbar";
import { CodePlayer } from "@/components/CodePlayer"; // Ensure this path is correct
import { Question } from "@/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getQuestion(id: string): Promise<Question | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/questions/${id}`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        return null;
    }
}

export default async function AdminPreviewPage({ params }: PageProps) {
    const { id } = await params;
    const question = await getQuestion(id);

    if (!question) {
        return (
            <div className="flex flex-col h-screen bg-dark-950 text-gray-200">
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-red-500">Question not found or server error.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            {/* Admin Preview Header */}
            <div className="h-10 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between px-4 text-xs font-mono text-yellow-500">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    ADMIN PREVIEW MODE
                </div>
                <Link href="/admin" className="hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Back to Admin
                </Link>
            </div>

            <Navbar />

            <main className="flex-1 flex overflow-hidden">
                {/* Full Width Code Player for Admin Preview */}
                <div className="flex-1 border-r border-dark-800 bg-dark-900 overflow-hidden flex flex-col">
                    <CodePlayer question={question} />
                </div>
            </main>
        </div>
    );
}
