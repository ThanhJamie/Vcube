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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Thiết lập Cơ sở Dữ liệu Supabase (Migration):
Truy cập **Supabase SQL Editor** của dự án bạn và chạy toàn bộ mã DDL từ tệp:
👉 `supabase/migrations/20260904_create_products_and_storage.sql`
*(Tệp này sẽ tự động tạo bảng `products`, phân quyền RLS chặt chẽ, tạo index full-text search và 2 Storage Buckets `product-images`, `cad-files`).*

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
│   ├── backend/supabase/        # Supabase client, database services, storage upload
│   ├── frontend/
│   │   ├── components/          # ThreeModelViewer, CadQuickViewModal, Header, Admin...
│   │   ├── context/             # AuthContext, LanguageContext
│   │   └── views/               # HomeView, ExploreView, ProductDetailView, CartView, CheckoutView...
│   ├── types/                   # TypeScript interfaces (Product, Order, CartItem...)
│   └── App.tsx                  # App routing & Realtime sync subscriptions
├── supabase/
│   └── migrations/              # DDL schema, RLS policies, Storage buckets
├── scripts/                     # Automated testing scripts
└── package.json
```
