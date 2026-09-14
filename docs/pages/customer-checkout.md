# VCUBE Specification: Customer Checkout, Fulfillment & Asset Management

## 1. Scope & Architecture Overview

This specification details the post-discovery transaction lifecycle of VCUBE: shopping cart state synchronization, multi-step customer checkout, corporate VAT invoice requisition, multi-channel payment flows (VietQR, VNPAY, COD), real-time 8-step MES production tracking, electronic invoice issuance, tolerance warranty claims, and the customer's personal digital CAD asset vault.

### Route & Component Inventory

| Path | Primary Component | Access Control | Primary Engineering Capabilities |
| :--- | :--- | :--- | :--- |
| `/cart` | `CartView.tsx` | Public | Physical vs. Digital separation, dynamic shipping fee calculation, free shipping progress bar, promo code validation, VAT breakdown |
| `Drawer` | `CartDrawer.tsx` | Public | Slide-over drawer mirroring cart state, real-time quantity mutations, direct checkout gateway |
| `/checkout` | `CheckoutView.tsx` | Public / Guest / Auth | Multi-step checkout, PII privacy protection, VietQR / VNPAY / COD payment flows, corporate VAT invoice form, NDA commitment |
| `/order-success/:orderId` | `OrderSuccessView.tsx` | Public (Token / ID) | Order confirmation, guest tracking token display, invoice modal trigger, production dispatch alert |
| `/tracking` / `/tracking/:orderId`| `OrderTrackingView.tsx` | Public (RPC Token) | Real-time 8-stage MES pipeline (`OrderProgress.tsx`), layer print telemetry, carrier tracking integration |
| `/orders` (alias `/my-orders`)| `MyOrdersView.tsx` | Protected (`customer`, `admin`) | Filterable order history, CAD file download links, reorder pipeline, dimensional warranty claim modal |
| `/assets` (alias `/library`) | `AssetLibraryView.tsx` | Protected (`customer`, `admin`) | Personal CAD vault, 3D WebGL asset preview, secure signed download links (`cad-files` private bucket, 60s TTL) |
| `Modal` | `InvoiceModal.tsx` | Order Subject / Admin | Printable electronic GTGT invoice, legal seller metadata from `app_settings`, tax audit trail |

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
  designer?: string;
  image?: string;
  price: number;
  quantity: number;
  material?: string;
  color?: string;
  colorHex?: string;
  resolution?: string;
  engraving?: string;
  scale?: number;
  customizationFee?: number;
  licenseType?: string;
}
```

### 2.2 Physical vs. Digital Item Segregation
The cart strictly segregates items based on their operational fulfillment type:
1. **Physical Fabrication Items (`type: 'physical'`)**:
   - Represents physical parts manufactured via 3D printing.
   - Retains parameters: selected material, color finish, layer resolution ($0.12 - 0.28\text{ mm}$), custom engraving text, and scale.
   - Contributes to shipment weight, standard delivery fees, and the free-shipping threshold calculation.
2. **Digital CAD Licenses (`type: 'digital'`)**:
   - Represents non-physical digital assets (STEP, STL, SLDPRT, 3MF).
   - Incurs zero shipping cost ($0\text{ VND}$).
   - Grants immediate access to download secure signed files in the Asset Library upon completed payment.

### 2.3 Dynamic Shipping & Free Shipping Threshold
- **Configuration Source**: Managed via `siteContent.freeShippingThreshold` and `siteContent.standardShippingFee` (falling back to `DEFAULT_SALES_RULES`).
- **Shipping Calculation Algorithm (`computeShippingFee`)**:
  $$\text{Shipping Fee} = \begin{cases} 0 & \text{if } \text{physicalItems.length} = 0 \\ 0 & \text{if } \text{subtotalPhysical} \ge \text{freeShippingThreshold} \\ \text{standardShippingFee} & \text{otherwise} \end{cases}$$
- **Visual Progress Bar**: Displays real-time progress toward the free shipping goal:
  $$\text{Progress \%} = \min\left(100, \text{round}\left(\frac{\text{subtotalPhysical}}{\text{freeShippingThreshold}} \times 100\right)\right)$$
  Renders a dynamic message: *"Thêm [X] đ để được MIỄN PHÍ VẬN CHUYỂN"* or *"Đã đủ điều kiện miễn phí vận chuyển"*.

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
       Dynamic Bank Info          Payment Gateway            Physical parts only
       from app_settings          Redirect                   Pending payment
       (Bank, Acc, Legal)         URL generation             status upon creation
               |                          |                          |
               +--------------------------+--------------------------+
                                          |
                                          v
                         +---------------------------------+
                         |   OrderService.createOrder()    |
                         |   - Writes to 'orders'          |
                         |   - Writes to 'order_items'     |
                         |   - Generates secure token      |
                         +----------------+----------------+
                                          |
                                          v
                         +---------------------------------+
                         | Navigate: /order-success/:id    |
                         +---------------------------------+
```

