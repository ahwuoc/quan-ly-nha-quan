"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Grid3x3, Tag, ShoppingCart, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const navItems = [
    { href: `/admin/${tenantSlug}`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/admin/${tenantSlug}/orders`, label: "Điều phối đơn", icon: ShoppingCart },
    { href: `/admin/${tenantSlug}/menu`, label: "Thực đơn", icon: UtensilsCrossed },
    { href: `/admin/${tenantSlug}/categories`, label: "Danh mục", icon: Tag },
    { href: `/admin/${tenantSlug}/tables`, label: "Sơ đồ bàn", icon: Grid3x3 },
    { href: `/admin/${tenantSlug}/settings`, label: "Cài đặt bảo mật", icon: Shield },
  ];

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-card border-r border-border h-screen sticky top-0">
      <div className="px-4 py-4 flex items-center gap-2.5">
        <span className="text-xl">🍺</span>
        <div>
          <p className="font-semibold text-sm leading-tight">Quản Lý Quán</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 p-2 flex flex-col gap-0.5 mt-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <p className="px-4 py-3 text-xs text-muted-foreground">v1.0 · Giai đoạn 1</p>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
    </div>
  );
}
