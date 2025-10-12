// app/api/notifications/route.ts

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: notifications, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        return NextResponse.json({ data: notifications });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}