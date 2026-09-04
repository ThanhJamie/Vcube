import { calculateDetailedPricing } from '../../utils/pricingEngine';
import { MATERIALS_CATALOG, PRINTER_PROFILES } from '../../data/mockData';
import { AnalysisFile } from '../../types';

export interface SignedQuotePayload {
  quoteId: string;
  volumeCm3: number;
  weightGrams: number;
  dimensions: { x: number; y: number; z: number };
  materialId: string;
  printerId: string;
  workpieceHash?: string;
  infillPercent: number;
  layerHeightMm: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  issuedAt: number;
  expiresAt: number; // 30-minute TTL
  nonce: string;
}

export interface SignedQuoteToken {
  payload: SignedQuotePayload;
  signature: string;
}

export interface WorkpieceDataInput {
  volumeCm3?: number;
  materialId?: string;
  printerId?: string;
}

// In-memory or fallback secret for development & client/server verification
const QUOTE_SIGNING_SECRET = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_QUOTE_SECRET) || 
  'vcube_inkiri_hmac_secret_2026_industrial_fab';

/**
 * Simple web-compatible SHA-256 HMAC generator using Web Crypto API
 */
async function generateHmacSignature(data: string, secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback hash for environments without Web Crypto
  let hash = 0;
  const combined = data + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

export class QuoteVerifier {
  /**
   * Generates a deterministic hash for workpiece specifications (volume, materialId, printerId)
   */
  static computeWorkpieceHash(volumeCm3: number, materialId: string, printerId: string): string {
    const cleanVol = Number(volumeCm3).toFixed(2);
    const cleanMat = (materialId || '').trim().toLowerCase();
    const cleanPrinter = (printerId || '').trim().toLowerCase();
    return `wp_${cleanVol}_${cleanMat}_${cleanPrinter}`;
  }

  /**
   * Generates a tamper-proof signed quote with 30-minute validity and workpiece data hash
   */
  static async createSignedQuote(input: {
    volumeCm3: number;
    weightGrams: number;
    dimensions: { x: number; y: number; z: number };
    materialId: string;
    printerId: string;
    infillPercent: number;
    layerHeightMm: number;
    quantity: number;
  }): Promise<SignedQuoteToken> {
    const material = MATERIALS_CATALOG.find((m) => m.id === input.materialId) || MATERIALS_CATALOG[0];
    const printer = PRINTER_PROFILES.find((p) => p.id === input.printerId) || PRINTER_PROFILES[0];

    const mockFile: AnalysisFile = {
      id: `quote-model-${Date.now()}`,
      fileName: 'quote_model.stl',
      fileSize: `${(input.weightGrams / 10).toFixed(1)} MB`,
      format: 'STL',
      dimensions: input.dimensions,
      volume: input.volumeCm3,
      status: 'Ready',
      tag: 'Mechanical',
      modelType: 'single',
      uploadDate: new Date().toISOString(),
      surfaceArea: 100,
      triangleCount: 25000,
      partsCount: 1,
      parts: [],
      isWatertight: true,
      nonManifoldEdges: 0,
      invertedNormals: 0,
      minWallThickness: 1.2,
      recommendedTech: 'FDM',
      requiresSupport: false,
      printability: {
        printabilityScore: 95,
        level: 'good',
        issues: [],
        recommendedOrientation: 'Z-Up',
        bedFit: true,
        overhangPercentage: 5
      }
    };

    // Run official Inkiri v3.4 pricing formula
    const detailed = calculateDetailedPricing({
      file: mockFile,
      transformedVolume: input.volumeCm3 * 1000,
      selectedPrinterId: input.printerId,
      selectedMaterialId: input.materialId,
      infillDensity: input.infillPercent,
      infillPattern: 'gyroid',
      layerHeight: `${input.layerHeightMm}mm`,
      supportsMode: 'auto',
      quantity: input.quantity
    });

    const unitPrice = detailed.volumeDiscount ? detailed.volumeDiscount.discountedUnitPrice : detailed.breakdown.finalSellingPriceRounded;
    const totalPrice = detailed.volumeDiscount ? detailed.volumeDiscount.totalAfterDiscount : (unitPrice * input.quantity);

    const now = Date.now();
    const ttlMs = 30 * 60 * 1000; // 30 minutes
    const workpieceHash = QuoteVerifier.computeWorkpieceHash(input.volumeCm3, input.materialId, input.printerId);

    const payload: SignedQuotePayload = {
      quoteId: `QUO-${now}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      volumeCm3: input.volumeCm3,
      weightGrams: input.weightGrams,
      dimensions: input.dimensions,
      materialId: input.materialId,
      printerId: input.printerId,
      workpieceHash,
      infillPercent: input.infillPercent,
      layerHeightMm: input.layerHeightMm,
      quantity: input.quantity,
      unitPrice,
      totalPrice,
      issuedAt: now,
      expiresAt: now + ttlMs,
      nonce: Math.random().toString(36).substring(2, 10)
    };

    const signatureString = JSON.stringify({
      id: payload.quoteId,
      unit: payload.unitPrice,
      total: payload.totalPrice,
      vol: Number(payload.volumeCm3.toFixed(2)),
      mat: payload.materialId,
      printer: payload.printerId,
      wpHash: payload.workpieceHash,
      qty: payload.quantity,
      exp: payload.expiresAt,
      nonce: payload.nonce
    });

    const signature = await generateHmacSignature(signatureString, QUOTE_SIGNING_SECRET);

    return {
      payload,
      signature
    };
  }

  /**
   * Verifies an incoming quote token before creating order:
   * 1. Strictly checks 30-minute TTL expiration
   * 2. Checks HMAC signature integrity
   * 3. Verifies workpiece data hash (volume, materialId, printerId)
   * 4. Verifies pricing integrity and detects any tampering deviation
   */
  static async verifyQuoteSignature(
    token: SignedQuoteToken,
    claimedTotalPrice?: number,
    workpieceData?: WorkpieceDataInput
  ): Promise<{ isValid: boolean; reason?: string; verifiedPrice?: number }> {
    if (!token || !token.payload || !token.signature) {
      return {
        isValid: false,
        reason: 'Token báo giá không đầy đủ cấu trúc hoặc thiếu chữ ký mã hóa.'
      };
    }

    const { payload, signature } = token;

    // Check 1: 30-minute TTL Expiration
    const now = Date.now();
    const ttlMs = 30 * 60 * 1000;
    if (now > payload.expiresAt || (payload.issuedAt && (now - payload.issuedAt > ttlMs))) {
      return {
        isValid: false,
        reason: 'Báo giá đã hết hạn sau 30 phút (TTL Expired). Vui lòng tính lại báo giá để cập nhật giá vật tư và tỷ giá máy mới nhất.'
      };
    }

    // Check 2: Workpiece Data Hash Integrity
    const expectedPayloadWorkpieceHash = QuoteVerifier.computeWorkpieceHash(
      payload.volumeCm3,
      payload.materialId,
      payload.printerId
    );
    if (payload.workpieceHash && payload.workpieceHash !== expectedPayloadWorkpieceHash) {
      return {
        isValid: false,
        reason: 'Phát hiện sai lệch hash phôi in 3D: Dữ liệu thể tích, vật liệu hoặc máy in trong payload bị biến đổi trái phép.'
      };
    }

    // If external workpieceData is provided (e.g. from cart/order items), cross-check against signed payload
    if (workpieceData) {
      if (workpieceData.volumeCm3 !== undefined && Math.abs(workpieceData.volumeCm3 - payload.volumeCm3) > 0.05) {
        return {
          isValid: false,
          reason: `Sai lệch thể tích phôi: Báo giá được cấp cho ${payload.volumeCm3.toFixed(2)} cm³, nhưng thông số yêu cầu là ${workpieceData.volumeCm3.toFixed(2)} cm³.`
        };
      }
      if (workpieceData.materialId && workpieceData.materialId !== payload.materialId) {
        return {
          isValid: false,
          reason: `Sai lệch vật liệu in: Báo giá được cấp cho "${payload.materialId}", nhưng yêu cầu sản xuất là "${workpieceData.materialId}".`
        };
      }
      if (workpieceData.printerId && workpieceData.printerId !== payload.printerId) {
        return {
          isValid: false,
          reason: `Sai lệch máy in: Báo giá được cấp cho thiết bị "${payload.printerId}", nhưng yêu cầu là "${workpieceData.printerId}".`
        };
      }
    }

    // Check 3: HMAC Signature Integrity
    const primarySignatureString = JSON.stringify({
      id: payload.quoteId,
      unit: payload.unitPrice,
      total: payload.totalPrice,
      vol: Number(payload.volumeCm3.toFixed(2)),
      mat: payload.materialId,
      printer: payload.printerId,
      wpHash: payload.workpieceHash || expectedPayloadWorkpieceHash,
      qty: payload.quantity,
      exp: payload.expiresAt,
      nonce: payload.nonce
    });

    const expectedSignature = await generateHmacSignature(primarySignatureString, QUOTE_SIGNING_SECRET);
    let isSignatureValid = (signature === expectedSignature);

    // Backward-compatibility: Check legacy signature format without workpiece hash if needed
    if (!isSignatureValid) {
      const legacySignatureString = JSON.stringify({
        id: payload.quoteId,
        unit: payload.unitPrice,
        total: payload.totalPrice,
        mat: payload.materialId,
        qty: payload.quantity,
        exp: payload.expiresAt,
        nonce: payload.nonce
      });
      const expectedLegacySignature = await generateHmacSignature(legacySignatureString, QUOTE_SIGNING_SECRET);
      isSignatureValid = (signature === expectedLegacySignature);
    }

    if (!isSignatureValid) {
      return {
        isValid: false,
        reason: 'Chữ ký báo giá không hợp lệ hoặc dữ liệu kỹ thuật đã bị thay đổi trái phép (HMAC signature mismatch).'
      };
    }

    // Check 4: Price Integrity & Tamper Detection
    const calculatedBaseTotal = payload.unitPrice * payload.quantity;
    if (payload.totalPrice > calculatedBaseTotal + 100) {
      return {
        isValid: false,
        reason: 'Phát hiện tính toàn vẹn giá không hợp lệ: Tổng giá lớn hơn đơn giá nhân số lượng.'
      };
    }

    if (claimedTotalPrice !== undefined) {
      const priceDifference = Math.abs(claimedTotalPrice - payload.totalPrice);
      if (priceDifference > 1000) {
        return {
          isValid: false,
          reason: `Phát hiện sai lệch giá đơn hàng: Yêu cầu ${claimedTotalPrice.toLocaleString('vi-VN')} đ nhưng giá tính toán hợp lệ theo chữ ký bảo mật là ${payload.totalPrice.toLocaleString('vi-VN')} đ.`
        };
      }
    }

    return {
      isValid: true,
      verifiedPrice: payload.totalPrice
    };
  }

  /**
   * Backward-compatible alias for verifyQuoteSignature
   */
  static async verifyQuoteToken(
    token: SignedQuoteToken,
    claimedTotalPrice: number,
    workpieceData?: WorkpieceDataInput
  ): Promise<{ isValid: boolean; reason?: string; verifiedPrice?: number }> {
    return QuoteVerifier.verifyQuoteSignature(token, claimedTotalPrice, workpieceData);
  }
}
