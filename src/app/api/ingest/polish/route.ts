import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAIModel } from '@/lib/ai/factory';
import { AIProvider } from '@/lib/ai/types';

export async function POST(request: Request) {
    try {
        const { steps } = await request.json();

        if (!steps || !Array.isArray(steps)) {
            return NextResponse.json({ error: 'Invalid steps data' }, { status: 400 });
        }

        const prompt = `
      You are a helpful cooking assistant. Your task is to polish the grammar and flow of recipe instructions, specifically fixing issues caused by removing ingredients.
      
      The user has removed some ingredients from the recipe, and the text might now have broken sentences like "Mix the and the sugar" or "Add the ." or "Finely dice the tomatoes, onion, and ."
      
      Please fix the grammar, punctuation, and flow of the following steps. 
      - DO NOT change the meaning of the steps.
      - DO NOT add any new ingredients or steps.
      - DO NOT remove any remaining ingredients.
      - ONLY fix the broken sentence structures and awkward phrasing.
      - Return the result as a JSON array of strings, corresponding to the input steps.

      Input Steps:
      ${JSON.stringify(steps)}

      Output JSON:
    `;

        const cookieStore = await cookies();
        const provider = (cookieStore.get('ai_provider')?.value || 'gemini') as AIProvider;
        const model = getAIModel(provider, 'standard');

        const { result, modelUsed } = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const response = result.response;
        const text = response.text();

        let polishedSteps: string[] = [];
        try {
            // Strip markdown code fences if present (some LLMs wrap JSON in ```json ... ```)
            let cleanText = text.trim();
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            polishedSteps = JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to parse Gemini response:', text);
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        return NextResponse.json({ polishedSteps });
    } catch (error: any) {
        console.error('Error polishing steps:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
