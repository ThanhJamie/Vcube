import React from 'react';
import { Badge, Button, Icon, InfoTip } from '@frontend/ui';
import { INKIRI_REFERENCE_VALUES } from '../../../../data/mockData';
import type { PricingHeaderProps } from './types';

export const PricingHeader: React.FC<PricingHeaderProps> = (props) => {
  const { refillFromInkiriReference, handleSaveFormula, formulaIsReference, globalIsReference, referenceHeldCount, referenceTotal, dbFormulaState, subTab, setSubTab, materials, printers, accessories } = props;

  return (
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="technical" className="uppercase tracking-wider">BỘ MÁY TÍNH CHI PHÍ IN 3D INKIRI v3.4</Badge>
              <span className="text-sm text-fg-muted">Mô hình định giá theo chuẩn xưởng in 3D công nghiệp</span>
            </div>
            <h2 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-fg">
              Quản Trị Bảng Giá, Nhựa In, Máy In & Thông Số Tính Phí Xưởng
              <InfoTip label="Giá thành gồm những biến số nào?">
                Cấu hình các biến số ảnh hưởng trực tiếp đến giá thành: Tiền nhựa, điện năng, khấu hao máy in,
                nhân công xử lý tệp/vật liệu đỡ, đóng gói và biên lợi nhuận.
              </InfoTip>
            </h2>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              id="inkiri-refill-reference"
              data-testid="inkiri-refill"
              onClick={refillFromInkiriReference}
              title="Điền bộ số mẫu theo Inkiri vào biểu mẫu — KHÔNG ghi cơ sở dữ liệu cho tới khi bấm Lưu"
              leadingIcon={<Icon name="tune" size={16} />}
            >
              Điền lại gợi ý Inkiri
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveFormula}
              leadingIcon={<Icon name="save" size={16} />}
            >
              Lưu Toàn Bộ Cấu Hình
            </Button>
          </div>
        </div>

        {/* Đợt U: BĂNG-RÔN BẮT BUỘC khi form đang giữ bộ số MẪU theo Inkiri (chưa được admin lưu) */}
        {(formulaIsReference || globalIsReference) && (
          <div
            role="status"
            data-testid="inkiri-reference-banner"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-warning/20 bg-warning-tint p-4 text-xs text-fg"
          >
            <p className="flex items-start gap-1.5 font-bold text-warning">
              <Icon name="warning" size={16} className="shrink-0 text-warning" />
              <span>Đang dùng giá trị mẫu theo Inkiri — chưa được xem xét cho VCUBE. Xem lại rồi bấm Lưu để áp dụng.</span>
            </p>
            <InfoTip label="Nguồn số mẫu, cảnh báo VAT và các ô cần anh quyết định" title="Về bộ số mẫu Inkiri">
              <span className="flex flex-col gap-2">
                <span>
                  Nguồn: <span className="font-mono tabular-nums">{INKIRI_REFERENCE_VALUES.source.label}</span> (
                  <span className="font-mono tabular-nums">{INKIRI_REFERENCE_VALUES.source.url}</span>), ghi lại ngày
                  <span className="font-mono tabular-nums"> {INKIRI_REFERENCE_VALUES.source.capturedAt}</span>. Chưa bấm Lưu
                  thì KHÔNG có lệnh ghi nào tới cơ sở dữ liệu.
                </span>
                <span>
                  <strong>VAT là con số PHÁP LÝ</strong> — anh phải tự xác nhận. Phí nền tảng · bản quyền · hệ số lãi
                  là <strong>QUYẾT ĐỊNH KINH DOANH</strong>: số của Inkiri chỉ là điểm khởi đầu, KHÔNG phải chuẩn đúng.
                </span>
                <span>
                  Ô Inkiri KHÔNG thể biết (mô hình 3 bên: nền tảng · xưởng · nhà thiết kế) vẫn để TRỐNG và gắn nhãn
                  &ldquo;cần anh quyết định&rdquo;:
                  <span className="font-mono tabular-nums"> {INKIRI_REFERENCE_VALUES.needsOwnerDecision.join(' · ')}</span>
                </span>
                {formulaIsReference && (
                  <span>
                    Đang là số mẫu: <strong>công thức (mục 1–10)</strong> — còn
                    <span className="font-mono tabular-nums"> {referenceHeldCount}/{referenceTotal}</span> ô giữ đúng số mẫu; các ô
                    đang là số mẫu có <strong>viền NÉT ĐỨT</strong> để phân biệt với ô anh tự nhập. Hết số mẫu khi anh
                    bấm Lưu.
                  </span>
                )}
                {globalIsReference && (
                  <span>
                    Đang là số mẫu: <strong>mục 0 — VAT · điện · nhân công · phí nền tảng</strong> (bảng
                    <span className="font-mono tabular-nums"> pricing_global_settings</span>) — bấm &ldquo;Lưu Cấu Hình Chung&rdquo;
                    để áp dụng.
                  </span>
                )}
              </span>
            </InfoTip>
          </div>
        )}

        {/* Trạng thái nguồn dữ liệu THẬT của công thức giá (không hiển thị số đoán) */}
        {dbFormulaState !== 'loaded' && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-warning/20 bg-warning-tint p-4 text-xs font-semibold text-warning"
          >
            {dbFormulaState === 'loading' && 'Đang đọc cấu hình công thức giá từ Supabase (bảng pricing_configs)…'}
            {dbFormulaState === 'missing' && (
              <>
                <span>CHƯA CẤU HÌNH: bảng pricing_configs chưa có hàng nào đang bật — mọi ô bên dưới để TRỐNG.</span>
                <InfoTip label="Vì sao các ô để trống và cần làm gì tiếp">
                  <span className="font-normal text-fg-muted">
                    Hệ thống không hiển thị và không lưu giá trị mặc định đoán
                    (DEFAULT_INKIRI_FORMULA_CONFIG). Nhập số thật rồi bấm Lưu để tạo cấu hình.
                  </span>
                </InfoTip>
              </>
            )}
            {dbFormulaState === 'error' &&
              'KHÔNG ĐỌC ĐƯỢC cấu hình công thức giá từ Supabase. Các ô đang giữ giá trị tạm và sẽ KHÔNG được lưu (tránh ghi đè bằng dữ liệu không phải từ DB).'}
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div
          role="tablist"
          aria-label="Các nhóm cấu hình định giá"
          className="mt-6 inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1"
        >
          <button
            type="button"
            role="tab"
            id="pricing-tab-formula"
            aria-selected={subTab === 'formula'}
            aria-controls="pricing-panel-formula"
            onClick={() => setSubTab('formula')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'formula'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="calculate" size={16} />
            1. Công Thức Tính Giá
          </button>

          <button
            type="button"
            role="tab"
            id="pricing-tab-materials"
            aria-selected={subTab === 'materials'}
            aria-controls="pricing-panel-materials"
            onClick={() => setSubTab('materials')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'materials'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="layers" size={16} />
            2. Nhựa In & Resin ({materials.length})
          </button>

          <button
            type="button"
            role="tab"
            id="pricing-tab-printers"
            aria-selected={subTab === 'printers'}
            aria-controls="pricing-panel-printers"
            onClick={() => setSubTab('printers')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'printers'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="precision_manufacturing" size={16} />
            3. Đội Máy In ({printers.length})
          </button>

          <button
            type="button"
            role="tab"
            id="pricing-tab-accessories"
            aria-selected={subTab === 'accessories'}
            aria-controls="pricing-panel-accessories"
            onClick={() => setSubTab('accessories')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'accessories'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="extension" size={16} />
            4. Phụ Kiện & Đóng Gói ({accessories.length})
          </button>

          <button
            type="button"
            role="tab"
            id="pricing-tab-inventory"
            aria-selected={subTab === 'inventory'}
            aria-controls="pricing-panel-inventory"
            onClick={() => setSubTab('inventory')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'inventory'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="shelves" size={16} />
            5. Kho & Vị Trí Kệ
          </button>

          <button
            type="button"
            role="tab"
            id="pricing-tab-estimator"
            aria-selected={subTab === 'estimator'}
            aria-controls="pricing-panel-estimator"
            onClick={() => setSubTab('estimator')}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer max-md:min-h-11 ${
              subTab === 'estimator'
                ? 'bg-surface text-fg shadow-e1 font-semibold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="receipt_long" size={16} />
            6. Dự Toán BOM Kỹ Thuật & Báo Giá Xưởng
          </button>
        </div>
      </div>
  );
};
