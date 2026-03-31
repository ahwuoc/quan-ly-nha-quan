import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getTenantId(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.from("tenants").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("table_requests")
    .select("*, table:tables(number)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { id, status } = await req.json();
  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("table_requests")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
