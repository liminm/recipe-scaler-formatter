import { StagingIngredient, StagingStep } from '@/types/staging';
import { geminiFlash } from '@/lib/gemini';

export interface YieldEstimate {
    estimatedFinalWeight_g: number;
    baseWeight_g: number;
    cookingLossFactor: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string[];
    modelUsed?: string;
}

/**
 * Estimate the final weight of a finished recipe using LLM analysis
 */
export async function estimateYield(
    ingredients: StagingIngredient[],
    steps: StagingStep[]
): Promise<YieldEstimate> {
    const model = geminiFlash;

    // Calculate base weight from consumable ingredients
    const consumableIngredients = ingredients.filter(ing =>
        ing.role === 'CONSUMABLE' || !ing.role
    );

    const baseWeight_g = consumableIngredients.reduce((sum, ing) => {
        const weight = ing.base_quantity_g || 0;
        return sum + weight;
    }, 0);

    // ... (omitted for brevity, same preparation code) ...
    // Prepare ingredient list for LLM
    const ingredientList = consumableIngredients
        .map(ing => `- ${ing.name_normalized || ing.name_raw}: ${ing.base_quantity_g}g (${ing.state || 'fresh'})`)
        .join('\n');

    // Prepare steps for LLM
    const stepsList = steps
        .map((step, idx) => `${idx + 1}. ${step.instruction_raw}`)
        .join('\n');

    const prompt = `You are a professional chef and recipe analyst. Estimate the final weight of a finished recipe based on the ingredients and cooking methods.

**Ingredients (CONSUMABLE only):**
${ingredientList}

**Base Weight:** ${baseWeight_g}g (sum of all consumable ingredients)

**Cooking Steps:**
${stepsList}

**Your Task:**
1. Analyze the cooking methods (roasting, frying, boiling, reduction, etc.)
2. Estimate the percentage of weight loss during cooking
3. Calculate the estimated final weight of the finished dish
4. Assign a confidence level (high/medium/low)
5. Provide brief reasoning

**Important Considerations:**
- Roasting/grilling typically loses 20-30% (moisture evaporation)
- Frying loses 15-25% (moisture + fat absorption varies)
- Boiling/simmering loses 5-10% (if liquid is retained)
- Reduction loses 50-70% (concentrated liquids)
- Baking (bread/cakes) loses 10-15% (steam)
- Raw/no-cook dishes lose 0-5% (minimal handling loss)
- If liquid is drained (pasta water, etc.), exclude PROCESS_ONLY ingredients from base weight

**Output Format (JSON only):**
{
  "estimatedFinalWeight_g": <number>,
  "cookingLossFactor": <0.0 to 1.0>,
  "confidence": "high" | "medium" | "low",
  "reasoning": [
    "Brief point 1",
    "Brief point 2",
    "Brief point 3"
  ]
}`;

    try {
        const { result, modelUsed } = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return {
            estimatedFinalWeight_g: Math.round(data.estimatedFinalWeight_g || baseWeight_g * 0.8),
            baseWeight_g,
            cookingLossFactor: data.cookingLossFactor || 0.2,
            confidence: data.confidence || 'medium',
            reasoning: data.reasoning || ['LLM estimation'],
            modelUsed
        };
    } catch (error) {
        console.error('Yield estimation failed, using fallback:', error);

        // Fallback: assume 20% cooking loss
        return {
            estimatedFinalWeight_g: Math.round(baseWeight_g * 0.8),
            baseWeight_g,
            cookingLossFactor: 0.2,
            confidence: 'low',
            reasoning: ['Fallback estimate: 20% cooking loss assumed'],
            modelUsed: 'fallback-error'
        };
    }
}

/**
 * Format yield estimate for display
 */
export function formatYieldEstimate(estimate: YieldEstimate): string {
    const confidenceEmoji = {
        high: '🟢',
        medium: '🟡',
        low: '🔴'
    };

    return `~${estimate.estimatedFinalWeight_g}g ${confidenceEmoji[estimate.confidence]} (${estimate.confidence} confidence)`;
}
