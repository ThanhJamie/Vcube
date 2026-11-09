/**
 * Unit test — `formatFileSize` trong `src/frontend/components/tool3d/tool3dAnalysis.ts`.
 *
 * Vì sao quan trọng: nhãn dung lượng hiện trên panel /quote. Làm tròn thô (1.331 B ⇒ "1 KB",
 * 512 B ⇒ "1 KB") làm khách đọc sai kích thước tệp đã tải lên, nên test giữ các mốc:
 *   1. < 1 KB: nguyên byte, không thập phân;
 *   2. 1 KB–1 MB: KB 1 chữ số thập phân, không bao giờ về 0;
 *   3. từ 1 MB: MB 1 chữ số (như cũ).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { formatFileSize } from '../../src/frontend/components/tool3d/tool3dAnalysis';

describe('formatFileSize — nhãn dung lượng tệp', () => {
  test('tệp rỗng và 512 B hiện nguyên byte, không phải "1 KB"', () => {
    assert.equal(formatFileSize(0), '0 B');
    assert.equal(formatFileSize(512), '512 B');
  });

  test('1.331 B hiện "1.3 KB" (giữ phần thập phân)', () => {
    assert.equal(formatFileSize(1331), '1.3 KB');
  });

  test('đúng 1 KB hiện "1.0 KB" và không mốc nào bị làm tròn thành 0', () => {
    assert.equal(formatFileSize(1024), '1.0 KB');
    assert.equal(formatFileSize(1023), '1023 B');
    // Sát ngưỡng MB vẫn ở thang KB.
    assert.equal(formatFileSize(1024 * 1024 - 1), '1024.0 KB');
  });

  test('1,5 MB hiện "1.5 MB" (giữ quy tắc MB 1 chữ số)', () => {
    assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.5 MB');
  });
});
