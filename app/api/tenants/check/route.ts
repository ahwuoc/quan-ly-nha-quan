import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if tenant exists and is not deleted
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, slug, deleted_at")
      .eq("slug", slug)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant not found", deleted: true }, { status: 404 });
    }

    // Check if user has access to this tenant
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No access", deleted: true }, { status: 403 });
    }

    // Check if tenant is deleted
    if (tenant.deleted_at) {
      return NextResponse.json({ 
        deleted: true, 
        message: "Tenant has been archived" 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      deleted: false, 
      tenant: { id: tenant.id, slug: tenant.slug } 
    }, { status: 200 });

  } catch (error) {
    console.error("[Tenant Check Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", deleted: true },
      { status: 500 }
    );
  }
}