#### A. VietQR Dynamic Bank Transfer
- **Configuration-Driven**: Bank name, account number, and legal entity name are loaded dynamically from `app_settings` via `settingsService`. Hardcoded bank details are eliminated.
- **Transfer Syntax**: Prompts the user with a standardized reference format: `VCUBE [ORDER_NUMBER] [PHONE]`.

#### B. VNPAY Online Gateway
- Prepares an online transaction payload. (Maintained in sample/sandbox mode per system invariants without external third-party PSP dependencies).

#### C. COD (Cash on Delivery)
- Permitted strictly for orders containing physical manufactured parts.
- Sets initial order payment status to `'cod'`.

### 3.3 Corporate GTGT Electronic Invoice Requisition
When the customer checks *"Yêu cầu xuất hóa đơn GTGT cho doanh nghiệp"*, the following mandatory fields are collected:
- **Tên doanh nghiệp / Đơn vị**: Full registered legal corporate name.
- **Mã số thuế (Tax ID)**: Validated against standard Vietnamese 10-digit or 13-digit format.
- **Địa chỉ trụ sở**: Legal corporate registered address.
- **Email nhận hóa đơn**: Email address to receive electronic XML/PDF invoice files.

### 3.4 Engineering Confidentiality & NDA Commitment
Checkout requires explicit acknowledgment of VCUBE's mutual Non-Disclosure Agreement (NDA). All uploaded 3D CAD files, mechanical assemblies, and proprietary specifications are protected under strict commercial confidentiality terms.

### 3.5 Database Transaction Execution
Order persistence is handled exclusively through `OrderService.createOrder()` (`src/backend/services/orderService.ts`):
- Creates parent row in `public.orders` with customer ID, shipping address, contact info, total amounts, VAT breakdown, and payment metadata.
- Inserts child records into `public.order_items` for every individual line item.
- Generates a cryptographically strong `secure_access_token` stored in `orders.secure_access_token` for unauthenticated guest tracking.

---

## 4. `OrderSuccessView.tsx` & `OrderTrackingView.tsx` — Order Tracking & MES Pipeline

### 4.1 `OrderSuccessView.tsx` (`/order-success/:orderId`)
Displayed immediately following order creation:
- Displays order number, creation timestamp, and selected payment method instructions.
- **Guest Order Access Token Badge**: Prominently displays `order.secureAccessToken` with a one-click copy button, instructing guest users to retain the token for status inquiries.
- Action triggers: "Xem Hóa Đơn Điện Tử" (`onOpenInvoice`), "Theo Dõi Đơn Hàng" (routes to `/tracking/:orderId`), and "Tiếp Tục Mua Sắm".

### 4.2 `OrderTrackingView.tsx` (`/tracking` & `/tracking/:orderId`)
Provides real-time visibility into the manufacturing process for both authenticated users and guest shoppers.

#### A. Security Definer RPC Guest Lookup
To prevent enumeration and unauthorized PII leakage:
- Lookup requires both the Order Number and either the associated Customer Phone Number or the `secure_access_token`.
- Traversal executes via the Supabase RPC `get_order_by_guest_token`.
- Identical error feedback is returned whether an order does not exist or the token is incorrect, completely preventing order enumeration attacks.

#### B. The 8-Step Industrial MES Production Pipeline (`OrderProgress.tsx`)
The physical production flow is tracked through 8 discrete operational milestones:

| Step | Stage ID | Stage Name (VI) | Technical Description | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `placed` | Đã nhận đơn | Order validated & payment confirmed | ERP order created, payment verified |
| 2 | `slicing` | Duyệt file CAD | Slicing & G-Code compilation | Model checked for printability, orientation set |
| 3 | `nesting` | Xếp bàn in | Build plate layout optimization | Multi-part density packing on print bed |
| 4 | `heating` | Gia nhiệt máy | Machine preparation & bed leveling | Bed heated to target temp, nozzle purged |
| 5 | `printing` | Đang in 3D | Active additive manufacturing | Real-time layer progress reporting ($0 - 100\%$) |
| 6 | `post_cure` | Xử lý bề mặt | Post-processing & curing | Support removal, ultrasonic alcohol wash, UV cure |
| 7 | `qc_check` | Đo kiểm QC | Metrology & tolerance audit | Caliper/CMM dimensional inspection ($\pm 0.10\text{ mm}$) |
| 8 | `shipping` | Xuất xưởng giao | Courier dispatch | Carrier tracking code assigned, parcel dispatched |

