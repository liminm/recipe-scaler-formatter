import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { splitRecipes } from '@/services/ingestion/splitter';
import { AIProvider } from '@/lib/ai/types';

export async function POST(request: Request) {
    try {
        const { text } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const provider = (cookieStore.get('ai_provider')?.value || 'gemini') as AIProvider;

        const candidates = await splitRecipes(text, provider);
        return NextResponse.json({ candidates });
    } catch (error) {
        console.error('Split API error:', error);
        return NextResponse.json({ error: 'Failed to split recipes' }, { status: 500 });
    }
}
