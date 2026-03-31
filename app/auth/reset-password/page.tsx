"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra");
        return;
      }

      alert("Đặt lại mật khẩu thành công!");
      router.push("/auth/login");
    } catch (err) {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-4">
      <Card className="w-full max-w-md rounded-[2rem] border-none shadow-xl">
        <CardHeader className="p-8 pb-4">
          <div className="size-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-center">Đặt mật khẩu mới</CardTitle>
          <CardDescription className="text-center text-slate-500">
            Nhập mật khẩu mới cho tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-slate-700">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-2xl bg-slate-50 border-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">Tối thiểu 6 ký tự</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
