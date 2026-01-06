import React from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { QuestionExplorer } from "@/components/QuestionExplorer";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Problem Set | PrepTracker",
    description: "Browse the latest interview questions and online assessments.",
};

export default function QuestionsPage() {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8 bg-dark-900">
                    <QuestionExplorer />
                </main>
            </div>
        </div>
    );
}
