# Implementation Plan: Table Ordering (Phase 2)

## Overview

Thay thế mock data bằng Supabase PostgreSQL, xây dựng customer ordering flow và admin realtime management. Các task được sắp xếp theo thứ tự dependency: setup → schema → types → API → UI.

## Tasks

- [x] 1. Cài đặt Supabase và khởi tạo client
  - [x] 1.1 Cài đặt dependencies Supabase
    - Chạy `bun add @supabase/supabase-js @supabase/ssr`
    - Chạy `bun add -D vitest @vitejs/plugin-react fast-check`
    - Thêm script `"test": "vitest --run"` vào `package.json`
    - _Requirements: 6.6_

  - [x] 1.2 Tạo Supabase browser client
    - Tạo `lib/supabase/client.ts` export `createClient()` dùng `createBrowserClient` từ `@supabase/ssr`
    - Đọc `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ env
    - _Requirements: 6.6_

  - [x] 1.3 Tạo Supabase server client
    - Tạo `lib/supabase/server.ts` export `createServerClient()` dùng `createServerClient` từ `@supabase/ssr` với Next.js cookies
    - _Requirements: 6.6_

  - [x] 1.4 Tạo file cấu hình Vitest
    - Tạo `vitest.config.ts` với `@vitejs/plugin-react`, path alias `@/` → `./`
    - _Requirements: (testing setup)_

- [ ] 2. Database migration và seed data
  - [x] 2.1 Tạo SQL migration script
    - Tạo `supabase/migrations/001_initial_schema.sql` với 4 bảng: `menu_items`, `tables`, `orders`, `order_items`
    - Thêm indexes: `orders_table_id_status_idx`, `order_items_order_id_idx`
    - _Requirements: 6.1_

  - [ ] 2.2 Thêm RLS policies vào migration
    - Bật RLS cho tất cả 4 bảng
    - Tạo policies `public read` và `anon write` cho từng bảng
    - _Requirements: 6.1_

  - [ ] 2.3 Tạo seed script
    - Tạo `supabase/seed.sql` với INSERT statements cho tất cả `mockMenuItems` và `mockTables` từ `lib/mock-data.ts`
    - Map camelCase fields sang snake_case columns (`qrCode` → `qr_code`)
    - _Requirements: 6.2_

- [ ] 3. Mở rộng TypeScript types
  - [ ] 3.1 Thêm Order, OrderItem, CartItem vào `lib/types.ts`
    - Thêm `OrderStatus = "pending" | "confirmed" | "completed"`
    - Thêm interface `Order` với fields: `id`, `tableId`, `status`, `createdAt`, `updatedAt`, `items?`
    - Thêm interface `OrderItem` với fields: `id`, `orderId`, `menuItemId`, `quantity`, `unitPrice`, `menuItem?`
    - Thêm interface `CartItem` với fields: `menuItem: MenuItem`, `quantity: number`
    - _Requirements: 6.1_

- [ ] 4. Cart logic thuần (pure functions)
  - [ ] 4.1 Tạo `lib/cart.ts` với pure cart functions
    - Export `addToCart(items: CartItem[], menuItem: MenuItem): CartItem[]` — tăng qty hoặc thêm mới, block nếu `available = false`
    - Export `removeFromCart(items: CartItem[], menuItemId: string): CartItem[]` — giảm qty, xóa nếu qty = 0
    - Export `cartTotals(items: CartItem[]): { totalItems: number; totalPrice: number }`
    - _Requirements: 2.1, 2.2, 2.4, 1.4_

  - [ ]* 4.2 Viết property tests cho cart logic (Properties 4, 5, 6)
    - **Property 4: Cart add increments quantity** — `addToCart` tăng qty đúng 1, các item khác không đổi
    - **Property 5: Cart totals are correct** — `cartTotals` bằng sum thực tế
    - **Property 6: Zero quantity removes item** — item bị xóa khi qty về 0
    - Tạo `__tests__/property/cart.property.test.ts`
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ]* 4.3 Viết unit tests cho cart logic
    - Test thêm item mới, thêm item đã có, xóa item cuối cùng, block unavailable item
    - Tạo `__tests__/unit/cart.test.ts`
    - _Requirements: 2.1, 2.4, 1.4_

- [ ] 5. Route Handlers — Menu Items API
  - [ ] 5.1 Tạo `app/api/menu-items/route.ts`
    - `GET`: fetch tất cả menu items từ Supabase, trả về JSON
    - `POST`: insert menu item mới, validate required fields
    - _Requirements: 6.3, 6.4_

  - [ ] 5.2 Tạo `app/api/menu-items/[id]/route.ts`
    - `PATCH`: update menu item (name, price, category, description, available)
    - `DELETE`: xóa menu item theo id
    - _Requirements: 6.3, 6.4_

- [ ] 6. Route Handlers — Orders API
  - [ ] 6.1 Tạo `app/api/orders/route.ts`
    - `POST`: nhận `{ tableId, items: CartItem[] }`, insert `orders` record (status: pending), batch insert `order_items`, update `tables.status = 'occupied'`
    - Trả về order id khi thành công, 400/500 khi lỗi
    - _Requirements: 3.1, 3.2_

  - [ ]* 6.2 Viết property tests cho order creation (Properties 8, 9, 11)
    - **Property 8: Order creation persists all cart items** — mock Supabase, verify insert calls
    - **Property 9: Order creation sets table to occupied**
    - **Property 11: Additional orders on occupied table succeed**
    - Tạo `__tests__/property/order.property.test.ts`
    - _Requirements: 3.1, 3.2, 3.6_

  - [ ] 6.3 Tạo `app/api/orders/[id]/route.ts`
    - `PATCH`: update order status (`confirmed` hoặc `completed`), validate transition hợp lệ
    - _Requirements: 4.4, 4.5_

  - [ ]* 6.4 Viết property test cho order status transitions (Property 13)
    - **Property 13: Order status transitions are valid** — pending→confirmed, confirmed→completed, không ảnh hưởng order khác
    - Tạo `__tests__/property/admin.property.test.ts`
    - _Requirements: 4.4, 4.5_

- [ ] 7. Route Handlers — Tables API
  - [ ] 7.1 Tạo `app/api/tables/[id]/route.ts`
    - `PATCH`: xử lý close table — update `tables.status = 'available'`, update tất cả orders pending/confirmed của bàn thành completed
    - _Requirements: 5.2, 5.3_

  - [ ]* 7.2 Viết property test cho close table (Properties 14, 15)
    - **Property 14: Close table clears all active orders**
    - **Property 15: Close table summary total is correct**
    - Thêm vào `__tests__/property/admin.property.test.ts`
    - _Requirements: 5.2, 5.3, 5.1_

- [ ] 8. Checkpoint — Đảm bảo tất cả tests pass
  - Chạy `bun test` để verify tất cả unit và property tests pass
  - Đảm bảo không có TypeScript errors trong `lib/` và `app/api/`
  - Hỏi user nếu có vấn đề cần giải quyết.

- [ ] 9. Customer Flow — `/table/[tableId]`
  - [ ] 9.1 Tạo `hooks/useCart.ts`
    - Client hook quản lý cart state dùng `useState` + `lib/cart.ts`
    - Export: `cartItems`, `addItem`, `removeItem`, `clearCart`, `totals`
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ]* 9.2 Viết property tests cho useCart hook (Properties 2, 7)
    - **Property 2: Unavailable items are blocked from cart**
    - **Property 7: Cart resets after successful order submission**
    - Thêm vào `__tests__/property/cart.property.test.ts`
    - _Requirements: 1.4, 2.5_

  - [ ] 9.3 Implement `app/table/[tableId]/page.tsx` (Server Component)
    - Fetch table info và menu items từ Supabase dùng server client
    - Nếu tableId không tồn tại → render 404 message
    - Pass `initialMenu` và `table` xuống `MenuClient`
    - _Requirements: 1.1, 1.2_

  - [ ] 9.4 Tạo `app/table/[tableId]/_components/MenuClient.tsx` (Client Component)
    - Nhận `initialMenu: MenuItem[]` và `table: Table` làm props
    - Render `CategoryTabs`, `MenuGrid`, `CartBar`
    - Quản lý `selectedCategory` state
    - _Requirements: 1.3, 1.6_

  - [ ] 9.5 Tạo `CategoryTabs` và `MenuGrid` components
    - `CategoryTabs`: tabs filter theo category, dùng `CATEGORY_LABELS` và `CATEGORY_ICONS`
    - `MenuGrid`: hiển thị danh sách `MenuItemCard` theo category đang chọn
    - `MenuItemCard`: tên, giá (format VND), description, nút "Thêm" (disabled nếu `available = false`)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 9.6 Viết property tests cho menu filtering (Properties 1, 3)
    - **Property 1: Menu grouping by category** — mỗi item chỉ xuất hiện đúng 1 group
    - **Property 3: Category filter correctness** — filter chỉ hiển thị đúng category
    - Tạo `__tests__/property/menu.property.test.ts`
    - _Requirements: 1.3, 1.6_

  - [ ] 9.7 Tạo `CartBar` và `CartDrawer` components
    - `CartBar`: sticky bottom bar, hiển thị tổng items + tổng tiền, nút mở drawer
    - `CartDrawer`: Sheet/Drawer hiển thị `CartItemRow` cho từng item, nút submit order
    - `CartItemRow`: tên, đơn giá, controls tăng/giảm qty, line total
    - Disable submit khi cart rỗng, hiển thị validation message
    - _Requirements: 2.2, 2.3, 2.4, 3.3_

  - [ ] 9.8 Implement order submission trong `CartDrawer`
    - Gọi `POST /api/orders` với `{ tableId, items: cartItems }`
    - On success: `clearCart()`, hiển thị toast confirmation
    - On error: giữ nguyên cart, hiển thị toast error
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ]* 9.9 Viết property test cho write failure (Property 10)
    - **Property 10: Write failure preserves cart** — mock fetch để throw error, verify cart không đổi
    - Thêm vào `__tests__/property/order.property.test.ts`
    - _Requirements: 3.4_

- [ ] 10. Admin Flow — Realtime Orders Hook
  - [ ] 10.1 Tạo `hooks/useOrders.ts`
    - Nhận `initialOrders: Order[]`, subscribe Supabase Realtime channel `orders-realtime`
    - INSERT event: fetch order kèm items rồi prepend vào state
    - UPDATE event: update status trong state
    - Cleanup: `supabase.removeChannel()` trong useEffect return
    - _Requirements: 4.2, 6.5_

  - [ ]* 10.2 Viết property test cho admin order list (Property 12)
    - **Property 12: Admin order list shows only active orders** — chỉ hiển thị pending/confirmed
    - Thêm vào `__tests__/property/admin.property.test.ts`
    - _Requirements: 4.1_

- [ ] 11. Admin Flow — Cập nhật `/admin/tables`
  - [ ] 11.1 Refactor `app/(admin)/admin/tables/page.tsx` thành Client Component
    - Fetch initial tables + active orders từ Supabase khi mount
    - Dùng `useOrders` hook cho Realtime subscription
    - Quản lý `selectedTableId` state để hiển thị `OrderPanel`
    - _Requirements: 4.1, 4.2_

  - [ ] 11.2 Tạo `TableCard` component với badge trạng thái
    - Hiển thị số bàn, số ghế, badge `available`/`occupied`
    - Highlight bàn có pending orders
    - _Requirements: 4.1, 4.3_

  - [ ] 11.3 Tạo `OrderPanel` component
    - Slide-in panel hiển thị orders của bàn đang chọn
    - Render `OrderCard` cho từng order (pending/confirmed)
    - Nút "Xác nhận" (pending → confirmed) gọi `PATCH /api/orders/[id]`
    - Nút "Hoàn thành" (confirmed → completed) gọi `PATCH /api/orders/[id]`
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ] 11.4 Tạo `CloseTableDialog` component
    - Dialog xác nhận đóng bàn, hiển thị tổng kết tất cả completed orders
    - Nếu còn pending/confirmed orders: hiển thị warning, yêu cầu xác nhận thêm
    - Confirm → gọi `PATCH /api/tables/[id]` với `{ action: 'close' }`
    - On success: cập nhật UI ngay lập tức
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 11.5 Cập nhật `AddTableModal` để persist lên Supabase
    - Thay mock data mutation bằng `POST /api/tables` (tạo route handler mới nếu chưa có)
    - Tạo `app/api/tables/route.ts` với `POST`: insert table mới vào Supabase
    - _Requirements: 6.1_

- [ ] 12. Admin Flow — Cập nhật `/admin/menu` để dùng Supabase
  - [ ] 12.1 Refactor `app/(admin)/admin/menu/page.tsx`
    - Fetch menu items từ `GET /api/menu-items` thay vì `mockMenuItems`
    - _Requirements: 6.3, 6.4_

  - [ ] 12.2 Cập nhật `MenuItemModal` để persist lên Supabase
    - Create: gọi `POST /api/menu-items`
    - Edit: gọi `PATCH /api/menu-items/[id]`
    - Delete: gọi `DELETE /api/menu-items/[id]`
    - Toggle availability: gọi `PATCH /api/menu-items/[id]` với `{ available: !current }`
    - _Requirements: 6.3, 6.4_

  - [ ]* 12.3 Viết property test cho MenuItem persistence (Property 16)
    - **Property 16: MenuItem persistence round-trip** — mock API, verify create/update/delete phản ánh đúng
    - Thêm vào `__tests__/property/menu.property.test.ts`
    - _Requirements: 6.3, 6.4_

- [ ] 13. Final Checkpoint — Đảm bảo tất cả tests pass
  - Chạy `bun test` để verify toàn bộ test suite
  - Kiểm tra không có TypeScript errors với `bun run build`
  - Hỏi user nếu có vấn đề cần giải quyết.

## Notes

- Tasks đánh dấu `*` là optional, có thể bỏ qua để ra MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để đảm bảo traceability
- Property tests dùng fast-check với `numRuns: 100` (default)
- Supabase migration cần chạy thủ công trên Supabase dashboard hoặc CLI
- Env vars cần thiết: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
