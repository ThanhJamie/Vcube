import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import { ModelPart, SlicerPresetInfo, FilamentPaletteItem, PlateInfo } from '../types';

/** Ma loi doc tep — tang tren (`Tool3DView`) hien `error.message` trong panel loi trung thuc. */
export type MeshParseErrorCode =
  | 'unsupported_format'
  | 'corrupt_file'
  | 'degenerate_geometry'
  | 'not_measurable';

/**
 * R2 (data-honesty MP-02/MP-03/MP-05): loi CO KIEU cho moi truong hop KHONG doc duoc tep.
 *
 * Vi sao co lop nay: ban cu `catch` loi cua `STLLoader` roi **thay bang mot hop 85 x 32 x 60 mm
 * dung san bang `THREE.BoxGeometry`** va tra ve nhu mot luoi hop le ⇒ UI in
 * "85.0 x 60.0 x 32.0 mm / 12 tam giac" va the tich bia do di thang vao bao gia.
 * Tu day: khong doc duoc thi NEM LOI — khong bao gio dung hinh hoc thay the cho tep cua khach.
 */
export class MeshParseError extends Error {
  readonly code: MeshParseErrorCode;
  readonly fileName: string;

  constructor(code: MeshParseErrorCode, fileName: string, message: string) {
    super(message);
    this.name = 'MeshParseError';
    this.code = code;
    this.fileName = fileName;
  }
}

/**
 * Ket qua doc tep. QUY UOC: `null` = CHUA DO DUOC (khac han `0` = do duoc va bang 0).
 * Moi truong `number` o day deu la ket qua cua mot phep do that tren chinh tep khach tai len.
 */
export interface ParsedMeshResult {
  geometry?: THREE.BufferGeometry;
  objectGroup?: THREE.Group;
  dimensions: { x: number; y: number; z: number };
  volume: number; // cm3 — tich phan phan ky tren chinh luoi cua tep (khong suy tu bbox)
  surfaceArea: number; // cm2 — tong dien tich tam giac
  triangleCount: number;
  /** `null` = chua phan tich duoc (vi du luoi vuot tran chi phi) — KHONG duoc hieu la "kin". */
  isWatertight: boolean | null;
  nonManifoldEdges: number | null;
  /** So mat quay nguoc huong voi da so luoi (do tu huong quan canh + dau the tich khoi kin). */
  invertedNormals: number | null;
  /** MP-10: bien ho = so canh chi co 1 mat — tach rieng khoi "phap tuyen nghich". */
  boundaryEdges?: number | null;
  /** mm — do bang phep do chieu day; `null` = chua do duoc (khong dung hang so 1.4/1.5/1.6/1.8). */
  minWallThickness: number | null;
  parts: ModelPart[];
  materialsDetected?: string[];
  slicerPreset?: SlicerPresetInfo;
  plates?: PlateInfo[];
  activePlateIndex?: number;
  overhangTriangles?: number;
  overhangPercentage?: number | null;
}

/**
 * Palette colors for auto-assigning to discovered parts
 */
const DEFAULT_PART_PALETTE = [
  { name: 'Xanh Teal Công Nghiệp', hex: '#00687a' },
  { name: 'Cam Cảnh Báo Cơ Khí', hex: '#ea580c' },
  { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C' },
  { name: 'Xám Titan Pro', hex: '#64748b' },
  { name: 'Đỏ Cơ Tính', hex: '#dc2626' },
  { name: 'Vàng Cảnh Báo', hex: '#f59e0b' },
  { name: 'Xanh Lá Neon', hex: '#10b981' },
  { name: 'Tím Polyamide', hex: '#7c3aed' }
];

/**
 * Calculate signed volume of a BufferGeometry in cm^3 (zero-allocation scalar loop)
 */
export function calculateVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  if (!position) return 0;
  const pos = position.array as ArrayLike<number>;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  let totalVolume = 0;

  if (index) {
    const len = index.length;
    for (let i = 0; i < len; i += 3) {
      const i1 = index[i] * 3;
      const i2 = index[i + 1] * 3;
      const i3 = index[i + 2] * 3;
      const x1 = pos[i1], y1 = pos[i1 + 1], z1 = pos[i1 + 2];
      const x2 = pos[i2], y2 = pos[i2 + 1], z2 = pos[i2 + 2];
      const x3 = pos[i3], y3 = pos[i3 + 1], z3 = pos[i3 + 2];
      // Signed tetrahedron volume = (v1 . (v2 x v3)) / 6
      totalVolume += (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1)) / 6.0;
    }
  } else {
    const len = pos.length;
    for (let i = 0; i < len; i += 9) {
      const x1 = pos[i], y1 = pos[i + 1], z1 = pos[i + 2];
      const x2 = pos[i + 3], y2 = pos[i + 4], z2 = pos[i + 5];
      const x3 = pos[i + 6], y3 = pos[i + 7], z3 = pos[i + 8];
      totalVolume += (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1)) / 6.0;
    }
  }

  const volumeMm3 = Math.abs(totalVolume);
  return Number.isFinite(volumeMm3) ? Number((volumeMm3 / 1000).toFixed(2)) : 0;
}

/**
 * Calculate surface area of a BufferGeometry in cm^2 (zero-allocation scalar loop)
 */
export function calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  if (!position) return 0;
  const pos = position.array as ArrayLike<number>;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  let totalArea = 0;

  if (index) {
    const len = index.length;
    for (let i = 0; i < len; i += 3) {
      const i1 = index[i] * 3;
      const i2 = index[i + 1] * 3;
      const i3 = index[i + 2] * 3;
      const ax = pos[i2] - pos[i1], ay = pos[i2 + 1] - pos[i1 + 1], az = pos[i2 + 2] - pos[i1 + 2];
      const bx = pos[i3] - pos[i1], by = pos[i3 + 1] - pos[i1 + 1], bz = pos[i3 + 2] - pos[i1 + 2];
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      totalArea += Math.sqrt(cx * cx + cy * cy + cz * cz) * 0.5;
    }
  } else {
    const len = pos.length;
    for (let i = 0; i < len; i += 9) {
      const ax = pos[i + 3] - pos[i], ay = pos[i + 4] - pos[i + 1], az = pos[i + 5] - pos[i + 2];
      const bx = pos[i + 6] - pos[i], by = pos[i + 7] - pos[i + 1], bz = pos[i + 8] - pos[i + 2];
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      totalArea += Math.sqrt(cx * cx + cy * cy + cz * cz) * 0.5;
    }
  }

  return Number.isFinite(totalArea) ? Number((totalArea / 100).toFixed(2)) : 0;
}

/**
 * R2 (MP-10): ket qua phan tich luoi. `null` = CHUA DO DUOC — khac han `0` (do duoc va bang 0).
 */
export interface MeshDefectAnalysis {
  /** So canh co nhieu hon 2 mat ke. */
  nonManifoldCount: number | null;
  /** So mat quay NGUOC huong voi da so luoi. */
  invertedNormalsCount: number | null;
  /** MP-10: bien ho (canh chi co 1 mat) — tach rieng, KHONG duoc goi la "phap tuyen nghich". */
  boundaryEdges: number | null;
  /** mm — do bang phep do chieu day; `null` = khong do duoc. */
  minWallThickness: number | null;
  isWatertight: boolean | null;
  overhangTriangles: number;
  overhangPercentage: number;
}

/**
 * Tran chi phi cho phep dung ban do canh (Map khoa chuoi). Tren nguong nay bo doc tra
 * `null` = "CHUA PHAN TICH" — ban cu bo qua buoc nay roi van tra CO KIN gan cung.
 */
export const MAX_TOPOLOGY_TRIANGLES = 60000;

/** Ngan sach phep thu tia-tam giac cho phep do chieu day (du chinh xac, khong treo UI). */
const THICKNESS_RAY_BUDGET = 1200000;

function unmeasuredDefects(): MeshDefectAnalysis {
  return {
    nonManifoldCount: null,
    invertedNormalsCount: null,
    boundaryEdges: null,
    minWallThickness: null,
    isWatertight: null,
    overhangTriangles: 0,
    overhangPercentage: 0
  };
}

/**
 * R2 (MP-12/MP-13/MP-17): do chieu day thanh nho nhat bang cach BAN TIA.
 *
 * Phuong phap: lay mau toi da 64 tam giac; tu tam moi tam giac ban mot tia theo huong phap tuyen am
 * (di vao trong vat the) va ghi khoang cach toi **mat thoat** gan nhat — mat ma tia xuyen qua tu
 * phia sau va gan vuong goc voi tia. Day la phep DO tren chinh luoi cua tep, KHONG phai hang so
 * 1.4/1.5/1.6/1.8 nhu ban cu. Khong do duoc (luoi qua lon so voi ngan sach, hoan toan ho, hoac
 * khong tia nao gap mat thoat) ⇒ tra `null` = "chua do duoc".
 *
 * Gioi han da biet (ghi ro de khong qua loi): gia tri la cuc tieu tren cac mat LAY MAU, khong phai
 * cuc tieu tuyet doi cua toan luoi; tia xien qua mat (goc lech > ~78 do so voi phap tuyen mat thoat)
 * bi bo de tranh so rac.
 */
