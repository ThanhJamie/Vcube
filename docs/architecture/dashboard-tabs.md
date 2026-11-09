<!-- doc-meta: status=active; verified=2026-11-09; owner=lead -->
# Dashboard tabs — hạ tầng tab dùng chung (admin / designer / lab)

Mục tiêu: thêm tab mới = thêm 1 entry vào registry, không sửa chuỗi `activeTab === …`; đổi tab
không mất filter/form/scroll và không fetch lại.

## API (`src/frontend/components/dashboard/DashboardTabs.tsx`)

```ts
type DashboardTab = {
  id: string;
  label: string;
  icon?: string;
  element: React.ReactNode;
  keepAlive?: boolean;   // default true
  boundaryLabel?: string;
};

<DashboardTabNav tabs activeId onSelect ariaLabel />   // segmented, role=tablist, Arrow/Home/End
<DashboardPanelHost tabs activeId maxKept={6} fallback={...} />
```

- `DashboardPanelHost`: mount tab khi mở lần đầu; giữ mounted (LRU `maxKept`) để bảo toàn state;
  mỗi tab có `PanelErrorBoundary` + `Suspense` riêng.
- URL vẫn là nguồn sự thật: caller resolve `activeId` từ `useParams` và navigate khi chọn tab.
- Tab `keepAlive:false` ⇒ unmount khi rời tab (dùng cho panel có id DOM trùng, canvas nặng,
  hoặc dữ liệu phải reset mỗi lần vào).

## Thêm một tab

1. Thêm id vào type + `validSections`/`*_TAB_IDS` + nav config tương ứng.
2. Thêm entry vào `tabs` array trong view (`AdminDashboardView`, `DesignerDashboardView`,
   `WorkshopSettingsView`).
3. Nếu tab mới có form/filter cần giữ: để `keepAlive` mặc định (true). Nếu panel render id tĩnh
   trùng panel khác hoặc chart/canvas lớn: đặt `keepAlive:false` + ghi lý do.
4. Verify: đổi tab qua lại, state còn; 0 console error; 0 id trùng.

## Quy ước

- Không tự viết `role="tablist"`/segmented nav mới — dùng `DashboardTabNav`.
- Không bọc `PanelErrorBoundary` lặp trong từng tab — host đã bọc.
- Panel giữ state phải chịu được việc bị ẩn (`hidden`) — effect/realtime vẫn chạy.
- Realtime: mỗi subscription phải có channel name **duy nhất** (xem `customDesignService.subscribe`)
  để nhiều instance/keep-alive không đụng topic đã `subscribe()`.

## Kiểm chứng (2026-11-09)

- Admin 22 section, designer 5 tab, lab 6 tab: 0 `pageerror`, 0 console error, 0 tràn ngang.
- Filter `products` giữ nguyên khi sang `orders` rồi quay lại; revisit ~218ms (không refetch).
- Search `models` của designer giữ nguyên sau khi đổi tab.
