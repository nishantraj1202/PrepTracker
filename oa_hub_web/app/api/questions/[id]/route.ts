import { NextResponse } from 'next/server';
import { questionsData } from '@/lib/data';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    const questionId = parseInt(id);
    const question = questionsData.find((q) => q.id === questionId);

    if (!question) {
        return new NextResponse('Question not found', { status: 404 });
    }

    return NextResponse.json(question);
}
