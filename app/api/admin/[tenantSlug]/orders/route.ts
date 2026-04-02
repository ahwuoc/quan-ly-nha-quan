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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();

    const tenantId = await getTenantIdBySlug(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const tableId = searchParams.get("tableId");
    const sessionId = searchParams.get("sessionId");

    let query = supabase
      .from("orders")
      .select(`
        *,
        table:tables (number),
        order_items (
          *,
          menu_item:menu_items (name, price, image_url)
        )
      `)
      .eq("tenant_id", tenantId);

    if (id) {
      query = query.eq("id", id);
    }
    if (tableId) {
      query = query.eq("table_id", tableId);
    }
    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing order ID" }, { status: 400 });

    const supabase = await createServerClient();
    const body = await request.json();
    const { status } = body;

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Orders PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
