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
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  try {
    const { tenantSlug, tableId } = await params;
    const supabase = await createServerClient();
    const tenantId = await getTenantIdBySlug(tenantSlug);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { items } = body;

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("session_id, status")
      .eq("id", tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    let currentSessionId = table.session_id;

    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      await supabase
        .from("tables")
        .update({
          session_id: currentSessionId,
          status: "occupied",
          session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        })
        .eq("id", tableId);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: tableId,
        tenant_id: tenantId,
        status: "completed", // Admin added orders are usually assumed served or at least confirmed
        session_id: currentSessionId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Insert items
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(
        items.map((i: any) => ({
          order_id: order.id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tenant_id: tenantId
        }))
      );

    if (itemsError) throw itemsError;

    // 4. Final check and set status again to be safe
    if (table.status !== "occupied") {
      await supabase.from("tables").update({ status: "occupied" }).eq("id", tableId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove items from a session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  try {
    const { tenantSlug, tableId } = await params;
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get("menuItemId");

    if (!menuItemId) {
      return NextResponse.json({ error: "menuItemId is required" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Get current session
    const { data: table } = await supabase
      .from("tables")
      .select("session_id")
      .eq("id", tableId)
      .single();

    if (!table?.session_id) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // 2. Find all orders in this session
    const { data: sessionOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("session_id", table.session_id);

    if (!sessionOrders?.length) return NextResponse.json({ success: true });

    const orderIds = sessionOrders.map(o => o.id);

    // 3. Delete order items
    const { error } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds)
      .eq("menu_item_id", menuItemId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update item quantity in a session
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  try {
    const { tenantSlug, tableId } = await params;
    const body = await request.json();
    const { menuItemId, quantity } = body;

    const supabase = await createServerClient();

    // 1. Get current session
    const { data: table } = await supabase
      .from("tables")
      .select("session_id")
      .eq("id", tableId)
      .single();

    if (!table?.session_id) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // 2. Find all orders in this session
    const { data: sessionOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("session_id", table.session_id);

    if (!sessionOrders?.length) return NextResponse.json({ success: true });

    const orderIds = sessionOrders.map(o => o.id);

    // 3. Find order items in this session
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .eq("menu_item_id", menuItemId);

    if (!items?.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // 4. Update quantity
    const targetItem = items[0];
    const { error: updateError } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("id", targetItem.id);

    if (updateError) throw updateError;

    if (items.length > 1) {
      const otherIds = items.slice(1).map(i => i.id);
      await supabase.from("order_items").delete().in("id", otherIds);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
