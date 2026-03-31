import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string; tableId: string }> }
) {
  const { tableId } = await params;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("tables")
    .update({ payment_requested: true } as any)
    .eq("id", tableId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
