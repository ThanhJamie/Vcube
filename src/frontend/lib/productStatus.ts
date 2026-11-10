/**
 * Shim tương thích — implementation đã chuyển sang `src/lib/productStatus.ts` (module trung
 * lập, backend + frontend dùng chung; P2-6: backend không import `src/frontend/**` nữa).
 * Giữ nguyên đường dẫn `@frontend/lib/productStatus` cho UI/tests hiện có.
 */
export * from '../../lib/productStatus';
