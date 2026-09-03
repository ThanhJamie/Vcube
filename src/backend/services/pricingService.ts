import { calculateDetailedPricing, PricingEngineInput } from '../../utils/pricingEngine';
import { MATERIALS_CATALOG, PRINTER_PROFILES, DEFAULT_INKIRI_FORMULA_CONFIG } from '../../data/mockData';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig } from '../../types';

export class PricingService {
  static calculateQuote(input: PricingEngineInput) {
    return calculateDetailedPricing(input);
  }

  static getMaterials(): MaterialProfile[] {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vcube_materials') : null;
    return saved ? JSON.parse(saved) : MATERIALS_CATALOG;
  }

  static getPrinters(): PrinterProfile[] {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vcube_printers') : null;
    return saved ? JSON.parse(saved) : PRINTER_PROFILES;
  }

  static getFormulaConfig(): InkiriCostFormulaConfig {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vcube_pricing_config') : null;
    return saved ? JSON.parse(saved) : DEFAULT_INKIRI_FORMULA_CONFIG;
  }
}
