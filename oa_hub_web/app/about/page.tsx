import React from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Mail, Linkedin, Github, Globe } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "About PrepTracker | Amit Dayal",
    description: "Learn about PrepTracker and its creator, Amit Dayal. Our mission is to simplify coding interview preparation.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <main className="flex-1 overflow-y-auto custom-scroll">
                <div className="max-w-4xl mx-auto px-6 py-16">

                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <h1 className="text-5xl font-bold text-white mb-6">About PrepTracker</h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            The fastest way to prepare for technical interviews. No fluff, just real questions from top companies.
                        </p>
                    </div>

                    {/* Author/Mission Section */}
                    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 md:p-12 mb-12">
                        <div className="flex flex-col md:flex-row gap-10 items-center">
                            <div className="shrink-0 text-center">
                                <div className="w-40 h-40 rounded-full bg-brand/10 border-4 border-dark-800 flex items-center justify-center text-brand font-bold text-5xl mb-4 mx-auto">
                                    AD
                                </div>
                                <h3 className="text-2xl font-bold text-white">Amit Dayal</h3>
                                <div className="text-brand font-bold text-sm uppercase tracking-wide mt-1">Creator & Maintainer</div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    Why I built this?
                                </h2>
                                <p className="text-gray-400 leading-relaxed">
                                    Hello! I'm <strong>Amit Dayal</strong>, a Computer Science Engineer from <strong>NIT Jalandhar</strong>.
                                    Like many of you, I realized that existing platforms (LeetCode, GFG) are bloated with thousands of irrelevant questions.
                                </p>
                                <p className="text-gray-400 leading-relaxed">
                                    I built <strong>PrepTracker</strong> to solve a simple problem:
                                    <em> "What are the exact questions companies like Uber, Google, and Amazon are asking RIGHT NOW?"</em>
                                </p>
                                <p className="text-gray-400 leading-relaxed">
                                    Every question on this site is curated based on recent interview experiences. No junk, just high-ROI problems.
                                </p>
                            </div>
                        </div>

                        {/* Social Signals */}
                        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-10 border-t border-dark-800">
                            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                                <Github className="w-5 h-5" />
                                <span>GitHub</span>
                            </a>
                            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-[#0077b5] transition-colors">
                                <Linkedin className="w-5 h-5" />
                                <span>LinkedIn</span>
                            </a>
                            <a href="mailto:contact@preptracker.com" className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors">
                                <Mail className="w-5 h-5" />
                                <span>Contact Me</span>
                            </a>
                        </div>
                    </div>

                    {/* Trust Signals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="p-6 bg-dark-900 rounded-xl border border-dark-800">
                            <div className="text-4xl font-bold text-white mb-2">100+</div>
                            <div className="text-sm text-gray-500 font-bold uppercase">Startups Hired</div>
                        </div>
                        <div className="p-6 bg-dark-900 rounded-xl border border-dark-800">
                            <div className="text-4xl font-bold text-white mb-2">500+</div>
                            <div className="text-sm text-gray-500 font-bold uppercase">Real Questions</div>
                        </div>
                        <div className="p-6 bg-dark-900 rounded-xl border border-dark-800">
                            <div className="text-4xl font-bold text-white mb-2">10k+</div>
                            <div className="text-sm text-gray-500 font-bold uppercase">Monthly Solvers</div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
