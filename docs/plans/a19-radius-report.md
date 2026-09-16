> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Báo cáo A19 — Dọn hệ quả đổi thang radius

Phạm vi: hạ cấp bán kính các **ô vuông / control nhỏ** đang dùng `rounded-lg` (20px) sau khi chủ dự án
chốt phương án "a" (`docs/plans/11-layout-references.md` §6.5) và coordinator đã áp token
(`src/index.css` 8/12/20/28 · `Button.tsx` → `rounded-full`).

- Luật áp dụng (khớp `docs/design/tokens.md` §6): **cạnh ngắn ≤ 32px → `rounded-sm` (8px)** ·
  **33–48px → `rounded-md` (12px)** · **≥ 49px → giữ `rounded-lg`** (card/panel) ·
  **`rounded-full` (pill) không đụng tới**.
- "Cạnh ngắn" chỉ được coi là **biết chắc** khi (a) className khai báo `h-N`/`size-N`, hoặc
  (b) Playwright đo được trên 11 route. Chỗ chỉ suy ra từ `p-N` (container bọc con) **không đổi** —
  xem §6.
- **137 chỗ** sửa trong **31 file**. Kết quả: **0 vi phạm** "bán kính ≥ nửa cạnh ngắn" trên 11 route,
  **0 ô vuông còn bị tròn**, **0 pageerror**.

| Chuyển đổi | Số chỗ |
|---|---:|
| `rounded-lg -> rounded-full` | 3 |
| `rounded-lg -> rounded-md` | 71 |
| `rounded-lg -> rounded-sm` | 61 |
| `rounded-md -> rounded-sm` | 2 |
| **Tổng** | **137** |


## 1. Bảng 137 chỗ đã sửa (`file:line` → cạnh → class)

Cột "căn cứ": `đo` = Playwright đo được (width×height thật) · `h-N` = khai báo cứng trong className ·
`~Npx` = suy từ hình dạng đã đo ở chỗ khác (py + text-size).

