"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    tenantName: "",
    tenantSlug: "",
  });

  async function handleCreateTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/tenants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create tenant");
        return;
      }

      // Show success message
      setSuccess(true);
      
      // Redirect after 1.5 seconds
      setTimeout(() => {
        router.push("/tenants");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 size-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto p-4 py-12">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/tenants")}
          className="mb-8"
        >
          <ArrowLeft className="size-4 mr-2" />
          Quay lại
        </Button>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Illustration/Info */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="size-4" />
                Bắt đầu ngay
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                Tạo nhà hàng mới
              </h1>
              <p className="text-lg text-slate-600">
                Thiết lập nhà hàng của bạn chỉ trong vài bước đơn giản
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4 pt-4">
              {[
                "Quản lý menu và đơn hàng dễ dàng",
                "Theo dõi doanh thu theo thời gian thực",
                "Hỗ trợ đa chi nhánh",
                "Tích hợp thanh toán linh hoạt"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="size-4 text-primary" />
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Decorative image placeholder */}
            <div className="hidden md:block mt-8 p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-blue-500/10">
              <div className="flex items-center justify-center">
                <Store className="size-32 text-primary/20" />
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl">Thông tin nhà hàng</CardTitle>
              <CardDescription>
                Điền thông tin cơ bản để bắt đầu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTenant} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tenantName" className="text-base">
                    Tên nhà hàng
                  </Label>
                  <Input
                    id="tenantName"
                    value={form.tenantName}
                    onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                    placeholder="VD: Nhà hàng Hương Việt"
                    required
                    className="h-11"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="tenantSlug" className="text-base">
                    Đường dẫn (URL)
                  </Label>
                  <Input
                    id="tenantSlug"
                    value={form.tenantSlug}
                    onChange={(e) => setForm({ ...form, tenantSlug: e.target.value.toLowerCase() })}
                    placeholder="VD: huong-viet"
                    required
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary">💡</span>
                    Chỉ dùng chữ thường, số, và dấu gạch ngang. URL sẽ là: yoursite.com/
                    <span className="font-mono font-medium">{form.tenantSlug || "slug"}</span>
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 animate-in fade-in slide-in-from-top-2">
                    <p className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Tạo nhà hàng thành công! Đang chuyển hướng...
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading || success} 
                  className="w-full h-11 text-base mt-2"
                  size="lg"
                >
                  {success ? (
                    <>
                      <CheckCircle2 className="size-4 mr-2 animate-pulse" />
                      Thành công!
                    </>
                  ) : loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Store className="size-4 mr-2" />
                      Tạo nhà hàng
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
