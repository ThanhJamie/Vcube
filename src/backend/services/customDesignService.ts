import { supabase, isSupabaseConfigured } from '../supabase/client';
import { rowToCustomDesignRequest } from '../supabase/mappers';
import { ok, fail, type WriteResult } from '../lib/result';
import type { CustomDesignRequest, CustomDesignMessage } from '../../types';

/**
 * DB là nguồn duy nhất cho yêu cầu thiết kế CAD.
 * KHÔNG cache localStorage: yêu cầu gắn tài khoản (brief/PII) — cache trên máy sẽ lộ
 * sang designer khác đăng nhập cùng trình duyệt và vi phạm quy tắc "một nguồn dữ liệu".
 */

/** Kết quả bảng yêu cầu của designer: danh sách + id thuộc chợ mở (chưa nhận). */
export interface DesignerRequestBoard {
  requests: CustomDesignRequest[];
  openRequestIds: string[];
}

/** Nhãn trung tính cho yêu cầu chợ mở — view không phơi danh tính khách (không bịa tên). */
const OPEN_POOL_LABEL = 'Khách hàng ẩn danh';

/**
 * Tải bảng yêu cầu của designer:
 *   · hàng được gán cho mình / của mình đọc trực tiếp từ bảng (RLS siết theo uid);
 *   · chợ mở (`designer_id is null`) đọc qua view cột-không-nhạy-cảm `open_design_requests` —
 *     RLS bảng gốc nay KHÔNG còn cho designer thấy hàng chưa nhận.
 *
 * DB là nguồn duy nhất — không đọc cache localStorage. Lỗi mạng/RLS trả bảng rỗng
 * (view hiện empty state thật) thay vì hiện dữ liệu cũ trên máy.
 */
async function loadRequestBoard(designerId?: string): Promise<DesignerRequestBoard> {
  if (!isSupabaseConfigured) {
    return { requests: [], openRequestIds: [] };
  }

  try {
    const { data, error } = await supabase
      .from('custom_design_requests')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[customDesignService] Lỗi tải yêu cầu thiết kế CAD:', error);
      return { requests: [], openRequestIds: [] };
    }

    const assigned = (data ?? []).map(rowToCustomDesignRequest);

    let open: CustomDesignRequest[] = [];
    if (designerId) {
      const { data: openRows, error: openError } = await supabase
        .from('open_design_requests')
        .select('id, title, budget, deadline, service_type, status, target_specs, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (openError) {
        console.warn('[customDesignService] Không tải được chợ yêu cầu mở:', openError);
      } else {
        open = (openRows ?? []).map((row) => ({
          ...rowToCustomDesignRequest(row),
          clientName: OPEN_POOL_LABEL,
        }));
      }
    }

    const assignedIds = new Set(assigned.map((r) => r.id));
    const openOnly = open.filter((r) => !assignedIds.has(r.id));

    return {
      requests: [...assigned, ...openOnly],
      openRequestIds: openOnly.map((r) => r.id),
    };
  } catch (err) {
    console.error('[customDesignService] Exception khi tải yêu cầu:', err);
    return { requests: [], openRequestIds: [] };
  }
}

