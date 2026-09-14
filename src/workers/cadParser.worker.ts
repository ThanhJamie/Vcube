/**
 * VCUBE Dedicated CAD Geometry Web Worker
 * Off-main-thread binary STL parser, WebAssembly STEP/IGES CAD kernel & Gauss divergence volume calculator.
 * Prevents main-thread UI freezing and Out of Memory (OOM) during large CAD parsing.
 */

// @ts-ignore
import occtimportjs from 'occt-import-js';

export interface CadWorkerRequest {
  id: string;
  fileBuffer: ArrayBuffer;
  fileName: string;
}

export interface CadWorkerResponse {
  id: string;
  success: boolean;
  error?: string;
  triangleCount: number;
  volumeCm3: number;
  surfaceAreaCm2: number;
  dimensionsMm: { x: number; y: number; z: number };
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  positions?: Float32Array;
  normals?: Float32Array;
}

let occtPromise: Promise<any> | null = null;

async function getOcctInstance(): Promise<any> {
  if (!occtPromise) {
    const wasmUrl =
      typeof self !== 'undefined' && self.location?.origin
        ? `${self.location.origin}/wasm/occt-import-js.wasm`
        : '/wasm/occt-import-js.wasm';

    // @ts-ignore
    const initFn =
      typeof occtimportjs === 'function'
        ? occtimportjs
        : (occtimportjs as any)?.default;

    if (typeof initFn !== 'function') {
      throw new Error('Không thể nạp thư viện WebAssembly CAD Kernel (occt-import-js).');
    }

    occtPromise = initFn({
      locateFile: (name: string) => {
        if (name.endsWith('.wasm')) {
          return wasmUrl;
        }
        return name;
      }
    });
  }
  return occtPromise;
}

