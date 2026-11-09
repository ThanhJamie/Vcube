/**
 * Unit test — `src/utils/meshParser.ts` (golden values)
 *
 * Vì sao: `meshParser` đang 1.878 dòng và sắp được tách file (CA-4). Bộ test này **khoá số đo**
 * của lõi hình học trước khi tách để bản tách không âm thầm đổi kết quả đo.
 *
 * QUY ƯỚC ĐƠN VỊ (đọc từ mã nguồn, không đoán):
 *   - `calculateVolume` trả **cm³** (mm³ / 1000).
 *   - `calculateSurfaceArea` trả **cm²** (mm² / 100).
 *   - Toạ độ dựng tay trong test là **mm**.
 *   ⇒ Khối lập phương 20 × 20 × 20 mm = 8.000 mm³ ⇒ golden **8 cm³**;
 *      6 mặt × 400 mm² = 2.400 mm² ⇒ golden **24 cm²**.
 *
 * GOLDEN: golden values dùng để bảo vệ khi tách meshParser (CA-4).
 * Môi trường: node + `tsx --test`, không có DOM đầy đủ. Node 22 có `File` toàn cục nên
 * `parse3DFile` được phủ ở nhánh STL ASCII; các nhánh 3MF/OBJ/STEP (cần `DOMParser` / Worker /
 * WASM) KHÔNG được phủ ở đây.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  MeshParseError,
  analyzeMeshDefects,
  calculateSurfaceArea,
  calculateVolume,
  parse3DFile,
} from '../../src/utils/meshParser';

/** Cạnh khối lập phương golden (mm). */
const CUBE_SIZE_MM = 20;
/** 20³ = 8.000 mm³ = 8 cm³. */
const CUBE_VOLUME_CM3 = 8;
/** 6 × 20² = 2.400 mm² = 24 cm². */
const CUBE_SURFACE_CM2 = 24;
const CUBE_TRIANGLE_COUNT = 12;

/**
 * 8 đỉnh của khối lập phương 20 mm, gốc tại (0,0,0) — mỗi đỉnh dùng chung cho các mặt
 * (indexed, 8 đỉnh / 12 tam giác) để phân tích topology thấy cạnh dùng đúng 2 lần.
 */
const CUBE_VERTICES: readonly number[] = [
  0, 0, 0,
  20, 0, 0,
  20, 20, 0,
  0, 20, 0,
  0, 0, 20,
  20, 0, 20,
  20, 20, 20,
  0, 20, 20,
];

/**
 * 12 tam giác, winding hướng RA NGOÀI (kiểm bằng tích có hướng — xem comment từng mặt).
 * Thứ tự này là một phần của golden: đảo winding sẽ đổi `invertedNormalsCount`.
 */
const CUBE_TRIANGLES: ReadonlyArray<readonly [number, number, number]> = [
  // Đáy z=0, pháp tuyến -Z
  [0, 3, 1], [1, 3, 2],
  // Đỉnh z=20, pháp tuyến +Z
  [4, 5, 6], [4, 6, 7],
  // Mặt trước y=0, pháp tuyến -Y
  [0, 1, 5], [0, 5, 4],
  // Mặt sau y=20, pháp tuyến +Y
  [2, 3, 7], [2, 7, 6],
  // Mặt trái x=0, pháp tuyến -X
  [3, 0, 4], [3, 4, 7],
  // Mặt phải x=20, pháp tuyến +X
  [1, 2, 6], [1, 6, 5],
];

/** Dựng khối lập phương golden; truyền `triangles` để tạo case thiếu tam giác / đảo winding. */
function makeCubeGeometry(
  triangles: ReadonlyArray<readonly [number, number, number]> = CUBE_TRIANGLES,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...CUBE_VERTICES], 3));
  geometry.setIndex(triangles.flatMap(([a, b, c]) => [a, b, c]));
  return geometry;
}

