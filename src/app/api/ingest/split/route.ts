import { NextResponse } from 'next/server';
import { splitRecipes } from '@/services/ingestion/splitter';

export async function POST(request: Request) {
    try {
        const { text } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const candidates = await splitRecipes(text);
        return NextResponse.json({ candidates });
    } catch (error) {
        console.error('Split API error:', error);
        return NextResponse.json({ error: 'Failed to split recipes' }, { status: 500 });
    }
}
