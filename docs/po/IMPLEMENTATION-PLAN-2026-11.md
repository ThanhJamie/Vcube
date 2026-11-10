<!-- doc-meta: status=active; verified=2026-11-09; owner=lead -->
# Kế hoạch triển khai theo vai trò — VCUBE (11/2026)

> Nguồn phân tích: `docs/po/ROLE-FEATURE-PLAN.md` (đã đối chiếu lại code + DB ngày 2026-11-09).
> Tài liệu này là **plan thực thi**: vai trò → hạng mục → phase → task spec → self-review → gate.
> Nguyên tắc: chỉ làm việc có người dùng thật, dữ liệu thật, đo được; không bịa số/ảnh/trạng thái.

## 0. Snapshot đo được (2026-11-09)

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| PO score | **90,3/100** — chưa đạt vì 1 P0 | `npm run po:audit` |
| P0 còn lại | **18 dòng `[MẪU]`** trong `materials` (7), `printer_fleet` (6), `accessories` (5) | `.loop/po.json` |
| P1 còn lại | `reviewPhotos` — chưa có upload/duyệt ảnh review | `.loop/po.json` |
| Gate | **23/23 OK** · 140 unit test · tsc PASS | `npm run check` |
| Task Machine | `blocked-on-human`: data cleanup + review-photos | `node scripts/machine-next.mjs --pretty` |

**Kết luận snapshot:** phần lớn nền tảng đã có; nút thắt còn lại là **dữ liệu thật**, **vòng tiền/hậu mãi**,
và **vài UI đang là placeholder** (warranty, payout info, audit log). Plan dưới đây đóng các nút đó theo
thứ tự rủi ro thấp → cao.

### 0.1 Wave 1 — kết quả thực thi (2026-11-10)

| Task | Trạng thái | Bằng chứng |
|---|---|---|
| A1 — Bảo hành customer + lab | **DONE** | Khách gửi claim → `warranty_claims` có hàng; lab thấy claim đúng đơn được giao, đổi `approved` → reload còn; 390/1440 0 tràn, 0 `pageerror`. |
| A2 — Designer khai thông tin nhận tiền | **DONE** | Lưu `designer_payout_info` qua RPC; reload thấy ngân hàng + STK mask `•••• 6789`; 0 lỗi. Migration #10 đã áp (được PO duyệt). |
| A3 — Admin audit log | **DONE** | `/admin/audit-log` hiển thị `setting_audit`, filter store/key, modal JSON; 390/1440 0 tràn. |
| Gate | **23/23 OK** | `npm run check`; 140 unit test; tsc PASS; import-boundaries PASS (không nới baseline). |
| Dữ liệu QA | **Đã xoá** | 0 profile/claim/order/audit/payout QA còn lại; auth users đã xoá. |

**Bug UI phát hiện & sửa trong Wave 1:** `Modal` mount có điều kiện (`{open && <Modal open …>}`)
dưới `StrictMode` chạy mount→cleanup→mount; `dialog.close()` trong cleanup gọi `onClose` và đóng modal
vừa mở. Đã sửa `MyOrdersView` + `WarrantyTab` sang **luôn mount, chỉ đổi prop `open`** (pattern đã ghi
ở `ChatSupportModal`). Khi thêm modal mới: **không** mount có điều kiện.

---

## 1. Inventory theo vai trò (đã xác minh trong code/DB)

### 1.1 Khách hàng (`customer`)

**Jobs-to-be-done:** tìm đúng bản vẽ → biết giá/thời gian → mua/đặt in → nhận file hoặc hàng → theo dõi →
khiếu nại/đánh giá → mua lại.

