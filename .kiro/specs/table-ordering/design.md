# Design Document: Table Ordering (Phase 2)

## Overview

Tính năng gọi món theo bàn cho phép khách hàng quét QR code tại bàn để xem thực đơn và đặt món trực tiếp. Admin theo dõi và xử lý order theo thời gian thực qua Supabase Realtime. Phase 2 thay thế toàn bộ mock data bằng Supabase PostgreSQL.

**Stack:**
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (radix-nova)
- Supabase (PostgreSQL + Realtime)

**Supabase package cần cài:**
```bash
bun add @supabase/supabase-js @supabase/ssr
```

---

## Architecture

### Rendering Strategy

```
/table/[tableId]          → Server Component (fetch table + menu từ Supabase)
  └── MenuClient          → Client Component (cart state, interactions)
      └── CartDrawer      → Client Component (cart UI)

/admin/tables             → Client Component (Realtime subscription)
  └── OrderPanel          → Client Component (per-table order management)
  └── CloseTableDialog    → Client Component (close table flow)

/admin/menu               → Client Component (CRUD → Supabase)
```

**Nguyên tắc phân chia:**
- Server Components: fetch dữ liệu ban đầu, SEO, không cần interactivity
- Client Components: state, event handlers, Supabase Realtime subscriptions

### Supabase Client Setup

```
lib/supabase/
  client.ts     → createBrowserClient() — dùng trong Client Components
  server.ts     → createServerClient() — dùng trong Server Components / Route Handlers
```

---

## Components and Interfaces

### Customer Flow (`/table/[tableId]`)

```
TablePage (Server Component)
  ├── TableHeader          — tên bàn, trạng thái
  ├── CategoryTabs         — filter theo category (Client)
  ├── MenuGrid             — danh sách món (Client)
  │   └── MenuItemCard     — card từng món, nút "Thêm"
  └── CartBar              — sticky bottom bar, tổng tiền + nút xem giỏ (Client)
      └── CartDrawer       — drawer/sheet hiển thị chi tiết giỏ hàng
          └── CartItemRow  — từng dòng trong giỏ (tên, giá, số lượng, tổng)
```

### Admin Flow (`/admin/tables`)

```
TablesPage (Client Component — Realtime)
  ├── TableGrid            — lưới bàn (available/occupied)
  │   └── TableCard        — card bàn, badge trạng thái
  ├── OrderPanel           — panel order của bàn đang chọn (slide-in)
  │   └── OrderCard        — card từng order (pending/confirmed)
  │       └── OrderItemRow — từng dòng món trong order
  └── CloseTableDialog     — dialog xác nhận đóng bàn + tổng kết
```

### Shared Hooks

```
hooks/
  useCart.ts              — cart state management (add, remove, update qty, clear)
  useOrders.ts            — Supabase Realtime subscription cho admin
  useSupabaseMutation.ts  — wrapper cho insert/update với error handling
```

---

## Data Models

### Supabase PostgreSQL Schema

```sql
-- Bảng menu_items (tương ứng MenuItem trong types.ts)
create table menu_items (
  id          text primary key,           -- e.g. "m1"
  name        text not null,
  price       integer not null,           -- VND, không dùng decimal
  category    text not null check (category in ('do-nhau','bia','nuoc-ngot','khac')),
  description text,
  available   boolean not null default true,
  created_at  timestamptz default now()
);

-- Bảng tables (tương ứng Table trong types.ts)
create table tables (
  id          text primary key,           -- e.g. "b5-abc123"
  number      integer not null unique,
  qr_code     text not null,
  seats       integer not null default 4,
  status      text not null default 'available' check (status in ('available','occupied')),
  created_at  timestamptz default now()
);

-- Bảng orders
create table orders (
  id          uuid primary key default gen_random_uuid(),
  table_id    text not null references tables(id),
  status      text not null default 'pending' check (status in ('pending','confirmed','completed')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Bảng order_items
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  menu_item_id text not null references menu_items(id),
  quantity     integer not null check (quantity > 0),
  unit_price   integer not null,          -- snapshot giá tại thời điểm order
  created_at   timestamptz default now()
);

-- Index cho query phổ biến
create index orders_table_id_status_idx on orders(table_id, status);
create index order_items_order_id_idx on order_items(order_id);
```

