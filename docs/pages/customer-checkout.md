# VCUBE Specification: Customer Checkout, Fulfillment & Asset Management

## 1. Scope & Architecture Overview

This specification details the post-discovery transaction lifecycle of VCUBE: shopping cart state synchronization, multi-step customer checkout, corporate VAT invoice requisition, multi-channel payment flows (VietQR, VNPAY, COD), real-time 8-step MES production tracking, internal invoice generation, tolerance warranty claim intake, and the customer's personal digital CAD asset vault.

### Route & Component Inventory

| Path | Primary Component | Access Control | Primary Engineering Capabilities |
| :--- | :--- | :--- | :--- |
| `/cart` | `CartView.tsx` | Public | Physical vs. Digital separation, dynamic shipping fee calculation, free shipping progress bar, promo code validation, VAT breakdown |
| `Drawer` | `CartDrawer.tsx` | Public | Slide-over drawer mirroring cart state, real-time quantity mutations, direct checkout gateway |
| `/checkout` | `CheckoutView.tsx` | Public / Guest / Auth | Multi-step checkout, PII privacy protection, VietQR / VNPAY / COD payment flows, corporate VAT invoice form, terms acknowledgment |
| `/order-success/:orderId` | `OrderSuccessView.tsx` | Public (resolved from in-memory order list) | Order confirmation, guest tracking token display, invoice modal trigger, production dispatch alert |
| `/tracking` / `/tracking/:orderId`| `OrderTrackingView.tsx` | Public (RPC Token) | Real-time 8-stage MES pipeline (`OrderProgress.tsx`), layer print telemetry, carrier tracking integration |
| `/orders` (alias `/my-orders`) | `MyOrdersView.tsx` | Protected (any authenticated user) | Filterable order history, reorder pipeline, dimensional warranty claim modal (not persisted) |
| `/assets` (alias `/library`) | `AssetLibraryView.tsx` | Protected (any authenticated user) | Personal CAD vault, illustrative 3D block preview, signed download links when `storagePath` exists (`cad-files` private bucket, 60s TTL) |
| `Modal` | `InvoiceModal.tsx` | Opened from any view for the current order | Printable internal GTGT invoice, legal seller metadata from `app_settings`, no tax-authority signature |

---

## 2. `CartView.tsx` & `CartDrawer.tsx` — Cart Management

### 2.1 State Management via `useCartStore`
The cart state is globally managed via Zustand (`src/frontend/stores/useCartStore.ts`) with `localStorage` persistence under the key `vcube_cart_store`.

```typescript
export interface CartItem {
  id: string;
  productId: string;
  type: 'physical' | 'digital';
  name: string;
  designer: string;
  image: string;
  price: number;
  quantity: number;
  material?: string;
  color?: string;
  colorHex?: string;
  dimensions?: string;
  resolution?: string;
  weightGrams?: number | null;
  customText?: string;
  customFont?: string;
  customFontSize?: number;
  uploadedLogoName?: string;
  fileFormat?: string;
  licenseType?: string;
  selectedAccessories?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}
```

### 2.2 Physical vs. Digital Item Segregation
The cart strictly segregates items based on their operational fulfillment type:
1. **Physical Fabrication Items (`type: 'physical'`)**:
   - Represents physical parts manufactured via 3D printing.
   - Retains parameters: selected material, color finish, layer resolution, custom engraving text (`customText`), optional accessories, and an estimated resin weight (`weightGrams`).
   - Contributes to shipment weight, standard delivery fees, and the free-shipping threshold calculation.
2. **Digital CAD Licenses (`type: 'digital'`)**:
   - Represents non-physical digital assets with a declared `fileFormat` and `licenseType`.
   - Incurs zero shipping cost ($0\text{ VND}$).
   - Grants access to download secure signed files in the Asset Library once a storage path exists (currently not yet wired).

### 2.3 Dynamic Shipping & Free Shipping Threshold
- **Configuration Source**: Managed via `siteContent.freeShippingThreshold` and `siteContent.standardShippingFee` (falling back to `DEFAULT_SALES_RULES`).
- **Shipping Calculation Algorithm (`computeShippingFee`)**:
  $$\text{Shipping Fee} = \begin{cases} 0 & \text{if } \text{physicalItems.length} = 0 \\ 0 & \text{if } \text{subtotalPhysical} \ge \text{freeShippingThreshold} \\ \text{standardShippingFee} & \text{otherwise} \end{cases}$$
