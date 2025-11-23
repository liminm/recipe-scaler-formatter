import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StagingRecipe } from '@/types/staging';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { stagingRecipe }: { stagingRecipe: StagingRecipe } = await request.json();

        if (!stagingRecipe) {
            return NextResponse.json({ error: 'Recipe data is required' }, { status: 400 });
        }

        // 1. Insert Recipe
        const recipeId = uuidv4();
        const { error: recipeError } = await supabase
            .from('recipes')
            .insert({
                id: recipeId,
                title: stagingRecipe.title,
                source_url: stagingRecipe.source_url,
                original_yield_servings: stagingRecipe.original_yield_servings,
                chefs_notes: stagingRecipe.chefs_notes,
                estimated_final_weight_g: stagingRecipe.estimated_final_weight_g,
                yield_confidence: stagingRecipe.yield_confidence,
                extraction_model: stagingRecipe.extraction_model,
                yield_estimation_model: stagingRecipe.yield_estimation_model,
                is_base_module: true,
                version_id: uuidv4()
            });

        if (recipeError) throw recipeError;

        // 2. Insert Ingredients
        if (stagingRecipe.ingredients.length > 0) {
            const ingredientsData = stagingRecipe.ingredients.map(ing => ({
                id: uuidv4(),
                recipe_id: recipeId,
                name_raw: ing.name_raw,
                name_normalized: ing.name_normalized || ing.name_raw,
                base_quantity_g: ing.base_quantity_g || 0,
                yield_factor: ing.yield_factor || 1,
                is_discrete: ing.is_discrete,
                purchase_unit: ing.purchase_unit,
                role: ing.role,
                dependency_role: ing.dependency_role,
                state: ing.state,
                density_g_ml: null // We don't have this from staging yet, would need lookup
            }));

            const { error: ingError } = await supabase
                .from('ingredients')
                .insert(ingredientsData);

            if (ingError) throw ingError;
        }

        // 3. Insert Steps
        if (stagingRecipe.steps.length > 0) {
            const stepsData = stagingRecipe.steps.map(step => ({
                id: uuidv4(),
                recipe_id: recipeId,
                order: step.order,
                instruction_raw: step.instruction_raw,
                instruction_normalized: step.instruction_normalized || step.instruction_raw,
                time_estimate_minutes: step.time_estimate_minutes,
                constraint_tags: step.constraint_tags
            }));

            const { error: stepError } = await supabase
                .from('steps')
                .insert(stepsData);

            if (stepError) throw stepError;
        }

        return NextResponse.json({ success: true, recipeId });

    } catch (error: any) {
        console.error('Create Recipe API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save recipe' }, { status: 500 });
    }
}