function measureMinimumWallThickness(
  geometry: THREE.BufferGeometry,
  rayBudget: number
): number | null {
  const posAttr = geometry.attributes.position;
  if (!posAttr) return null;

  const pos = posAttr.array as ArrayLike<number>;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  // LUU Y: KHONG duoc kiem tra `posAttr.count` o day. Luoi INDEXED co the chi con 8 dinh cho 12 tam
  // giac (vi du khoi hop da han dinh bang `mergeVertices`), nen nguong phai tinh theo SO TAM GIAC.
  const triangleCount = index ? index.length / 3 : posAttr.count / 3;
  if (!Number.isFinite(triangleCount) || triangleCount < 2) return null;

  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  if (!bb) return null;
  const diag = Math.sqrt(
    (bb.max.x - bb.min.x) ** 2 + (bb.max.y - bb.min.y) ** 2 + (bb.max.z - bb.min.z) ** 2
  );
  if (!(diag > 0)) return null;

  const samples = Math.min(64, Math.floor(rayBudget / triangleCount));
  if (samples < 1) return null; // luoi qua lon so voi ngan sach ⇒ chua do duoc

  const eps = Math.max(1e-3, diag * 1e-5);
  const stride = Math.max(1, Math.floor(triangleCount / samples));
  let best = Infinity;

  for (let s = 0; s < triangleCount; s += stride) {
    let a0: number, b0: number, c0: number;
    if (index) {
      a0 = index[s * 3] * 3; b0 = index[s * 3 + 1] * 3; c0 = index[s * 3 + 2] * 3;
    } else {
      a0 = s * 9; b0 = s * 9 + 3; c0 = s * 9 + 6;
    }
    const ax = pos[a0], ay = pos[a0 + 1], az = pos[a0 + 2];
    const e1x = pos[b0] - ax, e1y = pos[b0 + 1] - ay, e1z = pos[b0 + 2] - az;
    const e2x = pos[c0] - ax, e2y = pos[c0 + 1] - ay, e2z = pos[c0 + 2] - az;

    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (!(nLen > 1e-12)) continue; // tam giac suy bien
    nx /= nLen; ny /= nLen; nz /= nLen;

    // Diem xuat phat: tam tam giac lui vao trong mot doan rat nho; huong: -phap tuyen
    const ox = (ax + pos[b0] + pos[c0]) / 3 - nx * eps;
    const oy = (ay + pos[b0 + 1] + pos[c0 + 1]) / 3 - ny * eps;
    const oz = (az + pos[b0 + 2] + pos[c0 + 2]) / 3 - nz * eps;
    const dx = -nx, dy = -ny, dz = -nz;

    for (let k = 0; k < triangleCount; k++) {
      let i0: number, i1: number, i2: number;
      if (index) {
        i0 = index[k * 3] * 3; i1 = index[k * 3 + 1] * 3; i2 = index[k * 3 + 2] * 3;
      } else {
        i0 = k * 9; i1 = k * 9 + 3; i2 = k * 9 + 6;
      }
      const v0x = pos[i0] - ax, v0y = pos[i0 + 1] - ay, v0z = pos[i0 + 2] - az;
      const k1x = pos[i1] - ax - v0x, k1y = pos[i1 + 1] - ay - v0y, k1z = pos[i1 + 2] - az - v0z;
      const k2x = pos[i2] - ax - v0x, k2y = pos[i2 + 1] - ay - v0y, k2z = pos[i2 + 2] - az - v0z;

      const px = dy * k2z - dz * k2y;
      const py = dz * k2x - dx * k2z;
      const pz = dx * k2y - dy * k2x;
      const det = k1x * px + k1y * py + k1z * pz;
      // Chi nhan mat phia SAU cua tia (tia di RA khoi vat the qua mat do).
      if (det > -1e-12) continue;
      const invDet = 1 / det;

      const tx = ox - ax - v0x, ty = oy - ay - v0y, tz = oz - az - v0z;
      const u = (tx * px + ty * py + tz * pz) * invDet;
      if (u < 0 || u > 1) continue;
      const qx = ty * k1z - tz * k1y;
      const qy = tz * k1x - tx * k1z;
      const qz = tx * k1y - ty * k1x;
      const v = (dx * qx + dy * qy + dz * qz) * invDet;
      if (v < 0 || u + v > 1) continue;

      const tHit = (k2x * qx + k2y * qy + k2z * qz) * invDet;
      if (!(tHit > eps) || tHit >= best) continue;

      // Mat thoat phai gan vuong goc voi tia; neu khong day la tia xien qua mep.
      const fnx = k1y * k2z - k1z * k2y;
      const fny = k1z * k2x - k1x * k2z;
      const fnz = k1x * k2y - k1y * k2x;
      const fLen = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz);
      if (!(fLen > 1e-12)) continue;
      if ((dx * fnx + dy * fny + dz * fnz) / fLen < 0.2) continue;

      best = tHit;
    }
  }

  return Number.isFinite(best) ? Number(best.toFixed(2)) : null;
}

/**
 * Scan mesh for non-manifold edges, open boundaries, inverted normals, and overhang triangles.
 * Zero-allocation scalar implementation with strict memory bounds to eliminate Out-Of-Memory exceptions.
 *
 * R2 (MP-10): `invertedNormalsCount` truoc day bi dat bang so BIEN HO (va bi cat tran o 12) roi duoc
 * dan nhan "Vector Phap Tuyen Nghich". Nay:
 *   - `boundaryEdges` = so canh chi co 1 mat (do that);
 *   - `invertedNormalsCount` = so mat quan NGUOC huong voi da so (suy tu huong quan canh hai chieu;
 *     voi luoi kin thi kiem tra them huong tong the bang dau the tich khoi).
 * Khong tinh duoc (luoi vuot tran chi phi) ⇒ tra `null`, KHONG tra `true`/`0` gia.
 */