- **Visual Progress Bar**: Displays real-time progress toward the free shipping goal:
  $$\text{Progress \%} = \min\left(100, \text{round}\left(\frac{\text{subtotalPhysical}}{\text{freeShippingThreshold}} \times 100\right)\right)$$
  Renders a dynamic message: *"Mua thêm [X] để được MIỄN PHÍ VẬN CHUYỂN toàn quốc!"* or *"Đủ điều kiện MIỄN PHÍ GIAO HÀNG toàn quốc (đơn từ [threshold])!"*.

### 2.4 Data-Honesty Promo Code Validation
In accordance with `docs/design/data-honesty.md`:
- Arbitrary client-side promo codes (e.g. legacy `TECH3D`, `VCUBE10`) have been eliminated.
- If a promo code cannot be verified against an active backend database promotion rule, the system explicitly rejects it with a clear explanation rather than applying an unbacked discount.
- Any legacy unverified discounts remaining in `localStorage` are automatically purged upon opening the cart.

### 2.5 VAT Calculation
- VAT rate is dynamically resolved from `pricing_global_settings.vat_percent` (via `usePricingGlobalSettings()`).
- Prices are quoted net of VAT; VAT is computed as a transparent line item:
  $$\text{VAT Amount} = \text{round}\left(\text{Net Total} \times \frac{\text{vatPercent}}{100}\right)$$
  If `vatPercent` is not configured in the system, the VAT line is omitted with an informative indicator.

---

## 3. `CheckoutView.tsx` (`/checkout`) — Multi-Step Checkout

### 3.1 Customer Privacy & Form Autofill
- **Zero PII Leaks**: Unauthenticated guest users always receive a blank form. Fabricated mock personas (e.g. "Kỹ Sư Trần Tuấn Anh") are completely prohibited.
- **Authenticated Autofill**: When a user is logged in, values for `fullName`, `phone`, and `email` are pre-populated from `public.user_profiles` (`displayName`, `phone`, `email`).

### 3.2 Payment Flow Implementations

```
                          +-------------------------------+
                          |    CHECKOUT VIEW PAYMENT      |
                          +---------------+---------------+
                                          |
               +--------------------------+--------------------------+
               |                          |                          |
               v                          v                          v
      +------------------+       +------------------+       +------------------+
       |  METHOD 1: VietQR|       |  METHOD 2: VNPAY |       |  METHOD 3: COD   |
       +--------+---------+       +--------+---------+       +--------+---------+
                |                          |                          |
        Dynamic Bank Info          Method recorded only       Physical parts only
        from app_settings          (no gateway redirect)      payment status 'cod'
        (Bank, Acc, Legal)         status awaiting_payment    upon creation
               |                          |                          |
               +--------------------------+--------------------------+
                                          |
                                          v
                         +---------------------------------+
                         |   OrderService.createOrder()    |
                         |   - Upserts one 'orders' row    |
                         |   - Items stored in orders.items|
                         |     (jsonb, no order_items)     |
                         |   - Guest token minted at       |
                         |     CheckoutView (not in RPC)   |
                         +----------------+----------------+
                                          |
                                          v
                         +---------------------------------+
                         | Navigate: /order-success/:id    |
                         +---------------------------------+
```

#### A. VietQR Dynamic Bank Transfer
- **Configuration-Driven**: Bank name, account number, and legal entity name are loaded dynamically from `app_settings` via `settingsService`. Hardcoded bank details are eliminated.
- **Transfer Syntax**: Prompts the user with a standardized reference format: `VCUBE [PHONE]` (order number is not embedded). Transfer details are hidden and an explicit "not configured — contact VCUBE" notice is shown when `app_settings` has no bank data.

#### B. VNPAY Online Gateway
- Records `payment.method = 'VNPAY QR'` only. There is no payment-gateway payload or redirect integration; the order is created with payment status `'awaiting_payment'` until an operator reconciles it.

#### C. COD (Cash on Delivery)
- Permitted strictly for orders containing physical manufactured parts.
- Sets initial order payment status to `'cod'`.

### 3.3 Corporate GTGT Electronic Invoice Requisition
When the customer checks *"Yêu cầu xuất hóa đơn điện tử ... cho Doanh nghiệp / Dự án"*, three fields are collected and appended to the order note:
- **Tên doanh nghiệp / Đơn vị**: Full registered legal corporate name.
- **Mã số thuế (Tax ID)**: Free-text input (no client-side 10/13-digit validation at checkout; tax-code validation lives in the admin settings panel).
- **Địa chỉ đăng ký kinh doanh**: Legal corporate registered address.

