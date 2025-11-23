import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch event
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError) throw eventError;

        // Fetch menu items (recipe instances)
        // We need to join with recipes to get titles
        const { data: menuItems, error: menuError } = await supabase
            .from('recipe_instances')
            .select(`
        *,
        base_recipe:recipes(title)
      `)
            .eq('event_id', id);

        if (menuError) throw menuError;

        return NextResponse.json({ event, menu: menuItems });
    } catch (error: any) {
        console.error('Get Event Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Whitelist updateable fields
        const updates: any = {};
        if (body.name) updates.name = body.name;
        if (body.total_headcount) updates.total_headcount = body.total_headcount;
        if (body.target_weight_per_person_g) updates.target_weight_per_person_g = body.target_weight_per_person_g;
        if (body.dietary_tags) updates.dietary_tags = body.dietary_tags;



        const { error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update Event Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
