import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function assertSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).single();
  return data ? supabase : null;
}

export async function PATCH(req: Request) {
  const supabase = await assertSuperAdmin();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { tenant_id, plan_id, expires_at, status, note } = await req.json();
  let finalExpiry = expires_at ?? null;
  if (!finalExpiry && plan_id) {
    const { data: plan } = await supabase.from("plans").select("duration_days").eq("id", plan_id).single() as any;
    if (plan?.duration_days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + plan.duration_days);
      finalExpiry = d.toISOString();
    }
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert({
      tenant_id, plan_id,
      status: status ?? "active",
      expires_at: finalExpiry,
      note: note ?? null,
    }, { onConflict: "tenant_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
