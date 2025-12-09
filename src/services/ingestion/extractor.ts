import { getAIModel } from '../../lib/ai/factory';
import { AIProvider } from '../../lib/ai/types';
import { StagingRecipe } from '../../types/staging';
import { v4 as uuidv4 } from 'uuid';
import { estimateYield } from './yieldCalculator';

import { createHash } from 'crypto';

// Simple in-memory cache to speed up repeated extractions
const EXTRACTION_CACHE = new Map<string, StagingRecipe>();

export async function extractRecipe(rawText: string, titleHint?: string, summary?: string, provider: AIProvider = 'gemini'): Promise<StagingRecipe> {
  // Check cache
  const hash = createHash('md5').update(rawText).digest('hex');
  if (EXTRACTION_CACHE.has(hash)) {
    console.log('⚡ Cache Hit! Returning cached recipe.');
    return {
      ...EXTRACTION_CACHE.get(hash)!,
      id: uuidv4() // Always return a new ID to avoid state conflicts
    };
  }

  const model = getAIModel(provider, 'critical');

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
       - If an ingredient has no specific quantity (e.g. "salt and pepper to taste", "cilantro for garnish"), set tt: true and omit the g field.
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
        g?: number; // base_quantity_g (grams) - omit if to_taste
        tt?: boolean; // is_to_taste (true if "to taste", garnish, or no quantity specified)
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
    let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // If the response doesn't start with { or [, try to find JSON in the text
    if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error(`AI response is not valid JSON. Response starts with: "${jsonStr.substring(0, 100)}..."`);
      }
    }

    const data = JSON.parse(jsonStr);

    // Map minified keys back to full StagingRecipe structure
    const ingredients = (data.i || []).map((ing: any) => ({
      id: uuidv4(),
      name_raw: ing.n,
      name_normalized: ing.nn || ing.n, // Fallback to name_raw if normalized is missing
      quantity_raw: ing.q,
      unit_raw: ing.u,
      base_quantity_g: ing.g,
      state: ing.s || 'fresh',
      role: ing.r || 'CONSUMABLE',
      dependency_role: 'PASSENGER', // Default
      density_confidence: ing.dc,
      needs_review: !ing.g && !ing.tt, // Flag for review if weight missing and not to_taste
      is_to_taste: ing.tt || false
    }));

    const steps = (data.s || []).map((step: any, idx: number) => ({
      id: uuidv4(),
      order: step.o !== undefined ? step.o : idx,
      instruction_raw: step.i,
      constraint_tags: step.c || []
    }));

    // Calculate yield estimate server-side
    console.log('📊 Calculating yield estimate...');
    const yieldEstimate = await estimateYield(ingredients, steps, provider);
    console.log(`📊 Yield estimate: ${yieldEstimate.estimatedFinalWeight_g}g (${yieldEstimate.confidence})`);

    const resultRecipe = {
      id: uuidv4(),
      title: data.t || 'Untitled Recipe',
      summary: summary, // Use the summary provided from RecipeCandidate
      ingredients,
      steps,
      chefs_notes: data.n || [],
      estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
      yield_confidence: yieldEstimate.confidence,
      extraction_model: modelUsed,
      yield_estimation_model: yieldEstimate.modelUsed || 'unknown',
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
