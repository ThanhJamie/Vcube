// Storage fallback (localStorage + in-memory) — moved verbatim from workshopService.ts (Phase 4c).


// ==============================================================================
// STORAGE KEYS FOR LOCALSTORAGE FALLBACK
// ==============================================================================
export const STORAGE_KEYS = {
  WORKSHOP_PROFILES: 'vcube_db_workshop_profiles',
  WORKSHOP_MACHINES: 'vcube_db_workshop_machines',
  WORKSHOP_MATERIALS: 'vcube_db_workshop_materials',
  INVENTORY_LOGS: 'vcube_db_material_inventory_logs',
  DESIGNER_PROFILES: 'vcube_db_designer_profiles',
  CUSTOMER_PROFILES: 'vcube_db_customer_profiles',
  PRICING_SETTINGS: 'vcube_db_pricing_global_settings',
  WORKSHOP_ACCESSORIES: 'vcube_db_workshop_accessories',
};

// In-memory cache for Node.js / SSR runtime & LocalStorage synchronization
const inMemoryCache: Record<string, any> = {};

// Safe LocalStorage helpers with in-memory fallback
export function readFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item);
    }
  } catch (err) {
    console.warn(`[WorkshopService] Failed to read ${key} from localStorage:`, err);
  }
  if (inMemoryCache[key] !== undefined) {
    return inMemoryCache[key] as T;
  }
  return fallback;
}

export function writeToStorage<T>(key: string, value: T): void {
  inMemoryCache[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn(`[WorkshopService] Failed to write ${key} to localStorage:`, err);
  }
}
