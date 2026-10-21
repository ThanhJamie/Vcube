import { supabase } from '../../supabase/client';
import { fail } from '../../lib/result';
import { mapMyQueueOrder } from './shared';
import type { MyQueueResult, MyOrderProgressInput, MyOrderProgressResult } from './types';
import { deductMaterialsForCompletedOrder } from './inventory';



// --------------------------------------------------------------------------
// W1b.4 — HÀNG ĐỢI VIỆC: đơn được giao CHO XƯỞNG NÀY (`orders.assigned_workshop_id`)
// --------------------------------------------------------------------------
export async function getMyQueueOrders(partnerId: string | null): Promise<MyQueueResult> {
  if (!partnerId) return { data: [] };
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id,order_number,date,estimated_delivery,status,status_stage_index,layer_progress,items,assigned_printer_id'
    )
    .eq('assigned_workshop_id', partnerId)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapMyQueueOrder) };
}

/**
 * Cập nhật tiến độ một đơn CỦA XƯỞNG NÀY.
 *
 * Chỉ ghi đúng các cột trong phạm vi: `status_stage_index`, `status`, `layer_progress`.
 * Lọc thêm `assigned_workshop_id = partnerId` để một lệnh gọi sai id cũng không chạm
 * đơn của xưởng khác. `.select('id')` để phát hiện trường hợp RLS chặn âm thầm
 * (PostgREST trả 200 + 0 hàng) — khi đó KHÔNG được báo thành công.
 */
export async function updateMyOrderProgress(input: MyOrderProgressInput): Promise<MyOrderProgressResult> {
  if (!input.partnerId) {
    return fail('Tài khoản chưa gắn mã đối tác xưởng — không thể cập nhật đơn.');
  }
  if (!Number.isInteger(input.stageIndex) || input.stageIndex < 0 || input.stageIndex > 7) {
    return fail('Nấc tiến độ không hợp lệ (chỉ nhận 0–7).');
  }

  const payload: Record<string, unknown> = {
    status_stage_index: input.stageIndex,
    status: input.status,
  };
  if (typeof input.layerProgress === 'number' && Number.isFinite(input.layerProgress)) {
    const clamped = Math.max(0, Math.min(100, Math.round(input.layerProgress)));
    payload.layer_progress = clamped;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', input.orderId)
      .eq('assigned_workshop_id', input.partnerId)
      .select('id');

    if (error) return fail(error.message, 'Cập nhật tiến độ đơn thất bại.');
    const updatedRows = data ? data.length : 0;
    if (updatedRows === 0) {
      return fail(
        'Máy chủ không cập nhật hàng nào (đơn không thuộc xưởng này hoặc tài khoản chưa được cấp quyền sửa đơn). Chưa có thay đổi nào được lưu.'
      );
    }
    // Đơn HOÀN THÀNH ⇒ tự động trừ kho vật liệu (chỉ với item khai `weightGrams`).
    // Best-effort: lỗi trừ kho KHÔNG làm hỏng việc cập nhật trạng thái.
    let stockDeduction: { deducted: number; skipped: number } | undefined;
    if (input.status === 'completed') {
      stockDeduction = await deductMaterialsForCompletedOrder(
        input.orderId,
        input.partnerId as string,
      );
    }
    return { success: true, updatedRows, stockDeduction };
  } catch (e: any) {
    return fail(e, 'Lỗi không xác định khi cập nhật tiến độ đơn.');
  }
}