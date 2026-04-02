"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import { tablesApi, ordersApi, menuApi, type Table, type Order, type MenuItem } from "@/lib/api";

// Components
import { TableTitleHeader } from "./_components/TableTitleHeader";
import { TableConfigCard } from "./_components/TableConfigCard";
import { TableQRCodeCard } from "./_components/TableQRCodeCard";
import { SessionItemsCard } from "./_components/SessionItemsCard";
import { AddItemDialog } from "./_components/AddItemDialog";
import { CheckoutDialog } from "./_components/CheckoutDialog";
import { PrintTemplates } from "./_components/PrintTemplates";


export default function TableDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const tableId = params.tableId as string;

  useEffect(() => {
    if (tableId?.startsWith("temp-")) {
      router.replace(`/admin/${tenantSlug}/tables`);
    }
  }, [tableId, tenantSlug, router]);

  const [table, setTable] = useState<Table | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [printMode, setPrintMode] = useState<"bill" | "qr">("bill");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tableRes, ordersRes, menuRes] = await Promise.all([
        tablesApi.getTable(tenantSlug, tableId),
        ordersApi.getOrdersByTable(tenantSlug, tableId),
        menuApi.getMenuItems(tenantSlug),
      ]);

      setTable(tableRes.payload);
      setOrders(ordersRes.payload);
      setMenuItems(menuRes.payload || []);
    } catch (error) {
      console.error("Failed to fetch table details:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, tableId]);

  useEffect(() => {
    setMounted(true);
    fetchData();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`table-${tableId}-realtime`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tables", filter: `id=eq.${tableId}` },
        (payload: any) => {
          setTable((prev) => prev ? { ...prev, ...payload.new } : payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `table_id=eq.${tableId}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantSlug, tableId, fetchData]);

  async function handleUpdate(updates: Partial<Table>) {
    if (saving || !table) return;
    setSaving(true);
    try {
      await tablesApi.updateTable(tenantSlug, { id: table.id, ...updates });
      await fetchData();
    } catch (error) {
      alert("Lỗi khi cập nhật bàn");
    } finally {
      setSaving(false);
    }
  }

  const handlePrintQR = () => {
    setPrintMode("qr");
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintBill = () => {
    setPrintMode("bill");
    setTimeout(() => {
      window.print();
    }, 100);
  };

  async function handleFinalCheckout() {
    if (saving || !table) return;
    setSaving(true);
    try {
      await tablesApi.clearPaymentRequest(tenantSlug, table.id);
      await tablesApi.checkout(tenantSlug, { tableId: table.id });
      setIsCheckoutOpen(false);
      await fetchData();
    } catch (error) {
      alert("Lỗi khi hoàn tất thanh toán");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSessionItem(menuItem: MenuItem) {
    if (saving || !table) return;
    setSaving(true);
    try {
      await tablesApi.addSessionItems(tenantSlug, tableId, [
        { menu_item_id: menuItem.id, quantity: 1, unit_price: menuItem.price }
      ]);
      await fetchData();
    } catch (error) {
      alert("Lỗi khi thêm món");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateQuantity(menuItemId: string, newQty: number) {
    if (saving || !table) return;
    if (newQty < 1) {
      handleDeleteItem(menuItemId);
      return;
    }
    setSaving(true);
    try {
      await tablesApi.updateSessionItem(tenantSlug, tableId, menuItemId, newQty);
      await fetchData();
    } catch (error) {
      alert("Lỗi khi cập nhật số lượng");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(menuItemId: string) {
    if (saving || !table) return;
    if (!confirm("Xác nhận xóa món này?")) return;
    setSaving(true);
    try {
      await tablesApi.deleteSessionItem(tenantSlug, tableId, menuItemId);
      await fetchData();
    } catch (error) {
      alert("Lỗi khi xóa món");
    } finally {
      setSaving(false);
    }
  }

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.price.toString().includes(searchTerm)
    );
  }, [menuItems, searchTerm]);

  const groupedItems = useMemo(() => {
    if (!table) return [];
    const currentSessionOrders = orders.filter(o =>
      o.session_id === table.session_id &&
      ["pending", "preparing", "completed", "paid"].includes(o.status)
    );

    const items: Record<string, { id: string, name: string, quantity: number, price: number }> = {};
    currentSessionOrders.forEach(order => {
      order.order_items.forEach((it: any) => {
        const itId = it.menu_item_id;
        if (!items[itId]) {
          items[itId] = {
            id: itId,
            name: it.menu_item?.name || "Món đã ngưng",
            quantity: 0,
            price: it.unit_price || it.menu_item?.price || 0
          };
        }
        items[itId].quantity += it.quantity;
      });
    });
    return Object.values(items);
  }, [orders, table]);

  if (!mounted || (loading && !table)) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-[400px] bg-muted/20 rounded-[40px] animate-pulse" />
          <div className="h-[400px] bg-muted/20 rounded-[40px] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!table) return <div>Không tìm thấy bàn</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 bg-[#fafafa] min-h-screen pb-32">
      <TableTitleHeader
        table={table}
        tenantSlug={tenantSlug}
        loading={loading}
        onRefresh={fetchData}
        onCheckout={() => setIsCheckoutOpen(true)}
        saving={saving}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-4 space-y-8 md:space-y-12">
          <TableConfigCard table={table} onUpdate={handleUpdate} />
          <TableQRCodeCard table={table} tenantSlug={tenantSlug} onPrintQR={handlePrintQR} />
        </div>

        <div className="lg:col-span-8 space-y-8 md:space-y-12">
          <SessionItemsCard
            table={table}
            groupedItems={groupedItems}
            onUpdateQuantity={handleUpdateQuantity}
            onDeleteItem={handleDeleteItem}
            onOpenAddItems={() => setIsAddItemOpen(true)}
            saving={saving}
          />
        </div>
      </div>

      <AddItemDialog
        open={isAddItemOpen}
        onOpenChange={setIsAddItemOpen}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filteredMenuItems={filteredMenuItems}
        onAddItem={handleAddSessionItem}
        saving={saving}
      />

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        table={table}
        groupedItems={groupedItems}
        onDeleteItem={handleDeleteItem}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onPrintBill={handlePrintBill}
        onConfirm={handleFinalCheckout}
        saving={saving}
      />

      <PrintTemplates
        table={table}
        tenantSlug={tenantSlug}
        groupedItems={groupedItems}
        printMode={printMode}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
