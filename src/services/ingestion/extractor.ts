import { geminiPro } from '../../lib/gemini';
import { StagingRecipe } from '../../types/staging';
import { v4 as uuidv4 } from 'uuid';

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
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    // Hydrate with UUIDs and defaults
    return {
      id: uuidv4(),
      title: data.title || 'Untitled Recipe',
      original_yield_servings: data.original_yield_servings,
      ingredients: (data.ingredients || []).map((i: any) => ({
        id: uuidv4(),
        name_raw: i.name_raw,
        name_normalized: i.name_normalized || i.name_raw,
        quantity_raw: i.quantity_raw,
        unit_raw: i.unit_raw,
        base_quantity_g: i.base_quantity_g,
        yield_factor: 1,
        is_discrete: false, // Default, user must verify
        role: i.role || 'CONSUMABLE',
        dependency_role: 'PASSENGER',
        state: i.state,
        density_confidence: i.density_confidence || 'low',
        needs_review: true // Always flag for review
      })),
      steps: (data.steps || []).map((s: any, idx: number) => ({
        id: uuidv4(),
        order: s.order ?? idx + 1,
        instruction_raw: s.instruction_raw,
        constraint_tags: s.constraint_tags || []
      })),
      chefs_notes: data.chefs_notes || [],
      raw_text: rawText
    };

  } catch (error) {
    console.error('Extractor failed:', error);
    throw new Error('Failed to extract recipe structure.');
  }
}
