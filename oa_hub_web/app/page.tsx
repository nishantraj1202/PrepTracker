import React from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";
import { ArrowRight, Code, Terminal, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto custom-scroll bg-dark-900 relative">

          {/* Hero Section */}
          <div className="relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand/10 rounded-full blur-[100px] -z-10 pointer-events-none opacity-50"></div>

            <div className="max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
                <Zap className="w-3 h-3" />
                The Ultimate OA Guide
              </div>

              <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-6 animate-fade-in">
                Cracking the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-400">Online Assessment</span>
              </h1>

              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
                Access curated questions from top tech companies. Practice real interview problems, visualize solutions, and get hired.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
                <Link
                  href="/questions"
                  className="px-8 py-3.5 bg-brand text-black font-bold rounded-lg hover:bg-brand-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:shadow-[0_0_30px_rgba(255,184,0,0.5)] transform hover:-translate-y-1"
                >
                  Browse Problems
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/companies"
                  className="px-8 py-3.5 bg-dark-800 text-white font-bold rounded-lg hover:bg-dark-700 transition-all border border-dark-700 hover:border-gray-500"
                >
                  Explore Companies
                </Link>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="max-w-7xl mx-auto px-6 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-2xl bg-dark-800/50 border border-dark-700 hover:border-brand/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real Questions</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Practice with actual questions asked in recent online assessments from OA Hub community.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-dark-800/50 border border-dark-700 hover:border-brand/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Code className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Detailed Solutions</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Understand the core concepts with step-by-step explanations and code snippets in multiple languages.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-dark-800/50 border border-dark-700 hover:border-brand/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Company Specific</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Filter questions by target companies to prepare specifically for your upcoming interviews.
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