---

## 5. `MyOrdersView.tsx` (`/orders`, `/my-orders`) — Customer Order Management

### 5.1 Overview & Access Guard
Accessible exclusively to authenticated customers (wrapped in `<ProtectedRoute>`). Direct requests to `/my-orders` are permanently redirected to `/orders`.

### 5.2 Filter Tabs & Search
- Tabs: Tất cả đơn, Chờ thanh toán (`pending_payment`), Đang in 3D (`printing`/`processing`), Hậu kỳ & QC (`post_processing`/`packaging`), Đang vận chuyển (`shipping`), Đã hoàn thành (`completed`), Đã hủy (`cancelled`).
- Real-time search across order numbers, item names, materials, and carrier tracking codes.

### 5.3 Order Actions
- **Tải File CAD**: Direct download trigger for digital license items in completed or paid orders.
- **Xem Hóa Đơn GTGT**: Opens `InvoiceModal` with recorded tax and payment details.
- **Đặt Lại Đơn Này (`handleReorder`)**: Re-loads items directly into `/quote` for repeat production runs.
- **Khiếu Nại Sai Lệch Dung Sai (`handleOpenWarranty`)**: Launches the dimensional warranty claim modal.

### 5.4 Tolerance & Quality Warranty Claim Modal (`warrantyModal`)
Allows clients to file a structured dispute if manufactured parts do not meet engineering specifications:
- **Issue Classification**:
  * `tolerance`: Sai lệch kích thước / dung sai vượt ngưỡng cam kết ($\pm 0.10\text{ mm}$).
  * `surface`: Lỗi bề mặt (bọt khí, tách lớp, cong vênh warp, sọc lớp).
  * `material`: Sai chủng loại vật liệu yêu cầu.
  * `strength`: Giòn gãy, không đạt độ bền cơ học dự kiến.
- **Measured Deviation Input**: Required numeric field capturing the caliper/micrometer reading in millimeters (e.g. `+0.35 mm`).
- **Detailed Notes**: Description of operational failure or assembly fit issue.

---

## 6. `AssetLibraryView.tsx` (`/assets`, `/library`) — Personal CAD Vault

### 6.1 Purpose & Architectural Role
`AssetLibraryView.tsx` acts as the customer's permanent secure digital repository for all purchased 3D CAD models, digital licenses, and engineering drawings.

### 6.2 Filter & Search Capabilities
- Format filters: All, STL, STEP, OBJ, 3MF.
- Instant search by model name and designer attribution.

### 6.3 3D WebGL Inspection
Customers can inspect any purchased model in 3D before downloading via `ThreeModelViewer.tsx`, verifying geometry, bounding box dimensions, and polygon mesh structure.

### 6.4 Secure Signed URL Downloads
- Files are stored in Supabase Storage under the private bucket `cad-files`.
- Direct public URLs are blocked by storage RLS policies.
- Clicking "Tải Tệp CAD" calls `supabase.storage.from('cad-files').createSignedUrl(asset.storagePath, 60)`.
- A temporary signed download URL is generated with a strict 60-second Time-To-Live (TTL).
- If an asset lacks a confirmed storage path in the database, the UI honestly communicates that the file is not yet available for direct download, rather than generating broken or fabricated links.

---

## 7. `InvoiceModal.tsx` — Electronic GTGT Invoice Specification

### 7.1 Compliance & Architecture
- Follows Vietnamese e-invoice standards (Hóa đơn điện tử theo Thông tư 78/2021/TT-BTC & Nghị định 123/2020/NĐ-CP).
- **Seller Identity**: Seller corporate name, tax code, registered office, and hotline are resolved dynamically from `app_settings` (`settingsService`).
- **Data Honesty Invariant (PC-04)**: The invoice prints only amounts and tax percentages recorded on the order at checkout. It never applies client-side ad-hoc calculations that deviate from the database record.
- **Print Optimization**: Supports high-resolution browser printing via `window.print()` with `@media print` CSS rules hiding navigation chrome and modal backdrops.
