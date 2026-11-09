import React from 'react';
import { AccessoryItem } from '@/types';
import { Icon } from '@frontend/ui';
import { parseNumOrNull } from './accessoryFormUtils';

/**
 * Phần field dùng chung của modal "Thêm phụ kiện" và "Sửa phụ kiện".
 *
 * Tách ra để `AccessoriesManager.tsx` không phình quá trần 835 dòng (gate max-lines).
 * Mọi thứ ở đây giữ NGUYÊN bản: label + `htmlFor`, `aria-describedby`, grid, preview ảnh,
 * placeholder và text tiếng Việt. Chỉ khác nhau giữa 2 modal qua `idPrefix`:
 *   - `new-accessory` → modal tạo mới (có placeholder gợi ý, label dài hơn)
 *   - `edit-accessory` → modal sửa (label ngắn, không placeholder ở vài ô)
 * Controller (form state, nút Lưu/Huỷ) vẫn nằm ở component cha.
 */

interface AccessoryFormFieldsProps {
  /** Tiền tố id — quyết định cả mode tạo mới/sửa lẫn id label/aria. */
  idPrefix: 'new-accessory' | 'edit-accessory';
  value: Partial<AccessoryItem>;
  onChange: <K extends keyof AccessoryItem>(field: K, value: AccessoryItem[K]) => void;
  /** Chuỗi thô admin đang gõ ở ô "Tương Thích Với" (giữ dấu phẩy cuối khi gõ). */
  compatibleText: string;
  onCompatibleTextChange: (text: string) => void;
  /** Kết quả `safeImageUrl(...)` — `undefined` thì hiện icon thay vì `<img src="">`. */
  imagePreview: string | undefined;
}

const BASE_INPUT =
  'h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring';
const MONO_INPUT = `${BASE_INPUT} font-mono`;
const NUM_INPUT = `${BASE_INPUT} text-right font-mono text-sm font-semibold tabular-nums`;
const MONEY_INPUT = `${NUM_INPUT} text-fg`;
const PRICE_INPUT = `${BASE_INPUT} text-right font-mono text-sm font-bold tabular-nums text-primary`;
const THRESHOLD_INPUT = `${BASE_INPUT} text-right font-mono text-sm font-bold tabular-nums text-danger`;
const TEXTAREA =
  'min-h-20 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring';
const SELECT_INPUT =
  'h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring';
const CHECKBOX =
  'h-4 w-4 rounded-sm border-line-control accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const LABEL = 'mb-1 block text-sm font-medium text-fg';
const OPTIONAL = <span className="font-normal text-fg-muted">(không bắt buộc)</span>;

/** Giá trị cho `<input type="number">`: chỉ nhận số hữu hạn, còn lại để trống. */
const numInputValue = (v: number | null | undefined): string | number =>
  typeof v === 'number' && Number.isFinite(v) ? v : '';

