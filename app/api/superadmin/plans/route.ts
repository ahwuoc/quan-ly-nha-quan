import { createServerClient } from "@/lib/supabase/server";
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
  const { data, error } = await supabase.from("plans").select("*").order("price_monthly");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await assertSuperAdmin();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, name, description, max_tables, max_members, price_monthly, duration_days } = await req.json();
  const { error } = await supabase.from("plans")
    .update({ name, description, max_tables, max_members, price_monthly, duration_days })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
