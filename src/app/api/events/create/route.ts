import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, headcount, target_mass, tags } = body;

        if (!name || !headcount || !target_mass) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventId = uuidv4();
        const now = new Date().toISOString();

        const { error } = await supabase
            .from('events')
            .insert({
                id: eventId,
                name,
                total_headcount: headcount,
                target_weight_per_person_g: target_mass,
                dietary_tags: tags || [],
                equipment_profile: { ovens: 4, burners: 4 }, // Default for now
                version_id: uuidv4()
            });

        if (error) throw error;

        return NextResponse.json({ id: eventId });
    } catch (error: any) {
        console.error('Create Event Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