| Năng lực | Trạng thái | Bằng chứng | Thiếu / cần làm |
|---|---|---|---|
| Khám phá & tìm kiếm | ✅ | Home/Explore, filter URL, PDP 3D | Dữ liệu thật (P0); search server-side khi catalog lớn |
| Báo giá 3D | ✅ | `/quote`, upload/parse, quote vault | Chia sẻ link/email báo giá |
| Giỏ & checkout | ✅ | `/cart`, `/checkout` | Gateway thật (hiện chuyển khoản thủ công) |
| Nhận file số | ✅ | `/assets`, RPC delivery | Guest claim đã có UI; watermark/download limit là chính sách |
| Đơn & theo dõi | ✅ | `/orders`, `/tracking`, realtime | Huỷ đơn, đổi địa chỉ trước khi in, ETA chính xác |
| Hoá đơn | ⚠️ | in từ dữ liệu RAM | **Chưa có `invoice_number`/bảng invoice**; reload mất |
| Bảo hành | ❌ | form UI-only trong `MyOrdersView` | **Chưa ghi DB**; bảng `warranty_claims` có sẵn + RLS |
| Đánh giá | ✅ text / ⚠️ ảnh | `reviews` + PDP | **Chưa upload/hiển thị ảnh**; storage policy đang admin-only |
| Tài khoản | ✅ | `/account` profile/password | Sổ địa chỉ nhiều địa chỉ; xoá tài khoản |
| Hỗ trợ | ❌ | chat auto-reply | Ticket thật gắn đơn |
| Thông báo | ✅ in-app realtime | `useOrdersData` + NotificationBell | Email transactional (opt-in) |
| Mua lại | ⚠️ | nút reorder UI | Chưa có luồng server-side đầy đủ |

### 1.2 Nhà thiết kế (`designer`)

**Jobs:** đăng bán bản vẽ → được duyệt → bán → xem doanh thu → nhận tiền → trả lời yêu cầu CAD.

| Năng lực | Trạng thái | Bằng chứng | Thiếu / cần làm |
|---|---|---|---|
| Upload & cấu hình | ✅ | wizard, `digital_assets`, draft | Validate file/giấy phép, preview trước khi gửi duyệt |
| Quản lý ấn phẩm | ✅ | `DesignerModelsManagerTab` | Lý do từ chối, nhân bản sản phẩm |
| Yêu cầu CAD | ✅ | claim/quote request | Chat thật, deadline/SLA |
| Doanh thu | ⚠️ | overview hạn chế | Báo cáo tháng, top sản phẩm |
| Thông tin nhận tiền | ⚠️ | bảng `designer_payout_info` + RPC đã có | **UI đang EmptyState**, chưa nối form |
| Sổ quyết toán | ❌ | tab dùng fixture rỗng | **Designer không đọc được `order_items`** (RLS chỉ chủ đơn/admin) ⇒ cần RPC/view |
| Giấy phép & royalty | ❌ | — | Ma trận license, royalty ledger |
| Storefront | ❌ | — | Trang designer công khai |
| Thông báo | ⚠️ | chung | Thông báo đơn bán/duyệt/tiền về |

### 1.3 Xưởng in (`lab` / `workshop`)

**Jobs:** nhận việc → xác nhận → in → cập nhật tiến độ/QC → giao → đối soát công nợ.

| Năng lực | Trạng thái | Bằng chứng | Thiếu / cần làm |
|---|---|---|---|
| Hàng đợi | ✅ đọc đơn được giao + cập nhật stage | `workshop/queue.ts`, `QueueTab` | Nhận/từ chối chính thức, deadline/SLA, ưu tiên |
| Máy in | ✅ CRUD + trạng thái | `MachinesTab` | Lịch máy, bảo trì, capacity |
| Vật liệu & kho | ✅ CRUD + log | `MaterialsTab`, `AuditTrailTab` | Tự trừ kho khi completed; cảnh báo tồn |
| Tiến độ & QC | ⚠️ | stage/progress | Checklist QC + ảnh, ghi chú lỗi, reprint |
| Bảo hành | ❌ | bảng `warranty_claims` có sẵn | **Chưa có tab xưởng nhận/xử lý** |
| Công nợ/commission | ⚠️ | snapshot trong `order_items` | Bảng settlement theo kỳ, trạng thái trả tiền |
| Thông báo | ⚠️ | realtime đơn | Cảnh báo SLA trễ, việc mới |
| Báo cáo | ❌ | — | Sản lượng, tỷ lệ lỗi, thu nhập |

### 1.4 Admin

**Jobs:** điều hành catalog/đơn/xưởng/designer/khách, giá, nội dung, an toàn, đối soát.

