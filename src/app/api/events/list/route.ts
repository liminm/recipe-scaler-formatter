import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('id, name, total_headcount, target_weight_per_person_g, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ events: data });
    } catch (error: any) {
        console.error('List Events Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
