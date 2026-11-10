/**
 * Shim tương thích — readiness/transition publish nằm ở `src/lib/productPublish.ts`
 * (module trung lập để `dbService` dùng chung mà không import `src/frontend/**`).
 */
export * from '../../lib/productPublish';
