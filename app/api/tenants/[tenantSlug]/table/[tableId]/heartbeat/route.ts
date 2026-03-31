import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  const { tenantSlug, tableId } = await params;
  const supabase = await createServerClient();

  try {
    const { error } = await supabase
      .from("tables")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", tableId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 });
  }
}
