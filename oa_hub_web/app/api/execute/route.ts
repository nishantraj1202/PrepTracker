import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, language } = body;

        if (!code) {
            return NextResponse.json({ error: "No code provided" }, { status: 400 });
        }

        // Simulate server-side initial latency (compilation)
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simulate execution simulation
        // In a real backend, this would send code to a Docker container or Judge0 instance
        const success = Math.random() > 0.4; // 60% chance of success for demo

        if (success) {
            return NextResponse.json({
                status: "accepted",
                logs: [
                    "> Compiling...",
                    "> Running tests...",
                    "Test Case 1: PASSED",
                    "Test Case 2: PASSED",
                    "Test Case 3: PASSED",
                    "VERDICT: ACCEPTED",
                    "Runtime: 12ms | Memory: 5.4MB"
                ]
            });
        } else {
            return NextResponse.json({
                status: "wrong_answer",
                logs: [
                    "> Compiling...",
                    "> Running tests...",
                    "Test Case 1: PASSED",
                    "Test Case 2: FAILED",
                    "VERDICT: WRONG ANSWER",
                    "Input: [2, 7, 11, 15], Target: 9",
                    "Expected: [0, 1]",
                    "Output: [0, 0]"
                ]
            });
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
