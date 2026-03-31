import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function assertSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).single();
  return data ? supabase : null;
}

export async function GET() {
  const supabase = await assertSuperAdmin();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: tenants } = await supabase
    .from("tenants")
    .select(`
      id, name, slug, created_at, deleted_at,
      subscriptions (plan_id, status, expires_at),
      tenant_users (count)
    `)
    .order("created_at", { ascending: false });
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: authUsers } = await service.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  (authUsers?.users || []).forEach((u: any) => { emailMap[u.id] = u.email; });

  const { data: owners } = await supabase
    .from("tenant_users")
    .select("tenant_id, user_id")
    .eq("role", "owner");

  const ownerMap: Record<string, string> = {};
  (owners || []).forEach((o: any) => { ownerMap[o.tenant_id] = emailMap[o.user_id] ?? "—"; });

  const result = (tenants || []).map((t: any) => ({
    ...t,
    owner_email: ownerMap[t.id] ?? "—",
    member_count: t.tenant_users?.[0]?.count ?? 0,
    plan: t.subscriptions?.plan_id ?? "free",
    sub_status: t.subscriptions?.status ?? "active",
    expires_at: t.subscriptions?.expires_at ?? null,
  }));

  return NextResponse.json(result);
}