| Năng lực | Trạng thái | Bằng chứng | Thiếu / cần làm |
|---|---|---|---|
| Đơn & điều phối | ✅ kanban, phân bổ xưởng | `Group5ProductionPanel` | Refund, huỷ đơn, ghi chú nội bộ, SLA |
| Sản phẩm | ✅ duyệt/publish/CRUD | `AdminProductsPanel` | Moderation queue, lý do từ chối, bulk |
| Giá & catalog | ✅ đủ trường | `PricingConfigPanel`, `AccessoriesManager` | Nhập hàng loạt qua UI, version giá |
| Xưởng & designer | ✅ hồ sơ/KYC | `Group1/Group2` | Duyệt payout, settlement, đánh giá đối tác |
| Khách hàng | ✅ danh sách/KYC | `Group3CustomersPanel` | Ticket, refund, xoá dữ liệu |
| Nội dung/SEO | ✅ | `AdminStorefrontPanel`, `AdminSeoPanel` | Lịch publish, A/B |
| An toàn | ✅ RLS/gate | 23 gate | **Audit log UI** (hiện chỉ có bảng `setting_audit`, chưa có viewer); feature flags |
| Báo cáo | ⚠️ overview cơ bản | `Group0OverviewPanel` | Doanh thu theo kênh/vai trò, cohort, tỷ lệ lỗi |
| Hỗ trợ | ❌ | — | Inbox ticket |

### 1.5 Nền tảng dùng chung (chặn mọi role)

| Nền tảng | Trạng thái | Việc cần |
|---|---|---|
| Thanh toán | thủ công | Adapter gateway + webhook + idempotency (RPC atomic đã có) |
| Sổ tiền | `payment_transactions` + snapshot trong `orders`/`order_items` | Đối soát, refund, payout ledger |
| Thông báo | realtime in-app | Email transactional + tuỳ chọn |
| Audit | `setting_audit` (chỉ cấu hình) | Viewer + audit cho đơn/sản phẩm/thanh toán |
| Tệp | Storage + signed URL | Policy ảnh review, watermark/download limit |
| Tìm kiếm | client-side | Server search khi catalog lớn |
| Quan sát | `console.*` | Structured log + correlation id |
| Kiểm thử | 140 unit | E2E 3 luồng tiền + CI |

---

## 2. Backlog hợp nhất (ưu tiên × rủi ro)

| # | Hạng mục | Role | Giá trị | Effort | Phụ thuộc | Làm ở |
|---:|---|---|---|---|---|---|
| 1 | Dữ liệu catalog thật (18 dòng `[MẪU]`) | tất cả | ★★★★★ | S | **Người dùng cung cấp số thật** | Phase 0 — blocked |
| 2 | Bảo hành: khách ghi DB + xưởng xử lý | customer/lab | ★★★★★ | M | Không (bảng/RLS có sẵn) | **Phase A — Wave 1** |
| 3 | Designer khai thông tin nhận tiền | designer | ★★★★ | S | Không (RPC có sẵn) | **Phase A — Wave 1** |
| 4 | Admin audit log viewer | admin | ★★★★ | S–M | Không (`setting_audit` + RLS có sẵn) | **Phase A — Wave 1** |
| 5 | Hoá đơn bền (`invoice_number` + bảng/PDF) | customer/admin | ★★★★ | M | Migration + PO duyệt | Phase B — gate D1 |
| 6 | Designer earnings ledger (RPC/view) | designer | ★★★★★ | M | Migration security-definer + PO duyệt | Phase B — gate D2 |
| 7 | Ảnh review (storage policy + upload/duyệt) | customer/admin | ★★★★ | M | Storage policy + PO duyệt | Phase B — gate D3 |
| 8 | Xưởng: accept/decline + SLA/deadline | lab | ★★★★ | M | Cột mới + RPC + PO duyệt | Phase B — gate D4 |
| 9 | QC checklist + ảnh + reprint | lab | ★★★★ | M | Bảng/cột + storage | Phase B — gate D5 |
| 10 | Huỷ đơn / đổi địa chỉ trước khi in | customer/admin | ★★★★ | M | RPC + policy + PO duyệt | Phase B — gate D6 |
| 11 | Settlement kỳ cho xưởng/designer | lab/designer/admin | ★★★★ | L | Bảng settlement + RPC | Phase B — gate D7 |
| 12 | Feature flags + audit mở rộng | admin | ★★★ | M | Bảng flags + trigger audit | Phase B — gate D8 |
| 13 | Refund / payment gateway | customer/admin | ★★★★★ | L | **Quyết định sản phẩm + đối tác + secret** | Phase C — blocked |
| 14 | Email transactional | tất cả | ★★★ | M | **Nhà cung cấp email + secret** | Phase C — blocked |
| 15 | Ticket hỗ trợ gắn đơn | customer/admin | ★★★ | M | Bảng ticket + UI | Phase C — gate D9 |
| 16 | Sổ địa chỉ nhiều địa chỉ | customer | ★★★ | S–M | Bảng địa chỉ + RPC | Phase C — gate D10 |
| 17 | Designer storefront + license matrix + royalty | designer | ★★★ | L | Nhiều bảng/policy | Phase C |
| 18 | Báo cáo doanh thu/cohort/export CSV | admin | ★★★ | M | View/RPC aggregate | Phase C |
| 19 | Search server-side + gợi ý | customer | ★★ | M | Index/tsvector | Phase C |
| 20 | PWA offline | customer | ★★ | M | Service worker + cache policy | Phase C |

