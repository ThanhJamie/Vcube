import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnalysisFile, CartItem } from '../../types';
import { usePricingEngineStore } from '../../../stores/usePricingEngineStore';
import { PricingEngineService } from '../../../backend/services/pricingEngineService';
import { SignedQuoteToken, QuoteVerifier } from '../../../backend/services/quoteVerifier';

export interface InstantQuoteWidgetProps {
  file?: AnalysisFile;
  volumeCm3?: number;
  weightGrams?: number;
  dimensions?: { x: number; y: number; z: number };
  selectedPrinterId?: string;
  selectedMaterialId?: string;
  infillPercent?: number;
  layerHeightMm?: number;
  quantity?: number;
  printHoursEstimated?: number;
  onAddToCart?: (item: CartItem, token?: SignedQuoteToken) => void;
  onDirectOrder?: (item: CartItem, token?: SignedQuoteToken) => void;
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

// Fallback HMAC Secret if environment variable not present
const QUOTE_SIGNING_SECRET =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_QUOTE_SECRET) ||
  'vcube_inkiri_hmac_secret_2026_industrial_fab';

/**
 * Web-compatible HMAC-SHA256 signature generator
 */
async function generateHmacSha256(data: string, secret: string): Promise<string> {
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
  let hash = 0;
  const combined = data + secret;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return 'hmac_fb_' + Math.abs(hash).toString(16);
}