| # | file:line | căn cứ | cũ | mới |
|---:|---|---|---|---|
| 1 | `src/App.tsx:140` | do duoc ~38 | `rounded-lg` | `rounded-md` |
| 2 | `src/App.tsx:266` | do duoc ~38 | `rounded-lg` | `rounded-md` |
| 3 | `src/App.tsx:272` | do duoc ~38 | `rounded-lg` | `rounded-md` |
| 4 | `src/frontend/components/AuthModal.tsx:257` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 5 | `src/frontend/components/AuthModal.tsx:280` | nut icon ~30px | `rounded-lg` | `rounded-sm` |
| 6 | `src/frontend/components/AuthModal.tsx:428` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 7 | `src/frontend/components/AuthModal.tsx:670` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 8 | `src/frontend/components/AuthModal.tsx:692` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 9 | `src/frontend/components/AuthModal.tsx:714` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 10 | `src/frontend/components/CadQuickViewModal.tsx:163` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 11 | `src/frontend/components/CadQuickViewModal.tsx:171` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 12 | `src/frontend/components/CartDrawer.tsx:118` | nut icon ~30px | `rounded-lg` | `rounded-sm` |
| 13 | `src/frontend/components/Header.tsx:210` | do duoc 118x30 | `rounded-lg` | `rounded-sm` |
| 14 | `src/frontend/components/Header.tsx:217` | do duoc 100x28 | `rounded-lg` | `rounded-sm` |
| 15 | `src/frontend/components/InvoiceModal.tsx:42` | canh ngan 28px <= 32 (h-7) | `rounded-lg` | `rounded-sm` |
| 16 | `src/frontend/components/MaterialComparisonMatrix.tsx:157` | do duoc 496x36 | `rounded-lg` | `rounded-md` |
| 17 | `src/frontend/components/MaterialComparisonMatrix.tsx:168` | do duoc 88x28 | `rounded-lg` | `rounded-sm` |
| 18 | `src/frontend/components/MaterialComparisonMatrix.tsx:269` | do duoc 68x24 | `rounded-lg` | `rounded-sm` |
| 19 | `src/frontend/components/MaterialComparisonMatrix.tsx:285` | do duoc 108x22 | `rounded-md` | `rounded-sm` |
| 20 | `src/frontend/components/MaterialComparisonMatrix.tsx:386` | do duoc 352x38 | `rounded-lg` | `rounded-md` |
| 21 | `src/frontend/components/PageSkeleton.tsx:24` | canh ngan 28px <= 32 (h-7) | `rounded-lg` | `rounded-sm` |
| 22 | `src/frontend/components/PageSkeleton.tsx:96` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 23 | `src/frontend/components/PageSkeleton.tsx:97` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 24 | `src/frontend/components/PageSkeleton.tsx:98` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 25 | `src/frontend/components/PageSkeleton.tsx:103` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 26 | `src/frontend/components/PageSkeleton.tsx:109` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 27 | `src/frontend/components/ThreeModelViewer.tsx:388` | slider track (pill co y, hinh dang khong doi) | `rounded-lg` | `rounded-full` |
| 28 | `src/frontend/components/admin/AdminProductsPanel.tsx:221` | canh ngan 44px 33..48 (h-11) | `rounded-lg` | `rounded-md` |
| 29 | `src/frontend/components/admin/AdminSidebar.tsx:222` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 30 | `src/frontend/components/admin/PricingConfigPanel.tsx:409` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 31 | `src/frontend/components/admin/PricingConfigPanel.tsx:520` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 32 | `src/frontend/components/admin/PricingConfigPanel.tsx:616` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 33 | `src/frontend/components/admin/PricingConfigPanel.tsx:820` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 34 | `src/frontend/components/admin/PricingConfigPanel.tsx:859` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 35 | `src/frontend/components/admin/PricingConfigPanel.tsx:906` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 36 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:142` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 37 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:179` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 38 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:205` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 39 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:236` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 40 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:281` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 41 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx:345` | canh ngan 28px <= 32 (h-7) | `rounded-lg` | `rounded-sm` |
| 42 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx:412` | chip ~30px | `rounded-lg` | `rounded-sm` |
| 43 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx:519` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 44 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx:745` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 45 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx:816` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 46 | `src/frontend/components/auth/UserAvatarMenu.tsx:141` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 47 | `src/frontend/components/auth/UserAvatarMenu.tsx:177` | canh ngan 44px 33..48 (h-11) | `rounded-lg` | `rounded-md` |
| 48 | `src/frontend/components/auth/UserAvatarMenu.tsx:219` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 49 | `src/frontend/components/auth/UserAvatarMenu.tsx:242` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 50 | `src/frontend/components/auth/UserAvatarMenu.tsx:260` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 51 | `src/frontend/components/auth/UserAvatarMenu.tsx:292` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 52 | `src/frontend/components/auth/UserAvatarMenu.tsx:347` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 53 | `src/frontend/components/auth/UserAvatarMenu.tsx:370` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 54 | `src/frontend/components/auth/UserAvatarMenu.tsx:402` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 55 | `src/frontend/components/auth/UserAvatarMenu.tsx:420` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 56 | `src/frontend/components/auth/UserAvatarMenu.tsx:443` | canh ngan 36px 33..48 (h-9) | `rounded-lg` | `rounded-md` |
| 57 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx:621` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 58 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx:863` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 59 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx:921` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 60 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx:1175` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 61 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1612` | rail boc nut 30px ~ | `rounded-lg` | `rounded-md` |
| 62 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1639` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 63 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1651` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 64 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1676` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 65 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1686` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 66 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1698` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 67 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1710` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 68 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1719` | HUD boc nut 30px ~ | `rounded-lg` | `rounded-md` |
| 69 | `src/frontend/components/tool3d/ModelViewer3D.tsx:1840` | slider track (pill co y, hinh dang khong doi) | `rounded-lg` | `rounded-full` |
| 70 | `src/frontend/components/tool3d/PresetPalettePanel.tsx:294` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 71 | `src/frontend/components/tool3d/StlUnitConfirmModal.tsx:53` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 72 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:41` | do duoc 184x26 | `rounded-lg` | `rounded-sm` |
| 73 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:47` | do duoc 38x20 | `rounded-md` | `rounded-sm` |
| 74 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:70` | nut icon 30x30 (do duoc) | `rounded-lg` | `rounded-sm` |
| 75 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:86` | nut icon 30x30 (do duoc) | `rounded-lg` | `rounded-sm` |
| 76 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:99` | nut icon 30x30 (do duoc) | `rounded-lg` | `rounded-sm` |
| 77 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:112` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 78 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:124` | nut icon 30x30 | `rounded-lg` | `rounded-sm` |
| 79 | `src/frontend/views/AdminDashboardView.tsx:309` | nut icon ~36-40px | `rounded-lg` | `rounded-md` |
| 80 | `src/frontend/views/CheckoutView.tsx:198` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 81 | `src/frontend/views/CheckoutView.tsx:219` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 82 | `src/frontend/views/CheckoutView.tsx:242` | do duoc 239x30 | `rounded-lg` | `rounded-sm` |
| 83 | `src/frontend/views/CheckoutView.tsx:272` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 84 | `src/frontend/views/CheckoutView.tsx:285` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 85 | `src/frontend/views/CheckoutView.tsx:298` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 86 | `src/frontend/views/CheckoutView.tsx:309` | do duoc 384x40 | `rounded-lg` | `rounded-md` |
| 87 | `src/frontend/views/CheckoutView.tsx:331` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 88 | `src/frontend/views/CheckoutView.tsx:344` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 89 | `src/frontend/views/CheckoutView.tsx:356` | do duoc 384x38 | `rounded-lg` | `rounded-md` |
| 90 | `src/frontend/views/CheckoutView.tsx:561` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 91 | `src/frontend/views/DesignerDashboardView.tsx:347` | canh ngan 44px 33..48 (h-11) | `rounded-lg` | `rounded-md` |
| 92 | `src/frontend/views/ExploreView.tsx:258` | do duoc 482x26 | `rounded-lg` | `rounded-sm` |
| 93 | `src/frontend/views/ExploreView.tsx:279` | do duoc 352x38 | `rounded-lg` | `rounded-md` |
| 94 | `src/frontend/views/ExploreView.tsx:322` | do duoc 87-174x28-30 | `rounded-lg` | `rounded-sm` |
| 95 | `src/frontend/views/ExploreView.tsx:458` | do duoc 246x32 | `rounded-lg` | `rounded-sm` |
| 96 | `src/frontend/views/ExploreView.tsx:478` | do duoc 246x32 | `rounded-lg` | `rounded-sm` |
| 97 | `src/frontend/views/ExploreView.tsx:507` | do duoc 120x30 | `rounded-lg` | `rounded-sm` |
| 98 | `src/frontend/views/ExploreView.tsx:518` | do duoc 120x30 | `rounded-lg` | `rounded-sm` |
| 99 | `src/frontend/views/ExploreView.tsx:529` | do duoc 120x30 | `rounded-lg` | `rounded-sm` |
| 100 | `src/frontend/views/ExploreView.tsx:540` | do duoc 120x30 | `rounded-lg` | `rounded-sm` |
| 101 | `src/frontend/views/ExploreView.tsx:586` | do duoc 246x28 | `rounded-lg` | `rounded-sm` |
| 102 | `src/frontend/views/ExploreView.tsx:599` | do duoc 246x28 | `rounded-lg` | `rounded-sm` |
| 103 | `src/frontend/views/ExploreView.tsx:676` | do duoc 66x34 | `rounded-lg` | `rounded-md` |
| 104 | `src/frontend/views/ExploreView.tsx:679` | nut segmented 28x28 (do duoc) | `rounded-lg` | `rounded-sm` |
| 105 | `src/frontend/views/ExploreView.tsx:688` | nut segmented 28x28 (do duoc) | `rounded-lg` | `rounded-sm` |
| 106 | `src/frontend/views/ExploreView.tsx:702` | do duoc 153x31 | `rounded-lg` | `rounded-sm` |
| 107 | `src/frontend/views/ExploreView.tsx:730` | do duoc 188x36 | `rounded-lg` | `rounded-md` |
| 108 | `src/frontend/views/ExploreView.tsx:879` | CTA ~38px | `rounded-lg` | `rounded-md` |
| 109 | `src/frontend/views/ExploreView.tsx:958` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 110 | `src/frontend/views/HomeView.tsx:237` | do duoc 359x26 | `rounded-lg` | `rounded-sm` |
| 111 | `src/frontend/views/HomeView.tsx:272` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 112 | `src/frontend/views/HomeView.tsx:328` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 113 | `src/frontend/views/HomeView.tsx:442` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 114 | `src/frontend/views/HomeView.tsx:518` | do duoc 384x34 | `rounded-lg` | `rounded-md` |
| 115 | `src/frontend/views/HomeView.tsx:538` | do duoc 74x40 | `rounded-lg` | `rounded-md` |
| 116 | `src/frontend/views/HomeView.tsx:561` | do duoc 167x34 | `rounded-lg` | `rounded-md` |
| 117 | `src/frontend/views/HomeView.tsx:627` | do duoc 70-198x24-26 | `rounded-lg` | `rounded-sm` |
| 118 | `src/frontend/views/HomeView.tsx:680` | do duoc 198x36 | `rounded-lg` | `rounded-md` |
| 119 | `src/frontend/views/HomeView.tsx:877` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 120 | `src/frontend/views/HomeView.tsx:941` | do duoc 210x32 | `rounded-lg` | `rounded-sm` |
| 121 | `src/frontend/views/HomeView.tsx:990` | do duoc 292x39 | `rounded-lg` | `rounded-md` |
| 122 | `src/frontend/views/HomeView.tsx:1019` | do duoc 93x32 | `rounded-lg` | `rounded-sm` |
| 123 | `src/frontend/views/LoginView.tsx:77` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 124 | `src/frontend/views/OrderSuccessView.tsx:152` | canh ngan 40px 33..48 (h-10) | `rounded-lg` | `rounded-md` |
| 125 | `src/frontend/views/OrderSuccessView.tsx:210` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 126 | `src/frontend/views/ProductDetailView.tsx:213` | do duoc 66x34 | `rounded-lg` | `rounded-md` |
| 127 | `src/frontend/views/RegisterView.tsx:136` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 128 | `src/frontend/views/RegisterView.tsx:180` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 129 | `src/frontend/views/RegisterView.tsx:202` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 130 | `src/frontend/views/RegisterView.tsx:224` | canh ngan 32px <= 32 (h-8) | `rounded-lg` | `rounded-sm` |
| 131 | `src/frontend/views/Tool3DView.tsx:324` | do duoc 322x36 | `rounded-lg` | `rounded-md` |
| 132 | `src/frontend/views/Tool3DView.tsx:610` | canh ngan 48px 33..48 (h-12) | `rounded-lg` | `rounded-md` |
| 133 | `src/frontend/views/Tool3DView.tsx:638` | do duoc 322x36 | `rounded-lg` | `rounded-md` |
| 134 | `src/frontend/views/Tool3DView.tsx:880` | slider track (pill co y, hinh dang khong doi) | `rounded-lg` | `rounded-full` |
| 135 | `src/frontend/views/WorkshopSettingsView.tsx:561` | canh ngan 44px 33..48 (h-11) | `rounded-lg` | `rounded-md` |
| 136 | `src/frontend/views/WorkshopSettingsView.tsx:769` | canh ngan 44px 33..48 (h-11) | `rounded-lg` | `rounded-md` |
| 137 | `src/frontend/views/WorkshopSettingsView.tsx:919` | canh ngan 28px <= 32 (h-7) | `rounded-lg` | `rounded-sm` |

### 1.1 Phân bố theo file

| File | Số chỗ |
|---|---:|
| `src/frontend/views/ExploreView.tsx` | 18 |
| `src/frontend/views/HomeView.tsx` | 13 |
| `src/frontend/components/auth/UserAvatarMenu.tsx` | 11 |
| `src/frontend/views/CheckoutView.tsx` | 11 |
| `src/frontend/components/tool3d/ModelViewer3D.tsx` | 9 |
| `src/frontend/components/tool3d/UnifiedCadToolbar.tsx` | 7 |
| `src/frontend/components/AuthModal.tsx` | 6 |
| `src/frontend/components/PageSkeleton.tsx` | 6 |
| `src/frontend/components/admin/PricingConfigPanel.tsx` | 6 |
| `src/frontend/components/MaterialComparisonMatrix.tsx` | 5 |
| `src/frontend/components/admin/groups/Group0OverviewPanel.tsx` | 5 |
| `src/frontend/components/admin/groups/Group5ProductionPanel.tsx` | 5 |
| `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` | 4 |
| `src/frontend/views/RegisterView.tsx` | 4 |
| `src/frontend/views/Tool3DView.tsx` | 4 |
| `src/App.tsx` | 3 |
| `src/frontend/views/WorkshopSettingsView.tsx` | 3 |
| `src/frontend/components/CadQuickViewModal.tsx` | 2 |
| `src/frontend/components/Header.tsx` | 2 |
| `src/frontend/views/OrderSuccessView.tsx` | 2 |
| `src/frontend/components/CartDrawer.tsx` | 1 |
| `src/frontend/components/InvoiceModal.tsx` | 1 |
| `src/frontend/components/ThreeModelViewer.tsx` | 1 |
| `src/frontend/components/admin/AdminProductsPanel.tsx` | 1 |
| `src/frontend/components/admin/AdminSidebar.tsx` | 1 |
| `src/frontend/components/tool3d/PresetPalettePanel.tsx` | 1 |
| `src/frontend/components/tool3d/StlUnitConfirmModal.tsx` | 1 |
| `src/frontend/views/AdminDashboardView.tsx` | 1 |
| `src/frontend/views/DesignerDashboardView.tsx` | 1 |
| `src/frontend/views/LoginView.tsx` | 1 |
| `src/frontend/views/ProductDetailView.tsx` | 1 |

### 1.2 Đối chiếu với bảng 57 chỗ của coordinator

Lệnh kiểm tra (sau khi sửa) — **còn 0**:

```bash
grep -rnE '"[^"]*rounded-lg[^"]*"' src --include='*.tsx' | grep -E '\b(w|h)-(7|8|9|10|11|12)\b' | wc -l
# -> 0
```

- Cả **57 dòng** khớp lệnh grep trên đã được hạ cấp (kể cả 4 dòng là **thanh skeleton** `h-7 w-64`,
  `h-10 w-full`, `h-12 w-full`, `h-8 w-full` — chúng không phải ô vuông nhưng cùng lớp lỗi:
  r20 trên thanh 28–48px ⇒ hai đầu thành pill).
- Bảng của coordinator cộng ra 60 chỗ (3+18+16+10+5+8); lệnh grep thực tế trả **57 dòng** — chênh 3
  vì 3 dòng đếm trùng/không có `w-N` tương ứng. Con số dùng được là **57 dòng grep**, và nay = 0.
- Chỗ **không** đổi dù nằm trong grep: không có. Chỗ **đổi thêm ngoài grep**: 80 chỗ (xem §2).

## 2. P2 — quét thêm được gì (ngoài `w-N h-N`)

| # | Trường hợp | Số chỗ | Xử lý |
|---|---|---:|---|
| 1 | **Ô vuông sinh từ padding** (`p-1.5` + icon 18–20px ⇒ 28–32px) — grep P1 **không** bắt vì không có `w-N h-N` | 19 | `rounded-sm` (2 container bọc → `rounded-md`) |
| 2 | **Class radius trong template/ternary** (`` className={`... ${cond ? ...}`} ``) | 38 | cùng luật, script sửa theo *literal* chứ không theo dòng |
| 3 | **Thumbnail/ảnh nhỏ** `object-cover rounded-lg` (w-12 h-12, w-11 h-11) | 9 | `rounded-md` |
| 4 | **Input/select** nhỏ (`py-2`…`py-2.5` ⇒ 34–40px) — token §6 nói input/select = `--radius-md` | 16 | `rounded-md` |
| 5 | **Ô vuông dùng `rounded-xl`/`rounded-2xl`** | **0** | không tồn tại trong repo |
| 6 | **Ô vuông dùng `rounded` trần** | **0** | không tồn tại trong repo |
| 7 | **Thanh slider 6–8px** dùng `rounded-lg` (radius bị kẹp = pill ngầm) | 3 | `rounded-full` — **cố ý**, hình dạng không đổi, chỉ nói rõ ý định |
| 8 | **`rounded-md` trên chip 20–22px** (đã vi phạm từ trước, không do lượt đổi token này) | 2 | `rounded-sm` |
| 9 | **Nút icon `lg:hidden`** ở `/admin` (36–40px) | 1 | `rounded-md` |

Tổng số *token* đã hạ cấp: **135 `rounded-lg` + 2 `rounded-md`**.
`rounded-full` giữ nguyên **221 chỗ** (pill cố ý: `ui/Button`, avatar, công tắc, chip tròn).

**Không sửa** (đúng luật "card/panel lớn thì giữ"): 16 literal `rounded-lg` có `h-13`…`h-20`/`h-32`/`h-80`
(52–320px) — thumbnail lớn, card thống kê, panel. Liệt kê đầy đủ trong output patch (`GIU rounded-lg`).

## 3. Bằng chứng tự động — red test (trước) → green (sau)

Script: `C:\Users\chith\AppData\Local\Temp\pwtest\pw-radius-check.cjs`
(11 route: `/`, `/explore`, `/quote`, `/cart`, `/checkout`, `/orders`, `/assets`, `/auth/login`,
`/auth/register`, `/lab`, `/duong-dan-la`; Edge qua Playwright; assert 0 vi phạm + 0 pageerror).

### 3.1 TRƯỚC khi sửa — FAIL (89 vi phạm, 8 ô vuông tròn)

```text
=============== RADIUS CHECK — BEFORE ===============
ROUTE             HTTP  VI PHAM  TRON(r20)  PILL(dung)  390ovf  PAGEERR
/                 200   36       3          2           178     0
/explore          200   23       1          1           178     0
/quote            200   3        0          1           178     0
/cart             200   2        0          0           178     0
/checkout         200   10       1          3           178     0
/orders           200   2        0          0           178     0
/assets           200   2        0          0           178     0
/auth/login       200   2        0          0           178     0
/auth/register    200   5        3          0           178     0
/lab              200   2        0          0           178     0
/duong-dan-la     200   2        0          0           178     0

