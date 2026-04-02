"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Store, Package, ChevronLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/superadmin",        label: "Tổng quan",     icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Nhà hàng",     icon: Store },
  { href: "/superadmin/plans",   label: "Gói dịch vụ",  icon: Package },
];

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-white/10 h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="size-8 bg-primary rounded-xl flex items-center justify-center">
          <Shield className="size-4 text-white" />
        </div>
        <div>
          <p className="font-black text-sm text-white leading-tight">Super Admin</p>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Platform</p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex-1 p-3 flex flex-col gap-1 mt-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
              active ? "bg-primary text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
            )}>
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link href="/tenants" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white/30 hover:text-white hover:bg-white/5 transition-colors">
          <ChevronLeft className="size-4 shrink-0" /> Về trang chủ
        </Link>
      </div>
    </aside>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/check")
      .then(r => r.json())
      .then(d => {
        if (!d.isSuperAdmin) router.replace("/tenants");
        else setChecking(false);
      });
  }, [router]);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="size-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