---

## 3. Phase & acceptance

### Phase 0 — Dữ liệu thật (blocked on human, P0)
- Nhập giá trị thật cho 18 dòng `[MẪU]` qua `scripts/catalog/*.json` + `npm run catalog:import` (dry-run → `--apply`).
- Không tạo dữ liệu mẫu mới, không bịa ảnh/spec/giá.
- **Acceptance:** `npm run po:audit` hết P0 `dataHonesty`; PO ≥ 91; catalog hiển thị dữ liệu thật.

### Phase A — Đóng vòng hậu mãi & minh bạch (Wave 1, làm ngay)
- A1: Bảo hành khách ghi DB + xưởng xử lý.
- A2: Designer khai thông tin nhận tiền.
- A3: Admin xem audit log cấu hình.
- **Acceptance:** 3 luồng chạy thật trên DB; reload còn dữ liệu; 0 `pageerror`; 390/1440 không tràn; 23/23 gate; tsc PASS.

### Phase B — Vòng tiền & vận hành (cần PO duyệt migration)
- B1 (D1): invoice bền.
- B2 (D2): designer earnings ledger.
- B3 (D3): ảnh review.
- B4 (D4): xưởng accept/decline + SLA.
- B5 (D5): QC checklist + ảnh.
- B6 (D6): huỷ đơn/đổi địa chỉ.
- B7 (D7): settlement kỳ.
- B8 (D8): feature flags + audit mở rộng.
- **Acceptance mỗi mục:** SQL apply-ready + rollback; service + UI; RLS test; gate xanh.

### Phase C — Mở rộng (cần quyết định sản phẩm/đối tác)
- C1: payment gateway/webhook/refund.
- C2: email transactional.
- C3: ticket hỗ trợ.
- C4: sổ địa chỉ.
- C5: storefront/license/royalty.
- C6: báo cáo/export.
- C7: search server-side, PWA offline.

---

## 4. Task spec — Wave 1 (giao agent ngay)

### Task A1 — Bảo hành end-to-end (customer + lab)

**Mục tiêu:** khách gửi yêu cầu bảo hành → ghi thật vào `warranty_claims`; xưởng thấy claim thuộc đơn
được giao cho mình và cập nhật trạng thái/xử lý. Không bịa mã hồ sơ, không hứa SLA.

**Files:**
- Create: `src/backend/services/warrantyService.ts`
- Modify: `src/frontend/views/MyOrdersView.tsx`
- Create: `src/frontend/components/workshop/settings/WarrantyTab.tsx`
- Modify: `src/frontend/components/workshop/settings/tabs.ts`
- Modify: `src/frontend/components/shell/navConfig.ts`
- Modify: `src/frontend/views/WorkshopSettingsView.tsx`