export function analyzeMeshDefects(
  geometry: THREE.BufferGeometry,
  options?: { thicknessRayBudget?: number }
): MeshDefectAnalysis {
  const posAttr = geometry.attributes.position;
  if (!posAttr || posAttr.count < 3) {
    return unmeasuredDefects();
  }

  const pos = posAttr.array as ArrayLike<number>;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  const totalTriangles = index ? index.length / 3 : posAttr.count / 3;

  // 1. Fast Overhang Analysis in pure scalar math (Zero Vector3 allocated)
  //    + the tich CO DAU (dung dau de kiem tra huong tong the cua luoi kin).
  let overhangCount = 0;
  let signedVolume6 = 0;
  const cos45 = 0.70710678; // cos(45 deg)

  if (index) {
    const len = index.length;
    for (let i = 0; i < len; i += 3) {
      const i1 = index[i] * 3, i2 = index[i + 1] * 3, i3 = index[i + 2] * 3;
      const x1 = pos[i1], y1 = pos[i1 + 1], z1 = pos[i1 + 2];
      const x2 = pos[i2], y2 = pos[i2 + 1], z2 = pos[i2 + 2];
      const x3 = pos[i3], y3 = pos[i3 + 1], z3 = pos[i3 + 2];
      const ax = x2 - x1, ay = y2 - y1, az = z2 - z1;
      const bx = x3 - x1, by = y3 - y1, bz = z3 - z1;
      const ny = az * bx - ax * bz;
      const nx = ay * bz - az * by;
      const nz = ax * by - ay * bx;
      const lenNorm = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (lenNorm > 1e-7) {
        // Downward vector is (0, -1, 0), so dot = -ny / lenNorm
        if ((-ny / lenNorm) >= cos45) {
          overhangCount++;
        }
      }
      signedVolume6 += (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1));
    }
  } else {
    const len = pos.length;
    for (let i = 0; i < len; i += 9) {
      const x1 = pos[i], y1 = pos[i + 1], z1 = pos[i + 2];
      const x2 = pos[i + 3], y2 = pos[i + 4], z2 = pos[i + 5];
      const x3 = pos[i + 6], y3 = pos[i + 7], z3 = pos[i + 8];
      const ax = x2 - x1, ay = y2 - y1, az = z2 - z1;
      const bx = x3 - x1, by = y3 - y1, bz = z3 - z1;
      const ny = az * bx - ax * bz;
      const nx = ay * bz - az * by;
      const nz = ax * by - ay * bx;
      const lenNorm = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (lenNorm > 1e-7) {
        if ((-ny / lenNorm) >= cos45) {
          overhangCount++;
        }
      }
      signedVolume6 += (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1));
    }
  }

  const overhangPercentage = totalTriangles > 0
    ? Number(((overhangCount / totalTriangles) * 100).toFixed(1))
    : 0;

  if (!(totalTriangles > 0)) {
    return { ...unmeasuredDefects(), overhangTriangles: overhangCount, overhangPercentage };
  }

  // Luoi vuot tran chi phi ⇒ NOI RO la chua phan tich (khong duoc tra co kin gan cung).
  if (totalTriangles > MAX_TOPOLOGY_TRIANGLES) {
    return { ...unmeasuredDefects(), overhangTriangles: overhangCount, overhangPercentage };
  }

  // 2. Topological Manifold Edge Analysis with spatial vertex quantization
  // Quantizes coordinates to identify shared edges across unindexed STL triangles
  let nonManifold = 0;
  let boundaryEdges = 0;
  let windingConflicts = 0;

  {
    const edgeUsage = new Map<string, number>();
    const edgeWinding = new Map<string, number>();

    // Coordinate hash helper (quantized to 0.05mm tolerance) to detect shared geometric vertices regardless of unindexed raw STLs
    const getVertexHash = (idx: number): string => {
      const px = Math.round(posAttr.getX(idx) * 20);
      const py = Math.round(posAttr.getY(idx) * 20);
      const pz = Math.round(posAttr.getZ(idx) * 20);
      return `${px}_${py}_${pz}`;
    };

    const count = index ? index.length : posAttr.count;
    const faceEdges: Array<[string, string, string]> = [];
    const faceWinding: Array<[number, number, number]> = [];

    for (let i = 0; i < count; i += 3) {
      const i1 = index ? index[i] : i;
      const i2 = index ? index[i + 1] : i + 1;
      const i3 = index ? index[i + 2] : i + 2;

      const v1 = getVertexHash(i1);
      const v2 = getVertexHash(i2);
      const v3 = getVertexHash(i3);

      // Skip degenerate triangles where vertices collapse
      if (v1 === v2 || v2 === v3 || v3 === v1) {
        faceEdges.push(['', '', '']);
        faceWinding.push([0, 0, 0]);
        continue;
      }

      const e1 = v1 < v2 ? `${v1}#${v2}` : `${v2}#${v1}`;
      const e2 = v2 < v3 ? `${v2}#${v3}` : `${v3}#${v2}`;
      const e3 = v3 < v1 ? `${v3}#${v1}` : `${v1}#${v3}`;

      edgeUsage.set(e1, (edgeUsage.get(e1) || 0) + 1);
      edgeUsage.set(e2, (edgeUsage.get(e2) || 0) + 1);
      edgeUsage.set(e3, (edgeUsage.get(e3) || 0) + 1);
      // Huong quan: +1 khi di theo thu tu chuan cua khoa, -1 khi nguoc lai. Voi luoi quan nhat quan,
      // moi canh trong duoc di qua 1 lan moi chieu ⇒ tong = 0.
      edgeWinding.set(e1, (edgeWinding.get(e1) || 0) + (v1 < v2 ? 1 : -1));
      edgeWinding.set(e2, (edgeWinding.get(e2) || 0) + (v2 < v3 ? 1 : -1));
      edgeWinding.set(e3, (edgeWinding.get(e3) || 0) + (v3 < v1 ? 1 : -1));

      faceEdges.push([e1, e2, e3]);
      faceWinding.push([v1 < v2 ? 1 : -1, v2 < v3 ? 1 : -1, v3 < v1 ? 1 : -1]);
    }

    edgeUsage.forEach((usage, key) => {
      if (usage > 2) nonManifold++;
      if (usage === 1) boundaryEdges++;
    });

    // Mat bi coi la QUAY NGUOC khi MOI canh trong (usage === 2) cua no deu xung dot huong voi mat ke.
    for (let f = 0; f < faceEdges.length; f++) {
      const edges = faceEdges[f];
      if (!edges[0]) continue; // tam giac suy bien
      let shared = 0;
      let conflicted = 0;
      for (let e = 0; e < 3; e++) {
        if ((edgeUsage.get(edges[e]) || 0) !== 2) continue;
        shared++;
        if ((edgeWinding.get(edges[e]) || 0) !== 0) conflicted++;
      }
      if (shared > 0 && conflicted === shared) windingConflicts++;
    }
  }

  const isWatertight = boundaryEdges === 0 && nonManifold === 0;
  // Luoi KIN quan nhat quan nhung quay het vao trong ⇒ the tich co dau am ⇒ TOAN BO mat bi nguoc.
  const invertedNormalsCount = isWatertight
    ? (signedVolume6 < 0 ? Math.round(totalTriangles) : windingConflicts)
    : windingConflicts;

  return {
    nonManifoldCount: nonManifold,
    invertedNormalsCount,
    boundaryEdges,
    minWallThickness: measureMinimumWallThickness(
      geometry,
      options?.thicknessRayBudget ?? THICKNESS_RAY_BUDGET
    ),
    isWatertight,
    overhangTriangles: overhangCount,
    overhangPercentage
  };
}

/**
 * R2: gop so do cua nhieu chi tiet (3MF/OBJ) thanh so do cua ca tep.
 * Quy tac: co it nhat mot chi tiet chua do duoc ⇒ tra `null` cho chi so do (khong doan);
 * chieu day thanh lay MIN cua cac chi tiet do duoc; goc nho tinh lai theo tong so tam giac.
 */
export function aggregateDefects(
  entries: Array<{ defects: MeshDefectAnalysis; triangleCount: number }>
): MeshDefectAnalysis {
  if (entries.length === 0) return unmeasuredDefects();

  let allWatertight = true;
  let watertightKnown = true;
  let nonManifold = 0;
  let nonManifoldKnown = true;
  let inverted = 0;
  let invertedKnown = true;
  let boundary = 0;
  let boundaryKnown = true;
  let minWallThickness: number | null = null;
  let overhangTriangles = 0;
  let triangles = 0;

  for (const entry of entries) {
    const d = entry.defects;
    triangles += entry.triangleCount;
    overhangTriangles += d.overhangTriangles;
    if (d.isWatertight === null) watertightKnown = false;
    else allWatertight = allWatertight && d.isWatertight;
    if (d.nonManifoldCount === null) nonManifoldKnown = false;
    else nonManifold += d.nonManifoldCount;
    if (d.invertedNormalsCount === null) invertedKnown = false;
    else inverted += d.invertedNormalsCount;
    if (d.boundaryEdges === null) boundaryKnown = false;
    else boundary += d.boundaryEdges;
    if (d.minWallThickness !== null) {
      minWallThickness = minWallThickness === null
        ? d.minWallThickness
        : Math.min(minWallThickness, d.minWallThickness);
    }
  }

  return {
    nonManifoldCount: nonManifoldKnown ? nonManifold : null,
    invertedNormalsCount: invertedKnown ? inverted : null,
    boundaryEdges: boundaryKnown ? boundary : null,
    minWallThickness,
    isWatertight: watertightKnown ? allWatertight : null,
    overhangTriangles,
    overhangPercentage: triangles > 0
      ? Number(((overhangTriangles / triangles) * 100).toFixed(1))
      : 0
  };
}

/**
 * Generate simulated auto-fixed mesh with welded vertices and clean normals
 */
export function createRepairedMesh(originalGeometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const geom = originalGeometry.clone();
  geom.computeVertexNormals();
  return geom;
}

export const autoRepairGeometry = (
  originalGeometry: THREE.BufferGeometry
): THREE.BufferGeometry => createRepairedMesh(originalGeometry);

// D9 (Đợt 10): HAI HÀM TÁCH-KHỐI-GIẢ CỦA BỘ ĐỌC ĐÃ BỊ XOÁ (tên cũ ghi ở
// `docs/plans/22-backlog-and-decisions.md` mục D9 và `docs/design/data-honesty.md` mục MP-09).
//
// Vì sao xoá: chúng KHÔNG chạy phân tích thành phần rời rạc. Chúng nhân số tam giác ×0.58/×0.42 và
// thể tích ×0.6/×0.4, đặt tên hai chi tiết bịa ("[Vỏ Thân Chính 01]" / "[Lõi Cơ Khí 02]") rồi trả
// về như một kết quả tách khối thật; tầng UI còn đổi định dạng tệp sang 3MF (đổi cả báo giá). Nút
// tương ứng ở `ObjectTreePanel` cũng đã bị bỏ ⇒ hai export này không còn caller nào.
//
// Nếu sau này cần tính năng thật: phân tích connected-components trên index buffer (mỗi thành phần
// rời rạc là một phần, số tam giác/thể tích TÍNH TỪ CHÍNH thành phần đó). KHÔNG dựng lại hàm bịa.

// -------------------------------------------------------------
// XML & 3MF DOM HELPER FUNCTIONS (Namespace & Browser Resilient)
// -------------------------------------------------------------

function getElementsByLocalName(root: Node | Document | Element, targetName: string): Element[] {
  const results: Element[] = [];
  const tName = targetName.toLowerCase();

  function traverse(node: Node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      const local = (el.localName || el.nodeName).toLowerCase().replace(/^.*:/, '');
      if (local === tName) {
        results.push(el);
      }
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      traverse(node.childNodes[i]);
    }
  }

  traverse(root);
  return results;
}

function findFirstByLocalName(root: Node | Document | Element, targetName: string): Element | null {
  const tName = targetName.toLowerCase();
  if (root.nodeType === 1) {
    const el = root as Element;
    const local = (el.localName || el.nodeName).toLowerCase().replace(/^.*:/, '');
    if (local === tName) return el;
  }
  for (let i = 0; i < root.childNodes.length; i++) {
    const found = findFirstByLocalName(root.childNodes[i], targetName);
    if (found) return found;
  }
  return null;
}

function getDirectChildrenByLocalName(el: Element, targetName: string): Element[] {
  const results: Element[] = [];
  const tName = targetName.toLowerCase();
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 1) {
      const cEl = child as Element;
      const local = (cEl.localName || cEl.nodeName).toLowerCase().replace(/^.*:/, '');
      if (local === tName) {
        results.push(cEl);
      }
    }
  }
  return results;
}

