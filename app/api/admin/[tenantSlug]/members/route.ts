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

  // Use service role client to fetch all members (bypass RLS)
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from("tenant_users")
    .select("id, role, created_at, user_id")
    .eq("tenant_id", tenantId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  if (role === "admin" && currentRole !== "owner") {
    return NextResponse.json({ error: "Only owner can assign admin role" }, { status: 403 });
  }

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

  const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
  let targetUser = authUsers?.users?.find((u: any) => u.email === email);

  if (!targetUser) {
    // Get tenant info for invitation
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    // Invite user with redirect URL and metadata
    // User will click link → set password → redirect to login page
    const { data: invited, error: inviteErr } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
      data: {
        tenant_id: tenantId,
        tenant_name: tenant?.name || tenantSlug,
        invited_role: role,
      }
    });
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    targetUser = invited.user;
  }

  if (!targetUser) return NextResponse.json({ error: "Could not create user" }, { status: 500 });

  const { data: existing } = await serviceSupabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Người dùng đã là thành viên" }, { status: 409 });

  const { error: insertError } = await serviceSupabase.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: targetUser.id,
    role,
  });

  if (insertError) {
    console.error("Insert member error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true }, { status: 201 });
}

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

  // Use service role client to update (bypass RLS)
  const serviceSupabase = createServiceClient();
  const { error } = await serviceSupabase
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

  // Use service role client to delete (bypass RLS)
  const serviceSupabase = createServiceClient();
  const { error } = await serviceSupabase
    .from("tenant_users")
    .delete()
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .neq("role", "owner"); // cannot remove owner

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
