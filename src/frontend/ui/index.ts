/**
 * VCUBE UI primitives — Phase 2 (blocking cho A4 Storefront, A5 Quote tool, A6 Admin).
 *
 * Nguồn sự thật thiết kế: `docs/design/tokens.md` + `docs/plans/21-saas-spec.md`
 * (redesign Modern SaaS — thay thế một phần `docs/plans/12-ui-refactor-spec.md` §2.1/§2.2/§2.5).
 * Mọi class đều là token trong `src/index.css` — KHÔNG hex cứng, sàn chữ 12px.
 *
 * Thang ĐÃ có thật (Đợt 11A): `--text-xs 12 · sm 13 · base 14 · lg 16 · xl 20 · 2xl 24 ·
 * 3xl 30 · 4xl 38`, body mặc định 14px; bán kính `sm 6 · md 8 · lg 12 · xl 16 · modal 14 ·
 * full`; nhịp dọc `--spacing-section 24 / --spacing-block 16 / --spacing-label 4`.
 * Dùng `text-base`/`text-sm`… bình thường (KHÔNG `text-[15px]`), số liệu dùng `tabular-nums`.
 *
 * Luật dùng chung:
 * - Mọi input/select phải đi qua `Field` để luôn có `<label for>` + `aria-describedby`.
 * - Mọi nút chỉ có icon phải có `aria-label` (được ép ở tầng type của `Button`).
 * - Modal/Sheet/ConfirmDialog dùng `<dialog>` + `showModal()` (top-layer, inert, focus trap);
 *   KHÔNG tự dựng `div` overlay.
 * - Số tiền đi qua `Money`; số liệu khác dùng `formatNumber` từ `@frontend/lib/format`.
 * - Prop `className` chỉ nên THÊM class khác nhóm với class nền (`cn()` không merge
 *   xung đột Tailwind — xem `cn.ts`).
 */

export * from './cn';

export * from './AppShell';
export * from './Badge';
export * from './Button';
export * from './Card';
export * from './ConfirmDialog';
export * from './DataTable';
export * from './EmptyState';
export * from './Field';
export * from './Icon';
export * from './InfoTip';
export * from './iconMap';
export * from './Input';
export * from './KeyValue';
export * from './Modal';
export * from './Money';
export * from './PageHeader';
export * from './PanelErrorBoundary';
export * from './ProgressBar';
export * from './Section';
export * from './Select';
export * from './Sheet';
export * from './SideNav';
export * from './Skeleton';
export * from './StatCard';
export * from './Toolbar';
export * from './ToastViewport';
export * from './Topbar';