### Row Level Security (RLS)

```sql
-- Bật RLS cho tất cả bảng
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- menu_items: public read, anon write (Phase 2 chưa có auth)
create policy "public read menu_items" on menu_items for select using (true);
create policy "anon write menu_items" on menu_items for all using (true);

-- tables: public read, anon write
create policy "public read tables" on tables for select using (true);
create policy "anon write tables" on tables for all using (true);

-- orders: public read/write (customer tạo order, admin cập nhật)
create policy "public read orders" on orders for select using (true);
create policy "anon write orders" on orders for all using (true);

-- order_items: public read/write
create policy "public read order_items" on order_items for select using (true);
create policy "anon write order_items" on order_items for all using (true);
```

> Note: Phase 2 dùng anon key với RLS mở để đơn giản hóa. Phase 3 sẽ thêm auth cho admin.

### TypeScript Types (mở rộng lib/types.ts)

```typescript
export type OrderStatus = "pending" | "confirmed" | "completed";

export interface Order {
  id: string;           // uuid
  tableId: string;
  status: OrderStatus;
  createdAt: string;    // ISO timestamp
  updatedAt: string;
  items?: OrderItem[];  // joined khi cần
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItem?: MenuItem;  // joined khi cần
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}
```

---

## Data Flow

### Customer Ordering Flow

```
1. Customer quét QR → /table/[tableId]
2. TablePage (Server) fetch table + menu_items từ Supabase
3. Render MenuClient với initialData
4. Customer thêm món → useCart cập nhật state local
5. Customer submit → POST /api/orders
   a. Insert vào orders (status: pending)
   b. Insert vào order_items (batch)
   c. Update tables set status = 'occupied'
6. On success: clear cart, hiển thị confirmation
7. Customer có thể tiếp tục gọi thêm (tạo order mới)
```

### Admin Realtime Flow

```
1. Admin mở /admin/tables
2. TablesPage mount → fetch tables + active orders (pending/confirmed)
3. Subscribe Supabase Realtime channel 'orders'
   - INSERT event → thêm order mới vào state, highlight pending
   - UPDATE event → cập nhật status trong state
4. Admin click "Xác nhận" → PATCH /api/orders/[id] {status: confirmed}
5. Admin click "Hoàn thành" → PATCH /api/orders/[id] {status: completed}
6. Admin click "Đóng bàn" → 
   a. Hiển thị CloseTableDialog với tổng kết
   b. Confirm → PATCH /api/tables/[id] {status: available}
              → UPDATE orders set status=completed where table_id=? and status in (pending,confirmed)
```

---

## Route Structure

### Mới cần thêm

```
app/
  table/[tableId]/
    page.tsx                    ← Server Component (đã có, cần implement)
  api/
    orders/
      route.ts                  ← POST: tạo order + order_items
      [id]/
        route.ts                ← PATCH: cập nhật status
    tables/
      [id]/
        route.ts                ← PATCH: cập nhật status, close table
    menu-items/
      route.ts                  ← GET, POST
      [id]/
        route.ts                ← PATCH, DELETE
```

### Route Handlers vs Server Actions

Dùng **Route Handlers** (`/api/*`) thay vì Server Actions vì:
- Dễ test độc lập
- Tương thích với Supabase client pattern
- Admin page là Client Component cần fetch API

---

## Supabase Realtime Subscription Pattern

```typescript
// hooks/useOrders.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

export function useOrders(initialOrders: Order[]) {
  const [orders, setOrders] = useState(initialOrders);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch order với items vì payload không có joined data
            fetchOrderWithItems(payload.new.id).then((order) => {
              if (order) setOrders((prev) => [order, ...prev]);
            });
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? { ...o, ...payload.new } : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { orders, setOrders };
}
```

