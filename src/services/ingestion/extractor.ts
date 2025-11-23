import { geminiPro } from '../../lib/gemini';
import { StagingRecipe } from '../../types/staging';
import { v4 as uuidv4 } from 'uuid';
import { estimateYield } from './yieldCalculator';

export async function extractRecipe(rawText: string, titleHint?: string): Promise<StagingRecipe> {
  const model = geminiPro;

  const prompt = `
    You are a Professional Recipe Extractor. Your job is to convert raw recipe text into a structured, metric-only JSON format.
    
    Input Text:
    """
    ${rawText}
    """
    
    ${titleHint ? `Title Hint: "${titleHint}"` : ''}
    
    Instructions:
    1. Extract the Title (use hint if available/better).
    2. Extract Ingredients:
       - Normalize quantities to Metric (g, ml, kg, L). Convert cups/spoons to grams if possible using standard density (e.g. water, flour, sugar). If unsure, use ml for volume.
       - Identify 'state' (fresh, canned, dry, frozen).
       - Identify 'role' (CONSUMABLE, PROCESS_ONLY).
    3. Extract Steps:
       - Split into clear, sequential instructions.
       - Tag constraints (crowding, temp_shock, etc.) if obvious.
    4. Extract Metadata:
       - Yield (servings).
       - Chef's Notes (warnings, tips).
    5. Naming Consistency:
       - Ensure that the ingredient names used in the 'steps' exactly match the 'name_normalized' field in the ingredients list.
       - If the text uses an alias (e.g. 'aji') in the steps, but the normalized name is 'Chili Pepper', rewrite the step to use 'Chili Pepper'.
       - OR, if the alias is more appropriate (e.g. 'Aji' for a Chilean recipe), set 'name_normalized' to 'Aji' and use 'Aji' in the steps.
       - The goal is 100% consistency between the list and the instructions.
    
    Output strictly valid JSON matching this TypeScript interface:
    
    interface StagingRecipe {
      title: string;
      original_yield_servings?: number;
      ingredients: {
        name_raw: string;
        name_normalized?: string;
        quantity_raw?: string;
        unit_raw?: string;
        base_quantity_g?: number; // Estimate in grams
        state?: 'fresh' | 'canned' | 'dry' | 'frozen' | 'pre-cooked';
        role?: 'CONSUMABLE' | 'PROCESS_ONLY' | 'REDUCTION';
        density_confidence?: 'high' | 'low';
      }[];
      steps: {
        order: number;
        instruction_raw: string;
        constraint_tags?: string[];
      }[];
      chefs_notes: string[];
    }
  `;

  try {
    const { result, modelUsed } = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonStr);

    // Process ingredients and steps
    const ingredients = (data.ingredients || []).map((ing: any) => ({
      ...ing,
      id: uuidv4(),
      role: ing.role || 'CONSUMABLE',
      dependency_role: ing.dependency_role || 'PASSENGER',
      state: ing.state || 'fresh',
      needs_review: !ing.base_quantity_g // Flag for review if weight missing
    }));

    const steps = (data.steps || []).map((step: any, idx: number) => ({
      ...step,
      id: uuidv4(),
      order: idx,
      constraint_tags: step.constraint_tags || []
    }));

    // Calculate yield estimate
    const yieldEstimate = await estimateYield(ingredients, steps);

    return {
      id: uuidv4(),
      title: data.title || 'Untitled Recipe',
      original_yield_servings: data.original_yield_servings,
      ingredients,
      steps,
      chefs_notes: data.chefs_notes || [],
      estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
      yield_confidence: yieldEstimate.confidence,
      extraction_model: modelUsed,
      yield_estimation_model: yieldEstimate.modelUsed,
      raw_text: rawText
    };

  } catch (error) {
    console.error('Extractor failed:', error);
    throw new Error('Failed to extract recipe structure.');
  }
}