async function parseCadWithOcct(
  buffer: ArrayBuffer,
  id: string,
  isStep: boolean
): Promise<CadWorkerResponse> {
  const occt = await getOcctInstance();
  const fileBytes = new Uint8Array(buffer);
  const params = null;

  const result = isStep
    ? occt.ReadStepFile(fileBytes, params)
    : occt.ReadIgesFile(fileBytes, params);

  if (!result || !result.success) {
    throw new Error(`Không thể giải mã tệp CAD (${isStep ? 'STEP' : 'IGES'}). Dữ liệu tệp không hợp lệ.`);
  }

  if (!result.meshes || result.meshes.length === 0) {
    throw new Error('Tệp CAD không chứa hình học (0 meshes).');
  }

  let totalTriangles = 0;
  for (const mesh of result.meshes) {
    if (mesh.index?.array) {
      totalTriangles += Math.floor(mesh.index.array.length / 3);
    }
  }

  if (totalTriangles === 0) {
    throw new Error('Lưới CAD không chứa tam giác nào (0 triangles).');
  }

  const positions = new Float32Array(totalTriangles * 9);
  const normals = new Float32Array(totalTriangles * 9);

  let posIdx = 0;
  let signedVolumeSum = 0;
  let surfaceAreaSum = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const mesh of result.meshes) {
    const posArr = mesh.attributes?.position?.array;
    const normArr = mesh.attributes?.normal?.array;
    const idxArr = mesh.index?.array;

    if (!posArr || !idxArr) continue;

    const triCount = Math.floor(idxArr.length / 3);
    for (let t = 0; t < triCount; t++) {
      const i1 = idxArr[t * 3];
      const i2 = idxArr[t * 3 + 1];
      const i3 = idxArr[t * 3 + 2];

      const v1x = posArr[i1 * 3], v1y = posArr[i1 * 3 + 1], v1z = posArr[i1 * 3 + 2];
      const v2x = posArr[i2 * 3], v2y = posArr[i2 * 3 + 1], v2z = posArr[i2 * 3 + 2];
      const v3x = posArr[i3 * 3], v3y = posArr[i3 * 3 + 1], v3z = posArr[i3 * 3 + 2];

      positions[posIdx] = v1x;
      positions[posIdx + 1] = v1y;
      positions[posIdx + 2] = v1z;

      positions[posIdx + 3] = v2x;
      positions[posIdx + 4] = v2y;
      positions[posIdx + 5] = v2z;

      positions[posIdx + 6] = v3x;
      positions[posIdx + 7] = v3y;
      positions[posIdx + 8] = v3z;

      if (normArr && normArr.length >= (Math.max(i1, i2, i3) + 1) * 3) {
        normals[posIdx] = normArr[i1 * 3];
        normals[posIdx + 1] = normArr[i1 * 3 + 1];
        normals[posIdx + 2] = normArr[i1 * 3 + 2];

        normals[posIdx + 3] = normArr[i2 * 3];
        normals[posIdx + 4] = normArr[i2 * 3 + 1];
        normals[posIdx + 5] = normArr[i2 * 3 + 2];

        normals[posIdx + 6] = normArr[i3 * 3];
        normals[posIdx + 7] = normArr[i3 * 3 + 1];
        normals[posIdx + 8] = normArr[i3 * 3 + 2];
      } else {
        const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
        const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len; ny /= len; nz /= len;

        for (let j = 0; j < 3; j++) {
          normals[posIdx + j * 3] = nx;
          normals[posIdx + j * 3 + 1] = ny;
          normals[posIdx + j * 3 + 2] = nz;
        }
      }

      posIdx += 9;

      if (v1x < minX) minX = v1x; if (v1x > maxX) maxX = v1x;
      if (v1y < minY) minY = v1y; if (v1y > maxY) maxY = v1y;
      if (v1z < minZ) minZ = v1z; if (v1z > maxZ) maxZ = v1z;

      if (v2x < minX) minX = v2x; if (v2x > maxX) maxX = v2x;
      if (v2y < minY) minY = v2y; if (v2y > maxY) maxY = v2y;
      if (v2z < minZ) minZ = v2z; if (v2z > maxZ) maxZ = v2z;

      if (v3x < minX) minX = v3x; if (v3x > maxX) maxX = v3x;
      if (v3y < minY) minY = v3y; if (v3y > maxY) maxY = v3y;
      if (v3z < minZ) minZ = v3z; if (v3z > maxZ) maxZ = v3z;

      // Gauss divergence theorem: signed volume = (v1 . (v2 x v3)) / 6
      const crossX = v2y * v3z - v2z * v3y;
      const crossY = v2z * v3x - v2x * v3z;
      const crossZ = v2x * v3y - v2y * v3x;
      signedVolumeSum += (v1x * crossX + v1y * crossY + v1z * crossZ);

      // Surface area: 0.5 * |(v2 - v1) x (v3 - v1)|
      const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
      const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      surfaceAreaSum += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }
  }

  const volumeMm3 = Math.abs(signedVolumeSum / 6);
  const volumeCm3 = Number((volumeMm3 / 1000).toFixed(2));
  const surfaceAreaCm2 = Number((surfaceAreaSum / 100).toFixed(2));

  const dimX = Number(Math.max(0, maxX - minX).toFixed(2));
  const dimY = Number(Math.max(0, maxY - minY).toFixed(2));
  const dimZ = Number(Math.max(0, maxZ - minZ).toFixed(2));

  return {
    id,
    success: true,
    triangleCount: totalTriangles,
    volumeCm3,
    surfaceAreaCm2,
    dimensionsMm: { x: dimX, y: dimY, z: dimZ },
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    },
    positions,
    normals
  };
}

self.onmessage = async (event: MessageEvent<CadWorkerRequest>) => {
  const { id, fileBuffer, fileName } = event.data;

  try {
    const lowerName = (fileName || '').toLowerCase();
    const isStep = lowerName.endsWith('.step') || lowerName.endsWith('.stp');
    const isIges = lowerName.endsWith('.iges') || lowerName.endsWith('.igs');

    let result: CadWorkerResponse;

    if (isStep || isIges) {
      result = await parseCadWithOcct(fileBuffer, id, isStep);
    } else {
      const isAscii = checkIfAscii(fileBuffer);
      if (isAscii) {
        result = parseAsciiStl(fileBuffer, id);
      } else {
        result = parseBinaryStl(fileBuffer, id);
      }
    }

    // Transfer typed arrays without cloning memory
    if (result.positions && result.normals) {
      (self as any).postMessage(result, [result.positions.buffer, result.normals.buffer]);
    } else {
      self.postMessage(result);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Failed to parse CAD file in Web Worker',
      triangleCount: 0,
      volumeCm3: 0,
      surfaceAreaCm2: 0,
      dimensionsMm: { x: 0, y: 0, z: 0 },
      boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
    });
  }
};