**Lưu ý quan trọng:**
- Supabase Realtime payload cho `postgres_changes` không bao gồm joined data
- Khi nhận INSERT event, cần fetch lại order kèm items
- Dùng `supabase.removeChannel()` trong cleanup để tránh memory leak
- Channel name phải unique per component instance

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Sau khi phân tích prework, các property sau được hợp nhất để tránh redundancy:
- 1.5 (render menu item fields) và 2.3 (render cart item fields) và 4.6 (render order fields) → đều là rendering completeness properties, giữ riêng vì context khác nhau
- 2.1 (add item) và 2.4 (remove at zero) → hai chiều của cart mutation, giữ riêng
- 4.4 (confirm order) và 4.5 (complete order) → hợp nhất thành một property về order status transitions
- 5.2 (table → available) và 5.3 (orders → completed) → hợp nhất thành close table property
- 6.3 và 6.4 → hợp nhất thành MenuItem persistence round-trip

---

### Property 1: Menu grouping by category

*For any* list of menu items fetched from the database, when grouped by category, every item in each group must have a `category` field equal to that group's key, and no item should appear in more than one group.

**Validates: Requirements 1.3**

---

### Property 2: Unavailable items are blocked from cart

*For any* menu item with `available = false`, attempting to add it to the cart should leave the cart state unchanged.

**Validates: Requirements 1.4**

---

### Property 3: Category filter correctness

*For any* selected category filter, all displayed menu items must have `category` equal to the selected filter value.

**Validates: Requirements 1.6**

---

### Property 4: Cart add increments quantity

*For any* cart state and any available menu item, adding that item should result in its quantity in the cart being exactly (previous quantity + 1), and all other items' quantities remaining unchanged.

**Validates: Requirements 2.1**

---

### Property 5: Cart totals are correct

*For any* cart state, the computed total item count equals the sum of all item quantities, and the computed total price equals the sum of (quantity × unitPrice) for all items.

**Validates: Requirements 2.2**

---

### Property 6: Zero quantity removes item from cart

*For any* cart item whose quantity is decremented to zero, that item must be absent from the resulting cart state.

**Validates: Requirements 2.4**

---

### Property 7: Cart resets after successful order submission

*For any* non-empty cart that is successfully submitted as an order, the cart state after submission must be empty.

**Validates: Requirements 2.5**

---

### Property 8: Order creation persists all cart items

*For any* valid cart submission, the resulting order in Supabase must have `status = 'pending'` and contain exactly one `order_item` record for each cart item with matching `menu_item_id`, `quantity`, and `unit_price`.

**Validates: Requirements 3.1**

---

### Property 9: Order creation sets table to occupied

*For any* table (regardless of initial status), successfully creating an order for that table must result in the table's `status` being `'occupied'` in Supabase.

**Validates: Requirements 3.2**

---

### Property 10: Write failure preserves cart

*For any* cart state, if the Supabase order creation fails (network error or DB error), the cart state must remain identical to its pre-submission state.

**Validates: Requirements 3.4**

---

### Property 11: Additional orders on occupied table succeed

*For any* table with `status = 'occupied'`, creating a new order must succeed and produce a new order record linked to that table.

**Validates: Requirements 3.6**

---

### Property 12: Admin order list shows only active orders

*For any* set of orders in the database, the admin table page must display only orders with `status = 'pending'` or `status = 'confirmed'`, and must not display orders with `status = 'completed'`.

**Validates: Requirements 4.1**

---

### Property 13: Order status transitions are valid

*For any* order, confirming a `pending` order must result in `status = 'confirmed'`, and completing a `confirmed` order must result in `status = 'completed'`. Neither transition should affect other orders.

**Validates: Requirements 4.4, 4.5**

---

### Property 14: Close table clears all active orders

