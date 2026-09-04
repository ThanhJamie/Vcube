import { 
  PricingGlobalSettings, 
  WorkshopMachine, 
  WorkshopMaterial, 
  WorkshopAccessory,
  InkiriCalculationInput,
  InkiriCalculationResult
} from '../../types';
import { QuoteVerifier, SignedQuoteToken } from './quoteVerifier';

export const DEFAULT_PRICING_GLOBAL_SETTINGS: PricingGlobalSettings = {
  id: 'default',
  electricityRateVndKwh: 2850,
  defaultLaborRateVndHour: 65000,
  defaultScrapRatePercent: 5,
  profitMode: 'Markup',
  defaultProfitPercent: 35,
  marketplaceFeePercent: 8,
  marketplaceFixedFeeVnd: 5000,
  overheadMonthlyCost: 15000000,
  avgProductsSoldPerMonth: 300,
  enableAccessoriesPricing: true,
  enableMarketplaceFeeMode: false,
  enableAdvancedOverhead: true,
  version: 1,
  updatedBy: 'system'
};

export class PricingEngineService {
  /**
   * Evaluates the full Inkiri 3D-Calc-Cost formula according to section 0:
   * 1. Machine Cost = (Depreciation/hr + Power/hr) * Print Time
   * 2. Material Cost = sum(Grams / 1000 * Price/kg)
   * 3. Labor Cost = (Print Time + Post-processing Time) * Labor Rate/hr
   * 4. Accessories Cost = sum(Used / Pack Qty * Pack Price)
   * 5. Overhead Allocation = Monthly Fixed Overhead / Monthly Unit Sales
   * 6. Raw Cost = Machine + Material + Labor + Accessories + Custom + Overhead
   * 7. Final Cost = Raw Cost * (1 + Scrap Reserve %)
   * 8. Selling Price = Markup (Final Cost * (1 + Margin%)) OR Margin (Final Cost / (1 - Margin%))
   * 9. Marketplace Fee = (Selling Price + Fixed Fee) / (1 - Fee%)
   */
  static calculateInkiriCost(input: InkiriCalculationInput): InkiriCalculationResult {
    const settings: PricingGlobalSettings = {
      ...DEFAULT_PRICING_GLOBAL_SETTINGS,
      ...(input.globalSettings || {})
    };

    const electricityRate = settings.electricityRateVndKwh;
    const laborRate = settings.defaultLaborRateVndHour;
    const scrapRate = settings.defaultScrapRatePercent / 100;
    const profitPercent = settings.defaultProfitPercent / 100;
    const profitMode = settings.profitMode;

    // 1. Machine Costs
    const lifetimeHours = Math.max(1, input.machine.lifetimeHours || 8000);
    const purchasePrice = Math.max(0, input.machine.purchasePrice || 0);
    const depreciationPerHour = Math.round(purchasePrice / lifetimeHours);

    const avgPowerKW = Math.max(0.01, input.machine.avgPowerKW || 0.18);
    const electricityPerHour = Math.round(avgPowerKW * electricityRate);
    const maintenancePerHour = Math.max(0, input.machine.maintenanceCostPerHour || 0);

    const totalPrintHours = Math.max(0.1, input.printHours);
    const machineCost = Math.round((depreciationPerHour + electricityPerHour + maintenancePerHour) * totalPrintHours);

    // 2. Material Costs (supports single material or multi-material sum)
    let materialCost = 0;
    if (input.materials && input.materials.length > 0) {
      materialCost = input.materials.reduce((sum, item) => {
        const g = Math.max(0, item.grams || 0);
        const price = Math.max(0, item.pricePerKg || 0);
        return sum + Math.round((g / 1000) * price);
      }, 0);
    } else if (input.material) {
      const grams = Math.max(0, input.material.grams || 0);
      const pricePerKg = Math.max(0, input.material.pricePerKg || 0);
      materialCost = Math.round((grams / 1000) * pricePerKg);
    }

    // 3. Labor Costs
    let totalLaborHours: number;
    if (input.laborHours !== undefined) {
      totalLaborHours = Math.max(0, input.laborHours);
    } else {
      const setupHours = Math.max(0, input.setupHours || 0);
      const postProcessingHours = Math.max(0, input.postProcessingHours || 0);
      totalLaborHours = totalPrintHours + postProcessingHours + setupHours;
    }
    const laborCost = Math.round(totalLaborHours * laborRate);

    // 4. Accessories & Hardware Costs (if enabled)
    let accessoriesCost = 0;
    if (settings.enableAccessoriesPricing && input.accessories && input.accessories.length > 0) {
      accessoriesCost = input.accessories.reduce((acc, item) => {
        const packQty = Math.max(1, item.packQty || 1);
        const usedQty = Math.max(0, item.usedQty || 0);
        const packPrice = Math.max(0, item.packPrice || 0);
        return acc + Math.round((usedQty / packQty) * packPrice);
      }, 0);
    }

    // 5. Overhead Allocation (if advanced overhead enabled)
    let allocatedOverhead = 0;
    if (settings.enableAdvancedOverhead) {
      const avgSales = Math.max(1, settings.avgProductsSoldPerMonth);
      allocatedOverhead = Math.round(settings.overheadMonthlyCost / avgSales);
    }

    // 6. Raw Base Cost
    const customCosts = input.customCosts || 0;
    const rawBaseCost = machineCost + materialCost + laborCost + accessoriesCost + allocatedOverhead + customCosts;

    // 7. Final Cost with Scrap Reserve
    const scrapReserveCost = Math.round(rawBaseCost * scrapRate);
    const finalCost = rawBaseCost + scrapReserveCost;

    // 8. Selling Price calculation: Markup vs Margin
    let sellingPricePreFee = 0;
    if (profitMode === 'Markup') {
      sellingPricePreFee = Math.round(finalCost * (1 + profitPercent));
    } else {
      // Margin: selling price = cost / (1 - margin%)
      const marginDivisor = Math.max(0.01, 1 - profitPercent);
      sellingPricePreFee = Math.round(finalCost / marginDivisor);
    }

    // 9. Marketplace Fee (if enabled)
    let marketplaceFeeAmount = 0;
    let finalSellingPrice = sellingPricePreFee;

    if (settings.enableMarketplaceFeeMode) {
      const feePercent = settings.marketplaceFeePercent / 100;
      const fixedFee = settings.marketplaceFixedFeeVnd;
      const feeDivisor = Math.max(0.01, 1 - feePercent);
      finalSellingPrice = Math.round((sellingPricePreFee + fixedFee) / feeDivisor);
      marketplaceFeeAmount = finalSellingPrice - sellingPricePreFee;
    }

    return {
      depreciationPerHour,
      electricityPerHour,
      machineCost,
      materialCost,
      laborCost,
      accessoriesCost,
      allocatedOverhead,
      rawBaseCost,
      scrapReserveCost,
      finalCost,
      sellingPricePreFee,
      marketplaceFeeAmount,
      finalSellingPrice,
      profitMode,
      profitPercent: settings.defaultProfitPercent
    };
  }