--- 1) VI PHAM "ban kinh >= nua canh ngan" (tru pill) ---
  [/] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/] 359x26 r=20 <div> inline-flex items-center gap-2 px-3 py-1 bg-white border border-line rounded-lg text-xs uppercase font-mono tracking-[0.2em] text-
  [/] 40x40 r=20 <div> w-10 h-10 rounded-lg flex items-center justify-center transition-transform bg-primary/10 text-primary group-hover:scale-105
  [/] 184x26 r=20 <div> hidden sm:flex items-center gap-0.5 bg-surface-inverse p-0.5 rounded-lg border border-surface-inverse-raised/40 mr-1 text-xs font-
  [/] 38x20 r=12 <button> px-2 py-0.5 rounded-md uppercase font-bold transition-colors cursor-pointer bg-primary text-white shadow-e1
  [/] 30x30 r=20 <button> p-1.5 rounded-lg hover:bg-surface-inverse-raised transition-colors cursor-pointer text-accent bg-primary/30
  [/] 32x32 r=20 <div> w-8 h-8 rounded-lg bg-teal-50 text-primary flex items-center justify-center shrink-0 border border-teal-200
  [/] 384x34 r=20 <input> w-full pl-9 pr-8 py-2 bg-white border border-line text-xs text-fg placeholder-fg-subtle focus:outline-none focus:border-primary ro
  [/] 74x40 r=20 <div> flex items-center gap-1 bg-white border border-line p-1 rounded-lg
  [/] 167x34 r=20 <button> px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/30 transition-all flex
  [/] 70x24 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-prima
  [/] 155x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-red-5
  [/] 144x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 101x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 166x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 152x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 152x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 159x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 123x26 r=20 <button> px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer bg-white
  [/] 198x36 r=20 <button> px-5 py-2.5 bg-primary text-white text-xs font-tech font-bold uppercase rounded-lg hover:bg-primary-hover transition-colors cursor
  [/] 210x32 r=20 <button> px-4 py-2 bg-surface-inverse hover:bg-surface-inverse-raised text-white font-tech font-bold text-xs uppercase tracking-wider round
  [/] 292x39 r=20 <select> w-full bg-canvas border border-line p-2.5 text-xs text-fg font-bold rounded-lg focus:outline-none focus:border-primary cursor-poin
  [/] 93x32 r=20 <button> py-2 text-xs font-bold rounded-lg transition-all uppercase cursor-pointer bg-line-subtle text-fg-subtle hover:bg-line-subtle
  [/] 93x32 r=20 <button> py-2 text-xs font-bold rounded-lg transition-all uppercase cursor-pointer bg-primary text-white shadow-e1
  [/] 93x32 r=20 <button> py-2 text-xs font-bold rounded-lg transition-all uppercase cursor-pointer bg-line-subtle text-fg-subtle hover:bg-line-subtle
  [/] 496x36 r=20 <div> flex items-center gap-1.5 overflow-x-auto bg-line-subtle p-1 rounded-lg
  [/] 88x28 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer bg-white text-primary shadow-e1
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 68x24 r=20 <button> px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer
  [/] 108x22 r=12 <span> px-2.5 py-0.5 bg-white border border-line text-xs font-mono font-bold text-primary rounded-md uppercase
  [/] 352x38 r=20 <button> w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all sh
  [/explore] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/explore] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/explore] 482x26 r=20 <div> inline-flex items-center gap-2 px-3 py-1 bg-white border border-line rounded-lg text-xs uppercase font-mono tracking-[0.2em] text-
  [/explore] 352x38 r=20 <input> w-full pl-9 pr-8 py-2.5 bg-white border border-line text-xs text-fg placeholder-fg-subtle focus:outline-none focus:border-primary 
  [/explore] 87x28 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-pri
  [/explore] 174x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-red
  [/explore] 161x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 118x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 183x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 168x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 168x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 176x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 140x30 r=20 <button> px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-can
  [/explore] 246x32 r=20 <button> w-full text-left px-3 py-2 text-xs rounded-lg transition-all flex items-center justify-between cursor-pointer bg-primary text-whit
  [/explore] 120x30 r=20 <button> py-1.5 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer text-center bg-canvas text-fg-muted border
  [/explore] 120x30 r=20 <button> py-1.5 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer text-center bg-canvas text-fg-muted border
  [/explore] 120x30 r=20 <button> py-1.5 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer text-center bg-canvas text-fg-muted border
  [/explore] 120x30 r=20 <button> py-1.5 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer text-center bg-canvas text-fg-muted border
  [/explore] 246x28 r=20 <button> w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer bg-primary/10
  [/explore] 66x34 r=20 <div> flex items-center gap-1 bg-canvas border border-line p-0.5 rounded-lg
  [/explore] 28x28 r=20 <button> p-1.5 rounded-lg text-xs transition-all cursor-pointer bg-primary text-white shadow-e0
  [/explore] 153x31 r=20 <select> bg-white border border-line py-1.5 px-2.5 text-xs text-fg font-bold focus:outline-none focus:border-primary cursor-pointer rounded
  [/explore] 188x36 r=20 <button> px-6 py-2.5 bg-primary text-white text-xs uppercase font-mono font-bold tracking-wider hover:bg-primary-hover transition-colors ro
  [/quote] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/quote] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/quote] 322x36 r=20 <label> inline-block px-6 py-2.5 bg-surface-inverse hover:bg-primary text-white text-xs uppercase tracking-wider font-bold cursor-pointer 
  [/cart] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/cart] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/checkout] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/checkout] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/checkout] 40x40 r=20 <div> w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-e1
  [/checkout] 239x30 r=20 <a> px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-mono font-bold tran
  [/checkout] 384x38 r=20 <input> w-full bg-canvas border border-line px-3.5 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary
  [/checkout] 384x38 r=20 <input> w-full bg-canvas border border-line px-3.5 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary
  [/checkout] 785x38 r=20 <input> w-full bg-canvas border border-line px-3.5 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary
  [/checkout] 384x40 r=20 <select> w-full bg-canvas border border-line px-3 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary cursor-pointer
  [/checkout] 384x38 r=20 <input> w-full bg-canvas border border-line px-3.5 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary
  [/checkout] 785x38 r=20 <input> w-full bg-canvas border border-line px-3.5 py-2.5 text-xs text-fg rounded-lg focus:outline-none focus:border-primary
  [/orders] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/orders] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/assets] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/assets] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/auth/login] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/auth/login] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/auth/register] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/auth/register] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/auth/register] 32x32 r=20 <div> w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white
  [/auth/register] 32x32 r=20 <div> w-8 h-8 rounded-lg flex items-center justify-center bg-slate-200 text-slate-600
  [/auth/register] 32x32 r=20 <div> w-8 h-8 rounded-lg flex items-center justify-center bg-slate-200 text-slate-600
  [/lab] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/lab] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  [/duong-dan-la] 118x30 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/duong-dan-la] 100x28 r=20 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all flex items-center g
  TONG VI PHAM: 89

