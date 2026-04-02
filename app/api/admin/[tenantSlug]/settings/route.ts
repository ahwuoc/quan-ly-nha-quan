import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();

    let { data, error } = await supabase
      .from("tenants")
      .select("allowed_ips, ip_restriction_enabled, name, slug, bank_name, bank_account_number, bank_account_name, bank_qr_enabled, order_cancel_window, ip_auto_sync, wifi_name, wifi_password")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (error) {
      const retry = await supabase
        .from("tenants")
        .select("allowed_ips, ip_restriction_enabled, name, slug")
        .eq("slug", tenantSlug)
        .maybeSingle();

      if (retry.error) throw retry.error;
      data = retry.data as any;
    }

    if (!data) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const forwardedBy = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const currentIp = (realIp || (forwardedBy ? (forwardedBy.split(",")[0] || "127.0.0.1") : "127.0.0.1")).trim();

    if (data.ip_auto_sync && !data.allowed_ips.includes(currentIp)) {
      const updatedIps = [...data.allowed_ips, currentIp];
      await supabase.from("tenants").update({ allowed_ips: updatedIps }).eq("slug", tenantSlug);
      data.allowed_ips = updatedIps;
    }

    return NextResponse.json({ payload: { ...data, currentIp } });
  } catch (error: any) {
    console.error("API Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
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

    const { error } = await (supabase.from("tenants") as any)
      .update({
        allowed_ips: body.allowed_ips,
        ip_restriction_enabled: body.ip_restriction_enabled,
        bank_name: body.bank_name,
        bank_account_number: body.bank_account_number,
        bank_account_name: body.bank_account_name,
        bank_qr_enabled: body.bank_qr_enabled,
        order_cancel_window: body.order_cancel_window,
        ip_auto_sync: body.ip_auto_sync,
        wifi_name: body.wifi_name,
        wifi_password: body.wifi_password
      })
      .eq("slug", tenantSlug);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
