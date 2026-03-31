import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getTenantId(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.from("tenants").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

async function getCurrentUserRole(supabase: any, tenantId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();
  return data?.role ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getCurrentUserRole(supabase, tenantId);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan:plans(max_members)")
    .eq("tenant_id", tenantId)
    .single();

  const maxMembers = (subscription?.plan as any)?.[0]?.max_members || 3;

  const { data, error } = await supabase
    .from("tenant_users")
    .select("id, role, created_at, user_id")
    .eq("tenant_id", tenantId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const serviceSupabase = createServiceClient();
  const userIds = (data || []).map((m: any) => m.user_id);
  const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  (authUsers?.users || []).forEach((u: any) => {
    if (userIds.includes(u.id)) emailMap[u.id] = u.email;
  });

  const members = (data || []).map((m: any) => ({
    ...m,
    email: emailMap[m.user_id] ?? "—",
  }));

  return NextResponse.json({ members, currentRole: role, maxMembers });
}

export async function POST(req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { email, role } = await req.json();

  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentRole = await getCurrentUserRole(supabase, tenantId);
  if (!["owner", "admin"].includes(currentRole ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Only owner can add admin
  if (role === "admin" && currentRole !== "owner") {
    return NextResponse.json({ error: "Only owner can assign admin role" }, { status: 403 });
  }

  // Check subscription limits
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan:plans(max_members)")
    .eq("tenant_id", tenantId)
    .single();

  const maxMembers = (subscription?.plan as any)?.[0]?.max_members || 3;

  const { count: currentMembers } = await supabase
    .from("tenant_users")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if ((currentMembers || 0) >= maxMembers) {
    return NextResponse.json(
      { 
        error: `Đã đạt giới hạn ${maxMembers} thành viên. Vui lòng nâng cấp gói để thêm thành viên.` 
      },
      { status: 403 }
    );
  }

  const serviceSupabase = createServiceClient();

  // Find or create user by email
  const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
  let targetUser = authUsers?.users?.find((u: any) => u.email === email);

  if (!targetUser) {
    const { data: invited, error: inviteErr } = await serviceSupabase.auth.admin.inviteUserByEmail(email);
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    targetUser = invited.user;
  }

  if (!targetUser) return NextResponse.json({ error: "Could not create user" }, { status: 500 });

  // Check not already a member
  const { data: existing } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", targetUser.id)
    .single();

  if (existing) return NextResponse.json({ error: "User already a member" }, { status: 409 });

  const { error } = await supabase.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: targetUser.id,
    role,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}

// PATCH - change role
export async function PATCH(req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { memberId, role } = await req.json();

  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentRole = await getCurrentUserRole(supabase, tenantId);
  if (currentRole !== "owner") {
    return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
  }

  const { error } = await supabase
    .from("tenant_users")
    .update({ role })
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .neq("role", "owner");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE - remove member
export async function DELETE(req: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("id");

  const supabase = await createServerClient();
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentRole = await getCurrentUserRole(supabase, tenantId);
  if (!["owner", "admin"].includes(currentRole ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .neq("role", "owner"); // cannot remove owner

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
