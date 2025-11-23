import { geminiFlash } from '../../lib/gemini';
import { Ingredient } from '../../types/models';

export interface DietaryCheckResult {
    compliant: boolean;
    issues: string[]; // List of specific violations (e.g., "Parmesan contains animal rennet (not vegetarian)")
}

export async function checkDietaryCompliance(
    ingredients: Ingredient[],
    dietaryTags: string[]
): Promise<DietaryCheckResult> {
    if (dietaryTags.length === 0) {
        return { compliant: true, issues: [] };
    }

    const ingredientList = ingredients.map(i => i.name_normalized).join(', ');

    const prompt = `
    You are a Dietary QA Officer. Check the following ingredients against the specified dietary restrictions.
    
    Ingredients: ${ingredientList}
    Restrictions: ${dietaryTags.join(', ')}
    
    Instructions:
    1. Identify any ingredients that violate the restrictions.
    2. Be strict about hidden ingredients (e.g., fish sauce, gelatin, rennet).
    3. If compliant, return "compliant": true.
    4. If not, return "compliant": false and a list of specific issues.
    
    Output JSON:
    {
      "compliant": boolean,
      "issues": ["Issue 1", "Issue 2"]
    }
  `;

    try {
        const { result } = await geminiFlash.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Dietary QA failed:', error);
        // Fail safe: assume compliant but warn? Or assume non-compliant?
        // Better to warn that check failed.
        return { compliant: false, issues: ['Automated dietary check failed. Please verify manually.'] };
    }
}
