import React, { useMemo, useState } from 'react';
import { MaterialProfile } from '../../types';
import { Icon, EmptyState, Button } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency, formatNumber } from '@frontend/lib/format';
import { useLanguage } from '../context/LanguageContext';

interface MaterialComparisonMatrixProps {
  materials?: MaterialProfile[];
  onSelectMaterial?: (materialId: string) => void;
  onNavigate?: (screen: string, payload?: any) => void;
  className?: string;
}

/** Số hữu hạn hay không — NULL/NaN ⇒ chưa cấu hình (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Bảng so sánh vật liệu đọc TRỰC TIẾP từ danh mục `materials` thật.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md)
 * ----------------------------------------------------
 * Bản cũ render một mảng `EXTENDED_COMPARISONS` BỊA (điểm cơ tính 1-10, nhiệt độ, "price tier",
 * đánh giá "ứng dụng tối ưu") và KHÔNG hề đọc prop `materials`. Nay chỉ hiển thị những trường
 * DB thật có; thiếu ⇒ `—`. Không suy diễn điểm số, không bịa khuyến nghị.
 */
export const MaterialComparisonMatrix: React.FC<MaterialComparisonMatrixProps> = ({
  materials = [],
  onSelectMaterial,
  onNavigate,
  className = '',
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const list = useMemo(() => materials.filter(Boolean), [materials]);

  const [activeId, setActiveId] = useState<string>('');
  const active = list.find((m) => m.id === activeId) ?? list[0] ?? null;

  const handleChooseForQuote = (matId: string) => {
    onSelectMaterial?.(matId);
    onNavigate?.('quote', { materialId: matId });
  };

  return (
    <div className={`bg-surface rounded-lg p-6 shadow-e1 ${className}`}>
      <div className="border-b border-line-subtle pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
          <Icon name="science" size={18} />
          <span>{isVi ? 'Danh Mục Vật Liệu' : 'Material Catalog'}</span>
        </div>
        <h2 className="text-xl font-black text-fg tracking-tight">
          {isVi ? 'So Sánh Vật Liệu Đang Cấu Hình' : 'Configured Materials Comparison'}
        </h2>
        <p className="text-xs text-fg-subtle mt-0.5">
          {isVi
            ? 'Thông số lấy trực tiếp từ danh mục vật liệu trong hệ thống. Ô trống nghĩa là chưa được khai báo.'
            : 'Parameters come directly from the system material catalog. Empty fields mean they have not been declared.'}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            bordered
            icon={<Icon name="science" size={20} />}
            title={isVi ? 'Chưa có vật liệu nào được cấu hình' : 'No materials configured yet'}
            description={
              isVi
                ? 'Quản trị viên cần khai báo vật liệu trong /admin (Vật liệu) trước khi so sánh.'
                : 'An administrator needs to declare materials in /admin (Materials) before comparison.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line text-xs font-mono text-fg-subtle uppercase tracking-wider">
                  <th className="py-3 px-3">{isVi ? 'Vật liệu' : 'Material'}</th>
                  <th className="py-3 px-2 text-center">{isVi ? 'Độ bền kéo' : 'Tensile'}</th>
                  <th className="py-3 px-2 text-center">{isVi ? 'Chịu nhiệt' : 'Heat'}</th>
                  <th className="py-3 px-2 text-center">{isVi ? 'Độ dẻo' : 'Flexibility'}</th>
                  <th className="py-3 px-2 text-center">{isVi ? 'Tỷ trọng' : 'Density'}</th>
                  <th className="py-3 px-2 text-center">{isVi ? 'Đơn giá / g' : 'Price / g'}</th>
                  <th className="py-3 px-3 text-right">{isVi ? 'Hành động' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {list.map((mat) => {
                  const isSelected = active?.id === mat.id;
                  return (
                    <tr
                      key={mat.id}
                      onClick={() => setActiveId(mat.id)}
                      className={`transition-colors ${isSelected ? 'bg-primary/5 font-medium' : 'hover:bg-canvas'}`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-fg">{mat.name}</div>
                        {mat.brand && <span className="text-xs text-fg-muted font-mono">{mat.brand}</span>}
                      </td>
                      <td className="py-3.5 px-2 text-center text-fg-muted">
                        {mat.strength?.trim() || EMPTY_VALUE}
                      </td>
                      <td className="py-3.5 px-2 text-center whitespace-nowrap text-fg-muted">
                        {mat.heatResistance?.trim() || EMPTY_VALUE}
                      </td>
                      <td className="py-3.5 px-2 text-center text-fg-muted">
                        {mat.flexibility?.trim() || EMPTY_VALUE}
                      </td>
                      <td className="py-3.5 px-2 text-center font-mono tabular-nums text-fg-muted">
                        {isNum(mat.density) ? `${formatNumber(mat.density, { maximumFractionDigits: 2 })} g/cm³` : EMPTY_VALUE}
                      </td>
                      <td className="py-3.5 px-2 text-center font-mono tabular-nums text-primary font-bold">
                        {isNum(mat.pricePerGram) ? `${formatCurrency(mat.pricePerGram)}/g` : EMPTY_VALUE}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChooseForQuote(mat.id);
                          }}
                        >
                          {isVi ? 'Báo Giá' : 'Quote'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {active && (
            <div className="lg:col-span-4 bg-canvas border border-line rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-black text-fg">{active.name}</h3>
                {active.brand && <p className="text-xs text-fg-muted font-mono mt-0.5">{active.brand}</p>}

                <dl className="mt-4 space-y-2 text-xs">
                  {[
                    { label: isVi ? 'Độ bền kéo' : 'Tensile strength', value: active.strength?.trim() || EMPTY_VALUE },
                    { label: isVi ? 'Chịu nhiệt' : 'Heat resistance', value: active.heatResistance?.trim() || EMPTY_VALUE },
                    { label: isVi ? 'Độ dẻo' : 'Flexibility', value: active.flexibility?.trim() || EMPTY_VALUE },
                    {
                      label: isVi ? 'Tỷ trọng' : 'Density',
                      value: isNum(active.density) ? `${formatNumber(active.density, { maximumFractionDigits: 2 })} g/cm³` : EMPTY_VALUE,
                    },
                    {
                      label: isVi ? 'Giá vốn / kg' : 'Cost / kg',
                      value: isNum(active.costPerKg) ? formatCurrency(active.costPerKg) : EMPTY_VALUE,
                    },
                    {
                      label: isVi ? 'Đơn giá bán / g' : 'Sell price / g',
                      value: isNum(active.pricePerGram) ? `${formatCurrency(active.pricePerGram)}/g` : EMPTY_VALUE,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-fg-muted">{row.label}</dt>
                      <dd className="font-mono font-bold text-fg text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {(active.desc?.trim() || active.recommendedFor?.trim()) && (
                  <div className="mt-4 space-y-2.5 text-xs">
                    {active.desc?.trim() && (
                      <div className="p-2.5 bg-surface-muted rounded-lg">
                        <span className="text-xs font-mono uppercase font-bold text-fg block mb-0.5">
                          {isVi ? 'Mô tả' : 'Description'}
                        </span>
                        <p className="text-fg-muted leading-relaxed">{active.desc}</p>
                      </div>
                    )}
                    {active.recommendedFor?.trim() && (
                      <div className="p-2.5 bg-surface-muted rounded-lg">
                        <span className="text-xs font-mono uppercase font-bold text-positive block mb-0.5">
                          {isVi ? 'Khuyến nghị sử dụng' : 'Recommended for'}
                        </span>
                        <p className="text-fg-muted leading-relaxed">{active.recommendedFor}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                leadingIcon={<Icon name="precision_manufacturing" size={18} />}
                onClick={() => handleChooseForQuote(active.id)}
              >
                {isVi ? `Chọn ${active.name} báo giá` : `Quote with ${active.name}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
