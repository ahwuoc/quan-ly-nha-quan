import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single();

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .single();
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can view permissions" }, { status: 403 });
    }
    const { data: allPermissions } = await supabase
      .from("permissions")
      .select("*")
      .order("category, id");
    const { data: rolePermissions } = await supabase
      .from("role_permissions")
      .select("role, permission_id")
      .eq("tenant_id", tenant.id);
    const permissionsByRole: Record<string, string[]> = {
      owner: [],
      admin: [],
      member: [],
    };

    rolePermissions?.forEach((rp) => {
      if (!permissionsByRole[rp.role]) permissionsByRole[rp.role] = [];
      permissionsByRole[rp.role].push(rp.permission_id);
    });

    return NextResponse.json({
      permissions: allPermissions || [],
      rolePermissions: permissionsByRole,
    });
  } catch (error) {
    console.error("[Permissions GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { role, permissionId, enabled } = await request.json();

    // Get tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single();

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can manage permissions" }, { status: 403 });
    }

    // Cannot modify owner permissions
    if (role === "owner") {
      return NextResponse.json({ error: "Cannot modify owner permissions" }, { status: 400 });
    }

    if (enabled) {
      // Add permission
      await supabase.from("role_permissions").insert({
        tenant_id: tenant.id,
        role,
        permission_id: permissionId,
      });
    } else {
      // Remove permission
      await supabase
        .from("role_permissions")
        .delete()
        .eq("tenant_id", tenant.id)
        .eq("role", role)
        .eq("permission_id", permissionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Permissions POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
