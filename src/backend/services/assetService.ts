import { supabase } from '../supabase/client';

/**
 * AssetService — truy cập Storage cho file CAD đã mua.
 *
 * Bucket `cad-files` là PRIVATE (policy chỉ cho admin), nên phải đi qua
 * `createSignedUrl`; KHÔNG dùng `getPublicUrl`. UI không gọi thẳng
 * `supabase.storage` (AGENTS.md: truy cập DB/Storage qua tầng service).
 */
export const CAD_BUCKET = 'cad-files';
export const SIGNED_URL_TTL_SECONDS = 60;

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
}