export const AccessoryFormFields: React.FC<AccessoryFormFieldsProps> = ({
  idPrefix,
  value,
  onChange,
  compatibleText,
  onCompatibleTextChange,
  imagePreview,
}) => {
  const isEdit = idPrefix === 'edit-accessory';
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={id('name')} className={LABEL}>
          {isEdit ? 'Tên Phụ Kiện *' : 'Tên Phụ Kiện (Tiếng Việt) *'}
        </label>
        <input
          id={id('name')}
          type="text"
          required
          placeholder={isEdit ? undefined : 'Ví dụ: Khoen móc khóa Inox 304 có dây xích 25mm'}
          value={value.name ?? ''}
          onChange={(e) => onChange('name', e.target.value)}
          className={BASE_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('sku')} className={LABEL}>
          {isEdit ? 'Mã SKU *' : 'Mã SKU Quản Lý *'}
        </label>
        <input
          id={id('sku')}
          type="text"
          required
          value={value.sku ?? ''}
          onChange={(e) => onChange('sku', e.target.value)}
          className={MONO_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('name-en')} className={LABEL}>
          Tên Tiếng Anh {OPTIONAL}
        </label>
        <input
          id={id('name-en')}
          type="text"
          lang="en"
          placeholder="Ví dụ: 25mm Stainless Steel Keychain Ring"
          value={value.nameEn ?? ''}
          onChange={(e) => onChange('nameEn', e.target.value)}
          className={BASE_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('category')} className={LABEL}>Phân Loại</label>
        <select
          id={id('category')}
          value={value.category ?? 'keychain'}
          onChange={(e) => onChange('category', e.target.value as any)}
          className={SELECT_INPUT}
        >
          <option value="keychain">Móc Khóa & Dây Đeo (Keychain)</option>
          <option value="fastener">Ốc Cấy Ren & Tán Nhiệt (Inserts)</option>
          <option value="hardware">Bu Lông, Ốc Vít & Chân Silicon</option>
          <option value="magnet">Nam Châm Neodymium N52</option>
          <option value="bearing">Vòng Bi Bạc Đạn (Bearing)</option>
          <option value="packaging">Hộp Quà & Bao Bì Zip</option>
          <option value="other">Phụ Tùng Khác</option>
        </select>
      </div>

      <div>
        <label htmlFor={id('unit')} className={LABEL}>
          {isEdit ? 'Đơn Vị Tính' : 'Đơn Vị Tính (ĐVT)'}
        </label>
        <input
          id={id('unit')}
          type="text"
          placeholder={isEdit ? undefined : 'cái, bộ, con, sợi, hộp, túi...'}
          value={value.unit ?? ''}
          onChange={(e) => onChange('unit', e.target.value)}
          className={BASE_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('location')} className={LABEL}>Vị Trí Kệ Kho</label>
        <input
          id={id('location')}
          type="text"
          placeholder={isEdit ? undefined : 'Kệ A1 - Hộc 02'}
          value={value.warehouseLocation || ''}
          onChange={(e) => onChange('warehouseLocation', e.target.value)}
          className={MONO_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('cost')} className={LABEL}>Giá Vốn Nhập Xưởng (VNĐ)</label>
        <input
          id={id('cost')}
          type="number"
          min="0"
          step={isEdit ? undefined : '100'}
          value={numInputValue(value.costPrice)}
          onChange={(e) => onChange('costPrice', parseNumOrNull(e.target.value))}
          className={MONEY_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('price')} className={LABEL}>
          {isEdit ? 'Giá Báo Khách (VNĐ)' : 'Giá Báo / Bán Cho Khách (VNĐ)'}
        </label>
        <input
          id={id('price')}
          type="number"
          min="0"
          step={isEdit ? undefined : '500'}
          value={numInputValue(value.sellingPrice)}
          onChange={(e) => onChange('sellingPrice', parseNumOrNull(e.target.value))}
          className={PRICE_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('stock')} className={LABEL}>
          {isEdit ? 'Số Lượng Tồn Kho' : 'Tồn Kho Ban Đầu'}
        </label>
        <input
          id={id('stock')}
          type="number"
          min="0"
          value={numInputValue(value.stockCount)}
          onChange={(e) => onChange('stockCount', parseNumOrNull(e.target.value))}
          className={MONEY_INPUT}
        />
      </div>

      <div>
        <label htmlFor={id('threshold')} className={LABEL}>
          {isEdit ? 'Ngưỡng Báo Hết' : 'Ngưỡng Báo Sắp Hết'}
        </label>
        <input
          id={id('threshold')}
          type="number"
          min="1"
          value={numInputValue(value.lowStockThreshold)}
          onChange={(e) => onChange('lowStockThreshold', parseNumOrNull(e.target.value))}
          className={THRESHOLD_INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id('supplier')} className={LABEL}>Nhà Cung Cấp</label>
        <input
          id={id('supplier')}
          type="text"
          placeholder={isEdit ? undefined : 'Xưởng Kim Khí Tân Bình, Fasteners VN...'}
          value={value.supplier || ''}
          onChange={(e) => onChange('supplier', e.target.value)}
          className={BASE_INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id('description')} className={LABEL}>
          {isEdit ? 'Mô Tả' : 'Mô Tả Kỹ Thuật'}
        </label>
        <textarea
          id={id('description')}
          rows={2}
          placeholder={isEdit ? undefined : 'Đặc tính kim loại, dung sai, khả năng chịu lực...'}
          value={value.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className={TEXTAREA}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id('image')} className={LABEL}>
          Ảnh Minh Hoạ (URL) {OPTIONAL}
        </label>
        <input
          id={id('image')}
          type="url"
          inputMode="url"
          placeholder="https://... (chỉ dán URL ảnh thật)"
          value={value.imageUrl ?? ''}
          onChange={(e) => onChange('imageUrl', e.target.value)}
          aria-describedby={`${id('image')}-hint`}
          className={BASE_INPUT}
        />
        <p id={`${id('image')}-hint`} className="mt-1 text-xs text-fg-muted">
          Nền tảng không tự tạo ảnh minh hoạ — để trống nếu chưa có ảnh thật.
        </p>
        {imagePreview ? (
          <img
            src={imagePreview}
            alt={`Ảnh minh hoạ ${value.name?.trim() || (isEdit ? 'phụ kiện' : 'phụ kiện mới')}`}
            className="mt-2 h-20 w-20 rounded-md border border-line object-cover"
          />
        ) : (
          <span className="mt-2 flex h-20 w-20 items-center justify-center rounded-md border border-line-subtle bg-surface-muted text-fg-subtle">
            <Icon name="photo_library" size={22} />
          </span>
        )}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id('compatible')} className={LABEL}>
          Tương Thích Với {OPTIONAL}
        </label>
        <input
          id={id('compatible')}
          type="text"
          placeholder="Móc khóa, Vỏ hộp IoT, Giá đỡ cảm biến..."
          value={compatibleText}
          onChange={(e) => onCompatibleTextChange(e.target.value)}
          aria-describedby={`${id('compatible')}-hint`}
          className={BASE_INPUT}
        />
        <p id={`${id('compatible')}-hint`} className="mt-1 text-xs text-fg-muted">
          Ngăn cách từng mục bằng dấu phẩy.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id('active')} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-fg">
          <input
            id={id('active')}
            type="checkbox"
            checked={isEdit ? Boolean(value.isActive) : value.isActive ?? true}
            onChange={(e) => onChange('isActive', e.target.checked)}
            className={CHECKBOX}
          />
          Đang dùng
        </label>
      </div>
    </div>
  );
};
