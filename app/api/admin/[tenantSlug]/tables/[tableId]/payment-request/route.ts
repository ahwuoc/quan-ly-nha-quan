import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  const { tableId } = await params;
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("tables")
    .update({ payment_requested: false } as any)
    .eq("id", tableId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
