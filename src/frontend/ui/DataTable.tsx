/**
 * DataTable — bảng dữ liệu admin (spec: docs/design/tokens.md §8).
 *
 * Hợp đồng bắt buộc:
 * - Generic `<T,>`; cột khai báo `{ key, header, align, sortable, render, width }`.
 * - **Density 40/44** (21-saas-spec.md §1.3: hàng bảng **40–44px** ở MỌI bề rộng —
 *   bản cũ 32/40/48). Ô mặc định `whitespace-nowrap` (cột `wrap: true` để cho xuống dòng)
 *   nên hàng KHÔNG bị đẩy cao khi màn hẹp — bảng cuộn ngang trong khung.
 * - `border-separate` (không `border-collapse`): đo được `border-collapse` cộng 1px vào
 *   chiều cao hàng (`h-11` -> 45px). Đường kẻ vẽ trên `<td>`/`<th>`.
 * - **Header sticky** (dùng token `z-sticky`).
 * - Cột số **căn phải + `tabular-nums`** (`numeric: true`).
 * - Ô không có giá trị hiển thị **`—`** (`EMPTY_VALUE`), KHÔNG "N/A".
 * - **Sort** 1 hoặc nhiều cột (giữ Shift/Ctrl/Cmd khi `multiSort`); ô rỗng luôn xếp cuối.
 * - **Filter**: ô tìm kiếm, bỏ dấu tiếng Việt ("bao gia" khớp "báo giá"), tuỳ biến `filterFn`.
 * - **Pagination** ghi rõ khoảng `"21–40 / 142"` + số hàng/trang.
 * - **Chọn nhiều**: checkbox + `indeterminate` cho header + bulk action bar.
 * - **Empty state render NGOÀI `<table>`** (không phải `<tr><td colspan>`); slot `empty`
 *   = prop `emptyState` (hoặc `emptyTitle`/`emptyDescription`/`emptyAction`).
 * - `loading` -> skeleton đúng layout; `error` -> nêu nguyên nhân + nút retry.
 *
 * Quyết định kỹ thuật cần biết:
 * - Vùng cuộn ngang (`overflow-x-auto`) cũng là **scroll container dọc**; `position: sticky`
 *   của `<thead>` chỉ có tác dụng khi container thật sự cuộn dọc. Vì vậy khi
 *   `stickyHeader` bật, container được đặt `max-height` (`bodyMaxHeight`, mặc định 70dvh):
 *   bảng ngắn không đổi gì, bảng dài cuộn trong khung với header dính.
 * - `onRowClick` chỉ là tiện ích chuột; hàng có `tabIndex` + Enter/Space, nhưng để đúng
 *   ngữ nghĩa hãy đặt một `<a>`/`<button>` thật trong ô.
 */

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { EMPTY_VALUE, formatNumber } from '@frontend/lib/format';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Field } from './Field';
import { Input } from './Input';
import { Select } from './Select';
import { Skeleton } from './Skeleton';
import { cn } from './cn';

export type DataTableDensity = 40 | 44;
export type DataTableAlign = 'left' | 'center' | 'right';
export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableSort {
  key: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  align?: DataTableAlign;
  /** Cột số: tự động căn phải + `tabular-nums`. */
  numeric?: boolean;
  sortable?: boolean;
  /** Tự render ô; trả `null`/`undefined`/`''` -> hiện `emptyValue`. */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Giá trị dùng cho sort/filter (mặc định lấy `row[key]`). */
  value?: (row: T) => string | number | null | undefined;
  /** Bí danh của `value` (giữ cho dễ đọc ở call site). */
  sortAccessor?: (row: T) => string | number | null | undefined;
  /** Chuỗi CSS: '10rem', '20%'. */
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Giá trị thay thế khi ô rỗng (mặc định '—'). */
  emptyValue?: ReactNode;
  /**
   * Cho phép xuống dòng trong ô. Mặc định `false` = `whitespace-nowrap` để giữ mật độ
   * 40–44px (ô hẹp mà chữ tự xuống dòng sẽ đẩy hàng cao lên — đã đo 58px ở 390px).
   * Bảng dài sẽ cuộn ngang trong khung (`overflow-auto`), KHÔNG tràn trang.
   */
  wrap?: boolean;
}