export const customDesignService = {
  /**
   * Tải danh sách yêu cầu thiết kế CAD tùy chỉnh từ Supabase (gồm cả chợ mở nếu có
   * `designerId`). DB là nguồn duy nhất — không đọc cache localStorage.
   */
  async getRequests(designerId?: string): Promise<CustomDesignRequest[]> {
    const board = await loadRequestBoard(designerId);
    return board.requests;
  },

  /**
   * Tải bảng yêu cầu kèm danh sách id thuộc chợ mở để UI biết yêu cầu nào cần "Nhận việc".
   */
  async getRequestBoard(designerId?: string): Promise<DesignerRequestBoard> {
    return loadRequestBoard(designerId);
  },

  /**
   * Nhận một yêu cầu CAD chưa gán cho mình qua RPC nguyên tử `claim_design_request`.
   * Trả `fail` khi yêu cầu đã có người nhận (RPC trả NULL) — KHÔNG báo thành công giả.
   */
  async claimRequest(id: string): Promise<WriteResult> {
    if (!isSupabaseConfigured) {
      return fail('Supabase chưa cấu hình — không thể nhận yêu cầu.');
    }

    try {
      const { data, error } = await supabase.rpc('claim_design_request', { p_id: id });
      if (error) {
        return fail(error.message, 'Nhận yêu cầu thất bại.');
      }
      if (!data) {
        return fail('Yêu cầu đã được người khác nhận.', 'Yêu cầu đã có người nhận.');
      }
      return ok();
    } catch (err) {
      return fail(err, 'Nhận yêu cầu thất bại.');
    }
  },

  /**
   * Tạo yêu cầu thiết kế CAD tùy chỉnh mới (từ Section Custom Idea hoặc khách hàng).
   * DB là nguồn duy nhất: chỉ ghi Supabase, KHÔNG cache localStorage và KHÔNG có fallback
   * offline giả. Chưa cấu hình hoặc lỗi máy chủ đều trả `fail()` — không báo thành công giả.
   */
  async createRequest(
    request: Partial<CustomDesignRequest> & {
      customerId?: string;
      clientEmail?: string;
      clientPhone?: string;
      clientCompany?: string;
      description?: string;
    }
  ): Promise<WriteResult<CustomDesignRequest>> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const clientName = request.clientName || 'Khách hàng';
    const clientInitials =
      request.clientInitials ||
      (clientName.trim() ? clientName.trim().slice(0, 2).toUpperCase() : 'KH');
    const title = request.title || 'Yêu cầu thiết kế CAD 3D';

    const messageText =
      request.previewMessage ||
      request.description ||
      (request.messages && request.messages[0]?.text) ||
      'Yêu cầu tư vấn thiết kế 3D theo ý tưởng.';

    const initialMessage: CustomDesignMessage =
      request.messages && request.messages.length > 0
        ? request.messages[0]
        : {
            id: `msg-${Date.now()}`,
            sender: 'client',
            senderName: clientName,
            senderInitials: clientInitials,
            time: timeStr,
            text: messageText,
          };

    const messages =
      request.messages && request.messages.length > 0 ? request.messages : [initialMessage];

    if (!isSupabaseConfigured) {
      return fail('Supabase chưa cấu hình — không thể lưu yêu cầu thiết kế.');
    }

    // Lấy customerId từ session nếu không truyền
    let customerId = request.customerId;
    if (!customerId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        customerId = sessionData?.session?.user?.id;
      } catch {
        // ignore: không lấy được session (guest) — tiếp tục không có customerId
      }
    }

    try {
      const dbRow: Record<string, unknown> = {
        customer_id: customerId || null,
        title,
        client_name: clientName,
        client_initials: clientInitials,
        status: 'pending',
        budget: request.budget || '—',
        deadline: request.deadline || '—',
        service_type: request.serviceType || 'custom_cad',
        target_specs: {
          material: request.targetSpecs?.material || '',
          infill: request.targetSpecs?.infill || '',
          nozzle: request.targetSpecs?.nozzle || '',
          phone: request.clientPhone || '',
          email: request.clientEmail || '',
          company: request.clientCompany || '',
        },
        reference_files: request.referenceFiles || [],
        messages,
        unread: true,
      };

      const { data, error } = await supabase
        .from('custom_design_requests')
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        return fail(error.message, 'Không lưu được yêu cầu thiết kế lên máy chủ.');
      }
      if (!data) {
        return fail('Máy chủ không trả về yêu cầu thiết kế vừa tạo.', 'Không lưu được yêu cầu thiết kế lên máy chủ.');
      }

      return ok(rowToCustomDesignRequest(data));
    } catch (err) {
      return fail(err, 'Không lưu được yêu cầu thiết kế lên máy chủ.');
    }
  },

  /**
   * Cập nhật trạng thái của yêu cầu thiết kế CAD.
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'quoted' | 'in_progress' | 'completed' | 'declined'
  ): Promise<WriteResult> {
    if (!isSupabaseConfigured) {
      return fail('Supabase chưa cấu hình — không thể cập nhật trạng thái yêu cầu.');
    }

    try {
      const { error } = await supabase
        .from('custom_design_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return fail(error.message, 'Cập nhật trạng thái thất bại.');
      }
      return ok();
    } catch (err) {
      return fail(err, 'Cập nhật trạng thái thất bại.');
    }
  },

  /**
   * Thêm một tin nhắn vào luồng trao đổi kỹ thuật của yêu cầu CAD.
   */
  async appendMessage(id: string, message: CustomDesignMessage): Promise<WriteResult> {
    if (!isSupabaseConfigured) {
      return fail('Supabase chưa cấu hình — không thể gửi tin nhắn.');
    }

    try {
      const { data: current, error: fetchErr } = await supabase
        .from('custom_design_requests')
        .select('messages')
        .eq('id', id)
        .single();

      if (fetchErr) {
        return fail(fetchErr.message, 'Không tìm thấy yêu cầu.');
      }

      const updatedMessages = [...(current?.messages || []), message];
      const { error } = await supabase
        .from('custom_design_requests')
        .update({
          messages: updatedMessages,
          unread: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return fail(error.message, 'Gửi tin nhắn thất bại.');
      }
      return ok();
    } catch (err) {
      return fail(err, 'Gửi tin nhắn thất bại.');
    }
  },

  /**
   * Phát hành báo giá kỹ thuật CAD kèm cập nhật trạng thái 'quoted'.
   */
  async sendQuote(id: string, quoteMessage: CustomDesignMessage): Promise<WriteResult> {
    if (!isSupabaseConfigured) {
      return fail('Supabase chưa cấu hình — không thể phát hành báo giá.');
    }

    try {
      const { data: current, error: fetchErr } = await supabase
        .from('custom_design_requests')
        .select('messages')
        .eq('id', id)
        .single();

      if (fetchErr) {
        return fail(fetchErr.message, 'Không tìm thấy yêu cầu.');
      }

      const updatedMessages = [...(current?.messages || []), quoteMessage];
      const { error } = await supabase
        .from('custom_design_requests')
        .update({
          status: 'quoted',
          messages: updatedMessages,
          unread: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return fail(error.message, 'Gửi báo giá thất bại.');
      }
      return ok();
    } catch (err) {
      return fail(err, 'Gửi báo giá thất bại.');
    }
  },

  /**
   * Đăng ký lắng nghe thay đổi thời gian thực (Supabase Realtime) trên bảng `custom_design_requests`.
   *
   * ⚠️ SEC-02 / T21: chợ mở đọc qua VIEW `open_design_requests` — view KHÔNG phải nguồn
   * `postgres_changes`. Sau khi gỡ policy `designer_id is null`, kênh này chỉ còn phát
   * các hàng đã gán cho chính designer (RLS realtime lọc theo uid). Muốn thấy yêu cầu
   * mới vào chợ cần polling ngắn hoặc `realtime.send` — thuộc task riêng.
   */
  subscribe(callback: (payload: any) => void): () => void {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    // Tên kênh PHẢI duy nhất cho mỗi subscription: Supabase Realtime dùng chung topic theo
    // tên; nếu 2 instance (StrictMode / keep-alive tab) subscribe cùng tên, lần `.on()` thứ hai
    // sẽ throw "cannot add postgres_changes callbacks ... after subscribe()".
    const channelName = `public:custom_design_requests:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_design_requests' },
        callback
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
