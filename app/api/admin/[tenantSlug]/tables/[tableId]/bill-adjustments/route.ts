import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  try {
    const { tenantSlug, tableId } = await params;
    const { adjustments, finalItems } = await req.json();

    const supabase = createServiceClient();

    // Save adjustments to database for audit trail
    const adjustmentRecords = adjustments.map((adj: any) => ({
      table_id: tableId,
      item_name: adj.item,
      reason: adj.reason,
      quantity_change: adj.change,
      adjusted_at: new Date().toISOString(),
    }));

    if (adjustmentRecords.length > 0) {
      const { error } = await supabase
        .from("bill_adjustments")
        .insert(adjustmentRecords);

      if (error) {
        console.error("Failed to save adjustments:", error);
        // Don't fail the whole request if audit log fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bill adjustments error:", error);
    return NextResponse.json(
      { error: "Lỗi khi lưu điều chỉnh" },
      { status: 500 }
    );
  }
}
