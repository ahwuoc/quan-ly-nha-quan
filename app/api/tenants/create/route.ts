import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { tenantName, tenantSlug } = await request.json();

    if (!tenantName || !tenantSlug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create tenant record
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

    // Add user to tenant
    const { error: userTenantError } = await supabase
      .from("tenant_users")
      .insert({
        tenant_id: tenantData.id,
        user_id: user.id,
        role: "owner",
      });

    if (userTenantError) {
      return NextResponse.json(
        { error: userTenantError.message || "Failed to add user to tenant" },
        { status: 400 }
      );
    }

    // Create tenant schema and tables
    const schemaName = `tenant_${tenantSlug.replace(/-/g, "_")}`;
    // Schema creation will be done on first query
    // const { error: schemaError } = await supabase.rpc(
    //   "create_tenant_schema_and_tables",
    //   { schema_name: schemaName }
    // );

    // if (schemaError) {
    //   console.error("Failed to create schema:", schemaError);
    // }

    return NextResponse.json(
      {
        message: "Tenant created successfully",
        tenant_id: tenantData.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
