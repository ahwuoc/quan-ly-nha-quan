import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const { tableId } = await request.json();

    if (!tableId) return NextResponse.json({ error: "Missing tableId" }, { status: 400 });

    const supabase = await createServerClient();
    const { error: ordersError } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("table_id", tableId)
      .in("status", ["pending", "preparing"]);

    if (ordersError) throw ordersError;

    const { error: tableError } = await supabase
      .from("tables")
      .update({ status: "available" })
      .eq("id", tableId);

    if (tableError) throw tableError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
