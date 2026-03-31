"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tenantName: "",
    tenantSlug: "",
  });

  async function handleCreateTenant(e: React.FormEvent) {
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

      router.push("/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tạo nhà hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTenant} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenantName">Tên nhà hàng</Label>
              <Input
                id="tenantName"
                value={form.tenantName}
                onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                placeholder="Nhà hàng của tôi"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenantSlug">Slug (URL)</Label>
              <Input
                id="tenantSlug"
                value={form.tenantSlug}
                onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
                placeholder="nha-hang-cua-toi"
                required
              />
              <p className="text-xs text-muted-foreground">
                Chỉ dùng chữ thường, số, và dấu gạch ngang
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Đang xử lý..." : "Tạo nhà hàng"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Muốn tạo nhà hàng khác?{" "}
              <a href="/auth/create-tenant" className="text-primary hover:underline">
                Tạo thêm
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