--- 2) O VUONG 20-60px BI TRON (phep do cua coordinator) ---
  [/] 40px → r20 TRON :: w-10 h-10 rounded-lg flex items-center justify-center transition-transform bg-primary/10 text-primary group-hover:scale-105
  [/] 30px → r20 TRON :: p-1.5 rounded-lg hover:bg-surface-inverse-raised transition-colors cursor-pointer text-accent bg-primary/30
  [/] 32px → r20 TRON :: w-8 h-8 rounded-lg bg-teal-50 text-primary flex items-center justify-center shrink-0 border border-teal-200
  [/explore] 28px → r20 TRON :: p-1.5 rounded-lg text-xs transition-all cursor-pointer bg-primary text-white shadow-e0
  [/checkout] 40px → r20 TRON :: w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-e1
  [/auth/register] 32px → r20 TRON :: w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white
  [/auth/register] 32px → r20 TRON :: w-8 h-8 rounded-lg flex items-center justify-center bg-slate-200 text-slate-600
  [/auth/register] 32px → r20 TRON :: w-8 h-8 rounded-lg flex items-center justify-center bg-slate-200 text-slate-600

--- 3) TRAN NGANG @390px (da biet loi Header — ghi nhan, khong sua luot nay) ---
  [/] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/explore] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/quote] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/cart] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/checkout] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/orders] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/assets] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/auth/login] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/auth/register] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/lab] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al
  [/duong-dan-la] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-lg border border-line transition-al