**Interfaces (dùng đúng tên này):**
```ts
export type WarrantyClaimStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'resolved';

export interface WarrantyClaim {
  id: string;
  orderId: string;
  orderNumber: string | null;
  userId: string | null;
  reason: string;
  description: string;
  photoPaths: string[];
  status: WarrantyClaimStatus;
  resolution: string;
  handledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarrantyClaimInput {
  orderId: string;
  issueType: 'tolerance' | 'surface' | 'material' | 'strength';
  measuredDeviation: string;
  notes: string;
}

export function createWarrantyClaim(input: CreateWarrantyClaimInput): Promise<WriteResult<WarrantyClaim>>;
export function listMyWarrantyClaims(): Promise<WarrantyClaim[]>;
export function listWorkshopWarrantyClaims(partnerId: string): Promise<WarrantyClaim[]>;
export function updateWarrantyClaim(input: {
  id: string;
  status: WarrantyClaimStatus;
  resolution: string;
}): Promise<WriteResult>;
```

**Hành vi bắt buộc:**
1. `createWarrantyClaim`:
   - Lấy `user` từ `supabase.auth.getUser()`; thiếu phiên ⇒ fail “Bạn cần đăng nhập…”.
   - Xác minh đơn thuộc chính user: `orders.select('id,order_number').eq('id', orderId).eq('user_id', uid).maybeSingle()`;
     không có ⇒ fail “Không tìm thấy đơn hàng của bạn”.
   - `reason` = nhãn VI của `issueType`; `description` = ghép `Độ lệch đo được: …` + `Mô tả: …` (bỏ dòng rỗng).
   - Insert `{ order_id, user_id, reason, description, status: 'submitted' }`; trả claim đã map.
2. `listMyWarrantyClaims`: đọc claim `user_id = uid`, mới nhất trước; join `order_number` từ `orders`
   (không bịa nếu không đọc được).
3. `listWorkshopWarrantyClaims(partnerId)`:
   - Đọc `orders` có `assigned_workshop_id = partnerId` (RLS xưởng đã giới hạn).
   - Chỉ trả claim có `order_id` thuộc tập đơn đó. Không hiển thị claim của xưởng khác.
4. `updateWarrantyClaim`: update `status`, `resolution`, `handled_by = uid`, `updated_at`; `.select('id')`
   để phát hiện RLS chặn; validate status thuộc union.
5. `MyOrdersView`:
   - Bỏ hoàn toàn nhánh giả “chưa nối DB / không có mã hồ sơ”.
   - Submit async: disable nút khi đang gửi; lỗi hiển thị trong form; thành công hiển thị **id thật**
     (rút gọn) + trạng thái “Đã gửi — chờ xưởng tiếp nhận”.
   - Reset lỗi/claim khi mở modal.
6. `WarrantyTab`:
   - Dùng `ctl.partnerId`; nếu rỗng ⇒ EmptyState “Tài khoản chưa gắn mã đối tác xưởng.”
   - Bảng: mã đơn, lý do, trạng thái, ngày gửi, hành động “Xử lý”.
   - Modal xử lý: chọn trạng thái (`reviewing/approved/rejected/resolved`), nhập kết quả xử lý; lưu qua service.
   - EmptyState/ErrorState trung thực; không seed, không fake.
7. `tabs.ts`: thêm `'warranty'` vào `TabId`, `LAB_TAB_IDS`, `LAB_TAB_LABELS` (nhãn “Bảo hành”).
8. `navConfig.ts`: thêm mục lab `{ id: 'warranty', label: 'Bảo hành', icon: 'shield' }` (icon có trong `iconMap`).
9. `WorkshopSettingsView.tsx`: import `WarrantyTab`, thêm `warranty: <WarrantyTab ctl={controller} />` vào `tabElements`.

**Acceptance:**
- `npx tsc --noEmit` PASS.
- `check-ui-rules`, `check-icon-names`, `check-max-lines`, `check-error-handling`, `check-fabricated` PASS.
- Browser: khách gửi claim → reload còn claim; lab thấy claim đúng đơn được giao, đổi trạng thái → reload còn;
  390/1440 không tràn; 0 `pageerror`.

**Rủi ro cần ghi trong báo cáo:**
- RLS `warranty_claims_customer_insert` hiện chỉ kiểm `user_id = auth.uid()`, **không** kiểm quyền sở hữu đơn.
  Service đã kiểm; gate Phase B phải siết policy.
- RLS `warranty_claims_staff_read` cho mọi lab đọc mọi claim; UI lọc theo `partnerId`; gate Phase B phải siết policy.

