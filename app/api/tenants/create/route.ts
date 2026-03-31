import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_TENANTS_PER_USER = 3;

export async function POST(request: Request) {
  try {
    const { tenantName, tenantSlug } = await request.json();

    if (!tenantName || !tenantSlug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
      return NextResponse.json(
        { error: "Slug chỉ được dùng chữ thường, số, và dấu gạch ngang" },
        { status: 400 }
      );
    }
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { count } = await supabase
      .from("tenant_users")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "owner");

    if ((count ?? 0) >= MAX_TENANTS_PER_USER) {
      return NextResponse.json(
        { error: `Bạn đã đạt giới hạn ${MAX_TENANTS_PER_USER} nhà hàng. Liên hệ để nâng cấp gói.` },
        { status: 403 }
      );
    }

    // Create tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        slug: tenantSlug,
        name: tenantName,
        schema_name: `tenant_${tenantSlug.replace(/-/g, "_")}`,
      })
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json(
        { error: tenantError.message || "Failed to create tenant" },
        { status: 400 }
      );
    }

    // Add user as owner
    await supabase.from("tenant_users").insert({
      tenant_id: tenantData.id,
      user_id: user.id,
      role: "owner",
    });

    // Assign free plan with 30-day expiry
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await supabase.from("subscriptions").insert({
      tenant_id: tenantData.id,
      plan_id: "free",
      status: "active",
      expires_at: expires.toISOString(),
    });

    return NextResponse.json(
      { message: "Tenant created successfully", tenant_id: tenantData.id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
