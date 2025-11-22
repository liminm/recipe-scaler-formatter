import * as cheerio from 'cheerio';

export interface ScrapedData {
    url: string;
    title?: string;
    jsonLd?: any[]; // Array of JSON-LD objects
    rawText: string; // Fallback text content
}

export async function scrapeRecipe(url: string): Promise<ScrapedData> {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'FoodProcessorBot/1.0 (Food Processor)'
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        const jsonLd: any[] = [];
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const content = $(el).html();
                if (content) {
                    const parsed = JSON.parse(content);
                    // JSON-LD can be an array or object
                    if (Array.isArray(parsed)) {
                        jsonLd.push(...parsed);
                    } else {
                        jsonLd.push(parsed);
                    }
                }
            } catch (e) {
                console.error('Failed to parse JSON-LD', e);
            }
        });

        // Extract main text for fallback/LLM analysis
        // Remove scripts, styles, etc. to reduce noise
        $('script, style, nav, footer, header, aside, iframe, noscript').remove();

        // Get text, collapse whitespace
        const rawText = $('body').text().replace(/\s+/g, ' ').trim();
        const title = $('title').text().trim() || $('h1').first().text().trim();

        return { url, title, jsonLd, rawText };

    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    }
}
