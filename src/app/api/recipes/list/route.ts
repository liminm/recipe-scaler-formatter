import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .select('id, title, original_yield_servings, estimated_final_weight_g')
            .order('title', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ recipes: data });
    } catch (error: any) {
        console.error('List Recipes Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