export interface DataTablePaginationLabels {
  previous: string;
  next: string;
  pageSize: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T, index: number) => string;
  density?: DataTableDensity;
  /** Accessible name cho vùng cuộn + `<caption>`. */
  caption?: string;
  tableLabel?: string;
  className?: string;

  /* Sort */
  sort?: DataTableSort[];
  defaultSort?: DataTableSort[];
  onSortChange?: (sort: DataTableSort[]) => void;
  multiSort?: boolean;
  sortLabels?: { ascending: string; descending: string; none: string; multiHint?: string };

  /* Filter */
  filterable?: boolean;
  filterValue?: string;
  defaultFilterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  filterLabel?: string;
  filterFn?: (row: T, query: string) => boolean;
  toolbar?: ReactNode;

  /* Pagination */
  pagination?: boolean;
  /** Số hàng mỗi trang (controlled). */
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** Trang hiện tại, 1-based (controlled). */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Tổng số hàng khi phân trang phía server (khi đó DataTable không tự cắt trang). */
  totalRows?: number;
  paginationLabels?: Partial<DataTablePaginationLabels>;

  /* Chọn nhiều */
  selectable?: boolean;
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => ReactNode;
  bulkRegionLabel?: string;
  selectAllLabel?: string;
  selectRowLabel?: (row: T, index: number) => string;
  clearSelectionLabel?: string;
  selectedCountLabel?: (count: number) => string;

  /* Trạng thái */
  loading?: boolean;
  loadingLabel?: string;
  skeletonRows?: number;
  error?: ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  retryLabel?: string;

  /* Empty */
  emptyState?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  /* Hàng */
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
  stickyHeader?: boolean;
  bodyMaxHeight?: string;
  footer?: ReactNode;
}

/**
 * Bề cao Ô — ĐÃ ĐO BẰNG PLAYWRIGHT, đừng "làm tròn" lại:
 * table layout coi `height` của ô là chiều cao TỐI THIỂU của phần nội dung, nên đường kẻ
 * 1px của ô bị CỘNG THÊM vào chiều cao HÀNG. Hệ quả: `h-11` (44px) cho hàng cao **45px**
 * (đã đo, cả `border-collapse` lẫn `border-separate`) — vượt trần 44px của §1.3.
 * Vì vậy chiều cao ô đặt thấp hơn bề cao hàng đúng 1px: 39 + 1 = **40px**, 43 + 1 = **44px**.
 * Hàng cuối không có đường kẻ (xem `TBODY_LINE`) nên cao đúng bằng chiều cao ô — vẫn ≥ 40px.
 */
const DENSITY_CELL: Record<DataTableDensity, string> = {
  40: 'h-9.75 px-3',
  44: 'h-10.75 px-3',
};

/** Đường kẻ hàng — phải vẽ trên Ô: `border-separate` BỎ QUA border của `<tr>`. */
const ROW_LINE = 'border-b border-line-subtle';
/** Bỏ đường kẻ ở hàng cuối để không chồng lên viền panel / thanh phân trang. */
const TBODY_LINE = '[&>tr:last-child>td]:border-b-0';

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** Bỏ dấu tiếng Việt để "bao gia" khớp "báo giá" (đ -> d). */
function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function cellValue<T>(column: DataTableColumn<T>, row: T): unknown {
  const accessor = column.value ?? column.sortAccessor;
  if (accessor) return accessor(row);
  if (row && typeof row === 'object') return (row as Record<string, unknown>)[column.key];
  return undefined;
}

