import { NextResponse } from 'next/server';
import { questionsData } from '@/lib/data';

export async function GET() {
    return NextResponse.json(questionsData);
}