The invoice email is the order's delivery email field ("Email nhận file CAD & hóa đơn VAT") in the shipping section, not a separate VAT field.

### 3.4 Engineering Confidentiality & Terms Acknowledgment
Checkout displays an acknowledgment line stating that confirming the order accepts VCUBE's fabrication and commercial-copyright terms; all uploaded 3D CAD files and proprietary specifications are covered by those terms. There is no separate NDA checkbox or mutual-NDA signature step in the checkout form.

### 3.5 Database Transaction Execution
Order persistence is handled exclusively through `OrderService.createOrder()` (`src/backend/services/orderService.ts`), which delegates to `dbService.saveOrder()`:
- Upserts a single row in `public.orders` with customer ID, shipping address, contact info, total amounts, VAT breakdown, payment metadata, and `orders.items` (the full line-item array as `jsonb`). There is **no `order_items` table** — line items live inside the order row.
- The guest `secure_access_token` is minted in `CheckoutView` (`sec_<timestamp>_<random>`) and written to `orders.secure_access_token`; `dbService.saveOrder` only falls back to generating one if the field is missing. It is not a cryptographically strong token.
- `OrderService.createOrder` itself only generates the final order id (`VCB-...`) and throws if the DB write fails.

---

## 4. `OrderSuccessView.tsx` & `OrderTrackingView.tsx` — Order Tracking & MES Pipeline

### 4.1 `OrderSuccessView.tsx` (`/order-success/:orderId`)
Displayed immediately following order creation:
- Displays order number, creation timestamp, and selected payment method instructions.
- **Guest Order Access Token Badge**: Prominently displays `order.secureAccessToken` with a one-click copy button, instructing guest users to retain the token for status inquiries.
- Action triggers: "THEO DÕI TIẾN ĐỘ ĐƠN HÀNG" (only rendered for orders containing physical items; routes to `/tracking/:orderId`) and "Xem / In hoá đơn" (`onOpenInvoice`). Orders with digital items show a "Mở Kho Tệp CAD" button to `/assets` (or a sign-in prompt for guest orders). There is no "continue shopping" button.

### 4.2 `OrderTrackingView.tsx` (`/tracking` & `/tracking/:orderId`)
Provides real-time visibility into the manufacturing process for both authenticated users and guest shoppers.

#### A. Security Definer RPC Guest Lookup
To prevent enumeration and unauthorized PII leakage:
- Lookup requires both the Order Number and either the associated Customer Phone Number or the `secure_access_token`.
- Traversal executes via the Supabase RPC `get_order_by_guest_token`.
- Identical error feedback is returned whether an order does not exist or the token is incorrect, completely preventing order enumeration attacks.

#### B. The 8-Step Industrial MES Production Pipeline (`OrderProgress.tsx`)
The physical production flow is tracked through 8 discrete operational milestones:

| Step | Stage ID | Stage Name (VI) | `OrderProgress` Description (`desc`) |
| :--- | :--- | :--- | :--- |
| 1 | `placed` | Đã nhận đơn | Hệ thống xác thực |
| 2 | `slicing` | Duyệt file CAD | G-Code & Slicing |
| 3 | `nesting` | Xếp bàn in | Tối ưu layout bàn |
| 4 | `heating` | Gia nhiệt máy | Cân bàn & đùn phôi |
| 5 | `printing` | Đang in 3D | Thiêu kết / Đùn sợi (shows live `layerProgress %` when reported) |
| 6 | `post_cure` | Xử lý bề mặt | Rửa cồn siêu âm & UV |
| 7 | `qc_check` | Đo kiểm QC | Theo thoả thuận |
| 8 | `shipping` | Xuất xưởng giao | VCUBE Express |

The stage list is defined in `MES_PIPELINE_STAGES` (`OrderProgress.tsx`). `currentStageIndex` is 0-based (`null` = workshop has reported no stage, so no node is highlighted). No tolerance figure is advertised for the QC stage.

---

## 5. `MyOrdersView.tsx` (`/orders`, `/my-orders`) — Customer Order Management

### 5.1 Overview & Access Guard
Accessible to any authenticated user (wrapped in `<ProtectedRoute>`, which only checks login — it is not role-scoped). Direct requests to `/my-orders` are permanently redirected to `/orders`.

### 5.2 Filter Tabs & Search
- Tabs: Tất cả đơn, Chờ thanh toán (`pending_payment`), Đang in 3D (`printing`/`processing`), Hậu kỳ & QC (`post_processing`/`packaging`), Đang vận chuyển (`shipping`), Đã hoàn thành (`completed`), Đã hủy (`cancelled`).
- Real-time search across order numbers, item names, materials, and carrier tracking codes.

