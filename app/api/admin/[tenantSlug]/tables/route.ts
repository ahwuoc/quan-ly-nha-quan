import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const query = supabase
      .from("tables")
      .select(`
        *,
        orders (
          id,
          status,
          session_id,
          order_items (
            quantity,
            unit_price
          )
        )
      `)
      .eq("tenant_id", tenantId);

    if (id) {
      query.eq("id", id);
    } else {
      query.order("number", { ascending: true });
    }

    const { data: tablesData, error } = await query;

    if (error) throw error;

    if (id && (!tablesData || tablesData.length === 0)) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const tables = (tablesData || []).map((table: any) => {
      const activeOrders = table.orders?.filter((o: any) =>
        ["preparing", "completed", "pending"].includes(o.status) &&
        o.session_id === table.session_id
      ) || [];

      const currentTotal = activeOrders.reduce((total: number, order: any) => {
        const orderTotal = order.order_items?.reduce((oTotal: number, item: any) => oTotal + (item.quantity * item.unit_price), 0) || 0;
        return total + orderTotal;
      }, 0);

      const { orders, ...rest } = table;
      return { ...rest, current_total: currentTotal };
    });

    if (id) {
      return NextResponse.json(tables[0]);
    }

    return NextResponse.json(tables);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();
    const { id, number, qr_code, seats, status } = body;

    const { data, error } = await supabase
      .from("tables")
      .upsert({
        id,
        number,
        qr_code,
        seats,
        status: status || "available",
        tenant_id: tenantId,
        ...(status === "available" ? { session_id: null, session_expires_at: null } : {})
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const { id, number, qr_code, seats, status } = body;

    const { data, error } = await supabase
      .from("tables")
      .update({
        number,
        qr_code,
        seats,
        status,
        // Clear session if table is available
        ...(status === "available" ? { session_id: null, session_expires_at: null } : {})
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("tables")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

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