--- 4) PAGEERROR ---
  0 pageerror tren 11 route.

================ KET LUAN BEFORE ================
  vi pham radius : 89   (ky vong: > 0)
  o vuong bi tron: 8
  pageerror      : 0
  KET QUA        : FAIL
  Anh 1440px     : C:\Users\chith\AppData\Local\Temp\pwtest\before
```

### 3.2 SAU khi sửa — PASS (0 vi phạm, 0 ô vuông tròn, 0 pageerror)

```text
=============== RADIUS CHECK — AFTER ===============
ROUTE             HTTP  VI PHAM  TRON(r20)  PILL(dung)  390ovf  PAGEERR
/                 200   0        0          2           178     0
/explore          200   0        0          1           178     0
/quote            200   0        0          1           178     0
/cart             200   0        0          0           178     0
/checkout         200   0        0          3           178     0
/orders           200   0        0          0           178     0
/assets           200   0        0          0           178     0
/auth/login       200   0        0          0           178     0
/auth/register    200   0        0          0           178     0
/lab              200   0        0          0           178     0
/duong-dan-la     200   0        0          0           178     0

--- 1) VI PHAM "ban kinh >= nua canh ngan" (tru pill) ---
  KHONG CO VI PHAM.

--- 2) O VUONG 20-60px BI TRON (phep do cua coordinator) ---
  KHONG CON O VUONG NAO BI TRON (ngoai pill).

