import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { table_id, type, note } = await req.json();

  const supabase = getSupabase();
  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", tenantSlug).single();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("table_requests").insert({
    tenant_id: tenant.id,
    table_id,
    type,
    note: note || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
