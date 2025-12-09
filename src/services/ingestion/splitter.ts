import { getAIModel } from '../../lib/ai/factory';
import { AIProvider } from '../../lib/ai/types';

export interface RecipeCandidate {
    index: number;
    title: string;
    summary: string;
    originalTextSnippet: string; // A snippet to help identify it
}

export async function splitRecipes(rawText: string, provider: AIProvider = 'gemini'): Promise<RecipeCandidate[]> {
    const model = getAIModel(provider, 'critical');

    // Truncate extremely long text to avoid token limits, though Flash has a large window.
    // 50k chars is usually safe for a few recipes.
    const textToAnalyze = rawText.slice(0, 50000);

    const prompt = `
    You are a Recipe Splitter Agent. Your job is to analyze the provided text and detect if it contains one or multiple distinct recipes.
    
    Input Text:
    """
    ${textToAnalyze}
    """
    
    Instructions:
    1. Identify all distinct recipes in the text.
    2. Ignore ads, comments, and blog fluff.
    3. For each recipe found, provide:
       - A clear Title.
       - A 1-sentence Summary.
       - The first ~50 characters of the recipe text as a Snippet (for identification).
    
    Output strictly valid JSON in this format:
    [
      { "title": "Recipe Title", "summary": "Short summary...", "snippet": "Start of text..." }
    ]
  `;

    try {
        const { result, modelUsed } = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const candidates = JSON.parse(jsonStr);

        return candidates.map((c: any, i: number) => ({
            index: i,
            title: c.title,
            summary: c.summary,
            originalTextSnippet: c.snippet
        }));

    } catch (error) {
        console.error('Splitter Agent failed:', error);
        // Fallback: Return the whole text as one candidate
        return [{
            index: 0,
            title: "Unknown Recipe",
            summary: "Could not split automatically.",
            originalTextSnippet: rawText.slice(0, 50)
        }];
    }
}
