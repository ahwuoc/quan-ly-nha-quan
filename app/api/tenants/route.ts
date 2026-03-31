import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("tenant_users")
      .select("tenants!inner(id, name, slug, deleted_at)")
      .eq("user_id", user.id)
      .is("tenants.deleted_at", null);

    if (error) throw error;

    const tenants = data?.map((item: any) => item.tenants) || [];
    return NextResponse.json(tenants);
  } catch (error) {
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
      // 1. HARD DELETE: Wipe completely
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

