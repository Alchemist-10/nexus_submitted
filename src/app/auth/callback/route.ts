import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { safeNext } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(request.nextUrl.searchParams.get("next")), appUrl()),
      );
  }
  return NextResponse.redirect(
    new URL("/login?notice=confirmation-error", appUrl()),
  );
}
