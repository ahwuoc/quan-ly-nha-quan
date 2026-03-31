# Requirements Document

## Introduction

Tính năng gọi món theo bàn (Phase 2) cho phép khách hàng quét mã QR tại bàn để xem thực đơn, thêm món vào giỏ hàng và gửi order. Admin có thể xem, xác nhận, cập nhật trạng thái và đóng bàn/thanh toán ngay trong trang quản lý bàn. Hệ thống sử dụng Supabase làm database thực, thay thế mock data từ Phase 1.

## Glossary

- **Customer**: Khách hàng ngồi tại bàn, truy cập qua QR code
- **Admin**: Nhân viên/chủ quán quản lý hệ thống qua trang `/admin`
- **Table**: Bàn trong quán, có id dạng `b{num}-{rand}`, trạng thái `available` hoặc `occupied`
- **MenuItem**: Món trong thực đơn với các trường: id, name, price, category, description, available
- **Order**: Một lần gọi món của khách tại một bàn, có trạng thái `pending` → `confirmed` → `completed`
- **OrderItem**: Một dòng trong order, gồm menuItemId, quantity, unitPrice
- **Cart**: Giỏ hàng tạm thời phía client, chưa được gửi lên server
- **Session**: Phiên ngồi của khách tại bàn, từ lúc bàn được mở đến khi thanh toán/đóng bàn
- **Supabase**: Dịch vụ backend (PostgreSQL + Realtime) dùng làm database thực cho Phase 2

---

## Requirements

### Requirement 1: Xem thực đơn theo bàn

**User Story:** As a customer, I want to view the menu after scanning the QR code, so that I can choose what to order.

#### Acceptance Criteria

1. WHEN a customer navigates to `/table/[tableId]`, THE System SHALL fetch and display the table information from Supabase.
2. IF the `tableId` does not exist in the database, THEN THE System SHALL display an error message indicating the table was not found.
3. THE Menu SHALL display all available `MenuItem` records grouped by category (`do-nhau`, `bia`, `nuoc-ngot`, `khac`).
4. WHILE a `MenuItem` has `available = false`, THE Menu SHALL display that item as unavailable and prevent it from being added to the cart.
5. THE Menu SHALL display each item's name, price (formatted as Vietnamese đồng), category icon, and description when present.
6. THE Menu SHALL provide category filter tabs so the customer can filter items by category.

---

### Requirement 2: Giỏ hàng phía khách

**User Story:** As a customer, I want to manage a cart before submitting my order, so that I can review and adjust quantities.

#### Acceptance Criteria

1. WHEN a customer taps "Thêm" on an available menu item, THE Cart SHALL add one unit of that item or increment its quantity if already present.
2. THE Cart SHALL display the total number of items and total price at all times when the cart is non-empty.
3. WHEN a customer views the cart, THE Cart SHALL list each item with its name, unit price, quantity, and line total.
4. WHEN a customer changes the quantity of a cart item to zero, THE Cart SHALL remove that item from the cart.
5. THE Cart SHALL persist in component state only (client-side); THE Cart SHALL reset after a successful order submission.

---

### Requirement 3: Gửi order

**User Story:** As a customer, I want to submit my cart as an order, so that the kitchen/staff can prepare my items.

#### Acceptance Criteria

1. WHEN a customer submits the cart, THE System SHALL create an `Order` record in Supabase with status `pending`, linked to the `tableId` and containing all `OrderItem` records.
2. WHEN an order is successfully created, THE System SHALL update the corresponding `Table` status to `occupied` in Supabase.
3. IF the cart is empty, THEN THE System SHALL prevent submission and display a validation message.
4. IF the Supabase write fails, THEN THE System SHALL display an error message and retain the cart contents so the customer can retry.
5. WHEN an order is successfully submitted, THE System SHALL display a confirmation message to the customer.
6. WHILE a table is `occupied`, THE Customer SHALL be able to place additional orders (gọi thêm) that create new `Order` records linked to the same table.

---

### Requirement 4: Admin xem và xác nhận order

**User Story:** As an admin, I want to see incoming orders per table, so that I can confirm and track preparation.

#### Acceptance Criteria

1. THE Admin_Table_Page SHALL display a list of all `Order` records with status `pending` or `confirmed`, grouped by table.
2. WHEN an admin views the table management page, THE System SHALL fetch orders from Supabase in real-time using Supabase Realtime subscriptions.
3. WHEN a new order arrives with status `pending`, THE Admin_Table_Page SHALL visually highlight it to draw attention.
4. WHEN an admin clicks "Xác nhận" on a `pending` order, THE System SHALL update that order's status to `confirmed` in Supabase.
5. WHEN an admin clicks "Hoàn thành" on a `confirmed` order, THE System SHALL update that order's status to `completed` in Supabase.
6. THE Admin_Table_Page SHALL display each order's items, quantities, and total price.

---

### Requirement 5: Đóng bàn và thanh toán

**User Story:** As an admin, I want to close a table after payment, so that the table becomes available for new customers.

#### Acceptance Criteria

1. WHEN an admin clicks "Đóng bàn / Thanh toán" for an `occupied` table, THE System SHALL display a summary of all `completed` orders for that table with the grand total.
2. WHEN an admin confirms closing the table, THE System SHALL update the `Table` status to `available` in Supabase.
3. WHEN a table is closed, THE System SHALL mark all remaining `Order` records for that table as `completed` in Supabase.
4. IF there are still `pending` or `confirmed` orders for the table, THEN THE System SHALL warn the admin before allowing the table to be closed.
5. WHEN a table is successfully closed, THE Admin_Table_Page SHALL reflect the updated `available` status immediately.

---

### Requirement 6: Đồng bộ dữ liệu với Supabase

**User Story:** As a developer, I want all data to be persisted in Supabase, so that the system works correctly across multiple devices and sessions.

#### Acceptance Criteria

1. THE System SHALL store `MenuItem`, `Table`, `Order`, and `OrderItem` data in Supabase PostgreSQL tables with appropriate schema.
2. THE System SHALL seed initial `MenuItem` and `Table` data from the existing mock data into Supabase during setup.
3. WHEN the admin updates a `MenuItem`'s availability, THE System SHALL persist the change to Supabase.
4. WHEN the admin adds, edits, or deletes a `MenuItem`, THE System SHALL persist the change to Supabase.
5. THE Admin_Table_Page SHALL use Supabase Realtime to receive live updates for new orders without requiring a page refresh.
6. THE System SHALL use environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for Supabase connection configuration.
