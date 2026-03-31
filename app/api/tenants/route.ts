import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get("archived") === "true";

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = supabase
      .from("tenant_users")
      .select("tenants!inner(id, name, slug, deleted_at)")
      .eq("user_id", user.id);

    if (showArchived) {
      query = query.not("tenants.deleted_at", "is", null);
    } else {
      query = query.is("tenants.deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Tenants GET Error]", error);
      throw error;
    }

    const tenants = data?.map((item: any) => item.tenants) || [];
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("[Tenants GET Catch]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("id");
    const isHardDelete = searchParams.get("hard") === "true";

    if (!tenantId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership/role (optional but highly recommended)
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete restaurants" }, { status: 403 });
    }

    if (isHardDelete) {
      // HARD DELETE: Database will cascade delete all related data automatically
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    } else {
      // 2. SOFT DELETE: Update deleted_at
      const { error } = await supabase
        .from("tenants")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", tenantId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Tenant Delete Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("id");
    const isRestore = searchParams.get("restore") === "true";

    if (!tenantId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can restore restaurants" }, { status: 403 });
    }

    if (isRestore) {
      // Restore: Set deleted_at to null
      const { error } = await supabase
        .from("tenants")
        .update({ deleted_at: null })
        .eq("id", tenantId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Tenant Restore Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
