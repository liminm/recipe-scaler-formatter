import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (recipeError) throw recipeError;

        // Fetch ingredients
        const { data: ingredients, error: ingError } = await supabase
            .from('ingredients')
            .select('*')
            .eq('recipe_id', id);

        if (ingError) throw ingError;

        // Fetch steps
        const { data: steps, error: stepError } = await supabase
            .from('steps')
            .select('*')
            .eq('recipe_id', id)
            .order('order', { ascending: true });

        if (stepError) throw stepError;

        return NextResponse.json({
            recipe,
            ingredients: ingredients || [],
            steps: steps || []
        });
    } catch (error: any) {
        console.error('GET recipe error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { recipe, ingredients, steps } = body;

        // Update recipe
        const { error: recipeError } = await supabase
            .from('recipes')
            .update({
                title: recipe.title,
                summary: recipe.summary,
                source_url: recipe.source_url,
                original_yield_servings: recipe.original_yield_servings,
                chefs_notes: recipe.chefs_notes,
                estimated_final_weight_g: recipe.estimated_final_weight_g,
                yield_confidence: recipe.yield_confidence,
                extraction_model: recipe.extraction_model,
                yield_estimation_model: recipe.yield_estimation_model,
                version_id: uuidv4()
            })
            .eq('id', id);

        if (recipeError) throw recipeError;

        // Delete existing ingredients and steps
        await supabase.from('ingredients').delete().eq('recipe_id', id);
        await supabase.from('steps').delete().eq('recipe_id', id);

        // Insert new ingredients
        if (ingredients && ingredients.length > 0) {
            const ingredientsData = ingredients.map((ing: any) => ({
                id: uuidv4(),
                recipe_id: id,
                name_raw: ing.name_raw || ing.name_normalized,
                name_normalized: ing.name_normalized,
                base_quantity_g: ing.base_quantity_g || 0,
                yield_factor: ing.yield_factor || 1,
                is_discrete: ing.is_discrete || false,
                purchase_unit: ing.purchase_unit,
                role: ing.role || 'CONSUMABLE',
                dependency_role: ing.dependency_role || 'PASSENGER',
                state: ing.state || 'fresh',
                density_g_ml: ing.density_g_ml
            }));

            const { error: ingInsertError } = await supabase
                .from('ingredients')
                .insert(ingredientsData);

            if (ingInsertError) throw ingInsertError;
        }

        // Insert new steps
        if (steps && steps.length > 0) {
            const stepsData = steps.map((step: any, idx: number) => ({
                id: uuidv4(),
                recipe_id: id,
                order: idx,
                instruction_raw: step.instruction_raw,
                instruction_normalized: step.instruction_normalized || step.instruction_raw,
                time_estimate_minutes: step.time_estimate_minutes,
                constraint_tags: step.constraint_tags || []
            }));

            const { error: stepInsertError } = await supabase
                .from('steps')
                .insert(stepsData);

            if (stepInsertError) throw stepInsertError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PUT recipe error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update recipe' },
            { status: 500 }
        );
    }
}
