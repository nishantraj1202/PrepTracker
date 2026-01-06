"use client";

import React from "react";
import Link from "next/link";
import { Search, Upload, X } from "lucide-react";

export function Navbar() {
    return (
        <header className="h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 sticky top-0">
            {/* Logo */}
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center text-2xl font-bold tracking-tight cursor-pointer group">
                    <span className="text-white mr-1 group-hover:text-brand transition-colors">Prep</span>
                    <span className="bg-brand text-black px-1.5 py-0.5 rounded-[4px] text-xl">Tracker</span>
                </Link>
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Link href="/" className="text-white hover:text-brand transition-colors">
                        Home
                    </Link>
                    <div className="flex gap-6 items-center">
                        <Link href="/questions" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Problem Set
                        </Link>
                        <Link href="/companies" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Companies
                        </Link>
                        <Link href="/contribute" className="text-sm font-bold text-brand hover:text-brand/80 transition-colors flex items-center gap-1">
                            <span className="text-lg">+</span> Upload Scene
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Search Area - Removed */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block relative">
                {/* Search removed as per request */}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
                {/* Admin hidden for normal users */}
                {/* <Link href="/admin" className="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                    Admin
                </Link> */}

                <button
                    onClick={() => alert("We are working on this... Will be updated soon...")}
                    className="hidden sm:flex items-center gap-2 border border-brand text-brand hover:bg-brand hover:text-black px-3 py-1 rounded text-sm font-bold uppercase transition-all duration-200 cursor-pointer"
                >
                    Premium
                </button>
                <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-gray-400 border border-dark-500 cursor-pointer hover:border-brand hover:text-white transition-all">
                    JD
                </div>
            </div>
        </header>
    );
}