export const InstantQuoteWidget: React.FC<InstantQuoteWidgetProps> = ({
  file,
  volumeCm3: externalVolumeCm3,
  weightGrams: externalWeightGrams,
  dimensions: externalDimensions,
  selectedPrinterId: propPrinterId,
  selectedMaterialId: propMaterialId,
  infillPercent = 25,
  layerHeightMm = 0.2,
  quantity = 1,
  printHoursEstimated: propPrintHours,
  onAddToCart,
  onDirectOrder,
  onShowToast,
  compact = false
}) => {
  const { settings, machinePresets, materialPresets, accessories } = usePricingEngineStore();

  // Selected printer & material from store
  const [activePrinterId, setActivePrinterId] = useState<string>(
    propPrinterId || machinePresets[0]?.id || 'mach-bambu-x1c'
  );
  const [activeMaterialId, setActiveMaterialId] = useState<string>(
    propMaterialId || materialPresets[0]?.id || 'mat-pla-tough'
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isTokenDetailsOpen, setIsTokenDetailsOpen] = useState<boolean>(false);

  // Sync props if changed externally
  useEffect(() => {
    if (propPrinterId) setActivePrinterId(propPrinterId);
  }, [propPrinterId]);

  useEffect(() => {
    if (propMaterialId) setActiveMaterialId(propMaterialId);
  }, [propMaterialId]);

  const selectedMachine =
    machinePresets.find((m) => m.id === activePrinterId) || machinePresets[0];
  const selectedMaterial =
    materialPresets.find((m) => m.id === activeMaterialId) || materialPresets[0];

  // Derived workpiece geometric parameters
  const dimensions = externalDimensions || file?.dimensions || { x: 50, y: 50, z: 35 };
  const rawVolume = externalVolumeCm3 !== undefined ? externalVolumeCm3 : (file?.volume || 45000) / 1000;
  const volumeCm3 = Math.max(0.1, Number(rawVolume.toFixed(2)));
  const density = selectedMaterial?.density || 1.24;
  const calculatedWeight = externalWeightGrams || Math.round(volumeCm3 * density * (0.3 + (infillPercent / 100) * 0.7));
  const weightGrams = Math.max(1, calculatedWeight);

  // Estimated print hours (approx based on volume, printer speed, layer height)
  const printHours = propPrintHours || Math.max(0.4, Number(((volumeCm3 * 1.8) / (selectedMachine?.machineType === 'SLA' ? 25 : 18) * (0.2 / layerHeightMm)).toFixed(1)));

  // Realtime Signed Token State with 15-Minute TTL (900 seconds)
  const [quoteToken, setQuoteToken] = useState<SignedQuoteToken | null>(null);
  const [remainingTtlSeconds, setRemainingTtlSeconds] = useState<number>(900); // 15 mins

  // Core Inkiri Calculation Result
  const calculationResult = useMemo(() => {
    if (!selectedMachine || !selectedMaterial) return null;

    const activeAccessories = accessories
      .filter((a) => a.isActive)
      .map((a) => ({
        usedQty: a.defaultUsedQty || 1,
        packQty: a.qtyPerPack,
        packPrice: a.pricePerPack
      }));

    return PricingEngineService.calculateInkiriCost({
      printHours,
      postProcessingHours: 0.3,
      machine: {
        avgPowerKW: selectedMachine.avgPowerKW,
        purchasePrice: selectedMachine.purchasePrice,
        lifetimeHours: selectedMachine.lifetimeHours
      },
      material: {
        grams: weightGrams,
        pricePerKg: selectedMaterial.pricePerKg
      },
      accessories: activeAccessories,
      globalSettings: settings
    });
  }, [
    selectedMachine,
    selectedMaterial,
    printHours,
    weightGrams,
    accessories,
    settings
  ]);

  // Volume discount tier
  const volumeDiscountPercent = useMemo(() => {
    if (quantity >= 50) return 25;
    if (quantity >= 20) return 15;
    if (quantity >= 10) return 10;
    if (quantity >= 5) return 5;
    return 0;
  }, [quantity]);

  const baseUnitPrice = calculationResult ? calculationResult.finalSellingPrice : 150000;
  const unitPriceAfterDiscount = Math.round(baseUnitPrice * (1 - volumeDiscountPercent / 100));
  const totalPrice = unitPriceAfterDiscount * quantity;

  // Generate or Regenerate Signed Quote Token (15-Minute Expiry)
  const generateSignedQuote = useCallback(async () => {
    if (!calculationResult) return;
    setIsVerifying(true);

    const now = Date.now();
    const ttlMs = 15 * 60 * 1000; // 15 minutes TTL
    const expiresAt = now + ttlMs;
    const quoteId = `QUO-${now}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const nonce = Math.random().toString(36).substring(2, 10);
    const workpieceHash = QuoteVerifier.computeWorkpieceHash(volumeCm3, activeMaterialId, activePrinterId);

    const payload = {
      quoteId,
      volumeCm3,
      weightGrams,
      dimensions,
      materialId: activeMaterialId,
      printerId: activePrinterId,
      workpieceHash,
      infillPercent,
      layerHeightMm,
      quantity,
      unitPrice: unitPriceAfterDiscount,
      totalPrice,
      issuedAt: now,
      expiresAt,
      nonce
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

    const signature = await generateHmacSha256(signatureString, QUOTE_SIGNING_SECRET);

    const token: SignedQuoteToken = {
      payload,
      signature
    };

    setQuoteToken(token);
    setRemainingTtlSeconds(900);
    setIsVerifying(false);
  }, [
    calculationResult,
    volumeCm3,
    weightGrams,
    dimensions,
    activeMaterialId,
    activePrinterId,
    infillPercent,
    layerHeightMm,
    quantity,
    unitPriceAfterDiscount,
    totalPrice
  ]);

  // Initial token generation and regeneration on key parameter changes
  useEffect(() => {
    generateSignedQuote();
  }, [
    activePrinterId,
    activeMaterialId,
    volumeCm3,
    weightGrams,
    quantity,
    infillPercent,
    layerHeightMm
  ]);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (remainingTtlSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingTtlSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quoteToken]);

  // Format MM:SS
  const formatTtl = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = remainingTtlSeconds <= 0;

  // Build Cart Item
  const buildCartItem = (): CartItem => {
    const fileName = file?.fileName || 'Chi_tiet_in_3D.stl';
    return {
      id: quoteToken?.payload.quoteId || `custom-quote-${Date.now()}`,
      productId: file?.id || 'custom-3d-model',
      type: 'physical',
      name: `Gia công in 3D: ${fileName}`,
      designer: 'VCUBE Engineering Fab',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      price: unitPriceAfterDiscount,
      quantity,
      material: `${selectedMaterial?.materialName || 'PLA'} (${selectedMachine?.machineName || 'Bambu Lab'})`,
      color: selectedMaterial?.colorName || 'Mặc định',
      colorHex: selectedMaterial?.colorHex || '#00687a',
      dimensions: `${dimensions.x.toFixed(1)} × ${dimensions.y.toFixed(1)} × ${dimensions.z.toFixed(1)} mm`,
      resolution: `${layerHeightMm}mm Layer • Infill ${infillPercent}% • Khóa giá HMAC 15m`
    };
  };

  const handleAddToCartClick = () => {
    if (isExpired) {
      alert('Báo giá đã hết hạn 15 phút. Vui lòng bấm "Làm mới giá" để tạo chữ ký an toàn mới nhất!');
      return;
    }
    const item = buildCartItem();
    if (onAddToCart) {
      onAddToCart(item, quoteToken || undefined);
    }
    if (onShowToast) {
      onShowToast(`Đã thêm vào giỏ hàng với chữ ký bảo mật HMAC: ${(quoteToken?.payload.quoteId || '').slice(-8)}`);
    }
  };

  const handleDirectOrderClick = () => {
    if (isExpired) {
      alert('Báo giá đã hết hạn 15 phút. Vui lòng bấm "Làm mới giá" để tạo chữ ký an toàn mới nhất!');
      return;
    }
    const item = buildCartItem();
    if (onDirectOrder) {
      onDirectOrder(item, quoteToken || undefined);
    }
    if (onShowToast) {
      onShowToast(`Đang chuyển hướng đặt in ngay đơn hàng: ${item.name}`);
    }
  };

  return (
    <div className={`bg-white border border-[#CBD5E1] rounded-2xl shadow-sm font-sans transition-all ${
      compact ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'
    }`}>
      {/* Header with Security Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#00687A] text-white text-[9px] font-mono font-bold rounded uppercase tracking-wider">
              INSTANT QUOTE // ISO/ASTM 52900
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              HMAC SHA-256 SIGNED
            </span>
          </div>
          <h3 className="font-bold text-base text-[#091426] mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#00687A] text-lg">verified_user</span>
            Báo Giá Gia Công Tức Thì
          </h3>
        </div>

        {/* 15-Minute TTL Countdown Pill */}
        <div className="text-right shrink-0">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
            isExpired
              ? 'bg-red-50 text-red-700 border-red-200'
              : remainingTtlSeconds < 120
              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{isExpired ? 'Hết hạn (00:00)' : formatTtl(remainingTtlSeconds)}</span>
          </div>
          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
            {isExpired ? 'Cần làm mới token' : 'Hiệu lực bảo lưu giá'}
          </span>
        </div>
      </div>

      {/* Model & Spec Badges */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Thể tích</span>
          <strong className="text-slate-800">{volumeCm3} cm³</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Khối lượng</span>
          <strong className="text-slate-800">~{weightGrams}g</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Thời gian in</span>
          <strong className="text-slate-800">~{printHours}h</strong>
        </div>
      </div>

      {/* Printer & Material Selection Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">
            Máy In Gia Công
          </label>
          <select
            value={activePrinterId}
            onChange={(e) => setActivePrinterId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-800 text-xs"
          >
            {machinePresets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machineName} ({m.machineType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">
            Vật Liệu & Màu
          </label>
          <select
            value={activeMaterialId}
            onChange={(e) => setActiveMaterialId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-800 text-xs"
          >
            {materialPresets.map((mat) => (
              <option key={mat.id} value={mat.id}>
                {mat.materialName} ({mat.colorName || mat.materialType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transparent Cost Breakdown */}
      {calculationResult && (
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#00687A]">print</span>
              Chế tác 3D & Máy in ({printHours}h):
            </span>
            <span className="text-slate-800">
              {(calculationResult.machineCost + calculationResult.laborCost).toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#00687A]">layers</span>
              Vật liệu phôi sợi ({weightGrams}g):
            </span>
            <span className="text-slate-800">
              {calculationResult.materialCost.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#00687A]">inventory_2</span>
              Kiểm định QC & Đóng gói:
            </span>
            <span className="text-slate-800">
              {(calculationResult.accessoriesCost + calculationResult.scrapReserveCost).toLocaleString('vi-VN')} đ
            </span>
          </div>

          {volumeDiscountPercent > 0 && (
            <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
              <span>Chiết khấu số lượng (-{volumeDiscountPercent}%):</span>
              <span>-{(baseUnitPrice - unitPriceAfterDiscount).toLocaleString('vi-VN')} đ / cái</span>
            </div>
          )}
        </div>
      )}

      {/* Total Price Section */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 font-mono block">
            Đơn giá: {unitPriceAfterDiscount.toLocaleString('vi-VN')} đ × {quantity} chiếc
          </span>
          <div className="text-2xl font-bold font-mono text-[#091426]">
            {totalPrice.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">VND</span>
          </div>
        </div>

        {/* Refresh button if expired */}
        {isExpired ? (
          <button
            type="button"
            onClick={generateSignedQuote}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm Mới Giá
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsTokenDetailsOpen(!isTokenDetailsOpen)}
            className="text-[11px] text-[#00687A] hover:underline font-mono flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">token</span>
            {isTokenDetailsOpen ? 'Ẩn mã token' : 'Xem token HMAC'}
          </button>
        )}
      </div>

      {/* Security Token Inspector Drawer */}
      {isTokenDetailsOpen && quoteToken && (
        <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono space-y-1.5 border border-slate-700 animate-in fade-in">
          <div className="flex justify-between text-[#57DFFE] font-bold">
            <span>QUOTE TOKEN ID:</span>
            <span>{quoteToken.payload.quoteId}</span>
          </div>
          <div className="text-slate-400 break-all">
            <span className="text-slate-500">HMAC-SHA256: </span>
            {quoteToken.signature}
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">WORKPIECE HASH: </span>
            {quoteToken.payload.workpieceHash}
          </div>
          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
            <span>TTL: 15 Phút</span>
            <span>Hết hạn: {new Date(quoteToken.payload.expiresAt).toLocaleTimeString('vi-VN')}</span>
          </div>
        </div>
      )}

      {/* Primary Action Buttons: Add to Cart & Direct Order */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleAddToCartClick}
          disabled={isVerifying}
          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#091426] border border-slate-300 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base text-[#00687A]">add_shopping_cart</span>
          Thêm Vào Giỏ
        </button>

        <button
          type="button"
          onClick={handleDirectOrderClick}
          disabled={isVerifying}
          className="px-4 py-2.5 bg-[#00687A] hover:bg-[#005564] text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">rocket_launch</span>
          Đặt In Ngay
        </button>
      </div>

      {/* Guarantee Footer */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
          Cam kết bảo hành 7 ngày
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-blue-600">lock</span>
          Chữ ký mã hóa chống can thiệp
        </span>
      </div>
    </div>
  );
};

export default InstantQuoteWidget;
