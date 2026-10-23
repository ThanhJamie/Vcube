/**
 * fileStorage — adapter lưu file CAD (FL-2a).
 *
 * VÌ SAO CẦN ADAPTER
 * ------------------
 * Trước FL-2a repo **không có code upload nào**: designer chỉ ghi tên/dung lượng tệp vào form,
 * file thật không lên Storage, `digital_assets.storage_path` vì thế luôn trống ⇒ chuỗi giao file
 * số không thể chạy. Module này tách "nơi lưu file" khỏi Supabase để FL-7 có thể thay provider/CDN
 * khác mà không sửa UI/service: chỉ cần implement lại `FileStorage`.
 *
 * HỢP ĐỒNG
 * - Bucket: **`cad-files` (private)**, xem `docs/database/schema-notes.md` §file CAD.
 * - Path: `cad/<auth.uid()>/<uuid>/<sanitized-name>` — đúng policy
 *   `vcube_cad_files_cad_owner_rw` (`20261013110000_storage_scheme.sql`): chủ file chỉ đọc/ghi
 *   trong thư mục uid của mình, chống `..`, bắt buộc đủ 3 cấp.
 * - Chỉ tầng service/component gọi adapter; UI không gọi `supabase.storage` trực tiếp.
 *
 * TODO(FL-7): thay `SupabaseFileStorage` bằng provider mutable/CDN (S3/R2/…); giữ nguyên
 * `FileStorage` + path scheme để `digital_assets.storage_path` không phải migrate dữ liệu.
 */

import { supabase } from '../supabase/client';
import { CAD_BUCKET } from '../services/assetService';

/** Giới hạn upload theo bucket `cad-files` (150 MB — file_size_limit trong migration baseline). */
export const MAX_CAD_FILE_BYTES = 150 * 1024 * 1024;

/** Đuôi file CAD được phép. ZIP cho bộ nhiều tệp (STEP + PDF + ảnh) — KHÔNG parse lưới. */
export const ALLOWED_CAD_EXTENSIONS = ['stl', 'step', 'stp', '3mf', 'obj', 'zip'] as const;
export type CadExtension = (typeof ALLOWED_CAD_EXTENSIONS)[number];

/** Định dạng được bộ đọc lưới hiện có hỗ trợ (ZIP thì không). */
export const MESH_PARSEABLE_EXTENSIONS: CadExtension[] = ['stl', 'step', 'stp', '3mf', 'obj'];

const EXT_TO_FORMAT: Record<CadExtension, string> = {
  stl: 'STL',
  step: 'STEP',
  stp: 'STEP',
  '3mf': '3MF',
  obj: 'OBJ',
  zip: 'ZIP',
};

export type CadFileValidationCode =
  | 'no_file'
  | 'empty_file'
  | 'too_large'
  | 'unsupported_extension';

export type CadFileValidation =
  | { ok: true; extension: CadExtension; format: string }
  | { ok: false; code: CadFileValidationCode; message: string };

/**
 * Lấy đuôi file (lowercase, không dấu chấm). Không dựa vào `file.type` vì trình duyệt trả
 * `application/octet-stream`/rỗng cho .step/.3mf rất thường xuyên.
 */
export function getFileExtension(fileName: string): string {
  const base = String(fileName || '').trim().split(/[\\/]/).pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx <= 0 || idx === base.length - 1) return '';
  return base.slice(idx + 1).toLowerCase();
}

/** `stl` → `STL`, `stp` → `STEP` (chuẩn hoá về tên định dạng lưu trong DB). */
export function normalizeCadFormat(extension: string): string {
  const ext = String(extension || '').toLowerCase();
  return EXT_TO_FORMAT[ext as CadExtension] ?? ext.toUpperCase();
}

/**
 * Validate tệp CAD trước khi upload. Lỗi trả về `code` máy đọc + `message` tiếng Việt cho UI.
 * Luật: đuôi thuộc allowlist, size > 0, size ≤ 150 MB.
 */
