import { supabase } from '../../supabase/client';
import type { PrinterFleetRef, PrinterFleetCatalogResult, MaterialCatalogRef, MaterialCatalogResult } from './types';



// --------------------------------------------------------------------------
// W1b.5 — DANH MỤC THAM CHIẾU CỦA NỀN TẢNG (`printer_fleet`, `materials`)
// Chỉ dùng để GỢI Ý thông số khi xưởng khai báo máy/vật liệu của mình. KHÔNG hiển thị
// như tài sản của xưởng và KHÔNG dùng để tính bất kỳ số liệu tổng nào.
// --------------------------------------------------------------------------
export async function getPrinterFleetCatalog(): Promise<PrinterFleetCatalogResult> {
  const { data, error } = await supabase
    .from('printer_fleet')
    .select('id,name,brand,model,technology,bed_dimensions,power_kw,status')
    .order('name', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as unknown as PrinterFleetRef[] };
}

export async function getMaterialsCatalog(): Promise<MaterialCatalogResult> {
  const { data, error } = await supabase
    .from('materials')
    .select('id,name,brand,type,density,cost_per_kg')
    .order('name', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as unknown as MaterialCatalogRef[] };
}