  /**
   * Calculates Inkiri cost and signs a cryptographically secure HMAC SHA-256 quote token
   */
  static async calculateAndSignQuote(params: {
    input: InkiriCalculationInput;
    workpieceMeta: {
      volumeCm3: number;
      weightGrams: number;
      materialId: string;
      printerId: string;
      dimensions?: { x: number; y: number; z: number };
      quantity?: number;
      infillPercent?: number;
      layerHeightMm?: number;
    };
  }): Promise<{
    calculation: InkiriCalculationResult;
    dualQuote: ReturnType<typeof PricingEngineService.generateDualQuote>;
    signedToken: SignedQuoteToken;
  }> {
    const calculation = PricingEngineService.calculateInkiriCost(params.input);
    const dualQuote = PricingEngineService.generateDualQuote(calculation);

    const qty = Math.max(1, params.workpieceMeta.quantity || 1);
    const unitPrice = calculation.finalSellingPrice;
    const totalPrice = unitPrice * qty;

    const signedToken = await QuoteVerifier.createSignedQuoteFromInkiri({
      unitPrice,
      totalPrice,
      quantity: qty,
      volumeCm3: params.workpieceMeta.volumeCm3,
      weightGrams: params.workpieceMeta.weightGrams,
      materialId: params.workpieceMeta.materialId,
      printerId: params.workpieceMeta.printerId,
      dimensions: params.workpieceMeta.dimensions,
      infillPercent: params.workpieceMeta.infillPercent,
      layerHeightMm: params.workpieceMeta.layerHeightMm
    });

    return {
      calculation,
      dualQuote,
      signedToken
    };
  }

  /**
   * Generates a Dual Quote:
   * - internalQuote: Full 8-part BOM breakdown for workshops/admins
   * - customerQuote: Clean, transparent consumer breakdown hiding workshop secrets
   */
  static generateDualQuote(result: InkiriCalculationResult) {
    return {
      customerQuote: {
        unitPrice: result.finalSellingPrice,
        summary: [
          { label: 'Chế tác 3D công nghiệp & Máy in', cost: result.machineCost + result.laborCost },
          { label: 'Nguyên vật liệu & Phôi sợi', cost: result.materialCost },
          { label: 'Kiểm định chất lượng QC & Đóng gói', cost: result.accessoriesCost + result.scrapReserveCost }
        ],
        estimatedDeliveryHours: 24
      },
      internalQuote: {
        rawCost: result.rawBaseCost,
        finalCost: result.finalCost,
        breakdown: {
          depreciationPerHour: result.depreciationPerHour,
          electricityPerHour: result.electricityPerHour,
          machineCost: result.machineCost,
          materialCost: result.materialCost,
          laborCost: result.laborCost,
          accessoriesCost: result.accessoriesCost,
          overhead: result.allocatedOverhead,
          scrapReserve: result.scrapReserveCost
        },
        marginMode: result.profitMode,
        marginPercent: result.profitPercent,
        sellingPrice: result.finalSellingPrice
      }
    };
  }
}

