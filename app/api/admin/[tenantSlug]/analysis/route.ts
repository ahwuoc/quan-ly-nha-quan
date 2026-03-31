import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay, subDays, format, isWithinInterval } from "date-fns";

async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const supabase = await createServerClient();
    const tenantId = await getTenantIdBySlug(tenantSlug);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 1. Lấy tất cả đơn hàng đã thanh toán (completed)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (name, price)
        )
      `)
      .eq("tenant_id", tenantId)
      .in("status", ["completed", "paid"])
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));
    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const fourteenDaysAgo = startOfDay(subDays(now, 14));
    const thirtyDaysAgo = startOfDay(subDays(now, 30));
    const sixtyDaysAgo = startOfDay(subDays(now, 60));

    // Khởi tạo các biến tích lũy
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let thisWeekRevenue = 0;
    let lastWeekRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    // 2. Tính toán doanh thu 7 ngày gần nhất cho biểu đồ
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "dd/MM"),
        revenue: 0
      };
    }).reverse();

    const dishStats: Record<string, { name: string; count: number; revenue: number }> = {};

    orders?.forEach((order) => {
      const createdAt = new Date(order.created_at);
      const isToday = createdAt >= today;
      const isYesterday = createdAt >= yesterday && createdAt < today;
      const isThisWeek = createdAt >= sevenDaysAgo;
      const isLastWeek = createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
      const isThisMonth = createdAt >= thirtyDaysAgo;
      const isLastMonth = createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;

      let orderTotal = 0;
      order.order_items?.forEach((item: any) => {
        const itemRevenue = item.quantity * (item.unit_price || item.menu_item?.price || 0);
        orderTotal += itemRevenue;

        // Thống kê món ăn (chỉ lấy trong 30 ngày qua cho nóng hổi)
        if (isThisMonth) {
          const dishId = item.menu_item_id;
          if (!dishStats[dishId]) {
            dishStats[dishId] = { name: item.menu_item?.name || "Món đã xóa", count: 0, revenue: 0 };
          }
          dishStats[dishId].count += item.quantity;
          dishStats[dishId].revenue += itemRevenue;
        }
      });

      // Tích lũy vào các mốc thời gian
      if (isToday) todayRevenue += orderTotal;
      if (isYesterday) yesterdayRevenue += orderTotal;
      if (isThisWeek) thisWeekRevenue += orderTotal;
      if (isLastWeek) lastWeekRevenue += orderTotal;
      if (isThisMonth) thisMonthRevenue += orderTotal;
      if (isLastMonth) lastMonthRevenue += orderTotal;

      // Cập nhật biểu đồ 7 ngày
      const orderDateStr = format(createdAt, "yyyy-MM-dd");
      const dayData = last7Days.find(d => d.date === orderDateStr);
      if (dayData) dayData.revenue += orderTotal;
    });

    const topDishes = Object.values(dishStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Tính % tăng trưởng (tránh lỗi chia cho 0)
    const calcGrowth = (current: number, target: number) => {
      if (target === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - target) / target) * 100);
    };

    return NextResponse.json({
      revenueData: last7Days,
      topDishes,
      metrics: {
        today: { value: todayRevenue, growth: calcGrowth(todayRevenue, yesterdayRevenue) },
        week: { value: thisWeekRevenue, growth: calcGrowth(thisWeekRevenue, lastWeekRevenue) },
        month: { value: thisMonthRevenue, growth: calcGrowth(thisMonthRevenue, lastMonthRevenue) }
      },
      summary: {
        totalRevenue: thisMonthRevenue,
        totalOrders: orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo).length || 0
      }
    });
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
