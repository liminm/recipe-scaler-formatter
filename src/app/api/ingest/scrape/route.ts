import { NextResponse } from 'next/server';
import { scrapeRecipe } from '@/services/ingestion/scraper';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const data = await scrapeRecipe(url);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Scrape API error:', error);
        return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 });
    }
}
