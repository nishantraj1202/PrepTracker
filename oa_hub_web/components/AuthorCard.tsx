import React from "react";
import Image from "next/image";

export function AuthorCard() {
    return (
        <div className="bg-dark-950/50 rounded-xl p-6 border border-dark-800 my-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
            <div className="shrink-0 relative">
                <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-2xl border-2 border-brand/20">
                    AD
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-black" title="Verified Author"></div>
            </div>

            <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-1 justify-center sm:justify-start">
                    <h3 className="text-white font-bold text-lg">Author: Amit Dayal</h3>
                    <span className="px-2 py-0.5 rounded-full bg-dark-800 text-[10px] text-gray-400 font-bold uppercase tracking-wide border border-dark-700">
                        Software Engineer
                    </span>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    CSE Undergrad @ NIT Jalandhar. Expert in Data Structures & Algorithms.
                    Building tools to help developers crack FAANG interviews.
                </p>

                <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2.5 py-1 rounded border border-green-400/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[10px] font-bold uppercase tracking-wide">Reviewed by Senior Engineers</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 justify-center sm:justify-start text-sm">
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand transition-colors font-medium flex items-center gap-1">
                        GitHub
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand transition-colors font-medium flex items-center gap-1">
                        LinkedIn
                    </a>
                </div>
            </div>
        </div>
    );
}