---

### Task A2 — Designer khai thông tin nhận tiền

**Mục tiêu:** nối UI với bảng `designer_payout_info` + RPC `get_my_payout_info`/`upsert_my_payout_info`
đã có. Không hứa “quyết toán tự động”; không hiển thị số dư bịa.

**Files:**
- Modify: `src/frontend/stores/useDesignerAdminStore.ts` — thêm `myPayoutInfo` + `loadMyPayoutInfo`/`saveMyPayoutInfo`
  gọi RPC `get_my_payout_info` / `upsert_my_payout_info` (store đã nằm trong baseline, tránh nợ import mới).
- Modify: `src/frontend/components/designer/DesignerPayoutsTab.tsx` — chỉ dùng hook/store, không import backend.

**Interfaces:**
```ts
export interface MyPayoutInfo {
  bankName: string;
  bankAccount: string;
  taxId: string;
}

export function getMyPayoutInfo(): Promise<WriteResult<MyPayoutInfo>>;
export function saveMyPayoutInfo(input: MyPayoutInfo): Promise<WriteResult>;
```

**Hành vi bắt buộc:**
1. `getMyPayoutInfo`: gọi `supabase.rpc('get_my_payout_info')`; lỗi ⇒ fail; 0 hàng ⇒ fail
   “Tài khoản chưa có hồ sơ nhà thiết kế.”; có hàng ⇒ `ok({ bankName, bankAccount, taxId })` (null → `''`).
2. `saveMyPayoutInfo`: validate `bankName`/`bankAccount` không rỗng; gọi
   `supabase.rpc('upsert_my_payout_info', { p_bank_name, p_bank_account, p_tax_id })`; trả `ok()`/`fail()`.
3. `DesignerPayoutsTab`:
   - Nạp info khi mount; loading/error rõ ràng.
   - Card “Tài khoản nhận thanh toán” thay `EmptyState` bằng form 3 trường + nút “Lưu thông tin nhận tiền”.
   - Khi đã có: hiển thị ngân hàng + số tài khoản **mask** (giữ 4 số cuối), MST; nút “Cập nhật”.
   - Không log số tài khoản đầy đủ ra console; không gửi PII vào analytics.
   - Lịch sử quyết toán vẫn EmptyState trung thực: “Chưa có nguồn dữ liệu quyết toán.”
4. Không sửa `DesignerDashboardView` nếu không cần; tab tự nạp dữ liệu qua service.

**Acceptance:**
- `npx tsc --noEmit` PASS; checkers PASS.
- Browser: designer mở `/designer/payouts`, lưu thông tin → reload còn; RLS chỉ đọc/ghi hàng của mình;
  390/1440 không tràn; 0 `pageerror`.

---

### Task A3 — Admin audit log viewer

**Mục tiêu:** admin xem được `setting_audit` (ai đổi gì, khi nào) trong console; có filter + chi tiết;
empty state trung thực. Không bịa log.

**Files:**
- Create: `src/backend/services/auditLogService.ts`
- Create: `src/frontend/components/admin/AdminAuditLogPanel.tsx`
- Modify: `src/frontend/views/AdminDashboardView.tsx`
- Modify: `src/frontend/components/admin/AdminSidebar.tsx`
- Modify: `src/types/index.ts` (union `AdminNavSection`)

**Interfaces:**
```ts
export interface AuditLogEntry {
  id: string;
  settingKey: string;
  store: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

export function listAuditLog(options?: {
  limit?: number;
  store?: string;
  search?: string;
}): Promise<AuditLogEntry[]>;
```

**Hành vi bắt buộc:**
1. `listAuditLog`: query `setting_audit` (`*`, `order changed_at desc`, limit mặc định 200); filter `store`
   qua `.eq` nếu có; `search` qua `.ilike('setting_key', '%…%')`. Fetch `user_profiles` cho các `changed_by`
   để lấy `display_name`/`email`; không join giả, không bịa tên.
