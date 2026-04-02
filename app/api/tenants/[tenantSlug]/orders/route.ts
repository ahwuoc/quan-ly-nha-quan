import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

async function getTenantIdBySlug(supabase: any, slug: string): Promise<string | null> {
  const { data, error } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (error) console.error(`[ORDER_API_TRACE] Lỗi tìm Tenant: ${error.message}`);
  return data?.id || null;
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

    const supabase = getSupabaseClient();
    console.log(`[ORDER_API_TRACE] Bắt đầu xử lý: Tenant=${tenantSlug}, Session=${tableSessionId}`);

    const tenantId = await getTenantIdBySlug(supabase, tenantSlug);
    if (!tenantId) {
      console.error(`[ORDER_API_TRACE] 404: Không tìm thấy quán với slug: ${tenantSlug}`);
      return NextResponse.json({ error: `Tenant not found: ${tenantSlug}` }, { status: 404 });
    }
    console.log(`[ORDER_API_TRACE] Đã tìm thấy quán ID: ${tenantId}`);

    const body = await request.json();
    const { table_id, items, customer_name } = body;
    console.log(`[ORDER_API_TRACE] Đang kiểm tra bàn: ${table_id}, Khách: ${customer_name}`);

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("session_id, status")
      .eq("id", table_id)
      .maybeSingle();

    if (tableError) {
      console.error(`[ORDER_API_TRACE] 500: Lỗi DB khi tìm bàn ${table_id}: ${tableError.message}`);
      return NextResponse.json({ error: "Database error during table check" }, { status: 500 });
    }

    if (!table) {
      console.error(`[ORDER_API_TRACE] 404: Bàn ${table_id} không tồn tại hoặc bị chặn bởi RLS.`);
      return NextResponse.json({ error: `Table ${table_id} not found` }, { status: 404 });
    }
    console.log(`[ORDER_API_TRACE] Đã tìm thấy bàn. Session trong DB: ${table.session_id}`);

    if (table.session_id !== tableSessionId) {
      console.warn(`[ORDER_API_TRACE] 403: Sai Session. Của bạn=${tableSessionId}, Của bàn=${table.session_id}`);
      return NextResponse.json({ error: "Session mismatch. Please refresh." }, { status: 403 });
    }

    console.log(`[ORDER_API_TRACE] Đang tạo Order...`);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id,
        tenant_id: tenantId,
        status: "pending",
        session_id: tableSessionId,
        customer_name: customer_name || (await cookieStore).get("member_name")?.value || "Khách ẩn danh"
      })
      .select()
      .maybeSingle();
    if (orderError) throw new Error(`Lỗi tạo đơn: ${orderError.message}`);
    console.log(`[ORDER_API_TRACE] Đang tạo OrderItems (${items.length} món)...`);
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((i: any) => ({
        order_id: order.id,
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tenant_id: tenantId
      }))
    );
    if (itemsError) throw new Error(`Lỗi tạo món ăn: ${itemsError.message}`);

    // 6. Cập nhật bàn
    await supabase.from("tables").update({ status: "occupied" }).eq("id", table_id);

    console.log(`[ORDER_API_TRACE] HOÀN TẤT ĐẶT MÓN! ID=${order.id}`);
    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (err: any) {
    console.error(`[ORDER_API_TRACE] 500 Lỗi nghiêm trọng: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
