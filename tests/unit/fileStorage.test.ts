/**
 * Unit test — `src/backend/integrations/fileStorage.ts` (FL-2a: upload file CAD thật).
 *
 * Vì sao quan trọng: path upload SAI sẽ bị storage policy `vcube_cad_files_cad_owner_rw`
 * từ chối (hoặc tệ hơn: ghi sang thư mục người khác nếu thiếu kiểm tra `..`). Validate sai
 * thì designer tưởng đã gửi file nhưng bucket không nhận. Test này giữ các bất biến:
 *   1. path luôn `cad/<uid>/<uuid>/<sanitized>` — đúng 4 cấp, uid trùng người upload;
 *   2. tên file không thể chứa `..`/`/`/`\` hay ký tự điều khiển;
 *   3. allowlist định dạng + giới hạn 150 MB khớp bucket;
 *   4. adapter Supabase map lỗi thành Error (không "thành công giả"), compensation remove
 *      không ném tiếp để che lỗi gốc.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// client.ts đọc `NEXT_PUBLIC_*` lúc import; đặt env trước khi import module để test không
// in cảnh báo "chưa cấu hình" (không gọi mạng — adapter được test bằng mock client).
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fl2a-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_fl2a_test';

const {
  ALLOWED_CAD_EXTENSIONS,
  MAX_CAD_FILE_BYTES,
  SupabaseFileStorage,
  buildCadStoragePath,
  computeSha256Hex,
  createStorageObjectId,
  formatCadFileSize,
  getFileExtension,
  inferCadContentType,
  isMeshParseable,
  isValidOwnerId,
  normalizeCadFormat,
  sanitizeFileName,
  validateCadFile,
} = await import('../../src/backend/integrations/fileStorage');
type StorageClientLike = import('../../src/backend/integrations/fileStorage').StorageClientLike;
type FileStorage = import('../../src/backend/integrations/fileStorage').FileStorage;

const UID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const OBJ_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const makeFile = (name: string, size = 1024): File => new File([new Uint8Array(size)], name);

describe('fileStorage — validate tệp trước upload', () => {
  test('chấp nhận đủ allowlist, chuẩn hoá định dạng STP → STEP', () => {
    for (const ext of ['stl', 'step', 'stp', '3mf', 'obj', 'zip']) {
      const result = validateCadFile({ name: `model.${ext}`, size: 1024 });
      assert.equal(result.ok, true, ext);
      if (result.ok) {
        assert.equal(result.extension, ext);
        assert.equal(result.format, ext === 'stp' ? 'STEP' : ext.toUpperCase());
      }
    }
  });

  test('tên file HOA và đường dẫn Windows vẫn nhận đúng đuôi', () => {
    const upper = validateCadFile({ name: 'BANH_RANG.STL', size: 1024 });
    assert.equal(upper.ok, true);
    if (upper.ok) assert.equal(upper.format, 'STL');

    const winPath = validateCadFile({ name: 'C:\\Users\\KE\\hop.step', size: 1024 });
    assert.equal(winPath.ok, true);
    if (winPath.ok) assert.equal(winPath.format, 'STEP');
  });

  test('từ chối đuôi lạ, tệp rỗng, quá 150 MB, thiếu tên', () => {
    const exe = validateCadFile({ name: 'virus.exe', size: 10 });
    assert.deepEqual(exe.ok, false);
    if (exe.ok === false) assert.equal(exe.code, 'unsupported_extension');

    const empty = validateCadFile({ name: 'rong.stl', size: 0 });
    assert.deepEqual(empty.ok, false);
    if (empty.ok === false) assert.equal(empty.code, 'empty_file');

    const huge = validateCadFile({ name: 'to.stl', size: MAX_CAD_FILE_BYTES + 1 });
    assert.deepEqual(huge.ok, false);
    if (huge.ok === false) assert.equal(huge.code, 'too_large');

    const missing = validateCadFile(null);
    assert.deepEqual(missing.ok, false);
    if (missing.ok === false) assert.equal(missing.code, 'no_file');

    // Biên: đúng 150 MB vẫn hợp lệ.
    const exact = validateCadFile({ name: 'max.stl', size: MAX_CAD_FILE_BYTES });
    assert.equal(exact.ok, true);
  });

  test('getFileExtension/normalizeCadFormat/inferCadContentType nhất quán', () => {
    assert.equal(getFileExtension('a.b.STEP'), 'step');
    assert.equal(getFileExtension('khongcoext'), '');
    assert.equal(getFileExtension('../../etc/passwd'), '');
    assert.equal(normalizeCadFormat('stp'), 'STEP');
    assert.equal(normalizeCadFormat('3mf'), '3MF');
    assert.equal(inferCadContentType('x.stl'), 'model/stl');
    assert.equal(inferCadContentType('x.zip'), 'application/zip');
    assert.equal(inferCadContentType('x.la'), 'application/octet-stream');
    assert.equal(isMeshParseable('x.stl'), true);
    assert.equal(isMeshParseable('x.zip'), false);
  });

  test('formatCadFileSize: tệp nhỏ hiện KB/B, không hiện "0.00 MB"', () => {
    assert.equal(formatCadFileSize(512), '512 B');
    assert.equal(formatCadFileSize(2047), '2.0 KB');
    assert.equal(formatCadFileSize(150 * 1024 * 1024), '150.00 MB');
    assert.equal(formatCadFileSize(null), '—');
    assert.equal(formatCadFileSize(-1), '—');
  });

  test('ALLOWED_CAD_EXTENSIONS khớp UI/README (stl, step, stp, 3mf, obj, zip)', () => {
    assert.deepEqual([...ALLOWED_CAD_EXTENSIONS], ['stl', 'step', 'stp', '3mf', 'obj', 'zip']);
  });
});

describe('fileStorage — sanitize tên file (chống path traversal)', () => {
  test('bỏ mọi thư mục phía trước, chỉ giữ basename', () => {
    assert.equal(sanitizeFileName('../../etc/passwd.stl'), 'passwd.stl');
    assert.equal(sanitizeFileName('..\\..\\windows\\evil.stl'), 'evil.stl');
    assert.equal(sanitizeFileName('/tmp/a/b/c/banh-rang.stl'), 'banh-rang.stl');
  });

  test('loại ký tự lạ, giữ whitelist [a-z0-9._-] + đuôi', () => {
    const out = sanitizeFileName('Bánh răng "cuối" (v2).STL');
    assert.match(out, /^[a-z0-9._-]+\.stl$/);
    assert.ok(!out.includes('..'));
    assert.ok(!out.includes(' '));
    assert.ok(!out.includes('"'));
  });

  test('không bao giờ trả rỗng hoặc chỉ có dấu chấm', () => {
    assert.equal(sanitizeFileName(''), 'file');
    assert.equal(sanitizeFileName('...'), 'file');
    assert.equal(sanitizeFileName('..\\..'), 'file');
    assert.match(sanitizeFileName('.hidden'), /^hidden/);
  });

  test('giới hạn 120 ký tự nhưng giữ đuôi file', () => {
    const long = `${'a'.repeat(300)}.stl`;
    const out = sanitizeFileName(long);
    assert.ok(out.length <= 120);
    assert.ok(out.endsWith('.stl'));
  });

  test('tên chứa ký tự điều khiển/null không lọt vào path', () => {
    const out = sanitizeFileName('a\u0000b\u001fc.stl');
    assert.ok(!/[\u0000-\u001f]/.test(out));
    assert.equal(out, 'abc.stl');
  });
});

describe('fileStorage — path scheme cad/<uid>/<uuid>/<file>', () => {
  test('tạo đúng 4 cấp, uid ở cấp 2, uuid ở cấp 3', () => {
    const path = buildCadStoragePath(UID, 'Bánh răng.STL', OBJ_ID);
    const parts = path.split('/');
    assert.equal(parts.length, 4);
    assert.equal(parts[0], 'cad');
    assert.equal(parts[1], UID);
    assert.equal(parts[2], OBJ_ID);
    assert.equal(parts[3], 'banh-rang.stl');
    // Bất biến policy: (storage.foldername(name))[1]='cad', [2]=uid, đủ ≥3 cấp.
    assert.equal(parts[0], 'cad');
    assert.ok(parts.length - 1 >= 3);
  });

  test('mặc định tự sinh UUID v4 hợp lệ', () => {
    const path = buildCadStoragePath(UID, 'x.stl');
    const uuid = path.split('/')[2];
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('từ chối uid không hợp lệ (thiếu session / traversal)', () => {
    for (const uid of ['', '   ', '../other', 'a/b', 'a\\b', '..', '.']) {
      assert.throws(() => buildCadStoragePath(uid, 'x.stl'), /chủ sở hữu|phiên đăng nhập/i, uid);
    }
    assert.throws(() => buildCadStoragePath(null, 'x.stl'), /chủ sở hữu/i);
  });

  test('từ chối uuid sai định dạng', () => {
    for (const id of ['', 'abc', '../evil', '3f2504e0-4f89-41d3-9a0c-0305e82c330']) {
      assert.throws(() => buildCadStoragePath(UID, 'x.stl', id), /Mã định danh|không hợp lệ/i, id);
    }
  });

  test('tên tệp không có đuôi hợp lệ → từ chối (không đoán định dạng)', () => {
    assert.throws(() => buildCadStoragePath(UID, '...'), /Tên tệp không hợp lệ/i);
  });

  test('isValidOwnerId khớp điều kiện thư mục uid', () => {
    assert.equal(isValidOwnerId(UID), true);
    assert.equal(isValidOwnerId('a'.repeat(128)), true);
    for (const bad of ['', ' ', 'a/b', 'a\\b', '..', '.', 'a b', 'a'.repeat(129), null, undefined]) {
      assert.equal(isValidOwnerId(bad as string), false, String(bad));
    }
  });

  test('createStorageObjectId luôn là UUID v4', () => {
    for (let i = 0; i < 5; i++) {
      assert.match(createStorageObjectId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});

describe('fileStorage — SupabaseFileStorage (mock client, không gọi mạng)', () => {
  const createMock = () => {
    const calls: Array<{ op: string; args: unknown[] }> = [];
    let uploadError: { message: string } | null = null;
    let signedUrlError: { message: string } | null = null;
    let removeError: { message: string } | null = null;
    const client: StorageClientLike = {
      storage: {
        from(bucket: string) {
          calls.push({ op: 'from', args: [bucket] });
          return {
            async upload(path: string, file: File, options?: { contentType?: string; upsert?: boolean }) {
              calls.push({ op: 'upload', args: [path, file, options] });
              return { error: uploadError };
            },
            async createSignedUrl(path: string, expiresIn: number) {
              calls.push({ op: 'createSignedUrl', args: [path, expiresIn] });
              return signedUrlError
                ? { data: null, error: signedUrlError }
                : { data: { signedUrl: `https://signed/${path}?token=t` }, error: null };
            },
            async remove(paths: string[]) {
              calls.push({ op: 'remove', args: [paths] });
              return { error: removeError };
            },
          };
        },
      },
    };
    return {
      client,
      calls,
      setUploadError: (e: { message: string } | null) => {
        uploadError = e;
      },
      setSignedUrlError: (e: { message: string } | null) => {
        signedUrlError = e;
      },
      setRemoveError: (e: { message: string } | null) => {
        removeError = e;
      },
    };
  };

  test('upload gọi đúng bucket + path + contentType/upsert, trả size thật', async () => {
    const mock = createMock();
    const storage: FileStorage = new SupabaseFileStorage(mock.client);
    const file = makeFile('x.stl', 4321);
    const path = buildCadStoragePath(UID, file.name, OBJ_ID);

    const result = await storage.upload(path, file);
    assert.deepEqual(result, { path, sizeBytes: 4321, contentType: 'model/stl' });

    const fromCall = mock.calls.find((c) => c.op === 'from');
    assert.equal(fromCall?.args[0], 'cad-files');
    const uploadCall = mock.calls.find((c) => c.op === 'upload');
    assert.ok(uploadCall);
    assert.deepEqual(uploadCall?.args[0], path);
    assert.deepEqual(uploadCall?.args[2], { contentType: 'model/stl', upsert: false });
  });

  test('upload lỗi → ném Error tiếng Việt (không bao giờ báo thành công giả)', async () => {
    const mock = createMock();
    mock.setUploadError({ message: 'new row violates row-level security policy' });
    const storage = new SupabaseFileStorage(mock.client);
    await assert.rejects(storage.upload(buildCadStoragePath(UID, 'x.stl'), makeFile('x.stl')), /kho lưu trữ|row-level security/i);
  });

  test('createSignedUrl trả URL thật; lỗi → ném Error', async () => {
    const mock = createMock();
    const storage = new SupabaseFileStorage(mock.client);
    const path = buildCadStoragePath(UID, 'x.stl', OBJ_ID);
    const url = await storage.createSignedUrl(path, 120);
    assert.equal(url, `https://signed/${path}?token=t`);
    const signedCall = mock.calls.find((c) => c.op === 'createSignedUrl');
    assert.deepEqual(signedCall?.args, [path, 120]);

    mock.setSignedUrlError({ message: 'Object not found' });
    await assert.rejects(storage.createSignedUrl(path), /Object not found|liên kết tải/i);
  });

  test('remove là best-effort: lỗi chỉ cảnh báo, KHÔNG ném (compensation không che lỗi gốc)', async () => {
    const mock = createMock();
    const storage = new SupabaseFileStorage(mock.client);
    mock.setRemoveError({ message: 'network down' });
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      await assert.doesNotReject(storage.remove('cad/x/y/z.stl'));
    } finally {
      console.warn = originalWarn;
    }
    assert.ok(warnings.some((w) => w.includes('compensation')));
  });
});

describe('fileStorage — checksum SHA-256', () => {
  test('tính đúng hex cho nội dung đã biết (abc)', async () => {
    const file = new File(['abc'], 'abc.stl');
    const hash = await computeSha256Hex(file);
    // SHA-256("abc") chuẩn NIST
    assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
