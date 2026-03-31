"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-4">
        <Card className="w-full max-w-md rounded-[2rem] border-none shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="size-20 mx-auto bg-emerald-50 rounded-3xl flex items-center justify-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Email đã được gửi!</h2>
              <p className="text-slate-500 leading-relaxed">
                Chúng tôi đã gửi link đặt lại mật khẩu đến <span className="font-bold text-slate-900">{email}</span>
              </p>
              <p className="text-sm text-slate-400">
                Vui lòng kiểm tra hộp thư và làm theo hướng dẫn.
              </p>
            </div>
            <Link href="/auth/login">
              <Button className="w-full h-12 rounded-2xl font-bold">
                <ArrowLeft className="size-4 mr-2" /> Quay lại đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-4">
      <Card className="w-full max-w-md rounded-[2rem] border-none shadow-xl">
        <CardHeader className="p-8 pb-4">
          <div className="size-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Mail className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-center">Quên mật khẩu?</CardTitle>
          <CardDescription className="text-center text-slate-500">
            Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="h-12 rounded-2xl bg-slate-50 border-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20">
              {loading ? "Đang gửi..." : "Gửi link đặt lại"}
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" type="button" className="w-full h-12 rounded-2xl font-bold text-slate-500">
                <ArrowLeft className="size-4 mr-2" /> Quay lại đăng nhập
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