2. `AdminAuditLogPanel`:
   - `PageHeader` tiêu đề “Nhật ký thay đổi cấu hình”.
   - Filter: store (Select: tất cả + 5 store trong CHECK), ô tìm `setting_key`, nút làm mới.
   - `DataTable`: thời gian, store (nhãn VI), setting key, người đổi (tên hoặc `—`), tóm tắt old→new,
     nút “Xem” mở `Modal` hiển thị JSON pretty trong `<pre>` có `max-h`/`overflow-auto`.
   - EmptyState: “Chưa có bản ghi thay đổi cấu hình.” ErrorState có retry.
   - Không hiển thị log giả; không tự tạo log.
3. `AdminDashboardView`:
   - Lazy import panel; thêm `'audit-log'` vào `validSections`, breadcrumb, `tabs`.
   - Giữ nguyên toàn bộ section/alias hiện có.
4. `AdminSidebar`: thêm item `audit-log`, label “Nhật Ký Thay Đổi”, icon `history` (đã có trong `iconMap`).
5. `src/types/index.ts`: thêm `'audit-log'` vào `AdminNavSection`.

**Acceptance:**
- Deep-link `/admin/audit-log` mở đúng panel; admin thấy dữ liệu thật (nếu có), empty state nếu chưa.
- 22 section cũ vẫn mở đúng; 0 `pageerror`; 390/1440 không tràn.
- `npx tsc --noEmit` PASS; checkers PASS.

---

## 5. Approval gates (Phase B/C — chưa giao agent)

| Gate | Việc | Cần ai duyệt | Ghi chú |
|---|---|---|---|
| D1 | `invoice_number` + bảng `invoices`/PDF | PO + DB | Sinh số khi `paid`; idempotent |
| D2 | RPC/view `designer_earnings` (security definer) | PO + DB | Designer không đọc trực tiếp `order_items` |
| D3 | Storage policy `reviews/<uid>/…` + upload/duyệt | PO + Security | Hiện `product-images` write admin-only |
| D4 | Cột `accepted_at/declined_reason/deadline_at` + RPC accept/decline | PO + DB | SLA + cảnh báo trễ |
| D5 | Bảng `qc_checks` + ảnh + reprint | PO + DB/Storage | Gắn order/workshop |
| D6 | RPC cancel/address change + policy | PO + DB | Chỉ trước khi in; hoàn tiền là Phase C |
| D7 | Bảng `settlements` + kỳ + trạng thái | PO + DB | Đối soát xưởng/designer |
| D8 | Bảng `feature_flags` + audit mở rộng | PO + DB | Audit đơn/sản phẩm/thanh toán |
| D9 | Bảng `support_tickets` + inbox | PO | Gắn order_id |
| D10 | Bảng `customer_addresses` | PO | Thay `default_shipping_address` |
| C1 | Payment gateway/webhook/refund | PO + đối tác + secret | VNPay/MoMo; không hardcode |
| C2 | Email transactional | PO + nhà cung cấp + secret | Opt-in, template VI |

**Luật:** task chạm migration/secret không được agent tự apply; chỉ tạo file SQL + docs, chờ duyệt.
Không tạo migration mới chồng lấn; dùng `scripts/sql/` cho SQL áp dụng nhanh, cập nhật `docs/database/*`.

---

## 6. Self-review

### 6.1 Spec coverage
- **Customer:** warranty (A1), review ảnh (D3), invoice (D1), huỷ đơn/địa chỉ (D6), ticket (D9), địa chỉ (D10).
- **Designer:** payout info (A2), earnings ledger (D2), license/storefront (C5), báo cáo (C6).
- **Workshop:** warranty (A1), SLA/accept (D4), QC (D5), settlement (D7), báo cáo (C6).
- **Admin:** audit log (A3), refund/gateway (C1), feature flags (D8), báo cáo (C6), ticket (D9).
- **Shared:** payment (C1), email (C2), search (C7), PWA (C7).
- **Không có hạng mục nào trong bảng role bị bỏ rơi mà không có gate/lý do.**

### 6.2 Gaps đã biết (chấp nhận)
- **Dữ liệu thật** vẫn là P0; không thể tự động ⇒ Phase 0 chờ người dùng.
- **Payout ledger** chưa làm được ở Wave 1 vì RLS `order_items`; chỉ khai info ở A2.
- **Review ảnh** chưa upload được ở Wave 1 vì storage policy; D3.
- **Invoice** chưa bền vì chưa có cột/bảng; D1.
- **Email/gateway** phụ thuộc đối tác/secret; Phase C.
- **Audit log** hiện chỉ phủ `setting_audit`, chưa phủ đơn/sản phẩm; D8.