/** Dựng STL ASCII từ chính geometry golden (không dùng file fixture rời). */
function toAsciiStl(triangles: ReadonlyArray<readonly [number, number, number]> = CUBE_TRIANGLES): string {
  const vertexAt = (i: number): [number, number, number] => [
    CUBE_VERTICES[i * 3],
    CUBE_VERTICES[i * 3 + 1],
    CUBE_VERTICES[i * 3 + 2],
  ];
  const normalOf = (a: number[], b: number[], c: number[]): [number, number, number] => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    const len = Math.hypot(n[0], n[1], n[2]);
    return [n[0] / len, n[1] / len, n[2] / len];
  };

  const lines: string[] = ['solid cube'];
  for (const tri of triangles) {
    const points = tri.map(vertexAt) as [number[], number[], number[]];
    const n = normalOf(points[0], points[1], points[2]);
    lines.push(`  facet normal ${n[0]} ${n[1]} ${n[2]}`, '    outer loop');
    for (const p of points) lines.push(`      vertex ${p[0]} ${p[1]} ${p[2]}`);
    lines.push('    endloop', '  endfacet');
  }
  lines.push('endsolid cube');
  return `${lines.join('\n')}\n`;
}

/** Sai số tương đối — golden values cho phép 1% theo yêu cầu PR. */
function assertRelative(actual: number, expected: number, tolerance: number, label: string): void {
  const error = Math.abs(actual - expected) / Math.abs(expected);
  assert.ok(
    error <= tolerance,
    `${label}: kỳ vọng ${expected} ± ${tolerance * 100}%, đo được ${actual} (sai số ${(error * 100).toFixed(3)}%)`,
  );
}

describe('meshParser — calculateVolume / calculateSurfaceArea (golden cube 20mm)', () => {
  test('calculateVolume trả 8 cm³ cho khối 8.000 mm³ (dung sai 1%)', () => {
    // Vì sao: thể tích là đầu vào trực tiếp của báo giá; lệch đơn vị mm³↔cm³ là lỗi ×1000.
    assertRelative(calculateVolume(makeCubeGeometry()), CUBE_VOLUME_CM3, 0.01, 'thể tích cube');
  });

  test('calculateSurfaceArea trả 24 cm² cho khối 2.400 mm² (dung sai 1%)', () => {
    assertRelative(calculateSurfaceArea(makeCubeGeometry()), CUBE_SURFACE_CM2, 0.01, 'diện tích cube');
  });

  test('geometry không có attribute position ⇒ 0 (không NaN, không bịa số)', () => {
    const empty = new THREE.BufferGeometry();
    assert.equal(calculateVolume(empty), 0);
    assert.equal(calculateSurfaceArea(empty), 0);
  });
});

describe('meshParser — analyzeMeshDefects (golden cube kín)', () => {
  test('khối kín: watertight, 0 non-manifold, 0 biên hở, 0 mặt quay ngược', () => {
    // Shape trả về đọc từ `MeshDefectAnalysis` (meshParser.ts): 6 trường số + `isWatertight`.
    const defects = analyzeMeshDefects(makeCubeGeometry());

    assert.equal(defects.isWatertight, true);
    assert.equal(defects.nonManifoldCount, 0);
    assert.equal(defects.boundaryEdges, 0);
    assert.equal(defects.invertedNormalsCount, 0);
  });

  test('overhang golden: 2 tam giác mặt -Y trên 12 ⇒ 16.7%', () => {
    // Trục "xuống" của bộ phân tích là -Y; chỉ mặt trước y=0 (2 tam giác) đủ 45°.
    const defects = analyzeMeshDefects(makeCubeGeometry());

    assert.equal(defects.overhangTriangles, 2);
    assert.equal(defects.overhangPercentage, 16.7);
  });

  test('chiều dày thành đo bằng tia: khối 20mm ⇒ 20mm', () => {
    // Đây là phép ĐO (bắn tia), không phải hằng số; giữ golden để bản tách không đổi kết quả.
    const defects = analyzeMeshDefects(makeCubeGeometry());

    assert.notEqual(defects.minWallThickness, null);
    assert.ok(
      Math.abs((defects.minWallThickness as number) - CUBE_SIZE_MM) <= 0.01,
      `chiều dày thành: kỳ vọng ${CUBE_SIZE_MM}mm, đo được ${defects.minWallThickness}`,
    );
  });

  test('đảo winding toàn bộ ⇒ vẫn kín nhưng 12 mặt bị đánh dấu quay ngược', () => {
    const inverted = CUBE_TRIANGLES.map(([a, b, c]) => [a, c, b] as const);
    const defects = analyzeMeshDefects(makeCubeGeometry(inverted));

    assert.equal(defects.isWatertight, true);
    assert.equal(defects.boundaryEdges, 0);
    // Khối kín quay hết vào trong ⇒ dấu thể tích âm ⇒ toàn bộ 12 tam giác bị đánh dấu.
    assert.equal(defects.invertedNormalsCount, CUBE_TRIANGLE_COUNT);
  });

  test('thiếu 1 tam giác ⇒ hở đúng 3 cạnh biên, không còn watertight', () => {
    // Tam giác [0,3,1] bị bỏ: 3 cạnh của nó mất mặt kề thứ hai ⇒ 3 boundary edges.
    const defects = analyzeMeshDefects(makeCubeGeometry(CUBE_TRIANGLES.slice(1)));

    assert.equal(defects.isWatertight, false);
    assert.equal(defects.boundaryEdges, 3);
    assert.ok((defects.boundaryEdges as number) > 0);
    assert.equal(defects.nonManifoldCount, 0);
  });

  test('geometry rỗng ⇒ mọi số đo là null (CHƯA ĐO ĐƯỢC), không phải 0 hay true', () => {
    const defects = analyzeMeshDefects(new THREE.BufferGeometry());

    assert.equal(defects.isWatertight, null);
    assert.equal(defects.nonManifoldCount, null);
    assert.equal(defects.boundaryEdges, null);
    assert.equal(defects.invertedNormalsCount, null);
    assert.equal(defects.minWallThickness, null);
  });
});