--- 3) TRAN NGANG @390px (da biet loi Header — ghi nhan, khong sua luot nay) ---
  [/] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/explore] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/quote] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/cart] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/checkout] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/orders] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/assets] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/auth/login] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/auth/register] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/lab] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al
  [/duong-dan-la] +178px  (0 phan tu vuot)
        389px right=568 <div> flex items-center gap-2 sm:gap-3 shrink-0
        215px right=516 <div> flex items-center gap-1.5 sm:gap-2
        114px right=414 <a> px-3 sm:px-3.5 py-1.5 text-xs font-bold text-fg hover:text-primary hover:bg-primary/10 rounded-sm border border-line transition-al

--- 4) PAGEERROR ---
  0 pageerror tren 11 route.

================ KET LUAN AFTER ================
  vi pham radius : 0   (ky vong: = 0)
  o vuong bi tron: 0
  pageerror      : 0
  KET QUA        : PASS
  Anh 1440px     : C:\Users\chith\AppData\Local\Temp\pwtest\after
```

## 4. Gate

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **RC=0** (output: chỉ `> tsc --noEmit`, không lỗi) |
| Build | `npx vite build --outDir /tmp/vc-verify-a19 --emptyOutDir` | **RC=0** — `✓ 1847 modules transformed.` · `✓ built in 4.68s` |
| Tương phản | `node scripts/check-contrast.mjs` | **RC=0** — `64/74 pass, 10 expected non-pass, 0 unexpected fail` |
| Radius | `node pw-radius-check.cjs after` | **RC=0** — `vi pham radius: 0 · o vuong bi tron: 0 · pageerror: 0 · KET QUA: PASS` |

KPI token (`docs/design/tokens.md` §10, không đổi so với trước lượt này):
`grep -c '\[#' src --include='*.tsx'` = **0** · `text-[Npx]`/`text-[1Npx]` = **0** ·
`--radius-*` trong `src/index.css` vẫn **8/12/20/28/9999** (không sửa).

## 5. Ảnh trước/sau & chỗ còn xấu nhưng NGOÀI phạm vi

Ảnh 1440px (Edge, `networkidle` + 1,4s): `/`, `/explore`, `/quote`, `/auth/login`, `/cart`

- TRƯỚC: `C:\Users\chith\AppData\Local\Temp\pwtest\before\` (home, explore, quote, login, cart)
- SAU: `C:\Users\chith\AppData\Local\Temp\pwtest\after\`
- Soi mắt: các icon-button 28–32px ở thanh preset của viewport 3D và segmented grid/list ở `/explore`
  đã từ **hình tròn → hình vuông bo 8px**; chip lọc ở `/explore` và link nav ở header gọn lại;
  input/select ở `/checkout` bo 12px. **Không thấy chỗ nào xấu đi.**

Còn xấu **nhưng ngoài phạm vi A19** (chỉ ghi nhận, KHÔNG sửa):

1. **Tràn ngang 390px = +178px trên MỌI route** — lỗi Header đã biết (Track A/B). Trước = sau (không
   tệ thêm). Phần tử vượt: `div.flex items-center gap-2 sm:gap-3 shrink-0` (right=568).
2. **Palette thô `slate-*`/`teal-*`/`amber-*`** còn nhiều (header, `UserAvatarMenu`, admin panels) — Track A.
3. **Số liệu bịa ở `HomeView`**: `±0.05 MM`, `63 KỸ SƯ VCUBE 24/7`, `ISO/ASTM 52900` (`|| '±0.05 MM'`) —
   vi phạm `docs/design/data-honesty.md`, thuộc Track A/B.
4. **Emoji cờ** `🇻🇳` trong nút đổi ngôn ngữ ở header.
5. **`/admin`, `/designer`, modal, drawer chưa xem được** (cần tài khoản admin) — xem §6.
6. **`ui/Skeleton` `variant='text'`**: `h-3` (12px) + `rounded-sm` (8px) ⇒ hai đầu thành pill. **Không sửa**
   vì (a) `src/frontend/ui/**` thuộc diện cấm sửa, (b) đây là hành vi **có từ trước** (thang cũ
   `--radius-sm: 6px` = đúng nửa 12px), không phải hệ quả của lượt đổi token này.
7. **`HomeView.tsx:272`** — nút "KHÁM PHÁ KHO MẪU CAD" (`h-12 px-7`) nay là `rounded-md` (12px) trong khi
   CTA chính cạnh nó là pill (`ui/Button`). Đọc theo `tokens.md` §6/§8 ("nút = pill") thì chỗ này **nên**
   là `rounded-full`; tôi giữ `rounded-md` vì nhiệm vụ là *hạ cấp*, không phải chuyển nút sang pill.
   **Cần chủ dự án chốt** (1 dòng, xem §6).

## 6. Việc còn lại / rủi ro

1. **~371 chỗ `rounded-lg` suy từ padding ở vùng KHÔNG render được** (admin, modal, drawer, các view cần
   dữ liệu DB) chưa xác minh được cạnh ngắn. Chúng cùng lớp lỗi (r20 trên chip 24–34px ⇒ hai đầu pill),
   **không phải hồi quy** của lượt này (trước đổi token là 12px, nay 20px). Đã cố ý **không sửa mù**:
   phần lớn nằm trong cụm "track + chip con" dùng chung `rounded-lg`; sửa nửa vời (đổi track mà không đổi
   chip con) sẽ tệ hơn để nguyên. Cần: seed DB + tài khoản admin → mở rộng script sang `/admin`,
   `/designer`, `/personalize`, `/products/:slug`, modal/drawer rồi sửa theo số đo thật.
   Cách đếm đã dùng: tách **từng string literal của `className`/template literal** trong mọi file `.tsx`
   của `src` → **1.063 literal chứa `rounded-lg`**, rồi xác định cạnh ngắn của từng literal:
   **71 literal** có `h-N` (đã xử lý) · **16 literal** `h-13`…`h-80` = 52–320px (giữ `rounded-lg`) ·
   **~371 literal** chỉ suy được từ `py-N` (chip/nút/input ⇒ gần như chắc chắn vi phạm, chưa sửa) ·
   **~559 literal** chỉ có `p-N` (không đo được: card/panel, hoặc hộp bọc con nên chiều cao thật lớn hơn).
   File nặng nhất (số literal còn `rounded-lg`): `Group1WorkshopsPanel` (79), `AdminStorefrontPanel` (56), `WorkshopSettingsView` (54),
   `WorkshopOnboardingWizard` (50), `Group3CustomersPanel` (49), `Group5ProductionPanel` (47).
2. **Chuyển nút thô → pill**: sau lượt này, các `<button>`/`<a>` thô là hình chữ nhật bo 12px trong khi
   `ui/Button` là pill. Đây là quyết định đã có trong `tokens.md` §8 ("nút = pill") nhưng chưa được thi
   công ở tầng component — thuộc phạm vi migrate khác, không phải A19.
3. **`docs/design/tokens.md` §9** vẫn ghi giá trị radius **cũ** (6/8/12) trong khối `@theme` mẫu — lệch với
   `src/index.css` (8/12/20/28). Tôi **không sửa** vì tài liệu không thuộc danh sách file của A19; đề nghị
   người viết spec cập nhật để tránh copy nhầm.
