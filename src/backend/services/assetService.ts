import { supabase } from '../supabase/client';

/**
 * AssetService — quyền truy cập file CAD + hồ sơ `digital_assets`.
 *
 * Bucket `cad-files` là PRIVATE: policy `vcube_cad_files_cad_owner_rw` cho chủ file (designer)
 * đọc/ghi trong `cad/<auth.uid()>/...`; admin all; người mua đọc qua `order_files` (FL-2b).
 * Vì vậy KHÔNG dùng `getPublicUrl` — cấp file bằng `createSignedUrl`, và UI không gọi thẳng
 * `supabase.storage` (AGENTS.md: truy cập DB/Storage qua tầng service).
 *
 * FL-2a: thêm `createDigitalAsset` (ghi metadata sau khi upload Storage thành công). Việc upload
 * nằm ở `src/backend/integrations/fileStorage.ts` (adapter thay provider được ở FL-7).
 */
export const CAD_BUCKET = 'cad-files';
export const SIGNED_URL_TTL_SECONDS = 60;

/** Payload tối thiểu để tạo một dòng `digital_assets` (FL-2a). */
export interface DigitalAssetCreateInput {
  productId: string;
  designerId: string;
  storagePath: string;
  fileFormat: string;
  fileSizeBytes?: number | null;
  checksum?: string | null;
  licenseType?: string | null;
  /** `null` = không giới hạn lượt tải (đúng cột `download_limit int` cho phép NULL). */
  downloadLimit?: number | null;
  watermarkRequired?: boolean;
}

export interface DigitalAssetRecord {
  id: string;
  productId: string;
  storagePath: string;
}

export class AssetService {
  /**
   * Cấp signed URL cho một object trong bucket CAD. NÉM LỖI nếu Supabase từ chối
   * — caller không được hiện link giả khi chưa có URL thật.
   */
  static async createSignedUrl(
    storagePath: string,
    expiresIn: number = SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(CAD_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Không tạo được liên kết tải.');
    }

    return data.signedUrl;
  }

  /**
   * Ghi metadata file số vào `digital_assets`. NÉM LỖI nếu DB từ chối — caller phải compensation
   * (xoá object vừa upload) và KHÔNG báo thành công.
   *
   * LƯU Ý KIẾN TRÚC (FL-2a): product + asset hiện được ghi ở 2 request riêng từ client. Không có
   * transaction ⇒ nếu request tạo sản phẩm thất bại sau khi asset đã ghi, có thể còn asset "mồ côi".
   * FL-7 sẽ thay bằng RPC server-side (một transaction). Xem handoff FL-2a §risks.
   */
  static async createDigitalAsset(input: DigitalAssetCreateInput): Promise<DigitalAssetRecord> {
    const productId = String(input.productId || '').trim();
    const designerId = String(input.designerId || '').trim();
    const storagePath = String(input.storagePath || '').trim();

    if (!productId) throw new Error('Thiếu mã sản phẩm để gắn hồ sơ file số.');
    if (!designerId) throw new Error('Thiếu phiên Nhà thiết kế — không ghi hồ sơ file số.');
    if (!storagePath) throw new Error('Thiếu đường dẫn tệp trong kho lưu trữ.');
    if (input.downloadLimit !== undefined && input.downloadLimit !== null && input.downloadLimit < 0) {
      throw new Error('Giới hạn lượt tải không hợp lệ.');
    }

    const { data, error } = await supabase
      .from('digital_assets')
      .insert({
        product_id: productId,
        designer_id: designerId,
        storage_path: storagePath,
        file_format: input.fileFormat || '',
        file_size_bytes: typeof input.fileSizeBytes === 'number' ? input.fileSizeBytes : null,
        checksum: input.checksum || null,
        license_type: input.licenseType || null,
        download_limit: input.downloadLimit ?? null,
        watermark_required: input.watermarkRequired ?? true,
      })
      .select('id, product_id, storage_path')
      .single();

    if (error) {
      throw new Error(error.message || 'Không ghi được hồ sơ file số (digital_assets).');
    }

    const row = data as { id: string; product_id: string; storage_path: string };
    return { id: row.id, productId: row.product_id, storagePath: row.storage_path };
  }
}