function checkIfAscii(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return true;
  const view = new Uint8Array(buffer, 0, Math.min(256, buffer.byteLength));
  // Binary STLs often have non-ASCII bytes in the first 80 bytes or start with 'solid' followed by non-printable chars
  let isLikelyAscii = false;
  const header = String.fromCharCode.apply(null, Array.from(view.slice(0, 5)));
  if (header.toLowerCase() === 'solid') {
    // Check if the file contains null bytes; binary STLs will contain zeros in the header or facet count
    let nullBytes = 0;
    for (let i = 0; i < view.length; i++) {
      if (view[i] === 0) nullBytes++;
    }
    isLikelyAscii = nullBytes === 0;
  }
  return isLikelyAscii;
}

function parseBinaryStl(buffer: ArrayBuffer, id: string): CadWorkerResponse {
  const dataView = new DataView(buffer);
  const triangleCount = dataView.getUint32(80, true);

  if (buffer.byteLength < 84 + triangleCount * 50) {
    throw new Error('Tệp nhị phân STL bị cắt cụt (corrupted or truncated file).');
  }

  const positions = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);

  let signedVolumeSum = 0;
  let surfaceAreaSum = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let offset = 84;
  let posIdx = 0;

  for (let i = 0; i < triangleCount; i++) {
    // Normal vector
    const nx = dataView.getFloat32(offset, true);
    const ny = dataView.getFloat32(offset + 4, true);
    const nz = dataView.getFloat32(offset + 8, true);
    offset += 12;

    // Vertex 1
    const v1x = dataView.getFloat32(offset, true);
    const v1y = dataView.getFloat32(offset + 4, true);
    const v1z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    // Vertex 2
    const v2x = dataView.getFloat32(offset, true);
    const v2y = dataView.getFloat32(offset + 4, true);
    const v2z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    // Vertex 3
    const v3x = dataView.getFloat32(offset, true);
    const v3y = dataView.getFloat32(offset + 4, true);
    const v3z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    // Skip 2-byte attribute byte count
    offset += 2;

    // Store positions
    positions[posIdx] = v1x;
    positions[posIdx + 1] = v1y;
    positions[posIdx + 2] = v1z;

    positions[posIdx + 3] = v2x;
    positions[posIdx + 4] = v2y;
    positions[posIdx + 5] = v2z;

    positions[posIdx + 6] = v3x;
    positions[posIdx + 7] = v3y;
    positions[posIdx + 8] = v3z;

    // Store normals (same per face for STL)
    normals[posIdx] = nx;
    normals[posIdx + 1] = ny;
    normals[posIdx + 2] = nz;

    normals[posIdx + 3] = nx;
    normals[posIdx + 4] = ny;
    normals[posIdx + 5] = nz;

    normals[posIdx + 6] = nx;
    normals[posIdx + 7] = ny;
    normals[posIdx + 8] = nz;

    posIdx += 9;

    // Track bounds
    if (v1x < minX) minX = v1x; if (v1x > maxX) maxX = v1x;
    if (v1y < minY) minY = v1y; if (v1y > maxY) maxY = v1y;
    if (v1z < minZ) minZ = v1z; if (v1z > maxZ) maxZ = v1z;

    if (v2x < minX) minX = v2x; if (v2x > maxX) maxX = v2x;
    if (v2y < minY) minY = v2y; if (v2y > maxY) maxY = v2y;
    if (v2z < minZ) minZ = v2z; if (v2z > maxZ) maxZ = v2z;

    if (v3x < minX) minX = v3x; if (v3x > maxX) maxX = v3x;
    if (v3y < minY) minY = v3y; if (v3y > maxY) maxY = v3y;
    if (v3z < minZ) minZ = v3z; if (v3z > maxZ) maxZ = v3z;

    // Gauss divergence theorem: signed volume of tetrahedron = (v1 . (v2 x v3)) / 6
    const crossX = v2y * v3z - v2z * v3y;
    const crossY = v2z * v3x - v2x * v3z;
    const crossZ = v2x * v3y - v2y * v3x;
    signedVolumeSum += (v1x * crossX + v1y * crossY + v1z * crossZ);

    // Surface Area: 0.5 * |(v2 - v1) x (v3 - v1)|
    const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
    const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    surfaceAreaSum += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }

  const volumeMm3 = Math.abs(signedVolumeSum / 6);
  const volumeCm3 = Number((volumeMm3 / 1000).toFixed(2));
  const surfaceAreaCm2 = Number((surfaceAreaSum / 100).toFixed(2));

  const dimX = Number(Math.max(0, maxX - minX).toFixed(2));
  const dimY = Number(Math.max(0, maxY - minY).toFixed(2));
  const dimZ = Number(Math.max(0, maxZ - minZ).toFixed(2));

  return {
    id,
    success: true,
    triangleCount,
    volumeCm3,
    surfaceAreaCm2,
    dimensionsMm: { x: dimX, y: dimY, z: dimZ },
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    },
    positions,
    normals
  };
}

