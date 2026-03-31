import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: owned } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  const tenantIds = (owned || []).map((o: any) => o.tenant_id);

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly");

  if (!tenantIds.length) {
    return NextResponse.json({ subscriptions: [], plans: plans || [] });
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .in("tenant_id", tenantIds);

  return NextResponse.json({ subscriptions: subs || [], plans: plans || [] });
}