export function validateCadFile(file: { name?: string; size?: number } | null | undefined): CadFileValidation {
  if (!file || !file.name) {
    return { ok: false, code: 'no_file', message: 'Chưa chọn tệp CAD.' };
  }
  const extension = getFileExtension(file.name);
  if (!ALLOWED_CAD_EXTENSIONS.includes(extension as CadExtension)) {
    return {
      ok: false,
      code: 'unsupported_extension',
      message: `Định dạng ".${extension || '?'}" không được hỗ trợ. Chỉ nhận: ${ALLOWED_CAD_EXTENSIONS.join(', ').toUpperCase()}.`,
    };
  }
  const size = typeof file.size === 'number' ? file.size : -1;
  if (size <= 0) {
    return { ok: false, code: 'empty_file', message: 'Tệp rỗng hoặc không đọc được dung lượng.' };
  }
  if (size > MAX_CAD_FILE_BYTES) {
    return {
      ok: false,
      code: 'too_large',
      message: `Tệp vượt giới hạn ${Math.round(MAX_CAD_FILE_BYTES / (1024 * 1024))} MB (hiện ${(size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  return { ok: true, extension: extension as CadExtension, format: normalizeCadFormat(extension) };
}

/** Có parse lưới được không (ZIP/STEP phụ thuộc bộ đọc; STEP đi qua WASM kernel). */
export function isMeshParseable(fileName: string): boolean {
  return MESH_PARSEABLE_EXTENSIONS.includes(getFileExtension(fileName) as CadExtension);
}

/**
 * Chuẩn hoá tên file để lưu Storage:
 * - chỉ lấy phần basename (bỏ mọi `/`, `\`, ổ đĩa Windows);
 * - chặn `..` và ký tự điều khiển;
 * - whitelist `[a-z0-9._-]` (đuôi giữ nguyên, chữ thường);
 * - gộp nhiều dấu `.`/`-`, bỏ `.`/`-` ở đầu, cắt còn ≤120 ký tự (giữ đuôi).
 * Không bao giờ trả chuỗi rỗng — fallback `file.<ext>` hoặc `file.stl`.
 */
export function sanitizeFileName(originalName: string): string {
  const raw = String(originalName || '').trim();
  const base = raw.split(/[\\/]/).pop() || raw;
  // Bỏ dấu tiếng Việt trước khi lọc ký tự: "Bánh răng" → "banh rang" (đọc được, không thành "b-nh-r-ng").
  // Lưu ý: `đ/Đ` KHÔNG tách được bằng NFD nên phải thay riêng.
  const lower = base
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f]/g, '');
  const extension = getFileExtension(lower);
  const withoutExt = extension ? lower.slice(0, -(extension.length + 1)) : lower;

  let stem = withoutExt
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-{2,}/g, '-')
    .replace(/^[.\-_]+|[.\-_]+$/g, '');
  if (!stem) stem = 'file';

  const safeExt = ALLOWED_CAD_EXTENSIONS.includes(extension as CadExtension)
    ? extension
    : extension.replace(/[^a-z0-9]/g, '').slice(0, 10);

  // Cắt stem để tổng ≤120 ký tự (kể cả dấu chấm + đuôi).
  const maxStem = 120 - (safeExt ? safeExt.length + 1 : 0);
  if (stem.length > maxStem) stem = stem.slice(0, maxStem).replace(/[.\-_]+$/, '') || 'file';

  return safeExt ? `${stem}.${safeExt}` : stem;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** UUID v4 thuần (không phụ thuộc `crypto.randomUUID` để test được ở Node cũ). */
export function createStorageObjectId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID().toLowerCase();
  // Fallback: UUID v4 từ Math.random (không dùng cho bảo mật; chỉ là tên thư mục).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Một thư mục uid hợp lệ: không rỗng, không chứa `/`, `\`, `..`, khoảng trắng. */
export function isValidOwnerId(uid: string | null | undefined): boolean {
  if (typeof uid !== 'string') return false;
  const value = uid.trim();
  if (!value || value.length > 128) return false;
  if (value === '.' || value === '..') return false;
  return !/[/\\\s]/.test(value);
}

/**
 * Tạo path Storage an toàn: `cad/<uid>/<uuid>/<sanitized-name>`.
 * NÉM LỖI khi uid không hợp lệ hoặc tên file không sanitize được (không trả path "đoán").
 */
export function buildCadStoragePath(
  ownerId: string | null | undefined,
  originalName: string,
  objectId?: string,
): string {
  if (!isValidOwnerId(ownerId)) {
    throw new Error('Không xác định được chủ sở hữu tệp (thiếu phiên đăng nhập hợp lệ).');
  }
  const uid = String(ownerId).trim();
  const id = objectId ?? createStorageObjectId();
  if (!UUID_RE.test(id)) {
    throw new Error('Mã định danh thư mục lưu tệp không hợp lệ.');
  }
  const safeName = sanitizeFileName(originalName);
  if (!safeName || safeName === 'file') {
    throw new Error('Tên tệp không hợp lệ để lưu trữ.');
  }
  return `cad/${uid}/${id}/${safeName}`;
}

/** Kết quả upload tối thiểu — đủ để ghi `digital_assets.storage_path`. */
export interface UploadResult {
  path: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * Hợp đồng lưu trữ file CAD. FL-7 thay provider bằng cách implement interface này.
 * Mọi method NÉM LỖI (message tiếng Việt) khi thất bại — caller không được báo thành công giả.
 */
export interface FileStorage {
  upload(path: string, file: File, opts?: { contentType?: string; upsert?: boolean }): Promise<UploadResult>;
  createSignedUrl(path: string, expiresIn?: number): Promise<string>;
  remove(path: string): Promise<void>;
}

/** Tối thiểu những gì adapter cần từ Supabase Storage client (để unit-test bằng mock). */
export interface StorageClientLike {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        file: File,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ error: { message?: string } | null }>;
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>;
      remove(paths: string[]): Promise<{ error: { message?: string } | null }>;
    };
  };
}

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60;
const MIME_BY_EXT: Record<string, string> = {
  stl: 'model/stl',
  step: 'model/step',
  stp: 'model/step',
  '3mf': 'model/3mf',
  obj: 'model/obj',
  zip: 'application/zip',
};

/**
 * Định dạng dung lượng cho UI. Tệp CAD nhỏ (2 KB) không được hiện "0.00 MB" — gây hiểu nhầm
 * là tệp rỗng; dùng B/KB/MB theo độ lớn.
 */
export function formatCadFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Content-type gợi ý theo đuôi; trình duyệt thường trả rỗng cho .step/.3mf. */
export function inferCadContentType(fileName: string): string {
  return MIME_BY_EXT[getFileExtension(fileName)] ?? 'application/octet-stream';
}

export class SupabaseFileStorage implements FileStorage {
  private readonly client: StorageClientLike;

  private readonly bucket: string;

  constructor(client: StorageClientLike = supabase, bucket: string = CAD_BUCKET) {
    this.client = client;
    this.bucket = bucket;
  }

  async upload(path: string, file: File, opts: { contentType?: string; upsert?: boolean } = {}): Promise<UploadResult> {
    if (!file || typeof file.size !== 'number') {
      throw new Error('Không có tệp để tải lên.');
    }
    const bucket = this.client.storage.from(this.bucket);
    const { error } = await bucket.upload(path, file, {
      contentType: opts.contentType ?? inferCadContentType(file.name),
      upsert: opts.upsert ?? false,
    });
    if (error) {
      throw new Error(`Không tải được tệp lên kho lưu trữ: ${error.message || 'lỗi không xác định'}`);
    }
    return { path, sizeBytes: file.size, contentType: opts.contentType ?? inferCadContentType(file.name) };
  }

  async createSignedUrl(path: string, expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS): Promise<string> {
    const bucket = this.client.storage.from(this.bucket);
    const { data, error } = await bucket.createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Không tạo được liên kết tải tệp.');
    }
    return data.signedUrl;
  }

  async remove(path: string): Promise<void> {
    const bucket = this.client.storage.from(this.bucket);
    const { error } = await bucket.remove([path]);
    if (error) {
      // Compensation không được che lỗi gốc của caller: chỉ log, không ném tiếp.
      console.warn('[fileStorage] Không xoá được object sau khi compensation:', error.message);
    }
  }
}

let cachedStorage: FileStorage | null = null;

/** Adapter mặc định dùng Supabase Storage (bucket `cad-files`). */
export function getCadFileStorage(): FileStorage {
  if (!cachedStorage) cachedStorage = new SupabaseFileStorage();
  return cachedStorage;
}

/** Cho test/khác inject adapter khác hoặc reset cache. */
export function setCadFileStorage(storage: FileStorage | null): void {
  cachedStorage = storage;
}

/** SHA-256 hex của file (checksum lưu vào `digital_assets.checksum`). `null` nếu môi trường thiếu SubtleCrypto. */
export async function computeSha256Hex(file: File): Promise<string | null> {
  try {
    const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
    if (!subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.warn('[fileStorage] Không tính được checksum SHA-256:', err);
    return null;
  }
}
