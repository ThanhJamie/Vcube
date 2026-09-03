import { PRODUCTS, DIGITAL_ASSETS, DEFAULT_ACCESSORIES } from '../../data/mockData';
import { Product, DigitalAsset, AccessoryItem } from '../../types';

export class CatalogService {
  static getProducts(): Product[] {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vcube_products') : null;
    return saved ? JSON.parse(saved) : PRODUCTS;
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  static getDigitalAssets(): DigitalAsset[] {
    return DIGITAL_ASSETS;
  }

  static getAccessories(): AccessoryItem[] {
    return DEFAULT_ACCESSORIES;
  }
}
