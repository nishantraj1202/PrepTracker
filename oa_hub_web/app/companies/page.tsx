import React from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Companies | PrepTracker",
    description: "Browse companies and their latest interview questions.",
};

interface Company {
    _id: string;
    name: string;
    slug: string;
    logo: string;
    description: string;
}

async function getCompanies(): Promise<Company[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Failed to fetch companies:", error);
        return [];
    }
}

export default async function CompaniesPage() {
    const companies = await getCompanies();

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-dark-950 text-gray-200">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8 bg-dark-900">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">Companies</h1>
                            <p className="text-gray-400">Find questions by company</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                            {companies.map((company) => (
                                <Link key={company._id} href={`/company/${company.slug}`} className="block group h-full">
                                    <div className="bg-dark-800 border border-dark-700 hover:border-brand p-6 rounded-lg transition-all flex flex-col items-center text-center h-full shadow-sm hover:shadow-md">
                                        <div className={cn("w-16 h-16 rounded-full border-2 border-dark-600 flex items-center justify-center text-2xl font-bold text-white mb-4 group-hover:border-brand transition-colors bg-dark-900", company.logo)}>
                                            {company.name[0]}
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-brand transition-colors mb-2">{company.name}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{company.description || "No description available."}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {companies.length === 0 && (
                            <div className="text-center text-gray-500 py-20 bg-dark-800/50 rounded-lg border border-dashed border-dark-700">
                                <p className="text-lg">No companies found.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
