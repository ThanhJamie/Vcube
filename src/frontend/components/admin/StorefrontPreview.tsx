import type { SiteContentConfig } from '@/types';
import { Badge, Card, Icon, cn } from '@frontend/ui';

/**
 * StorefrontPreview — xem trước các khối cấu hình được của trang chủ NGAY khi admin đang
 * sửa (kể cả chưa bấm Lưu). Chỉ ĐỌC `SiteContentConfig`: không gọi DB, không tự điền
 * số/tên/ngày. Ô trống hiển thị đúng như HomeView/Header: ẩn khối (announcement/dung sai),
 * hoặc hiện nội dung mặc định có ghi rõ "(mặc định)" — KHÔNG bịa nội dung mới.
 *
 * Vì sao lặp `LEGACY_SITE_COPY`: HomeView đổi 2 giá trị seed cũ sang tiếng Việt tại chỗ
 * render; preview phải khớp để marketing không thấy "lệch" so với web thật.
 */

interface StorefrontPreviewProps {
  content: SiteContentConfig;
  className?: string;
}

const LEGACY_SITE_COPY: Record<string, string> = {
  'VCUBE PRECISION ANTHOLOGY // 2026': 'TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026',
  'Báo Giá File 3D Tức Thì': 'Báo giá tệp 3D tức thì',
};

/** Nội dung HomeView rơi về khi ô tương ứng để trống (giữ NGUYÊN VĂN để preview khớp web). */
const HOME_DEFAULTS = {
  heroBadge: 'TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026',
  heroHeadlineLine1: 'CHẾ TÁC CƠ KHÍ',
  heroHeadlineHighlight: 'IN 3D CÔNG NGHIỆP CHÍNH XÁC',
  heroSubheadline:
    'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số.',
  heroCtaQuoteText: 'Báo giá tệp 3D tức thì',
  heroCtaCatalogText: 'Khám Phá Kho Mẫu CAD',
} as const;

const METRIC_DEFAULT_LABELS = ['Dung Sai Đo Kiểm', 'Thời Gian Bàn Giao', 'Tiêu Chuẩn Sản Xuất'] as const;

const trim = (value?: string): string => (value || '').trim();

/** Giá trị đã cấu hình ⇒ giữ nguyên; trống ⇒ nội dung mặc định của Home (không bịa). */
const siteCopy = (value: string | undefined, fallback: string): string => {
  const v = trim(value);
  return v ? (LEGACY_SITE_COPY[v] ?? v) : fallback;
};

function PreviewCopy({
  value,
  fallback,
  className,
  markDefault = true,
}: {
  value?: string;
  fallback: string;
  className?: string;
  /** `false` cho nhãn nút: chữ mờ đã đủ nghĩa, tránh nhét "(mặc định)" vào trong CTA. */
  markDefault?: boolean;
}) {
  const configured = trim(value) !== '';
  return (
    <span
      className={configured ? className : cn('text-fg-subtle', className)}
      title={configured ? undefined : 'Ô đang để trống — trang chủ dùng nội dung mặc định'}
    >
      {siteCopy(value, fallback)}
      {!configured && markDefault && (
        <span className="ml-1.5 align-middle text-xs font-normal">(mặc định)</span>
      )}
    </span>
  );
}

