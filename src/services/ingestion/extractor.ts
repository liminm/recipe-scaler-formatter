import { geminiPro } from '../../lib/gemini';
import { StagingRecipe } from '../../types/staging';
import { v4 as uuidv4 } from 'uuid';
import { estimateYield } from './yieldCalculator';

import { createHash } from 'crypto';

// Simple in-memory cache to speed up repeated extractions
const EXTRACTION_CACHE = new Map<string, StagingRecipe>();

export async function extractRecipe(rawText: string, titleHint?: string, summary?: string): Promise<StagingRecipe> {
  // Check cache
  const hash = createHash('md5').update(rawText).digest('hex');
  if (EXTRACTION_CACHE.has(hash)) {
    console.log('⚡ Cache Hit! Returning cached recipe.');
    return {
      ...EXTRACTION_CACHE.get(hash)!,
      id: uuidv4() // Always return a new ID to avoid state conflicts
    };
  }

  const model = geminiPro;

  const titleHintString = titleHint ? `Title Hint: "${titleHint}"` : '';

  const prompt = `
    You are a Professional Recipe Extractor. Your job is to convert raw recipe text into a structured, metric-only JSON format.
    
    Input Text:
    """
    ${rawText}
    """
    
    ${titleHintString}
    
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
    Output strictly valid JSON matching this Minified Interface (for speed):
    
    interface MinifiedRecipe {
      t: string; // title
      y?: number; // original_yield_servings
      i: { // ingredients
        n: string; // name_raw
        nn?: string; // name_normalized
        q?: string; // quantity_raw
        u?: string; // unit_raw
        g?: number; // base_quantity_g (grams)
        s?: 'fresh' | 'canned' | 'dry' | 'frozen' | 'pre-cooked'; // state
        r?: 'CONSUMABLE' | 'PROCESS_ONLY' | 'REDUCTION'; // role
        dc?: 'high' | 'low'; // density_confidence
      }[];
      s: { // steps
        o: number; // order
        i: string; // instruction_raw
        c?: string[]; // constraint_tags
      }[];
      n: string[]; // chefs_notes
    }
  `;

  try {
    const { result, modelUsed } = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonStr);

    // Map minified keys back to full StagingRecipe structure
    const ingredients = (data.i || []).map((ing: any) => ({
      id: uuidv4(),
      name_raw: ing.n,
      name_normalized: ing.nn,
      quantity_raw: ing.q,
      unit_raw: ing.u,
      base_quantity_g: ing.g,
      state: ing.s || 'fresh',
      role: ing.r || 'CONSUMABLE',
      dependency_role: 'PASSENGER', // Default
      density_confidence: ing.dc,
      needs_review: !ing.g // Flag for review if weight missing
    }));

    const steps = (data.s || []).map((step: any, idx: number) => ({
      id: uuidv4(),
      order: step.o !== undefined ? step.o : idx,
      instruction_raw: step.i,
      constraint_tags: step.c || []
    }));

    // Calculate yield estimate
    // OPTIMIZATION: We skip server-side yield estimation to speed up response.
    // The client (RecipeEditor) will fetch it asynchronously.

    const resultRecipe = {
      id: uuidv4(),
      title: data.t || 'Untitled Recipe',
      summary: summary, // Use the summary provided from RecipeCandidate
      original_yield_servings: data.y,
      ingredients,
      steps,
      chefs_notes: data.n || [],
      estimated_final_weight_g: 0, // Will be populated by client
      yield_confidence: 'low' as const,
      extraction_model: modelUsed,
      yield_estimation_model: 'pending',
      raw_text: rawText
    };

    // Cache the result
    EXTRACTION_CACHE.set(hash, resultRecipe);

    return resultRecipe;

  } catch (error) {
    console.error('Extractor failed:', error);
    throw new Error('Failed to extract recipe structure.');
  }
}
