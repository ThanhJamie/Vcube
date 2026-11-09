<!-- doc-meta: status=active; verified=2026-11-06; owner=po -->
# PO Acceptance — VCUBE “world-class”

Đây là **hợp đồng nghiệm thu** mà bộ máy `scripts/po-audit.mjs` dùng để chấm điểm tự động.
Ngưỡng “PO satisfied”: **score ≥ 85/100 và 0 tiêu chí P0 fail**.

## 1. Người dùng phải “tận hưởng” được gì

| Trụ cột | Kỳ vọng world-class | Cách đo |
|---|---|---|
| **Tin cậy** | Không dữ liệu bịa, không ảnh chết, không trang “nói sai” (empty-state trung thực) | `scripts/audit-demo-data.mjs`, ảnh vỡ = 0 |
| **Tốc độ** | LCP < 2,5s · CLS < 0,1 · JS ban đầu < 250KB gzip | audit build + browser (PerformanceObserver) |
| **Hoàn tất hành trình** | Xem → báo giá → mua → **nhận file** → theo dõi → hậu mãi | `docs/po/acceptance.json` flags + smoke |
| **Khám phá** | Filter/share link, OG/Twitter card, sitemap, robots | file SEO + URL sync |
| **Cài đặt được (PWA)** | manifest + theme-color + icon; mở offline-friendly | `manifest.webmanifest` |
| **Tiếp cận** | contrast AA, focus ring, aria-label, 44px touch | gate `check-contrast*`, `check-ui-rules` |
| **Vận hành** | RLS xanh, secret không lọt bundle | gate `verify-rls`, `inspect-db`, quét `sb_secret_` |
| **Tài liệu** | 0 path chết, route doc sinh tự động | gate `doc-refs`, `doc-freshness` |

## 2. Thang điểm (tổng 100)

| Nhóm | Trọng số | Tiêu chí tự động |
|---|---:|---|
| Reliability | 20 | gate xanh, 0 pageerror, 0 ảnh vỡ, mọi route public HTTP 200 |
| Performance | 15 | JS ban đầu < 250KB gzip, font < 300KB, 0 external font, CLS/LCP (khi có browser) |
| Data honesty | 15 | 0 dòng `[MẪU]`, 0 URL ảnh bịa trong DB |
| Core journeys | 20 | flags trong `docs/po/acceptance.json` |
| Discoverability/SEO | 10 | robots, sitemap, manifest, OG/canonical, SEOHead coverage |
| Accessibility | 10 | contrast + ui-rules + icon-label gates |
| Ops/Security | 5 | RLS gates + `.env` ignored + 0 secret trong dist |
| Docs | 5 | doc-refs = 0 |

## 3. Vòng lặp tự động

```
node scripts/po-audit.mjs          # chấm điểm + backlog P0/P1/P2
/po-loop N                         # chạy tối đa N vòng: chọn 1 mục → sửa → đo lại
```

Điều kiện dừng: `score ≥ 85` **và** `p0fail === 0`, hoặc hết `N` vòng, hoặc 2 vòng liên tiếp
không tăng điểm. Mọi thay đổi phải giữ 19/19 gate xanh; nếu không → hoàn nguyên và đánh dấu
`blocked` trong `.loop/po-state.json`.
