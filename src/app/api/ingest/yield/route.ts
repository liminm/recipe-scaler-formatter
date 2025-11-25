import { NextResponse } from 'next/server';
import { estimateYield } from '@/services/ingestion/yieldCalculator';

export async function POST(request: Request) {
    try {
        const { ingredients, steps } = await request.json();

        if (!ingredients || !steps) {
            return NextResponse.json({ error: 'Ingredients and steps are required' }, { status: 400 });
        }

        const yieldEstimate = await estimateYield(ingredients, steps);
        return NextResponse.json(yieldEstimate);
    } catch (error) {
        console.error('Yield API error:', error);
        return NextResponse.json({ error: 'Failed to estimate yield' }, { status: 500 });
    }
}
