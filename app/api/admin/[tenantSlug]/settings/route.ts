import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("allowed_ips, ip_restriction_enabled, name, slug")
      .eq("slug", tenantSlug)
      .single();

    if (error) throw error;

    const forwardedBy = request.headers.get("x-forwarded-for");
    const currentIp = forwardedBy ? forwardedBy.split(",")[0] : "127.0.0.1";

    return NextResponse.json({ ...data, currentIp });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const body = await request.json();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("tenants")
      .update({
        allowed_ips: body.allowed_ips,
        ip_restriction_enabled: body.ip_restriction_enabled,
      })
      .eq("slug", tenantSlug);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