*For any* occupied table, when the admin closes it, the table's `status` must become `'available'` and all orders for that table with `status` in `('pending', 'confirmed')` must be updated to `'completed'`.

**Validates: Requirements 5.2, 5.3**

---

### Property 15: Close table summary total is correct

*For any* occupied table, the grand total displayed in the close-table summary must equal the sum of (quantity × unit_price) across all order_items belonging to completed orders for that table.

**Validates: Requirements 5.1**

---

### Property 16: MenuItem persistence round-trip

*For any* MenuItem mutation (create, update availability, delete) performed through the admin UI, a subsequent fetch of that item from Supabase must reflect the mutation exactly.

**Validates: Requirements 6.3, 6.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| tableId không tồn tại | Server Component trả về 404 page với thông báo rõ ràng |
| Supabase write thất bại (order) | Giữ nguyên cart, hiển thị toast error, cho phép retry |
| Supabase read thất bại (menu) | Hiển thị error state với nút reload |
| Realtime disconnect | Supabase client tự reconnect; hiển thị indicator "đang kết nối lại" |
| Đóng bàn khi còn pending/confirmed orders | Hiển thị warning dialog, yêu cầu xác nhận thêm |
| Cart submit khi cart rỗng | Disable nút submit, hiển thị validation message |
| MenuItem không còn available khi submit | Validate lại trước khi insert, báo lỗi từng item |

---

## Testing Strategy

### Dual Testing Approach

Dùng **Vitest** cho unit tests và **fast-check** cho property-based tests.

```bash
bun add -D vitest @vitejs/plugin-react fast-check
```

**Unit tests** tập trung vào:
- Specific examples cho cart operations (add first item, add duplicate, remove last item)
- Integration points: API route handlers với Supabase mock
- Edge cases: empty cart submit, invalid tableId, Supabase error responses
- Snapshot tests cho component rendering

**Property-based tests** tập trung vào:
- Universal properties từ phần Correctness Properties ở trên
- Mỗi property test chạy tối thiểu 100 iterations (fast-check default)
- Generators tạo random MenuItems, CartStates, Orders

### Property Test Configuration

Mỗi property test phải có comment tag theo format:
```
// Feature: table-ordering, Property {N}: {property_text}
```

Ví dụ:

```typescript
import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { addToCart, cartTotals } from "@/lib/cart";

// Feature: table-ordering, Property 4: Cart add increments quantity
it("adding an item increments its quantity by 1", () => {
  fc.assert(
    fc.property(
      fc.array(arbCartItem()),
      arbAvailableMenuItem(),
      (cartItems, menuItem) => {
        const before = cartItems.find(i => i.menuItem.id === menuItem.id)?.quantity ?? 0;
        const after = addToCart(cartItems, menuItem);
        const afterQty = after.find(i => i.menuItem.id === menuItem.id)?.quantity ?? 0;
        return afterQty === before + 1;
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: table-ordering, Property 5: Cart totals are correct
it("cart totals match sum of quantities and prices", () => {
  fc.assert(
    fc.property(fc.array(arbCartItem(), { minLength: 1 }), (cartItems) => {
      const { totalItems, totalPrice } = cartTotals(cartItems);
      const expectedItems = cartItems.reduce((s, i) => s + i.quantity, 0);
      const expectedPrice = cartItems.reduce((s, i) => s + i.quantity * i.menuItem.price, 0);
      return totalItems === expectedItems && totalPrice === expectedPrice;
    }),
    { numRuns: 100 }
  );
});
```

### Test File Structure

```
__tests__/
  unit/
    cart.test.ts          — cart state logic
    order-api.test.ts     — Route Handler logic với Supabase mock
    menu-filter.test.ts   — grouping và filtering logic
  property/
    cart.property.test.ts — Properties 4, 5, 6, 7
    order.property.test.ts — Properties 8, 9, 10, 11
    admin.property.test.ts — Properties 12, 13, 14, 15
    menu.property.test.ts  — Properties 1, 2, 3, 16
```
