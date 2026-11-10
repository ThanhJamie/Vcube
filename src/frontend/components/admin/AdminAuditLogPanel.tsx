import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
} from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE, formatDateTime, formatNumber } from '@frontend/lib/format';
import {
  AUDIT_LOG_LIMIT,
  useAuditLog,
  type AuditLogEntry,
} from '@frontend/hooks/useSettings';

/**
 * AdminAuditLogPanel — màn đọc THẬT bảng `public.setting_audit`.
 *
 * Nguyên tắc:
 * - Không tự tạo/sửa log (bảng append-only ở RLS); panel chỉ đọc.
 * - Không bịa tên người đổi: `changed_by` không đọc được tên trong `user_profiles` ⇒ `—`.
 * - Lỗi truy vấn hiển thị nguyên văn + nút thử lại; mảng rỗng chỉ khi DB thật sự rỗng
 *   (hoặc không khớp bộ lọc) nên empty state nói đúng nguyên nhân.
 * - Bảng trả tối đa {@link AUDIT_LOG_LIMIT} bản ghi mới nhất — nêu rõ trần này, không
 *   giả vờ đã tải toàn bộ lịch sử.
 */

/** Nhãn VI cho 5 giá trị `store` trong CHECK của bảng; giá trị lạ hiển thị nguyên bản. */
const STORE_LABELS: Record<string, string> = {
  site_content: 'Nội dung trang',
  app_settings: 'Cài đặt pháp lý',
  pricing_global_settings: 'Cấu hình giá chung',
  pricing_configs: 'Công thức định giá',
  order_payouts: 'Đối soát thanh toán',
};

const STORE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn cấu hình' },
  ...Object.entries(STORE_LABELS).map(([value, label]) => ({
    value,
    label: `${label} (${value})`,
  })),
];

function storeLabel(store: string): string {
  if (!store) return EMPTY_VALUE;
  return STORE_LABELS[store] ?? store;
}

/** JSON pretty cho modal; chuỗi giữ nguyên (không bọc nháy) để đọc dễ hơn. */
function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    // ignore: jsonb từ DB không thể có tham chiếu vòng; chỉ chặn UI crash nếu giá trị lạ.
    return '';
  }
}

/** Tóm tắt 1 dòng cho cột bảng (không xuống dòng, cắt ngắn). */
function summarizeJson(value: unknown): string {
  const text = prettyJson(value).replace(/\s+/g, ' ').trim();
  if (!text) return EMPTY_VALUE;
  if (text.length <= 44) return text;
  return `${text.slice(0, 44)}…`;
}

function summaryLine(entry: AuditLogEntry): string {
  return `${summarizeJson(entry.oldValue)} → ${summarizeJson(entry.newValue)}`;
}

interface JsonBlockProps {
  label: string;
  value: unknown;
}

const JsonBlock: React.FC<JsonBlockProps> = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <h3 className="text-sm font-semibold text-fg">{label}</h3>
    <pre className="max-h-[32dvh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-line-subtle bg-surface-muted p-3 font-mono text-xs text-fg">
      {prettyJson(value) || EMPTY_VALUE}
    </pre>
  </div>
);

