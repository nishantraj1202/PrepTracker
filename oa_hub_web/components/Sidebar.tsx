"use client";

import React from "react";
import Link from "next/link";
import { Home, Flame, History, Code, Server, Database, Settings, Info } from "lucide-react";

export function Sidebar() {
    return (
        <aside className="hidden lg:flex flex-col w-60 bg-dark-900 border-r border-dark-800 flex-shrink-0 overflow-y-auto h-[calc(100vh-64px)] py-6 px-3 sticky top-16">
            <div className="space-y-1 mb-8">
                <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-800 px-3 py-2 rounded transition-colors group">
                    <Home className="w-5 h-5 group-hover:text-brand transition-colors" />
                    <span className="font-medium">Home</span>
                </Link>
                {/* Admin Panel Hidden */}
                {/* <Link href="/admin" className="flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-800 px-3 py-2 rounded transition-colors group">
                    <Settings className="w-5 h-5 group-hover:text-brand transition-colors" />
                    <span className="font-medium">Admin Panel</span>
                </Link> */}

                <div
                    onClick={() => alert("We are working on this... Will be updated soon...")}
                    className="flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-800 px-3 py-2 rounded cursor-pointer transition-colors group"
                >
                    <Flame className="w-5 h-5 group-hover:text-brand transition-colors" />
                    <span className="font-medium">Best of 2024</span>
                </div>

                {/* History Removed */}
            </div>

            {/* Categories Removed */}

            {/* Bottom Links */}
            <div className="mt-auto pt-6 border-t border-dark-800">
                <Link href="/about" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded transition-colors group">
                    <Info className="w-4 h-4 group-hover:text-brand transition-colors" />
                    <span className="font-medium text-sm">About & Team</span>
                </Link>
            </div>
        </aside>
    );
}
