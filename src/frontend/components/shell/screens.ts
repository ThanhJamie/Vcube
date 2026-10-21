/**
 * screens — hằng số phân loại route dùng chung giữa `App.tsx` và `AppOverlays` (Phase 4d).
 * Tách ra để AppOverlays dùng chung đúng hằng số, không lặp logic/không đổi điều kiện render.
 */

/**
 * Khu dùng khung RIÊNG (không render Header/Footer storefront) — mỗi màn chỉ có
 * MỘT tầng khung (15-ui-audit.md §2):
 *   - `admin`    : AdminDashboardView tự có sidebar + breadcrumb.
 *   - `lab`      : AppShell (LabDashboardShell) — Đợt 11B nhóm 1.
 *   - `designer` : AppShell (DesignerDashboardShell) — Đợt 11B nhóm 1.
 * Trước Đợt 11B chỉ có `admin`, nên `/lab` và `/designer` bị 2 tầng khung chồng nhau.
 */
export const CHROMELESS_SCREENS = ['admin', 'lab', 'designer'];
/** D-F (Lead duyệt 2026-10-20) — UI-016: ẩn FAB trên 2 route có thanh mua cố định
 * (`ProductDetailView`/`PersonalizeView` render bar `fixed bottom-0 z-sticky`). FAB nằm
 * ở `z-drawer` (40) > `z-sticky` (10) nên trước đây đè nút "Đặt In 3D" ở 390 trong lúc
 * chờ logic auto-hide (~400ms/scroll-settle). Không đổi route; chỉ bỏ FAB khỏi cây. */
export const FAB_HIDDEN_SCREENS = ['product_detail', 'personalize'];