function parseAsciiStl(buffer: ArrayBuffer, id: string): CadWorkerResponse {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);

  const vertexPattern = /vertex\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const vertices: number[] = [];

  let match;
  while ((match = vertexPattern.exec(text)) !== null) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }

  const triangleCount = Math.floor(vertices.length / 9);
  const positions = new Float32Array(vertices);
  const normals = new Float32Array(triangleCount * 9);

  let signedVolumeSum = 0;
  let surfaceAreaSum = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < triangleCount; i++) {
    const idx = i * 9;
    const v1x = positions[idx], v1y = positions[idx + 1], v1z = positions[idx + 2];
    const v2x = positions[idx + 3], v2y = positions[idx + 4], v2z = positions[idx + 5];
    const v3x = positions[idx + 6], v3y = positions[idx + 7], v3z = positions[idx + 8];

    // Compute Face Normal
    const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
    const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;

    for (let j = 0; j < 3; j++) {
      normals[idx + j * 3] = nx;
      normals[idx + j * 3 + 1] = ny;
      normals[idx + j * 3 + 2] = nz;
    }

    if (v1x < minX) minX = v1x; if (v1x > maxX) maxX = v1x;
    if (v1y < minY) minY = v1y; if (v1y > maxY) maxY = v1y;
    if (v1z < minZ) minZ = v1z; if (v1z > maxZ) maxZ = v1z;

    if (v2x < minX) minX = v2x; if (v2x > maxX) maxX = v2x;
    if (v2y < minY) minY = v2y; if (v2y > maxY) maxY = v2y;
    if (v2z < minZ) minZ = v2z; if (v2z > maxZ) maxZ = v2z;

    if (v3x < minX) minX = v3x; if (v3x > maxX) maxX = v3x;
    if (v3y < minY) minY = v3y; if (v3y > maxY) maxY = v3y;
    if (v3z < minZ) minZ = v3z; if (v3z > maxZ) maxZ = v3z;

    const crossX = v2y * v3z - v2z * v3y;
    const crossY = v2z * v3x - v2x * v3z;
    const crossZ = v2x * v3y - v2y * v3x;
    signedVolumeSum += (v1x * crossX + v1y * crossY + v1z * crossZ);
    surfaceAreaSum += 0.5 * len;
  }

  const volumeMm3 = Math.abs(signedVolumeSum / 6);
  const volumeCm3 = Number((volumeMm3 / 1000).toFixed(2));
  const surfaceAreaCm2 = Number((surfaceAreaSum / 100).toFixed(2));

  return {
    id,
    success: true,
    triangleCount,
    volumeCm3,
    surfaceAreaCm2,
    dimensionsMm: {
      x: Number(Math.max(0, maxX - minX).toFixed(2)),
      y: Number(Math.max(0, maxY - minY).toFixed(2)),
      z: Number(Math.max(0, maxZ - minZ).toFixed(2))
    },
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    },
    positions,
    normals
  };
}