### 6.3 Overlap & sequencing
- A1 sở hữu `warrantyService` + `WarrantyTab` + `MyOrdersView`; A2 sở hữu payout service/tab; A3 sở hữu
  audit service/panel + admin registry. **Không file nào trùng giữa 3 task.**
- `AdminDashboardView` chỉ A3 chạm; `WorkshopSettingsView` chỉ A1 chạm; `DesignerPayoutsTab` chỉ A2 chạm.
- Wave 2 phụ thuộc A1 (warranty policy hardening) và A3 (audit viewer) trước khi mở rộng.

### 6.4 Review Focus (những chỗ dễ vỡ)
1. **DB rỗng**: không được seed/fake; phải EmptyState đúng.
2. **RLS từ chối**: hiển thị lỗi thật, không retry vô hạn, không nuốt lỗi.
3. **PII**: số tài khoản designer phải mask; không log đầy đủ.
4. **Double submit warranty**: disable nút; không tạo 2 claim ngoài ý muốn.
5. **JSON audit dài**: modal phải cuộn trong khung, không tràn 390px.
6. **Designer chưa có hồ sơ**: báo lỗi rõ, không crash tab.
7. **Lab chưa có partner_id**: EmptyState, không gọi API với chuỗi rỗng.
8. **Timezone/format**: dùng `formatDateTime`/`formatDate` sẵn có, không tự viết.
9. **Icon**: chỉ dùng tên có trong `iconMap`; không import lucide ngoài `ui/**`.
10. **Không thêm dependency**, không đổi copy ngoài phạm vi.

### 6.5 Proportion
- Plan tập trung vào 3 task Wave 1 có thể giao ngay; Phase B/C chỉ nêu gate + acceptance, không viết code
  trước khi có quyết định migration/đối tác. Tránh plan dài hơn code.

---

## 7. Dispatch log (Wave 1)

| Agent | Task | File ownership | Trạng thái |
|---|---|---|---|
| machine-implementer | A1 — Warranty end-to-end | `warrantyService.ts`, `MyOrdersView.tsx`, `WarrantyTab.tsx`, `tabs.ts`, `navConfig.ts`, `WorkshopSettingsView.tsx` | **done + verified** |
| machine-implementer | A2 — Designer payout info | `useDesignerAdminStore.ts`, `DesignerPayoutsTab.tsx` | **done + verified** (migration #10 applied) |
| machine-implementer | A3 — Admin audit log | `auditLogService.ts`, `AdminAuditLogPanel.tsx`, `AdminDashboardView.tsx`, `AdminSidebar.tsx`, `types/index.ts` | **done + verified** |

**Sau khi agent trả:** lead chạy `npx tsc --noEmit`, `npm run check`, browser sweep 3 role; nếu xanh mới commit.

---

## 8. Việc tiếp theo (sau Wave 1)

1. **P0 dữ liệu thật (blocked on human):** thay 18 dòng `[MẪU]` bằng giá trị thật qua
   `scripts/catalog/*.json` + `npm run catalog:import` (dry-run → `--apply`). PO score kỳ vọng ~97,8.
2. **P1 review photos (gate D3):** storage policy `reviews/<uid>/…` + upload/duyệt + hiển thị PDP.
3. **Phase B (cần PO duyệt migration):** invoice bền (D1), designer earnings ledger (D2), SLA/accept
   xưởng (D4), QC checklist (D5), huỷ đơn/đổi địa chỉ (D6), settlement (D7), feature flags + audit mở
   rộng (D8).
4. **Phase C (cần đối tác/quyết định):** payment gateway, email transactional, ticket hỗ trợ, sổ địa chỉ,
   storefront/license, báo cáo, search server-side.

**Trạng thái đo lại 2026-11-10:** PO **90,3/100** (P0 data honesty còn 1; P1 reviewPhotos còn 1) —
đúng như dự kiến vì Wave 1 không thay đổi dữ liệu catalog/review. Gate **23/23**, tsc PASS.