describe('meshParser — parse3DFile (nhánh STL ASCII, phủ được trên node)', () => {
  test('đọc STL ASCII cube: số đo & topology khớp golden', async () => {
    const file = new File([toAsciiStl()], 'cube-20mm.stl', { type: 'model/stl' });
    const result = await parse3DFile(file);

    assert.equal(result.triangleCount, CUBE_TRIANGLE_COUNT);
    assert.deepEqual(result.dimensions, { x: 20, y: 20, z: 20 });
    assertRelative(result.volume, CUBE_VOLUME_CM3, 0.01, 'parse3DFile thể tích');
    assertRelative(result.surfaceArea, CUBE_SURFACE_CM2, 0.01, 'parse3DFile diện tích');
    assert.equal(result.isWatertight, true);
    assert.equal(result.nonManifoldEdges, 0);
    assert.equal(result.boundaryEdges, 0);
    assert.equal(result.invertedNormals, 0);
    assert.equal(result.parts.length, 1);
    assert.equal(result.parts[0].triangleCount, CUBE_TRIANGLE_COUNT);
  });

  test('thiếu 1 tam giác trong STL ⇒ boundaryEdges = 3, không watertight', async () => {
    const file = new File([toAsciiStl(CUBE_TRIANGLES.slice(1))], 'cube-open.stl', { type: 'model/stl' });
    const result = await parse3DFile(file);

    assert.equal(result.boundaryEdges, 3);
    assert.equal(result.isWatertight, false);
    assert.equal(result.nonManifoldEdges, 0);
  });

  test('định dạng không hỗ trợ ⇒ MeshParseError("unsupported_format")', async () => {
    const file = new File(['xin chào'], 'ghi-chu.txt', { type: 'text/plain' });

    await assert.rejects(parse3DFile(file), (error: unknown) => {
      assert.ok(error instanceof MeshParseError);
      assert.equal(error.name, 'MeshParseError');
      assert.equal(error.code, 'unsupported_format');
      assert.equal(error.fileName, 'ghi-chu.txt');
      return true;
    });
  });

  test('STL rỗng ⇒ MeshParseError("corrupt_file"), không dựng hình thay thế', async () => {
    const file = new File([], 'rong.stl', { type: 'model/stl' });

    await assert.rejects(parse3DFile(file), (error: unknown) => {
      assert.ok(error instanceof MeshParseError);
      assert.equal(error.code, 'corrupt_file');
      assert.equal(error.fileName, 'rong.stl');
      return true;
    });
  });
});
