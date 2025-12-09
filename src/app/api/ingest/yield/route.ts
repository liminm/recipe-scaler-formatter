import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { estimateYield } from '@/services/ingestion/yieldCalculator';
import { AIProvider } from '@/lib/ai/types';

export async function POST(request: Request) {
    try {
        const { ingredients, steps } = await request.json();

        if (!ingredients || !steps) {
            return NextResponse.json({ error: 'Ingredients and steps are required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const provider = (cookieStore.get('ai_provider')?.value || 'gemini') as AIProvider;

        const yieldEstimate = await estimateYield(ingredients, steps, provider);
        return NextResponse.json(yieldEstimate);
    } catch (error) {
        console.error('Yield API error:', error);
        return NextResponse.json({ error: 'Failed to estimate yield' }, { status: 500 });
    }
}
