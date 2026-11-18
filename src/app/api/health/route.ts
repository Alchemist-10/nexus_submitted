import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/env";
export function GET() {
  return NextResponse.json(
    { status: "ok", databaseConfigured: isConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
