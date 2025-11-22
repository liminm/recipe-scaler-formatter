import { NextResponse } from 'next/server';
import { extractRecipe } from '@/services/ingestion/extractor';

export async function POST(request: Request) {
    try {
        const { text, titleHint } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const recipe = await extractRecipe(text, titleHint);
        return NextResponse.json({ recipe });
    } catch (error) {
        console.error('Extract API error:', error);
        return NextResponse.json({ error: 'Failed to extract recipe' }, { status: 500 });
    }
}