export const AdminAuditLogPanel: React.FC = () => {
  const [store, setStore] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  // Gõ tới đâu lọc tới đó sau một nhịp ngắn — tránh gọi DB mỗi ký tự.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { entries, loading, error, reload } = useAuditLog({ store, search });
  const refresh = () => void reload();

  const resetFilters = () => {
    setStore('');
    setSearchInput('');
    setSearch('');
  };

  const hasFilters = store !== '' || search !== '';

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'changedAt',
      header: 'Thời gian',
      width: '12rem',
      render: (entry) => (
        <span className="tabular-nums">{formatDateTime(entry.changedAt)}</span>
      ),
    },
    {
      key: 'store',
      header: 'Nguồn',
      width: '11rem',
      render: (entry) => (
        <Badge variant="neutral" size="sm" title={entry.store || undefined}>
          {storeLabel(entry.store)}
        </Badge>
      ),
    },
    {
      key: 'settingKey',
      header: 'Khóa cấu hình',
      render: (entry) => (
        <span className="font-mono text-xs text-fg">{entry.settingKey || EMPTY_VALUE}</span>
      ),
    },
    {
      key: 'changedByName',
      header: 'Người đổi',
      width: '11rem',
      render: (entry) => (
        <span className="truncate" title={entry.changedBy ?? undefined}>
          {entry.changedByName ?? EMPTY_VALUE}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Giá trị cũ → mới',
      render: (entry) => (
        <span className="font-mono text-xs text-fg-muted">{summaryLine(entry)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Chi tiết',
      align: 'right',
      width: '5rem',
      render: (entry) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
          Xem
        </Button>
      ),
    },
  ];

  const emptyState = hasFilters ? (
    <EmptyState
      title="Không có bản ghi khớp bộ lọc."
      description="Chưa có bản ghi thay đổi cấu hình nào khớp nguồn hoặc từ khoá đang chọn."
      action={
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          Xoá bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="Chưa có bản ghi thay đổi cấu hình."
      description="Bảng setting_audit chưa có dòng nào — mọi thay đổi cấu hình qua dịch vụ cài đặt sẽ được ghi tại đây."
    />
  );

  return (
    <div className="space-y-6">
      {/* Console admin đã có 1 `h1` sr-only theo mục đang mở ⇒ panel nhúng dùng `h2`. */}
      <PageHeader
        titleAs="h2"
        title="Nhật ký thay đổi cấu hình"
        description={`Ai đã đổi cấu hình nào, giá trị cũ/mới và thời điểm — đọc trực tiếp bảng setting_audit. Hiển thị tối đa ${formatNumber(AUDIT_LOG_LIMIT)} bản ghi mới nhất.`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            loading={loading}
            loadingLabel="Đang tải…"
            leadingIcon={<Icon name="refresh" size={16} />}
          >
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-surface p-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-xs">
          <Field id="audit-log-store" label="Nguồn cấu hình" hideLabel>
            {(control) => (
              <Select
                {...control}
                size="sm"
                value={store}
                options={STORE_OPTIONS}
                onChange={(event) => setStore(event.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="w-full sm:max-w-sm">
          <Field id="audit-log-search" label="Tìm theo khóa cấu hình" hideLabel>
            {(control) => (
              <Input
                {...control}
                type="search"
                size="sm"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm setting_key…"
              />
            )}
          </Field>
        </div>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Xoá bộ lọc
          </Button>
        ) : null}
      </div>

      {!loading && !error && entries.length > 0 ? (
        <p role="status" className="text-xs text-fg-muted">
          {`Đang hiển thị ${formatNumber(entries.length)} bản ghi mới nhất (tối đa ${formatNumber(AUDIT_LOG_LIMIT)}).`}
        </p>
      ) : null}

      <DataTable<AuditLogEntry>
        columns={columns}
        rows={entries}
        getRowId={(entry) => entry.id}
        caption="Nhật ký thay đổi cấu hình"
        loading={loading}
        loadingLabel="Đang tải nhật ký thay đổi cấu hình"
        error={error}
        errorTitle="Không tải được nhật ký thay đổi"
        onRetry={refresh}
        retryLabel="Thử lại"
        emptyState={emptyState}
        pageSizeOptions={[20, 50, 100]}
        paginationLabels={{ pageSize: 'Số bản ghi mỗi trang' }}
      />

      <Modal
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        title="Chi tiết thay đổi cấu hình"
        description={selectedEntry ? selectedEntry.settingKey || undefined : undefined}
        size="lg"
      >
        {selectedEntry ? (
          <div className="flex min-w-0 flex-col gap-4">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-fg-subtle">Thời gian</dt>
                <dd className="tabular-nums text-fg">{formatDateTime(selectedEntry.changedAt)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-fg-subtle">Người đổi</dt>
                <dd className="text-fg">{selectedEntry.changedByName ?? EMPTY_VALUE}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-fg-subtle">Nguồn cấu hình</dt>
                <dd className="text-fg">
                  {storeLabel(selectedEntry.store)}
                  <span className="ml-1 font-mono text-xs text-fg-muted">
                    ({selectedEntry.store || EMPTY_VALUE})
                  </span>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-fg-subtle">Khóa cấu hình</dt>
                <dd className="break-all font-mono text-xs text-fg">
                  {selectedEntry.settingKey || EMPTY_VALUE}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <JsonBlock label="Giá trị cũ" value={selectedEntry.oldValue} />
              <JsonBlock label="Giá trị mới" value={selectedEntry.newValue} />
            </div>

            <p className="break-all font-mono text-xs text-fg-subtle">
              {`ID bản ghi: ${selectedEntry.id || EMPTY_VALUE}`}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminAuditLogPanel;
