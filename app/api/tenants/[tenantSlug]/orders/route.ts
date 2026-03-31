import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const tableSessionId = cookieStore.get("table_session_id")?.value;

    const supabase = await createServerClient();

    const tenantId = await getTenantIdBySlug(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { table_id, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // 0. Verify Table Session
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("session_id, session_expires_at")
      .eq("id", table_id)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Check if session matches
    if (!table.session_id || table.session_id !== tableSessionId) {
       return NextResponse.json({ 
         error: "Session invalid or table occupied by another device. Please scan QR again." 
       }, { status: 403 });
    }

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id,
        tenant_id: tenantId,
        status: "pending"
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Update status to occupied (already done usually but for good measure)
    await supabase
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", table_id);

    // 2. Create the order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tenant_id: tenantId
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("Order POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
