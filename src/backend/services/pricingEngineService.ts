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

    const totalPrintHours = Math.max(0.1, input.printHours);
    const machineCost = Math.round((depreciationPerHour + electricityPerHour) * totalPrintHours);

    // 2. Material Costs
    const grams = Math.max(1, input.material.grams);
    const pricePerKg = Math.max(0, input.material.pricePerKg);
    const materialCost = Math.round((grams / 1000) * pricePerKg);

    // 3. Labor Costs
    const postProcessingHours = Math.max(0, input.postProcessingHours || 0);
    const totalLaborHours = totalPrintHours + postProcessingHours;
    const laborCost = Math.round(totalLaborHours * laborRate);

    // 4. Accessories & Hardware Costs (if enabled)
    let accessoriesCost = 0;
    if (settings.enableAccessoriesPricing && input.accessories && input.accessories.length > 0) {
      accessoriesCost = input.accessories.reduce((acc, item) => {
        const packQty = Math.max(1, item.packQty);
        return acc + Math.round((item.usedQty / packQty) * item.packPrice);
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

