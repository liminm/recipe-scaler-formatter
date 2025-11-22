import { geminiPro } from '../../lib/gemini';
import { Step, Ingredient } from '../../types/models';
import { Decimal } from '../../lib/decimal';

export async function analyzeStepPhysics(
    step: Step,
    ingredients: Ingredient[],
    totalScaledMass: Decimal
): Promise<string[]> {
    // We use Gemini Pro for reasoning about physics
    const model = geminiPro;

    const ingredientNames = ingredients.map(i => i.name_normalized).join(', ');

    const prompt = `
    You are a Kitchen Physics Engine. Analyze the following cooking step for potential physical/logistical constraints when cooking for a LARGE GROUP.
    
    Context:
    - Total Food Mass: ${totalScaledMass.toFixed(2)} g
    - Ingredients involved: ${ingredientNames}
    
    Step: "${step.instruction_normalized}"
    
    Check for:
    1. Surface Area / Crowding (e.g., browning meat, roasting veg).
    2. Temperature Shock (e.g., adding cold things to hot oil).
    3. Volumetric constraints (e.g., mixing bowl size).
    4. Labor intensity (e.g., peeling 500 shrimp).
    5. Cooling/Safety (e.g., cooling 20L of stock).
    
    If a constraint is violated or risky at this scale, output a specific warning tag/instruction.
    If no major risks, output an empty list.
    
    Output JSON:
    ["Warning 1", "Warning 2"]
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Physics analysis failed:', error);
        return [];
    }
}
