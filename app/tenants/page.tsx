"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, [router]);

  async function fetchTenants() {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch tenants:", data);
        // Redirect to login if unauthorized
        if (res.status === 401) {
          router.push("/auth/login");
        }
        return;
      }

      setTenants(data);

      // Nếu chỉ có 1 tenant, tự động redirect
      if (data.length === 1) {
        localStorage.setItem("selectedTenantId", data[0].id);
        router.push(`/admin/${data[0].slug}/menu`);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  }

  function selectTenant(tenantId: string, tenantSlug: string) {
    // Redirect to admin with tenant slug
    window.location.href = `/admin/${tenantSlug}/menu`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Không có nhà hàng</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Bạn chưa tạo nhà hàng nào. Vui lòng tạo nhà hàng mới.
            </p>
            <Button asChild>
              <a href="/auth/create-tenant">Tạo nhà hàng mới</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Chọn nhà hàng</h1>
          <p className="text-muted-foreground mt-2">
            Bạn có {tenants.length} nhà hàng
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Slug: <code className="bg-muted px-2 py-1 rounded">{tenant.slug}</code>
                </p>
                <Button
                  onClick={() => selectTenant(tenant.id, tenant.slug)}
                  className="w-full"
                >
                  Chọn
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button asChild variant="outline">
            <a href="/auth/logout">Đăng xuất</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