### 5.3 Order Actions
- **Thanh toán ngay**: For `pending_payment` orders, opens `InvoiceModal`.
- **Theo dõi hành trình / Xem tiến độ**: Routes to `/tracking` with the order.
- **In lại đơn này (`handleReorder`)**: Loads items into `/quote` (dispatched as screen `tool_3d` with `reorderItems`).
- **Hóa đơn VAT**: Opens `InvoiceModal` with recorded tax and payment details.
- **Kiểm tra / Bảo hành (`handleOpenWarranty`)**: Launches the dimensional warranty claim modal.

There is no direct CAD-file download action in this view (downloads live in `/assets`).

### 5.4 Tolerance & Quality Warranty Claim Modal (`warrantyModal`)
A `<Modal>` (native `<dialog>`) lets clients record a structured dispute:
- **Issue Classification** (`select`):
  * `tolerance`: "Sai lệch kích thước so với bản vẽ (Tolerance Deviation)".
  * `surface`: "Lỗi bề mặt, tách lớp (Delamination / Layer Separation)".
  * `material`: "Sai chủng loại vật liệu hoặc màu sắc yêu cầu".
  * `strength`: "Độ cứng cơ tính không đạt thông số Datasheet".
- **Measured Deviation Input**: Required free-text caliper measurement (no fixed ±0.10 mm threshold is claimed).
- **Detailed Notes**: Description of the failure and requested remedy.
- **Not persisted**: There is no `warranty_claims` table; submitting shows "Chưa gửi được yêu cầu" and asks the customer to contact the workshop directly. No claim id is fabricated.

---

## 6. `AssetLibraryView.tsx` (`/assets`, `/library`) — Personal CAD Vault

### 6.1 Purpose & Architectural Role
`AssetLibraryView.tsx` acts as the customer's permanent secure digital repository for all purchased 3D CAD models, digital licenses, and engineering drawings.

### 6.2 Filter & Search Capabilities
- Format filters: Tất Cả Định Dạng, STL, 3MF, STEP (no OBJ filter).
- Instant search by model name and designer attribution.

### 6.3 3D Inspection
Clicking "Xem 3D" opens a `Modal` rendering `ThreeModelViewer.tsx`. The viewer shows an **illustrative primitive block** (`modelType`/gear), explicitly labelled "Xem trước dạng khối minh hoạ — không phải hình học thật của file" — it does not load or measure the real mesh.

### 6.4 Secure Signed URL Downloads
- Files are intended to live in Supabase Storage under the private bucket `cad-files`; direct public URLs are blocked by storage RLS policies.
- The UI never calls `supabase.storage` directly: `AssetService.createSignedUrl(asset.storagePath)` (`src/backend/services/assetService.ts`) wraps `createSignedUrl` with a strict 60-second TTL (`SIGNED_URL_TTL_SECONDS = 60`).
- **Current limitation**: `DigitalAsset` carries no `storagePath` and there is no `order_files` table, so no purchased asset currently satisfies the `canDownload` guard. Cards show "Chưa hỗ trợ tải trực tiếp" and the view displays an honest notice instead of generating broken or fabricated links. Once a storage path exists, the same button calls `AssetService.createSignedUrl` and downloads the file.

---

## 7. `InvoiceModal.tsx` — Electronic GTGT Invoice Specification

### 7.1 Compliance & Architecture
- This is an **internal VCUBE document**, not a tax-authority-issued e-invoice. The modal states that no digital-signature service is integrated, so no e-signature or verification hash is printed ("Hoá đơn điện tử do cơ quan thuế cấp mã sẽ được gửi riêng"). There is no Thông tư 78/Nghị định 123 issuance pipeline in the code.
- **Seller Identity**: Seller legal name, tax code, invoice address, and hotline are resolved dynamically from `app_settings` (`settingsService`); missing values render `—`.
- **Data Honesty Invariant (PC-04)**: The invoice prints only amounts and tax percentages recorded on the order at checkout. It never applies client-side ad-hoc calculations that deviate from the database record; if the order recorded no VAT rate, no VAT line is printed.
- **Print Optimization**: The modal is a native `<dialog>` and printing uses `window.print()`. The global `@media print` rule in `src/index.css` hides `header`, `footer`, `button`, and `.no-print` elements (it does not target modal backdrops specifically).