/** Ô rỗng LUÔN ở cuối, bất kể asc/desc. */
function compareValues(a: unknown, b: unknown, direction: DataTableSortDirection): number {
  const aBlank = isBlank(a);
  const bBlank = isBlank(b);
  if (aBlank || bBlank) {
    if (aBlank && bBlank) return 0;
    return aBlank ? 1 : -1;
  }
  const base =
    typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
  return direction === 'desc' ? -base : base;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  density = 44,
  caption,
  tableLabel = 'Bảng dữ liệu',
  className,

  sort,
  defaultSort,
  onSortChange,
  multiSort = false,
  sortLabels,

  filterable = false,
  filterValue,
  defaultFilterValue = '',
  onFilterChange,
  filterPlaceholder = 'Tìm kiếm…',
  filterLabel = 'Tìm kiếm trong bảng',
  filterFn,
  toolbar,

  pagination = true,
  pageSize,
  defaultPageSize = 20,
  pageSizeOptions,
  page,
  onPageChange,
  totalRows,
  paginationLabels,

  selectable = false,
  selectedIds,
  defaultSelectedIds,
  onSelectionChange,
  bulkActions,
  bulkRegionLabel = 'Hành động hàng loạt',
  selectAllLabel = 'Chọn tất cả hàng trên trang này',
  selectRowLabel,
  clearSelectionLabel = 'Bỏ chọn',
  selectedCountLabel,

  loading = false,
  loadingLabel = 'Đang tải dữ liệu',
  skeletonRows,
  error,
  errorTitle,
  errorDescription,
  onRetry,
  retryLabel = 'Thử lại',

  emptyState,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,

  onRowClick,
  rowClassName,
  stickyHeader = true,
  bodyMaxHeight = '70dvh',
  footer,
}: DataTableProps<T>) {
  const tableId = useId();
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  /* ---------------------------- state (controlled/uncontrolled) ---------------------------- */

  const [internalSort, setInternalSort] = useState<DataTableSort[]>(defaultSort ?? []);
  const sortState = sort ?? internalSort;

  const [internalFilter, setInternalFilter] = useState(defaultFilterValue);
  const filterText = filterValue ?? internalFilter;

  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
  const effectivePageSize = pageSize ?? internalPageSize;

  const [internalPage, setInternalPage] = useState(page ?? 1);
  const rawPage = page ?? internalPage;

  const [internalSelected, setInternalSelected] = useState<string[]>(defaultSelectedIds ?? []);
  const selected = selectedIds ?? internalSelected;

  const commitSort = (next: DataTableSort[]) => {
    if (sort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };
  const commitFilter = (next: string) => {
    if (filterValue === undefined) setInternalFilter(next);
    onFilterChange?.(next);
    if (page === undefined) setInternalPage(1);
  };
  const commitPage = (next: number) => {
    if (page === undefined) setInternalPage(next);
    onPageChange?.(next);
  };
  const commitSelected = (next: string[]) => {
    if (selectedIds === undefined) setInternalSelected(next);
    onSelectionChange?.(next);
  };
  const clearSelection = () => commitSelected([]);

  /* ------------------------------------- lọc + sắp xếp ------------------------------------ */

  const query = filterText.trim();
  const normalizedQuery = normalizeSearch(query);

  const defaultFilterFn = useMemo(
    () => (row: T, rawQuery: string) => {
      const needle = normalizeSearch(rawQuery.trim());
      if (!needle) return true;
      const parts: string[] = [];
      for (const column of columns) {
        const value = cellValue(column, row);
        if (typeof value === 'string' || typeof value === 'number') parts.push(String(value));
      }
      return normalizeSearch(parts.join(' ')).includes(needle);
    },
    [columns],
  );

  const activeFilterFn = filterFn ?? defaultFilterFn;

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter((row) => activeFilterFn(row, query));
  }, [rows, normalizedQuery, query, activeFilterFn]);

  const sortedRows = useMemo(() => {
    if (sortState.length === 0) return filteredRows;

    const indexed = filteredRows.map((row, index) => ({ row, index }));
    indexed.sort((left, right) => {
      for (const entry of sortState) {
        const column = columns.find((candidate) => candidate.key === entry.key);
        if (!column) continue;
        const result = compareValues(
          cellValue(column, left.row),
          cellValue(column, right.row),
          entry.direction,
        );
        if (result !== 0) return result;
      }
      return left.index - right.index; // stable
    });
    return indexed.map((entry) => entry.row);
  }, [filteredRows, sortState, columns]);

  /* ------------------------------------- phân trang -------------------------------------- */

  const serverSide = totalRows !== undefined;
  const total = serverSide ? (totalRows as number) : sortedRows.length;
  const safePageSize = effectivePageSize > 0 ? effectivePageSize : 20;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, rawPage), pageCount);

  const pageRows = useMemo(() => {
    if (serverSide) return sortedRows;
    const start = (safePage - 1) * safePageSize;
    return sortedRows.slice(start, start + safePageSize);
  }, [serverSide, sortedRows, safePage, safePageSize]);

  const firstRowNumber = total === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const lastRowNumber = serverSide
    ? Math.min(total, (safePage - 1) * safePageSize + pageRows.length)
    : Math.min(total, safePage * safePageSize);
  const rangeLabel = `${formatNumber(firstRowNumber)}–${formatNumber(lastRowNumber)} / ${formatNumber(total)}`;

  /* -------------------------------------- chọn nhiều -------------------------------------- */

  const rowIdAt = (row: T, indexInPage: number) =>
    getRowId(row, (safePage - 1) * safePageSize + indexInPage);

  const pageIds = pageRows.map((row, index) => rowIdAt(row, index));
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someOnPageSelected = pageIds.some((id) => selected.includes(id));

  useEffect(() => {
    const checkbox = headerCheckboxRef.current;
    if (checkbox) checkbox.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleRow = (id: string) => {
    commitSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      commitSelected(selected.filter((id) => !pageIds.includes(id)));
      return;
    }
    commitSelected(Array.from(new Set([...selected, ...pageIds])));
  };

  /* ---------------------------------------- sort UI --------------------------------------- */

  const resolvedSortLabels = {
    ascending: sortLabels?.ascending ?? 'đang sắp xếp tăng dần',
    descending: sortLabels?.descending ?? 'đang sắp xếp giảm dần',
    none: sortLabels?.none ?? 'chưa sắp xếp',
    multiHint: sortLabels?.multiHint,
  };

  const handleSortClick = (column: DataTableColumn<T>, event: ReactMouseEvent<HTMLButtonElement>) => {
    const existing = sortState.find((entry) => entry.key === column.key);
    const addToMulti = multiSort && (event.shiftKey || event.metaKey || event.ctrlKey);

    let next: DataTableSort[];
    if (!existing) {
      next = addToMulti ? [...sortState, { key: column.key, direction: 'asc' }] : [{ key: column.key, direction: 'asc' }];
    } else if (existing.direction === 'asc') {
      next = addToMulti
        ? sortState.map((entry) => (entry.key === column.key ? { ...entry, direction: 'desc' } : entry))
        : [{ key: column.key, direction: 'desc' }];
    } else {
      next = addToMulti ? sortState.filter((entry) => entry.key !== column.key) : [];
    }
    commitSort(next);
  };

  const ariaSortFor = (column: DataTableColumn<T>): 'none' | 'ascending' | 'descending' => {
    const entry = sortState.find((candidate) => candidate.key === column.key);
    if (!entry) return 'none';
    return entry.direction === 'asc' ? 'ascending' : 'descending';
  };

  /* ---------------------------------------- render ---------------------------------------- */

  const cellClass = DENSITY_CELL[density];
  const wrapClass = (column: DataTableColumn<T>) =>
    column.wrap ? 'whitespace-normal' : 'whitespace-nowrap';

  const alignClass = (column: DataTableColumn<T>) =>
    column.numeric || column.align === 'right'
      ? 'text-right tabular-nums'
      : column.align === 'center'
        ? 'text-center'
        : 'text-left';

  const renderCell = (column: DataTableColumn<T>, row: T, rowIndex: number): ReactNode => {
    let content: ReactNode;
    if (column.render) {
      content = column.render(row, rowIndex);
    } else {
      const value = cellValue(column, row);
      content = isBlank(value) ? null : String(value);
    }
    if (content === null || content === undefined || content === false || content === '') {
      return column.emptyValue ?? EMPTY_VALUE;
    }
    return content;
  };

  const resolvedSelectRowLabel =
    selectRowLabel ?? ((_row: T, index: number) => `Chọn hàng ${index + 1}`);
  const resolvedSelectedCountLabel =
    selectedCountLabel ?? ((count: number) => `Đã chọn ${formatNumber(count)} hàng`);

  const resolvedPaginationLabels: DataTablePaginationLabels = {
    previous: paginationLabels?.previous ?? 'Trang trước',
    next: paginationLabels?.next ?? 'Trang sau',
    pageSize: paginationLabels?.pageSize ?? 'Số hàng mỗi trang',
  };

  const hasFilter = normalizeSearch(filterText).length > 0;

  const errorTitleText = errorTitle ?? 'Không tải được dữ liệu';
  const errorDescriptionText =
    errorDescription ??
    (typeof error === 'string' && error ? error : 'Chưa xác định được nguyên nhân — thử tải lại.');
  const errorNode = typeof error === 'string' ? null : error;

  const resolvedEmptyDescription =
    emptyDescription ??
    (hasFilter
      ? 'Không hàng nào khớp từ khoá tìm kiếm hiện tại.'
      : 'Chưa có bản ghi nào được tạo trong mục này.');

  const rowCountForSkeleton = skeletonRows ?? Math.min(safePageSize, 5);

  /* ------------------------------- khối toolbar (filter) ---------------------------------- */

  const toolbarBlock =
    filterable || toolbar ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle p-3">
        {filterable ? (
          <div className="w-full max-w-sm">
            <Field id={`${tableId}-filter`} label={filterLabel} hideLabel>
              {(control) => (
                <Input
                  {...control}
                  type="search"
                  size="sm"
                  value={filterText}
                  placeholder={filterPlaceholder}
                  onChange={(event) => commitFilter(event.target.value)}
                />
              )}
            </Field>
          </div>
        ) : null}
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
    ) : null;

  /* --------------------------------- bulk action bar ------------------------------------- */

  const bulkBar =
    selectable && selected.length > 0 ? (
      <div
        role="region"
        aria-label={bulkRegionLabel}
        className="flex flex-wrap items-center gap-3 border-b border-line-subtle bg-surface-muted px-3 py-2"
      >
        <span className="text-xs font-medium tabular-nums text-fg">
          {resolvedSelectedCountLabel(selected.length)}
        </span>
        {bulkActions?.(selected, clearSelection)}
        <Button variant="ghost" size="sm" onClick={clearSelection}>
          {clearSelectionLabel}
        </Button>
      </div>
    ) : null;

  /* --------------------------------------- trạng thái ------------------------------------- */

  if (error && !loading) {
    return (
      <div className={cn('w-full overflow-hidden rounded-lg border border-line-subtle bg-surface text-fg', className)}>
        {toolbarBlock}
        <div role="alert" className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-start gap-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-fg">{errorTitleText}</p>
              <p className="text-xs text-fg-muted">{errorDescriptionText}</p>
            </div>
          </div>
          {errorNode}
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
        {footer}
      </div>
    );
  }

  const body =
    pageRows.length === 0 && !loading ? (
      <div className="p-2">
        {emptyState ?? (
          <EmptyState
            title={emptyTitle}
            description={resolvedEmptyDescription}
            live
            action={
              emptyAction ??
              (hasFilter ? (
                <Button variant="secondary" size="sm" onClick={() => commitFilter('')}>
                  Xoá từ khoá tìm kiếm
                </Button>
              ) : undefined)
            }
          />
        )}
      </div>
    ) : (
      <div
        role="region"
        aria-label={caption ?? tableLabel}
        tabIndex={0}
        style={stickyHeader ? { maxHeight: bodyMaxHeight } : undefined}
        className="w-full overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table
          aria-busy={loading || undefined}
          className="w-full border-separate border-spacing-0 text-left text-sm"
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="bg-surface-muted">
              {selectable ? (
                <th
                  scope="col"
                  className={cn(
                    cellClass,
                    ROW_LINE,
                    'w-12 whitespace-nowrap align-middle',
                    // Ô chọn-tất-cả PHẢI dính cùng các ô tiêu đề khác (lỗi đã đo: position static).
                    stickyHeader && 'sticky top-0 z-sticky bg-surface-muted',
                  )}
                >
                  <label className="flex size-10 cursor-pointer items-center justify-center">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label={selectAllLabel}
                    />
                  </label>
                </th>
              ) : null}

              {columns.map((column) => {
                const sorted = sortState.find((entry) => entry.key === column.key);
                const SortIcon = !sorted ? ArrowUpDown : sorted.direction === 'asc' ? ArrowUp : ArrowDown;
                const sortStateText = !sorted
                  ? resolvedSortLabels.none
                  : sorted.direction === 'asc'
                    ? resolvedSortLabels.ascending
                    : resolvedSortLabels.descending;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortable ? ariaSortFor(column) : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      cellClass,
                      ROW_LINE,
                      wrapClass(column),
                      'align-middle font-medium text-fg-muted',
                      alignClass(column),
                      stickyHeader && 'sticky top-0 z-sticky bg-surface-muted',
                      column.headerClassName,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={(event) => handleSortClick(column, event)}
                        title={multiSort ? resolvedSortLabels.multiHint : undefined}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm text-xs font-semibold uppercase tracking-wide text-fg-muted',
                          'hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          // §1.3: icon trong control 16px, nhưng vùng bấm mobile vẫn ≥44×44 (bù bằng padding).
                          'max-md:min-h-11 max-md:min-w-11 max-md:justify-center',
                          column.numeric && 'flex-row-reverse',
                        )}
                      >
                        <span>{column.header}</span>
                        <SortIcon aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="sr-only">{sortStateText}</span>
                        {multiSort && sorted && sortState.length > 1 ? (
                          <span className="tabular-nums" aria-hidden="true">
                            {sortState.findIndex((entry) => entry.key === column.key) + 1}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wide">{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className={TBODY_LINE}>
            {loading
              ? Array.from({ length: rowCountForSkeleton }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {selectable ? (
                      <td className={cn(cellClass, ROW_LINE)}>
                        <Skeleton variant="rect" width="1rem" height="1rem" />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key} className={cn(cellClass, ROW_LINE, wrapClass(column), 'align-middle')}>
                        <Skeleton variant="text" width={column.numeric ? '40%' : '80%'} />
                      </td>
                    ))}
                  </tr>
                ))
              : pageRows.map((row, rowIndex) => {
                  const id = rowIdAt(row, rowIndex);
                  const isSelected = selected.includes(id);

                  const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
                    if (!onRowClick) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  };

                  return (
                    <tr
                      key={id}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? handleRowKeyDown : undefined}
                      className={cn(
                        'align-middle',
                        onRowClick &&
                          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-surface-muted',
                        isSelected && 'bg-surface-muted',
                        rowClassName?.(row, rowIndex),
                      )}
                    >
                      {selectable ? (
                        <td className={cn(cellClass, ROW_LINE, 'w-12')}>
                          <label
                            className="flex size-10 cursor-pointer items-center justify-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={isSelected}
                              onChange={() => toggleRow(id)}
                              aria-label={resolvedSelectRowLabel(row, rowIndex)}
                            />
                          </label>
                        </td>
                      ) : null}

                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            cellClass,
                            ROW_LINE,
                            wrapClass(column),
                            'align-middle text-fg',
                            alignClass(column),
                            column.cellClassName,
                          )}
                        >
                          {renderCell(column, row, rowIndex)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    );

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-lg border border-line-subtle bg-surface text-fg',
        className,
      )}
    >
      {toolbarBlock}
      {bulkBar}

      {loading ? (
        <span role="status" className="sr-only">
          {loadingLabel}
        </span>
      ) : null}

      {body}

      {pagination && !loading && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-3 py-2">
          <p aria-live="polite" className="text-xs tabular-nums text-fg-muted">
            {rangeLabel}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {pageSizeOptions && pageSizeOptions.length > 0 ? (
              <div className="w-40">
                <Field id={`${tableId}-page-size`} label={resolvedPaginationLabels.pageSize} hideLabel>
                  {(control) => (
                    <Select
                      {...control}
                      size="sm"
                      value={String(safePageSize)}
                      numeric
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next) || next <= 0) return;
                        if (pageSize === undefined) setInternalPageSize(next);
                        commitPage(1);
                      }}
                      options={pageSizeOptions.map((option) => ({
                        value: String(option),
                        label: `${formatNumber(option)} / trang`,
                      }))}
                    />
                  )}
                </Field>
              </div>
            ) : null}

            <Button
              iconOnly
              variant="secondary"
              size="sm"
              aria-label={resolvedPaginationLabels.previous}
              disabled={safePage <= 1}
              onClick={() => commitPage(safePage - 1)}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>

            <span aria-hidden="true" className="text-xs tabular-nums text-fg-muted">
              {formatNumber(safePage)} / {formatNumber(pageCount)}
            </span>

            <Button
              iconOnly
              variant="secondary"
              size="sm"
              aria-label={resolvedPaginationLabels.next}
              disabled={safePage >= pageCount}
              onClick={() => commitPage(safePage + 1)}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {footer}
    </div>
  );
}
