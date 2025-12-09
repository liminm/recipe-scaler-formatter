import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { extractRecipe } from '@/services/ingestion/extractor';
import { AIProvider } from '@/lib/ai/types';

export async function POST(request: Request) {
    try {
        const { text, titleHint, summary } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const provider = (cookieStore.get('ai_provider')?.value || 'gemini') as AIProvider;

        const recipe = await extractRecipe(text, titleHint, summary, provider);
        return NextResponse.json({ recipe });
    } catch (error) {
        console.error('Extract API error:', error);
        return NextResponse.json({ error: 'Failed to extract recipe' }, { status: 500 });
    }
}
