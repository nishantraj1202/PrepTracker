"use client";

import React from "react";
import Link from "next/link";
import { Search, Upload, X, Menu, Flame } from "lucide-react";

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <header className="h-16 bg-dark-800 border-b border-dark-700 flex flex-col justify-center px-4 sm:px-8 shrink-0 z-50 sticky top-0">
            <div className="flex items-center justify-between w-full h-full">
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

                {/* Header Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => alert("We are working on this... Will be updated soon...")}
                        className="hidden sm:flex items-center gap-2 border border-brand text-brand hover:bg-brand hover:text-black px-3 py-1 rounded text-sm font-bold uppercase transition-all duration-200 cursor-pointer"
                    >
                        Premium
                    </button>
                    <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-gray-400 border border-dark-500 cursor-pointer hover:border-brand hover:text-white transition-all">
                        JD
                    </div>
                    {/* Mobile Menu Toggle */}
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden w-10 h-10 flex items-center justify-center text-white hover:bg-dark-700/50 rounded-full transition-colors"
                        aria-label="Toggle Menu"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isOpen && (
                <div className="absolute top-16 left-0 w-full bg-dark-900 border-b border-dark-700 p-4 flex flex-col gap-4 md:hidden shadow-2xl animate-fade-in">
                    <Link href="/" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-brand py-2 border-b border-dark-800">
                        Home
                    </Link>
                    <Link href="/questions" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-brand py-2 border-b border-dark-800">
                        Problem Set
                    </Link>
                    <Link href="/companies" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-brand py-2 border-b border-dark-800">
                        Companies
                    </Link>
                    <Link href="/contribute" onClick={() => setIsOpen(false)} className="text-brand font-bold py-2 border-b border-dark-800">
                        Upload Scene
                    </Link>
                    <button
                        onClick={() => {
                            alert("We are working on this... Will be updated soon...");
                            setIsOpen(false);
                        }}
                        className="text-left text-gray-300 hover:text-brand py-2 border-b border-dark-800 flex items-center gap-2"
                    >
                        <Flame className="w-4 h-4" />
                        Best of 2024
                    </button>
                    <button
                        onClick={() => {
                            alert("We are working on this... Will be updated soon...");
                            setIsOpen(false);
                        }}
                        className="text-left text-yellow-500 font-bold py-2"
                    >
                        Premium
                    </button>
                </div>
            )}
        </header>
    );
}