export function StorefrontPreview({ content, className }: StorefrontPreviewProps) {
  const announcementActive = content.announcementActive === true;
  const announcementText = trim(content.announcementText);
  const announcementBadge = trim(content.announcementBadge);
  const announcementAction = trim(content.announcementActionText);

  const subheadlineRaw = trim(content.heroSubheadline);
  // HomeView coi 2 nhãn dữ liệu mẫu là "chưa cấu hình" ⇒ preview cũng vậy.
  const subheadlineValue =
    subheadlineRaw.includes('Dữ liệu mẫu để kiểm thử') || subheadlineRaw.includes('--remove')
      ? ''
      : subheadlineRaw;

  const metrics = METRIC_DEFAULT_LABELS.map((defaultLabel, index) => {
    const suffix = (index + 1) as 1 | 2 | 3;
    return {
      label: trim(content[`heroMetric${suffix}Label`]) || defaultLabel,
      value: trim(content[`heroMetric${suffix}Value`]),
    };
  });
  const filledMetrics = metrics.filter((metric) => metric.value);
  const toleranceSpec = trim(content.toleranceSpec);

  return (
    <section
      aria-label="Xem trước nội dung trang chủ (chưa lưu)"
      className={cn('rounded-xl border border-line bg-surface p-4 sm:p-5 space-y-4', className)}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line-subtle pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="preview" size={18} className="text-primary" aria-hidden="true" />
            Xem trước (chưa lưu)
          </h3>
          <p className="mt-1 text-xs text-fg-subtle">
            Cập nhật ngay khi bạn sửa, kể cả trước khi bấm Lưu. Đây là bản mô phỏng, không phải trang thật.
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          Mô phỏng
        </Badge>
      </div>

      <div className="space-y-3">
        {/* 1. Dải thông báo — Header chỉ render khi đang bật VÀ có thông điệp. */}
        {announcementActive && announcementText ? (
          <div className="overflow-hidden rounded-md border border-primary/20">
            <div className="flex items-center justify-center gap-2 bg-primary px-3 py-2 text-center text-xs font-medium text-primary-fg">
              {announcementBadge && (
                <span className="shrink-0 rounded-full border border-primary-fg/30 px-2 py-0.5 font-mono text-xs">
                  {announcementBadge}
                </span>
              )}
              <span className="min-w-0 break-words">{announcementText}</span>
              {announcementAction && (
                <span className="shrink-0 underline underline-offset-2">{announcementAction}</span>
              )}
            </div>
            {(announcementBadge || announcementAction) && (
              <p className="border-t border-line-subtle bg-surface-muted px-3 py-1.5 text-xs text-fg-subtle">
                Huy hiệu/nút hành động đã cấu hình nhưng giao diện đầu trang hiện chỉ render thông điệp —
                hai trường này được lưu mà chưa hiển thị.
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-md border border-dashed border-line-subtle bg-surface-muted px-3 py-2 text-xs text-fg-muted">
            <Icon name="campaign" size={16} className="mt-px shrink-0" aria-hidden="true" />
            <span>
              {announcementActive
                ? 'Dải thông báo đang bật nhưng chưa có thông điệp — đầu trang sẽ không hiển thị dải này.'
                : 'Dải thông báo đang tắt — không hiển thị trên web.'}
            </span>
          </p>
        )}

        {/* 2. Hero — badge, 2 dòng tiêu đề, mô tả phụ, 2 CTA, 3 chỉ số (đúng thứ tự HomeView). */}
        <div className="rounded-lg border border-line-subtle bg-surface-muted/60 p-3 sm:p-4 space-y-3">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
            <PreviewCopy value={content.heroBadge} fallback={HOME_DEFAULTS.heroBadge} />
          </span>

          <p className="break-words text-xl font-bold leading-tight tracking-tight text-fg">
            <PreviewCopy value={content.heroHeadlineLine1} fallback={HOME_DEFAULTS.heroHeadlineLine1} />
            <br />
            <span className="text-primary">
              <PreviewCopy
                value={content.heroHeadlineHighlight}
                fallback={HOME_DEFAULTS.heroHeadlineHighlight}
              />
            </span>
          </p>

          <p className="break-words text-sm leading-relaxed text-fg-muted">
            <PreviewCopy value={subheadlineValue} fallback={HOME_DEFAULTS.heroSubheadline} />
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg">
              <Icon name="upload_file" size={16} aria-hidden="true" />
              <PreviewCopy
                value={content.heroCtaQuoteText}
                fallback={HOME_DEFAULTS.heroCtaQuoteText}
                markDefault={false}
              />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line-control bg-surface px-3 py-2 text-sm font-medium text-fg">
              <Icon name="view_in_ar" size={16} className="text-primary" aria-hidden="true" />
              <PreviewCopy
                value={content.heroCtaCatalogText}
                fallback={HOME_DEFAULTS.heroCtaCatalogText}
                markDefault={false}
              />
            </span>
          </div>
          <p className="text-xs text-fg-subtle">
            Nút phụ chỉ hiển thị khi kho mẫu đã có sản phẩm xuất bản.
          </p>

          {/* HomeView: cả 3 giá trị rỗng ⇒ gộp thành MỘT dòng mảnh, không phải 3 thẻ trống. */}
          {filledMetrics.length === 0 ? (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-muted">
              <Icon name="info" size={14} className="shrink-0" aria-hidden="true" />
              <span>Dung sai đo kiểm, thời gian bàn giao và tiêu chuẩn sản xuất:</span>
              <span className="font-mono font-semibold">Chưa cấu hình</span>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {metrics.map((metric) => (
                <Card key={metric.label} variant="flat" padding="sm" className="min-w-0">
                  <span className="block text-xs font-medium text-fg-muted">{metric.label}</span>
                  {metric.value ? (
                    <span className="block break-words font-mono text-sm font-semibold tabular-nums text-fg">
                      {metric.value}
                    </span>
                  ) : (
                    <span className="block font-mono text-xs font-semibold text-fg-muted">Chưa cấu hình</span>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 3. Dải dung sai cam kết — HomeView ẩn hẳn khi rỗng. */}
        {toleranceSpec ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-line-subtle bg-surface p-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-tile-mint text-fg">
              <Icon name="verified" size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block font-mono text-xs font-bold uppercase tracking-wider text-fg-muted">
                Dung sai cam kết
              </span>
              <p className="break-words text-xs font-medium text-fg">{toleranceSpec}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-fg-subtle">
            Dải dung sai cam kết: Chưa cấu hình — khối này ẩn trên trang chủ.
          </p>
        )}
      </div>

      <p className="border-t border-line-subtle pt-3 text-xs text-fg-subtle">
        Chữ mờ kèm “(mặc định)” = ô đang trống, trang chủ sẽ dùng nội dung mặc định — bản xem trước không tự
        điền dữ liệu của bạn.
      </p>
    </section>
  );
}
