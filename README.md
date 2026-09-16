# 🧊 VCUBE — Nền Tảng Chế Tác In 3D & Bản Quyền CAD Kỹ Thuật

VCUBE là hệ sinh thái số hóa công nghệ in 3D và giao dịch tệp CAD cơ khí chính xác cao (Watertight Solid Mesh), tích hợp trình xem 3D WebGL 360°, hệ thống cấu hình vật liệu thông minh và đồng bộ cơ sở dữ liệu Supabase thời gian thực.

---

## 🛠️ Yêu Cầu Môi Trường (Prerequisites)
* **Node.js**: Phiên bản `>= 18.x` (Khuyên dùng Node 20 LTS).
* **Trình quản lý gói**: `npm` hoặc `bun` / `pnpm`.
* **Git**: Phiên bản mới nhất.

---

## 🚀 Hướng Dẫn Clone & Chạy Dự Án (Quick Start)

### 1. Clone repository về máy:
```bash
git clone https://github.com/ThanhJamie/Vcube.git
cd Vcube
```

### 2. Cài đặt các gói phụ thuộc (Dependencies):
```bash
npm install
```

### 3. Cấu hình biến môi trường:
Sao chép tệp mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Mở tệp `.env` và điền thông tin Supabase của bạn:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SITE_URL=http://localhost:3000
# SERVER ONLY — bỏ qua RLS, không bao giờ đưa vào client/`define` của Vite:
SUPABASE_SECRET_KEY=sb_secret_...
```

### 4. Thiết lập Cơ sở dữ liệu Supabase (Migration):
Chạy **3 file migration theo thứ tự tên** trong `supabase/migrations/` (SQL Editor hoặc `supabase/scripts/apply_all_manual.sql`):

1. `20260900_rls_helpers.sql` — helper `current_app_role()` + `is_admin()`
2. `20260901_baseline_schema.sql` — 31 bảng + 1 view, 49 index, 7 hàm, 5 trigger, 2 storage bucket, realtime, seed
3. `20261010_harden_rls.sql` — 90 policy bảng + 6 policy storage

> `supabase/legacy/` chứa 6 migration cũ — **không chạy**. Cấp quyền admin bằng `supabase/scripts/bootstrap_admin.sql`.

### 5. Khởi động môi trường phát triển (Local Development):
```bash
npm run dev
```
Truy cập ứng dụng tại: **`http://localhost:3000`**

---

## 🧪 Kiểm Thử & Đóng Gói Sản Phẩm (Scripts)
* **Kiểm tra TypeScript**: `npm run lint` (`tsc --noEmit`)
* **Đóng gói Production**: `npm run build` (`vite build`)
* **Chạy kịch bản kiểm thử tích hợp**: `npx tsx scripts/test-catalog-sync.ts`

---

## 📂 Cấu Trúc Thư Mục Cốt Lõi
```
Vcube/
├── src/
│   ├── backend/supabase/        # Supabase client, database service, mappers, seed service
│   ├── backend/services/        # catalogService, orderService, pricingService, settingsService…
│   ├── frontend/
│   │   ├── components/          # ThreeModelViewer, CadQuickViewModal, Header, Admin...
│   │   ├── context/             # AuthContext, LanguageContext
│   │   └── views/               # HomeView, ExploreView, ProductDetailView, CartView, CheckoutView...
│   ├── utils/                   # pricingEngine.ts, meshParser.ts
│   ├── workers/                 # cadParser.worker.ts (OpenCASCADE WASM)
│   └── App.tsx                  # App routing & Realtime sync subscriptions
├── supabase/
│   ├── migrations/              # 3 migration đang chạy (helpers → baseline → harden)
│   └── legacy/                  # 6 migration cũ — không chạy
├── scripts/                     # Quality gates & test scripts
└── package.json
```

> Tài liệu đầy đủ: `docs/README.md` (cổng vào) · `docs/architecture/` · `docs/database/` · `docs/security/` · `docs/SETUP_RUNBOOK.md`. `docs/plans/` và `docs/archive/` là tài liệu lịch sử.

