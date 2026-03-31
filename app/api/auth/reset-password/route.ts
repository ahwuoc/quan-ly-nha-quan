import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Update user password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Update password error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