/**
 * Parse Slicer preset & filament palettes from 3MF ZIP archive
 */
async function extract3MFMetadata(
  zip: JSZip,
  xmlDocs: Document[]
): Promise<SlicerPresetInfo> {
  const palettes: FilamentPaletteItem[] = [];
  const plates: PlateInfo[] = [];
  // R2 (MP-13/MP-14): KHÔNG khởi tạo sẵn các thông số slicer "trông như thật" rồi trả về như thể
  // đó là dữ liệu của tệp. Trường nào tệp không khai báo ⇒ `undefined` = "tệp không kèm dữ liệu slicer".
  let software = 'Chưa rõ phần mềm tạo tệp 3MF';
  let printerModel: string | undefined = undefined;
  let nozzleDiameter: number | undefined = undefined;
  let layerHeight: number | undefined = undefined;
  let initialLayerHeight: number | undefined = undefined;
  let infillDensity: string | undefined = undefined;
  let infillPattern: string | undefined = undefined;
  let wallLoops: number | undefined = undefined;
  let topShellLayers: number | undefined = undefined;
  let bottomShellLayers: number | undefined = undefined;
  let estimatedPrintTimeFormatted: string | undefined = undefined;
  let estimatedPrintTimeSeconds: number | undefined = undefined;
  let totalFilamentGrams = 0;
  let totalFilamentMeters = 0;
  let activePlateIndex = 1;

  // 1. Check Metadata from .model XML
  for (const doc of xmlDocs) {
    const metaNodes = getElementsByLocalName(doc, 'metadata');
    for (const m of metaNodes) {
      const name = m.getAttribute('name')?.toLowerCase() || '';
      const text = m.textContent?.trim() || '';
      if (name === 'application' && text) {
        software = text;
      } else if (name === 'title' && text && !software.includes('Bambu')) {
        software = `3MF Design (${text})`;
      }
    }

    // Basematerials colors — CHỈ lấy đúng thứ tệp khai báo (mã màu + tên). Không đoán vật liệu,
    // không gán hãng / khối lượng riêng / giá: tệp 3MF KHÔNG chứa giá vật tư (MP-14).
    const baseNodes = getElementsByLocalName(doc, 'base');
    baseNodes.forEach((base) => {
      const dispColor = base.getAttribute('displaycolor');
      const name = base.getAttribute('name') || '';
      if (dispColor) {
        const hex = dispColor.slice(0, 7);
        if (!palettes.some(p => p.colorHex.toLowerCase() === hex.toLowerCase())) {
          palettes.push({
            index: palettes.length + 1,
            colorHex: hex,
            name: name || `Màu ${palettes.length + 1} (khai báo trong tệp)`,
            materialType: ''
          });
        }
      }
    });

    // Color group colors
    const colorNodes = getElementsByLocalName(doc, 'color');
    colorNodes.forEach((c) => {
      const hexVal = c.getAttribute('color');
      if (hexVal) {
        const hex = hexVal.slice(0, 7);
        if (!palettes.some(p => p.colorHex.toLowerCase() === hex.toLowerCase())) {
          palettes.push({
            index: palettes.length + 1,
            colorHex: hex,
            name: `Màu ${palettes.length + 1} (bảng màu trong tệp)`,
            materialType: ''
          });
        }
      }
    });
  }

  // 2. Check Bambu / OrcaSlicer `Metadata/slice_info.config`
  const sliceInfoFile = zip.file('Metadata/slice_info.config') || zip.file(/slice_info\.config$/i)[0];
  if (sliceInfoFile) {
    try {
      const sliceInfoText = await sliceInfoFile.async('text');
      const parser = new DOMParser();
      const sDoc = parser.parseFromString(sliceInfoText, 'application/xml');

      software = 'Bambu Studio / OrcaSlicer (theo slice_info.config trong tệp)';

      // Filament nodes in slice_info
      const filamentNodes = getElementsByLocalName(sDoc, 'filament');
      if (filamentNodes.length > 0) {
        palettes.length = 0; // Clear and populate from slice_info
        filamentNodes.forEach((fNode, idx) => {
          const id = parseInt(fNode.getAttribute('id') || String(idx + 1), 10);
          const colorAttr = fNode.getAttribute('color');
          const type = fNode.getAttribute('type') || '';
          const vendor = fNode.getAttribute('vendor') || undefined;
          const usedG = parseFloat(fNode.getAttribute('used_g') || '0') || 0;
          const usedM = parseFloat(fNode.getAttribute('used_m') || '0') || 0;
          const densityAttr = parseFloat(fNode.getAttribute('density') || '0');

          totalFilamentGrams += usedG;
          totalFilamentMeters += usedM;

          palettes.push({
            index: id || idx + 1,
            // Tệp không khai báo mã màu ⇒ dùng màu hiển thị mặc định của trình xem và GHI RÕ trong tên,
            // không trình bày nó như "màu có trong tệp".
            colorHex: colorAttr
              ? (colorAttr.startsWith('#') ? colorAttr.slice(0, 7) : `#${colorAttr.slice(0, 6)}`)
              : DEFAULT_PART_PALETTE[idx % DEFAULT_PART_PALETTE.length].hex,
            name: `${vendor || 'Không rõ hãng'} ${type || 'không rõ vật liệu'} (AMS Slot ${id || idx + 1})${colorAttr ? '' : ' — màu do trình xem gán'}`,
            materialType: type,
            vendor,
            density: densityAttr > 0 ? densityAttr : undefined,
            usedGrams: usedG > 0 ? Number(usedG.toFixed(1)) : undefined,
            usedMeters: usedM > 0 ? Number(usedM.toFixed(2)) : undefined
          });
        });
      }

      // Plate & prediction time
      const plateNodes = getElementsByLocalName(sDoc, 'plate');
      if (plateNodes.length > 0) {
        plateNodes.forEach((pNode, pIdx) => {
          const id = parseInt(pNode.getAttribute('id') || pNode.getAttribute('index') || String(pIdx + 1), 10);
          const pName = pNode.getAttribute('name') || `Plate ${id}`;
          const predSec = parseInt(pNode.getAttribute('prediction') || '0', 10);
          const weightG = parseFloat(pNode.getAttribute('weight') || pNode.getAttribute('filament_weight') || '0') || 0;
          const lengthM = parseFloat(pNode.getAttribute('filament_length') || '0') || 0;
          const bedType = pNode.getAttribute('bed_type') || undefined;

          // R2 (MP-13): tệp không ghi `prediction` ⇒ KHÔNG bịa '35m'/'45m'.
          const predFormatted = predSec > 0
            ? (Math.floor(predSec / 3600) > 0
                ? `${Math.floor(predSec / 3600)}h ${Math.floor((predSec % 3600) / 60)}m`
                : `${Math.floor((predSec % 3600) / 60)}m`)
            : undefined;

          plates.push({
            index: id,
            name: pName,
            predictionSeconds: predSec > 0 ? predSec : undefined,
            predictionFormatted: predFormatted,
            filamentGrams: weightG > 0 ? Number(weightG.toFixed(1)) : undefined,
            filamentMeters: lengthM > 0 ? Number(lengthM.toFixed(2)) : undefined,
            bedType,
            partIds: []
          });
        });

        const p1 = plateNodes[0];
        const predSec = parseInt(p1.getAttribute('prediction') || '0', 10);
        if (predSec > 0) {
          estimatedPrintTimeSeconds = predSec;
          const hrs = Math.floor(predSec / 3600);
          const mins = Math.floor((predSec % 3600) / 60);
          estimatedPrintTimeFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      }

      // Printer model in slice_info
      const headerNode = findFirstByLocalName(sDoc, 'header');
      if (headerNode) {
        const pModel = headerNode.getAttribute('printer_model') || headerNode.getAttribute('printer');
        if (pModel) printerModel = pModel;
      }
    } catch (e) {
      console.warn('Error reading slice_info.config:', e);
    }
  }

  // 3. Check `Metadata/project_settings.config` or `Metadata/model_settings.config`
  const projectSettingsFile = zip.file('Metadata/project_settings.config') || zip.file(/project_settings\.config$/i)[0];
  if (projectSettingsFile) {
    try {
      const content = await projectSettingsFile.async('text');
      if (content.trim().startsWith('{')) {
        const json = JSON.parse(content);
        const num = (v: unknown): number | undefined => {
          const parsed = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
          return Number.isFinite(parsed) ? parsed : undefined;
        };

        if (json.printer_model) printerModel = json.printer_model;
        // R2 (MP-13): chỉ nhận giá trị CÓ trong tệp; thiếu ⇒ giữ `undefined` (0.20 / 15% / gyroid / 2 / 200
        // trước đây là hằng số của bộ đọc, không phải của tệp).
        nozzleDiameter = num(json.nozzle_diameter) ?? nozzleDiameter;
        layerHeight = num(json.layer_height) ?? layerHeight;
        initialLayerHeight = num(json.initial_layer_print_height) ?? initialLayerHeight;
        if (json.infill_sparse_density !== undefined && json.infill_sparse_density !== null && json.infill_sparse_density !== '') {
          infillDensity = `${json.infill_sparse_density}%`;
        }
        if (typeof json.infill_pattern === 'string' && json.infill_pattern) infillPattern = json.infill_pattern;
        wallLoops = num(json.wall_loops) ?? wallLoops;
        topShellLayers = num(json.top_shell_layers) ?? topShellLayers;
        bottomShellLayers = num(json.bottom_shell_layers) ?? bottomShellLayers;

        if (Array.isArray(json.filament_colour) && palettes.length === 0) {
          json.filament_colour.forEach((colStr: string, idx: number) => {
            const hex = colStr.startsWith('#') ? colStr.slice(0, 7) : `#${colStr.slice(0, 6)}`;
            const type = (Array.isArray(json.filament_type) && json.filament_type[idx]) || '';
            const vendor = (Array.isArray(json.filament_vendor) && json.filament_vendor[idx]) || undefined;
            palettes.push({
              index: idx + 1,
              colorHex: hex,
              name: `${vendor || 'Không rõ hãng'} ${type || 'không rõ vật liệu'} (AMS Slot ${idx + 1})`,
              materialType: type,
              vendor
            });
          });
        }
      }
    } catch (e) {
      console.warn('Error parsing project_settings.config:', e);
    }
  }

  // R2 (MP-13/MP-14): KHÔNG còn "palette dự phòng" bịa (Bambu PLA Basic 28.5 g / PETG 14.2 g với
  // giá suy từ tên vật liệu). Tệp không khai báo màu/vật liệu ⇒ danh sách RỖNG; giao diện tự dùng
  // màu hiển thị mặc định của trình xem.

  return {
    software,
    printerModel,
    nozzleDiameter,
    layerHeight,
    initialLayerHeight,
    infillDensity,
    infillPattern,
    wallLoops,
    topShellLayers,
    bottomShellLayers,
    estimatedPrintTimeFormatted,
    estimatedPrintTimeSeconds,
    // R2 (MP-13): tệp không kèm số đo ⇒ `undefined` ("không có dữ liệu slicer trong tệp"),
    // KHÔNG rơi về 42.7 g / 14.1 m như thể đó là preset của máy cắt lớp.
    totalFilamentGrams: totalFilamentGrams > 0 ? Number(totalFilamentGrams.toFixed(1)) : undefined,
    totalFilamentMeters: totalFilamentMeters > 0 ? Number(totalFilamentMeters.toFixed(2)) : undefined,
    plateCount: plates.length,
    activePlateIndex,
    plates,
    palettes
  };
}

/**
 * Dedicated Native 3MF Parser using JSZip + XML DOM with full Palette & Slicer Preset Extraction
 */
async function parse3MFNative(arrayBuffer: ArrayBuffer, fileName: string): Promise<ParsedMeshResult> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Locate all .model XML files (standard: 3D/3dmodel.model, 3D/Objects/*.model)
  const modelEntries: JSZip.JSZipObject[] = [];
  const standardMain = zip.file('3D/3dmodel.model') || zip.file('3dmodel.model');
  if (standardMain) {
    modelEntries.push(standardMain);
  }

  // Find any other .model files in the archive
  zip.forEach((relativePath, fileObj) => {
    if (relativePath.toLowerCase().endsWith('.model') && !modelEntries.some(e => e.name === fileObj.name)) {
      modelEntries.push(fileObj);
    }
  });

  if (modelEntries.length === 0) {
    throw new Error('Không tìm thấy tệp .model hình học trong tệp 3MF.');
  }

  const domParser = new DOMParser();
  const xmlDocs: Document[] = [];

  for (const entry of modelEntries) {
    const xmlText = await entry.async('text');
    const xmlDoc = domParser.parseFromString(xmlText, 'application/xml');
    const parseError = findFirstByLocalName(xmlDoc, 'parsererror');
    if (!parseError) {
      xmlDocs.push(xmlDoc);
    }
  }

  if (xmlDocs.length === 0) {
    throw new Error('Lỗi cú pháp XML trong tệp 3MF.');
  }

  // 2. Extract Slicer Presets & Filament Palettes
  const slicerPreset = await extract3MFMetadata(zip, xmlDocs);

  // 3. Determine Unit scaling from main XML
  const mainDoc = xmlDocs[0];
  const modelNode = findFirstByLocalName(mainDoc, 'model');
  const unitAttr = (modelNode?.getAttribute('unit') || 'millimeter').toLowerCase();
  let unitScale = 1.0;
  if (unitAttr === 'inch') unitScale = 25.4;
  else if (unitAttr === 'foot') unitScale = 304.8;
  else if (unitAttr === 'micron') unitScale = 0.001;
  else if (unitAttr === 'meter') unitScale = 1000.0;
  else if (unitAttr === 'centimeter') unitScale = 10.0;

  // 4. Color Index Map from Materials
  const colorMap = new Map<string, string>();
  slicerPreset.palettes.forEach((p, idx) => {
    colorMap.set(String(idx), p.colorHex);
    colorMap.set(String(p.index), p.colorHex);
  });

  // 5. Parse Mesh Objects across all XML Docs
  const meshMap = new Map<string, { geometry: THREE.BufferGeometry; name: string; colorHex?: string }>();
  const componentMap = new Map<string, Array<{ objectId: string; transform?: number[] }>>();

  xmlDocs.forEach((xmlDoc) => {
    const objectNodes = getElementsByLocalName(xmlDoc, 'object');

    objectNodes.forEach((objNode, objIdx) => {
      const objId = objNode.getAttribute('id') || String(meshMap.size + objIdx + 1);
      const objName = objNode.getAttribute('name') || `Chi Tiết ${meshMap.size + 1}`;
      const pindex = objNode.getAttribute('pindex') || objNode.getAttribute('pid');
      let colorHex: string | undefined = undefined;
      if (pindex && colorMap.has(pindex)) {
        colorHex = colorMap.get(pindex);
      }

      // Check for Mesh element
      const meshNode = findFirstByLocalName(objNode, 'mesh');
      if (meshNode) {
        const vertexNodes = getElementsByLocalName(meshNode, 'vertex');
        const triangleNodes = getElementsByLocalName(meshNode, 'triangle');

        if (vertexNodes.length > 0 && triangleNodes.length > 0) {
          const positions = new Float32Array(vertexNodes.length * 3);
          vertexNodes.forEach((vNode, vIdx) => {
            const x = (parseFloat(vNode.getAttribute('x') || '0') || 0) * unitScale;
            const y = (parseFloat(vNode.getAttribute('y') || '0') || 0) * unitScale;
            const z = (parseFloat(vNode.getAttribute('z') || '0') || 0) * unitScale;

            positions[vIdx * 3] = x;
            positions[vIdx * 3 + 1] = y;
            positions[vIdx * 3 + 2] = z;
          });

          const indices = new Uint32Array(triangleNodes.length * 3);
          triangleNodes.forEach((tNode, tIdx) => {
            const v1 = parseInt(tNode.getAttribute('v1') || '0', 10);
            const v2 = parseInt(tNode.getAttribute('v2') || '0', 10);
            const v3 = parseInt(tNode.getAttribute('v3') || '0', 10);

            indices[tIdx * 3] = v1;
            indices[tIdx * 3 + 1] = v2;
            indices[tIdx * 3 + 2] = v3;

            // Check if triangle has individual color property
            if (!colorHex) {
              const tp1 = tNode.getAttribute('p1');
              if (tp1 && colorMap.has(tp1)) {
                colorHex = colorMap.get(tp1);
              }
            }
          });

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          meshMap.set(objId, { geometry, name: objName, colorHex });
        }
      }

      // Check for Components (Assembly References)
      const compNodes = getElementsByLocalName(objNode, 'component');
      if (compNodes.length > 0) {
        const comps: Array<{ objectId: string; transform?: number[] }> = [];
        compNodes.forEach((compNode) => {
          const targetId = compNode.getAttribute('objectid');
          const transformStr = compNode.getAttribute('transform');
          if (targetId) {
            let transformArr: number[] | undefined = undefined;
            if (transformStr) {
              transformArr = transformStr.trim().split(/\s+/).map(Number);
            }
            comps.push({ objectId: targetId, transform: transformArr });
          }
        });
        componentMap.set(objId, comps);
      }
    });
  });

  // 6. Build Group Hierarchy
  const rootGroup = new THREE.Group();
  rootGroup.name = '3MF_Root_Assembly';
  const parts: ModelPart[] = [];
  // R2 (MP-12): số đo khuyết tật THẬT của từng chi tiết (thay cho cờ kín / 0 cạnh / 0 mặt nghịch /
  // chiều dày gán cứng ở khối `return`),
  // và danh sách hình học để đo chiều dày theo một ngân sách tia dùng chung.
  const defectEntries: Array<{ defects: MeshDefectAnalysis; triangleCount: number }> = [];
  const thicknessEntries: Array<{ geometry: THREE.BufferGeometry; triangleCount: number }> = [];
  let partIndex = 1;
  let totalTriangles = 0;
  let totalVolume = 0;
  let totalSurfaceArea = 0;

  const instantiateMesh = (
    geom: THREE.BufferGeometry,
    name: string,
    colorHexOverride?: string,
    matrixTransform?: THREE.Matrix4
  ) => {
    let finalGeom = geom.clone();
    if (matrixTransform) {
      finalGeom.applyMatrix4(matrixTransform);
    }

    // Match with extracted Slicer Preset Palette
    const paletteItem = slicerPreset.palettes[(partIndex - 1) % slicerPreset.palettes.length];
    const chosenColorHex = colorHexOverride || paletteItem?.colorHex || DEFAULT_PART_PALETTE[(partIndex - 1) % DEFAULT_PART_PALETTE.length].hex;
    const chosenColorName = paletteItem?.name || (colorHexOverride ? `Màu Preset (${colorHexOverride})` : DEFAULT_PART_PALETTE[(partIndex - 1) % DEFAULT_PART_PALETTE.length].name);

    const mesh = new THREE.Mesh(
      finalGeom,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(chosenColorHex),
        roughness: 0.35,
        metalness: 0.15,
        side: THREE.DoubleSide
      })
    );

    const partId = `part-${partIndex}-${Date.now()}`;
    mesh.name = name;
    mesh.userData = { partId, partName: name };

    const triCount = finalGeom.index ? finalGeom.index.count / 3 : finalGeom.attributes.position.count / 3;
    const vol = calculateVolume(finalGeom);
    const area = calculateSurfaceArea(finalGeom);
    // R2 (MP-12): phân tích biên hở / cạnh non-manifold / pháp tuyến nghịch TRÊN CHÍNH lưới của chi tiết.
    // Chiều dày để `null` ở bước này; đo sau bằng ngân sách chia đều (measureGroupThickness).
    const defects = analyzeMeshDefects(finalGeom, { thicknessRayBudget: 0 });

    totalTriangles += triCount;
    totalVolume += vol;
    totalSurfaceArea += area;
    defectEntries.push({ defects, triangleCount: triCount });
    thicknessEntries.push({ geometry: finalGeom, triangleCount: triCount });

    parts.push({
      id: partId,
      name: name || `3MF Component ${partIndex}`,
      color: chosenColorName,
      colorHex: chosenColorHex,
      materialId: paletteItem?.materialType?.toLowerCase().includes('petg') ? 'petg-pro' : 'pla-tough',
      visible: true,
      triangleCount: Math.round(triCount),
      volumeCm3: Number(vol.toFixed(2)),
      extruderIndex: ((partIndex - 1) % 4) + 1
    });

    rootGroup.add(mesh);
    partIndex++;
  };

  // Build items processing
  const buildItems = getElementsByLocalName(mainDoc, 'item');
  if (buildItems.length > 0) {
    buildItems.forEach((itemNode) => {
      const objId = itemNode.getAttribute('objectid');
      const transformStr = itemNode.getAttribute('transform');
      let matrix: THREE.Matrix4 | undefined = undefined;
      if (transformStr) {
        const matValues = transformStr.trim().split(/\s+/).map(Number);
        if (matValues.length === 12) {
          matrix = new THREE.Matrix4().set(
            matValues[0], matValues[3], matValues[6], matValues[9] * unitScale,
            matValues[1], matValues[4], matValues[7], matValues[10] * unitScale,
            matValues[2], matValues[5], matValues[8], matValues[11] * unitScale,
            0, 0, 0, 1
          );
        }
      }

      if (objId && meshMap.has(objId)) {
        const mData = meshMap.get(objId)!;
        instantiateMesh(mData.geometry, mData.name, mData.colorHex, matrix);
      } else if (objId && componentMap.has(objId)) {
        const subComps = componentMap.get(objId)!;
        subComps.forEach((sc) => {
          if (meshMap.has(sc.objectId)) {
            const mData = meshMap.get(sc.objectId)!;
            let combinedMatrix = matrix ? matrix.clone() : new THREE.Matrix4();
            if (sc.transform && sc.transform.length === 12) {
              const scMat = new THREE.Matrix4().set(
                sc.transform[0], sc.transform[3], sc.transform[6], sc.transform[9] * unitScale,
                sc.transform[1], sc.transform[4], sc.transform[7], sc.transform[10] * unitScale,
                sc.transform[2], sc.transform[5], sc.transform[8], sc.transform[11] * unitScale,
                0, 0, 0, 1
              );
              combinedMatrix.multiply(scMat);
            }
            instantiateMesh(mData.geometry, mData.name, mData.colorHex, combinedMatrix);
          }
        });
      }
    });
  }

  // Fallback: If build is empty, instantiate all parsed meshes
  if (rootGroup.children.length === 0 && meshMap.size > 0) {
    meshMap.forEach((mData) => {
      instantiateMesh(mData.geometry, mData.name, mData.colorHex);
    });
  }

  if (rootGroup.children.length === 0) {
    throw new Error('Không tìm thấy đối tượng Mesh 3D hợp lệ trong tệp 3MF.');
  }

  // 7. Convert 3MF Z-up coordinate system to Three.js Y-up so it lies flat on print bed
  rootGroup.rotation.x = -Math.PI / 2;
  rootGroup.updateMatrixWorld(true);

  // Compute oriented bounding box
  const orientedBox = new THREE.Box3().setFromObject(rootGroup);
  const size = new THREE.Vector3();
  orientedBox.getSize(size);
  const center = new THREE.Vector3();
  orientedBox.getCenter(center);

  // Normalize group position so (X=0, Z=0) is center and bottom sits at Y=0
  const normalizedGroup = new THREE.Group();
  normalizedGroup.name = '3MF_Normalized_Assembly';
  rootGroup.position.set(-center.x, -orientedBox.min.y, -center.z);
  normalizedGroup.add(rootGroup);
  normalizedGroup.updateMatrixWorld(true);

  // R2 (MP-06): thể tích/diện tích CHỈ lấy từ tích phân trên lưới thật. Không rơi về
  // `hộp bao × 0.45` / công thức hộp bao — đó chính là "số bịa nuôi giá".
  const finalVolume = Number(totalVolume.toFixed(2));
  const finalSurfaceArea = Number(totalSurfaceArea.toFixed(2));
  if (!Number.isFinite(finalVolume) || !(finalVolume > 0) || !Number.isFinite(finalSurfaceArea) || !(finalSurfaceArea > 0)) {
    throw new MeshParseError(
      'not_measurable',
      fileName,
      'Không đo được thể tích/diện tích từ lưới trong tệp 3MF (tích phân bằng 0 hoặc không hữu hạn). Hệ thống không suy từ hộp bao và không tạo báo giá cho tệp này.'
    );
  }

  const computedPlates: PlateInfo[] = (slicerPreset.plates && slicerPreset.plates.length > 0)
    ? slicerPreset.plates.map((plate, pIdx) => {
        const plateParts = parts.filter(p => (p.plateIndex || 1) === plate.index);
        const partCount = plateParts.length > 0 ? plateParts.length : (pIdx === 0 ? parts.length : 0);
        const partIds = plateParts.map(p => p.id);

        return {
          // R2 (MP-13): khối lượng nhựa/giờ in CHỈ giữ đúng thứ tệp khai báo (`...plate`). Không suy
          // `thể tích × 1.24 g/cm3` rồi bày ra như preset của máy cắt lớp.
          ...plate,
          partCount,
          partIds,
          dimensions: {
            x: Number(size.x.toFixed(1)),
            y: Number(size.z.toFixed(1)),
            z: Number(size.y.toFixed(1))
          }
        };
      })
    : [
        {
          // Tệp không kèm dữ liệu bàn in ⇒ chỉ nêu thứ ĐO ĐƯỢC (số chi tiết + kích thước khay).
          // Không bịa 3600 giây / '45m' / khối lượng nhựa / loại bàn in.
          index: 1,
          name: 'Bàn in 1 (lưới đọc từ tệp — tệp không kèm dữ liệu slicer)',
          partCount: parts.length,
          partIds: parts.map(p => p.id),
          dimensions: {
            x: Number(size.x.toFixed(1)),
            y: Number(size.z.toFixed(1)),
            z: Number(size.y.toFixed(1))
          }
        }
      ];

  // R2 (MP-12): gộp số đo các chi tiết + đo chiều dày trên tối đa 4 chi tiết lớn nhất.
  const defects: MeshDefectAnalysis = {
    ...aggregateDefects(defectEntries),
    minWallThickness: measureGroupThickness(thicknessEntries, THICKNESS_RAY_BUDGET)
  };

  return {
    objectGroup: normalizedGroup,
    dimensions: {
      x: Number(size.x.toFixed(1)),
      y: Number(size.z.toFixed(1)), // Depth on bed
      z: Number(size.y.toFixed(1))  // Height off bed
    },
    volume: finalVolume,
    surfaceArea: finalSurfaceArea,
    triangleCount: Math.round(totalTriangles),
    // R2 (MP-12): số đo khuyết tật THẬT của cả tệp (gộp từ các chi tiết) — không còn hằng số.
    isWatertight: defects.isWatertight,
    nonManifoldEdges: defects.nonManifoldCount,
    invertedNormals: defects.invertedNormalsCount,
    boundaryEdges: defects.boundaryEdges,
    minWallThickness: defects.minWallThickness,
    overhangTriangles: defects.overhangTriangles,
    overhangPercentage: defects.overhangPercentage,
    parts,
    slicerPreset: {
      ...slicerPreset,
      plates: computedPlates,
      plateCount: computedPlates.length
    },
    plates: computedPlates,
    activePlateIndex: 1
  };
}

/**
 * Off-thread CAD & binary STL parser running in dedicated Web Worker.
 *
 * R4: Giải mã tệp STL, STEP, STP, IGES, IGS bằng WebAssembly kernel (occt-import-js) và tính thể tích giải tích.
 * Worker trả về HÌNH HỌC đã đọc, hoặc `null` = KHÔNG ĐỌC ĐƯỢC. Mọi số đo được tính từ chính hình học đọc được.
 */
async function parseCadWithWorker(file: File): Promise<THREE.BufferGeometry | null> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const worker = new Worker(new URL('../workers/cadParser.worker.ts', import.meta.url), { type: 'module' });
      const reqId = `req_${Date.now()}`;

      const timer = setTimeout(() => {
        worker.terminate();
        resolve(null);
      }, 30000);

      worker.onmessage = (e: MessageEvent<any>) => {
        clearTimeout(timer);
        const data = e.data;
        worker.terminate();

        const positions = data?.positions;
        // Không có lưới / 0 tam giác ⇒ COI NHƯ KHÔNG ĐỌC ĐƯỢC (không suy ra số đo thay thế).
        if (!data || !data.success || !positions || !positions.length || !(data.triangleCount > 0)) {
          resolve(null);
          return;
        }
        const dims = data.dimensionsMm;
        if (!dims || !(dims.x > 0) || !(dims.y > 0) || !(dims.z > 0) || !(data.volumeCm3 > 0)) {
          resolve(null);
          return;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (data.normals) {
          geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
        } else {
          geometry.computeVertexNormals();
        }
        geometry.computeBoundingBox();
        resolve(geometry);
      };

      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        resolve(null);
      };

      file.arrayBuffer().then((buffer) => {
        worker.postMessage({ id: reqId, fileBuffer: buffer, fileName: file.name }, [buffer]);
      }).catch(() => {
        clearTimeout(timer);
        worker.terminate();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

const parseStlWithWorker = parseCadWithWorker;

/**
 * R2 (MP-12): đo chiều dày cho NHIỀU chi tiết với MỘT ngân sách tia dùng chung.
 * Chỉ đo trên tối đa 4 chi tiết lớn nhất (chi phí bị chặn), lấy MIN của các chi tiết đo được;
 * không đo được chi tiết nào ⇒ `null` ("chưa đo được"), không rơi về hằng số 1.5/1.6/1.8.
 */
function measureGroupThickness(
  entries: Array<{ geometry: THREE.BufferGeometry; triangleCount: number }>,
  rayBudget: number
): number | null {
  const sorted = [...entries].sort((a, b) => b.triangleCount - a.triangleCount).slice(0, 4);
  if (sorted.length === 0) return null;
  const perPart = Math.max(1, Math.floor(rayBudget / sorted.length));
  let best: number | null = null;
  for (const entry of sorted) {
    const thickness = measureMinimumWallThickness(entry.geometry, perPart);
    if (thickness !== null) best = best === null ? thickness : Math.min(best, thickness);
  }
  return best;
}

/**
 * R2 (MP-03/MP-06): đo MỘT lưới tam giác (STL) từ chính hình học đã đọc.
 * Không đọc được / suy biến / tích phân bằng 0 ⇒ ném `MeshParseError` — KHÔNG thay bằng hộp
 * 85×32×60, KHÔNG suy thể tích từ hộp bao, KHÔNG có số đo thay thế.
 */
function measureTriangularMesh(geometry: THREE.BufferGeometry, fileName: string): {
  geometry: THREE.BufferGeometry;
  dimensions: { x: number; y: number; z: number };
  volume: number;
  surfaceArea: number;
  triangleCount: number;
  defects: MeshDefectAnalysis;
} {
  const posAttr = geometry.attributes.position;
  if (!posAttr || posAttr.count < 3) {
    geometry.dispose();
    throw new MeshParseError(
      'corrupt_file',
      fileName,
      'Lưới đọc được không có tam giác nào. Hệ thống không dựng hình học thay thế và không tạo báo giá cho tệp này.'
    );
  }

  // For geometries under 35,000 vertices, merge vertices to recover topological indices
  // For larger files, keep rawGeometry directly for ultra-fast 60 FPS rendering without memory exhaustion
  let mesh = geometry;
  if (posAttr.count < 35000) {
    try {
      const rawBox = new THREE.Box3().setFromBufferAttribute(posAttr as THREE.BufferAttribute);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const relativeTolerance = Math.max(rawSize.length() * 1e-4, 1e-5);
      mesh = BufferGeometryUtils.mergeVertices(geometry, relativeTolerance);
      geometry.dispose();
    } catch {
      mesh = geometry;
    }
  }

  mesh.computeBoundingBox();
  mesh.computeVertexNormals();

  const size = new THREE.Vector3();
  if (mesh.boundingBox) mesh.boundingBox.getSize(size);
  const dimensions = {
    x: Number(size.x.toFixed(1)),
    y: Number(size.y.toFixed(1)),
    z: Number(size.z.toFixed(1))
  };
  if (!(dimensions.x > 0.01) || !(dimensions.y > 0.01) || !(dimensions.z > 0.01)) {
    mesh.dispose();
    throw new MeshParseError(
      'degenerate_geometry',
      fileName,
      'Không đo được kích thước 3 chiều từ lưới (lưới suy biến hoặc phẳng). Hệ thống không suy kích thước từ hộp dựng sẵn.'
    );
  }

  const triangleCount = mesh.index ? mesh.index.count / 3 : mesh.attributes.position.count / 3;
  const volume = calculateVolume(mesh);
  const surfaceArea = calculateSurfaceArea(mesh);
  if (!(triangleCount >= 1) || !Number.isFinite(volume) || !(volume > 0) || !Number.isFinite(surfaceArea) || !(surfaceArea > 0)) {
    mesh.dispose();
    throw new MeshParseError(
      'not_measurable',
      fileName,
      'Không đo được thể tích/diện tích từ lưới (tích phân bằng 0 hoặc không hữu hạn). Hệ thống KHÔNG suy số đo từ hộp bao và không báo giá cho tệp này.'
    );
  }

  return {
    geometry: mesh,
    dimensions,
    volume,
    surfaceArea,
    triangleCount,
    defects: analyzeMeshDefects(mesh)
  };
}

/**
 * R2 (MP-06/MP-12/MP-13/MP-17): đo TOÀN BỘ số liệu của một NHÓM lưới (OBJ, và đường dự phòng 3MF)
 * từ chính hình học đã đọc: kích thước của cả nhóm, thể tích / diện tích / số tam giác của TỪNG
 * chi tiết, và phân tích khuyết tật thật. Không còn số tam giác / thể tích dựng sẵn cho từng chi
 * tiết, cũng không suy thể tích từ hộp bao (× 0.3 / × 0.4).
 *
 * `swapYAndZ`: 3MF là hệ Z-up và đã được xoay về Y-up trước khi đo ⇒ khi báo cho UI (trục Z = chiều
 * cao khỏi bàn in) phải hoán đổi Y/Z; OBJ giữ nguyên hệ của tệp.
 */
function measureGroup(
  objectGroup: THREE.Group,
  fileName: string,
  swapYAndZ = false
): ParsedMeshResult {
  objectGroup.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(objectGroup);
  const size = new THREE.Vector3();
  if (!box.isEmpty()) box.getSize(size);
  const rawDimensions = {
    x: Number(size.x.toFixed(1)),
    y: Number(size.y.toFixed(1)),
    z: Number(size.z.toFixed(1))
  };
  if (!(rawDimensions.x > 0.01) || !(rawDimensions.y > 0.01) || !(rawDimensions.z > 0.01)) {
    throw new MeshParseError(
      'degenerate_geometry',
      fileName,
      'Không đo được kích thước 3 chiều của nhóm lưới trong tệp. Hệ thống không suy kích thước từ hộp dựng sẵn.'
    );
  }
  const dimensions = swapYAndZ
    ? { x: rawDimensions.x, y: rawDimensions.z, z: rawDimensions.y }
    : rawDimensions;

  const parts: ModelPart[] = [];
  const defectEntries: Array<{ defects: MeshDefectAnalysis; triangleCount: number }> = [];
  const thicknessEntries: Array<{ geometry: THREE.BufferGeometry; triangleCount: number }> = [];
  let totalTriangles = 0;
  let totalVolume = 0;
  let totalSurfaceArea = 0;
  let partIdx = 1;

  objectGroup.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) return;

    // Đo trên bản SAO đã áp ma trận thế giới (OBJ có thể đặt transform ở node cha).
    const measured = mesh.geometry.clone();
    measured.applyMatrix4(mesh.matrixWorld);
    measured.computeBoundingBox();
    measured.computeVertexNormals();

    const triCount = measured.index ? measured.index.count / 3 : measured.attributes.position.count / 3;
    if (!(triCount >= 1)) {
      measured.dispose();
      return;
    }

    const vol = calculateVolume(measured);
    const area = calculateSurfaceArea(measured);
    const defects = analyzeMeshDefects(measured, { thicknessRayBudget: 0 });
    const palette = DEFAULT_PART_PALETTE[(partIdx - 1) % DEFAULT_PART_PALETTE.length];

    parts.push({
      id: `part-${partIdx}-${Date.now()}`,
      name: mesh.name || `Chi tiết ${partIdx}`,
      color: palette.name,
      colorHex: palette.hex,
      materialId: 'pla-basic',
      visible: true,
      // R2 (MP-17): số tam giác / thể tích của TỪNG chi tiết đều ĐO từ lưới của chi tiết đó.
      triangleCount: Math.round(triCount),
      volumeCm3: Number(vol.toFixed(2)),
      extruderIndex: 1
    });
    defectEntries.push({ defects, triangleCount: triCount });
    thicknessEntries.push({ geometry: measured, triangleCount: triCount });
    totalTriangles += triCount;
    totalVolume += vol;
    totalSurfaceArea += area;
    partIdx++;
  });

  if (parts.length === 0) {
    thicknessEntries.forEach((entry) => entry.geometry.dispose());
    throw new MeshParseError(
      'corrupt_file',
      fileName,
      'Tệp không chứa lưới tam giác nào để đo. Hệ thống không dựng mô hình thay thế và không tạo báo giá cho tệp này.'
    );
  }

  const defects: MeshDefectAnalysis = {
    ...aggregateDefects(defectEntries),
    minWallThickness: measureGroupThickness(thicknessEntries, THICKNESS_RAY_BUDGET)
  };
  // Bản sao chỉ để đo ⇒ giải phóng ngay; nhóm gốc (đang render) không bị đụng tới.
  thicknessEntries.forEach((entry) => entry.geometry.dispose());

  return {
    objectGroup,
    dimensions,
    volume: Number(totalVolume.toFixed(2)),
    surfaceArea: Number(totalSurfaceArea.toFixed(2)),
    triangleCount: Math.round(totalTriangles),
    isWatertight: defects.isWatertight,
    nonManifoldEdges: defects.nonManifoldCount,
    invertedNormals: defects.invertedNormalsCount,
    boundaryEdges: defects.boundaryEdges,
    minWallThickness: defects.minWallThickness,
    overhangTriangles: defects.overhangTriangles,
    overhangPercentage: defects.overhangPercentage,
    parts
  };
}

/**
 * Parse an uploaded File (3MF, STL, OBJ, STEP, IGES) into real Three.js Geometry/Group and extract exact metrics.
 *
 * R4: STEP/STP/IGES được giải mã qua WebAssembly CAD Kernel trong Web Worker.
 * Mọi định dạng khác chưa có bộ đọc ⇒ NÉM `MeshParseError('unsupported_format')`.
 */
export async function parse3DFile(file: File): Promise<ParsedMeshResult> {
  const fileName = file.name.toLowerCase();

  // 1. TRUE 3MF LOADER WITH MULTI-PART, COLOR & FULL PRESET PALETTE EXTRACTION
  if (fileName.endsWith('.3mf')) {
    const arrayBuffer = await file.arrayBuffer();

    // Primary: Native Fast 3MF Parser with JSZip + XML DOM
    try {
      return await parse3MFNative(arrayBuffer, file.name);
    } catch (nativeErr) {
      if (nativeErr instanceof MeshParseError) throw nativeErr;
      console.warn('Bộ đọc 3MF gốc gặp lỗi, thử ThreeMFLoader:', nativeErr);
    }

    // Secondary fallback: ThreeMFLoader — số đo vẫn phải ĐO từ hình học vừa đọc.
    try {
      if (typeof window !== 'undefined') {
        (window as any).JSZip = JSZip;
      }
      const loader = new ThreeMFLoader();
      const objectGroup = loader.parse(arrayBuffer);
      objectGroup.rotation.x = -Math.PI / 2;
      objectGroup.updateMatrixWorld(true);
      return measureGroup(objectGroup, file.name, true);
    } catch (threeErr) {
      console.error('Tất cả bộ đọc 3MF đều lỗi:', threeErr);
      if (threeErr instanceof MeshParseError) throw threeErr;
      throw new MeshParseError(
        'corrupt_file',
        file.name,
        'Không đọc được cấu trúc tệp 3MF (gói ZIP / model XML). Hệ thống không dựng hình học thay thế và không tạo báo giá cho tệp này.'
      );
    }
  }

  // 2. STL LOADER (Offscreen Worker for >2MB, STLLoader for small files)
  if (fileName.endsWith('.stl')) {
    let rawGeometry: THREE.BufferGeometry | null = null;

    if (file.size > 2 * 1024 * 1024) {
      try {
        rawGeometry = await parseStlWithWorker(file);
      } catch (err) {
        console.warn('Bộ đọc STL trong Web Worker lỗi, quay về đọc trên luồng chính:', err);
      }
    }

    if (!rawGeometry) {
      const arrayBuffer = await file.arrayBuffer();
      const loader = new STLLoader();
      try {
        rawGeometry = loader.parse(arrayBuffer);
      } catch (parseErr) {
        // R2 (MP-03): chỗ này trước đây dựng một hộp 85 x 32 x 60 mm thay cho tệp lỗi.
        throw new MeshParseError(
          'corrupt_file',
          file.name,
          'Không đọc được cấu trúc STL (không phải STL nhị phân hợp lệ và cũng không có khối "facet normal"/"vertex" của STL ASCII). Hệ thống KHÔNG tạo dữ liệu thay thế cho tệp này.'
        );
      }
    }

    const measured = measureTriangularMesh(rawGeometry, file.name);

    const parts: ModelPart[] = [
      {
        id: `part-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        color: 'Xanh Teal Công Nghiệp',
        colorHex: '#00687a',
        materialId: 'pla-basic',
        visible: true,
        triangleCount: Math.round(measured.triangleCount),
        volumeCm3: measured.volume,
        extruderIndex: 1
      }
    ];

    return {
      geometry: measured.geometry,
      dimensions: measured.dimensions,
      volume: measured.volume,
      surfaceArea: measured.surfaceArea,
      triangleCount: Math.round(measured.triangleCount),
      isWatertight: measured.defects.isWatertight,
      nonManifoldEdges: measured.defects.nonManifoldCount,
      invertedNormals: measured.defects.invertedNormalsCount,
      boundaryEdges: measured.defects.boundaryEdges,
      minWallThickness: measured.defects.minWallThickness,
      overhangTriangles: measured.defects.overhangTriangles,
      overhangPercentage: measured.defects.overhangPercentage,
      parts
    };
  }

  // 3. OBJ LOADER
  if (fileName.endsWith('.obj')) {
    const text = await file.text();
    const loader = new OBJLoader();
    let objectGroup: THREE.Group;
    try {
      objectGroup = loader.parse(text);
    } catch (parseErr) {
      throw new MeshParseError(
        'corrupt_file',
        file.name,
        'Không đọc được cấu trúc OBJ. Hệ thống không dựng hình học thay thế và không tạo báo giá cho tệp này.'
      );
    }
    return measureGroup(objectGroup, file.name);
  }

  // 4. STEP / IGES LOADER (Off-thread WebAssembly CAD Kernel)
  if (
    fileName.endsWith('.step') ||
    fileName.endsWith('.stp') ||
    fileName.endsWith('.iges') ||
    fileName.endsWith('.igs')
  ) {
    let rawGeometry: THREE.BufferGeometry | null = null;
    try {
      rawGeometry = await parseCadWithWorker(file);
    } catch (err) {
      console.warn('Bộ đọc CAD trong Web Worker gặp sự cố:', err);
    }

    if (!rawGeometry) {
      throw new MeshParseError(
        'corrupt_file',
        file.name,
        'Không thể giải mã cấu trúc hình học CAD từ tệp STEP/IGES (lỗi kernel WebAssembly hoặc tệp bị hỏng). Hệ thống không dựng hình học thay thế và không tạo báo giá cho tệp này.'
      );
    }

    const measured = measureTriangularMesh(rawGeometry, file.name);

    const parts: ModelPart[] = [
      {
        id: `part-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        color: 'Xanh Teal Công Nghiệp',
        colorHex: '#00687a',
        materialId: 'pla-basic',
        visible: true,
        triangleCount: Math.round(measured.triangleCount),
        volumeCm3: measured.volume,
        extruderIndex: 1
      }
    ];

    return {
      geometry: measured.geometry,
      dimensions: measured.dimensions,
      volume: measured.volume,
      surfaceArea: measured.surfaceArea,
      triangleCount: Math.round(measured.triangleCount),
      isWatertight: measured.defects.isWatertight,
      nonManifoldEdges: measured.defects.nonManifoldCount,
      invertedNormals: measured.defects.invertedNormalsCount,
      boundaryEdges: measured.defects.boundaryEdges,
      minWallThickness: measured.defects.minWallThickness,
      overhangTriangles: measured.defects.overhangTriangles,
      overhangPercentage: measured.defects.overhangPercentage,
      parts
    };
  }

  // 5. Định dạng khác: KHÔNG có bộ đọc hình học ⇒ nói thẳng, không dựng mô hình thay thế.
  const extension = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  throw new MeshParseError(
    'unsupported_format',
    file.name,
    `Chưa có bộ đọc hình học cho định dạng ${extension ? `".${extension}"` : 'này'} nên KHÔNG có số đo nào cho tệp này. `
      + 'Hệ thống không dựng mô hình mô phỏng thay thế và không tạo báo giá từ tệp chưa đọc được — '
      + 'vui lòng tải bản (.stl / .3mf / .obj / .step / .stp / .iges / .igs) hoặc gửi yêu cầu thẩm định thủ công.'
  );
}
