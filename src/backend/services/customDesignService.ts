import { supabase, isSupabaseConfigured } from '../supabase/client';
import { rowToCustomDesignRequest } from '../supabase/mappers';
import type { CustomDesignRequest, CustomDesignMessage } from '../../types';

const LOCAL_REQUESTS_KEY = 'vcube_custom_design_requests';

function getLocalRequests(): CustomDesignRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRequest(req: CustomDesignRequest): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalRequests();
    const updated = [req, ...existing.filter((r) => r.id !== req.id)];
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[customDesignService] Không thể lưu vào localStorage:', err);
  }
}

export const customDesignService = {
  /**
   * Tải danh sách yêu cầu thiết kế CAD tùy chỉnh từ Supabase.
   * Nếu có `designerId`, lọc các yêu cầu được gán cho designer này hoặc chưa gán ai.
   * Khi offline/demo, tự động đọc từ local mock store.
   */
  async getRequests(designerId?: string): Promise<CustomDesignRequest[]> {
    const localRequests = getLocalRequests();

    if (!isSupabaseConfigured) {
      return localRequests;
    }

    try {
      let query = supabase
        .from('custom_design_requests')
        .select('*')
        .order('updated_at', { ascending: false });

      if (designerId) {
        query = query.or(`designer_id.eq.${designerId},designer_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[customDesignService] Lỗi tải yêu cầu thiết kế CAD:', error);
        return localRequests;
      }

      const dbRequests = (data ?? []).map(rowToCustomDesignRequest);
      const dbIds = new Set(dbRequests.map((r) => r.id));
      const unsyncedLocals = localRequests.filter((r) => !dbIds.has(r.id));
      return [...unsyncedLocals, ...dbRequests];
    } catch (err) {
      console.error('[customDesignService] Exception khi tải yêu cầu:', err);
      return localRequests;
    }
  },

  /**
   * Tạo yêu cầu thiết kế CAD tùy chỉnh mới (từ Section Custom Idea hoặc khách hàng).
   * Hỗ trợ lưu Supabase khi khả dụng, có fallback lưu local mock store khi offline/demo.
   */
  async createRequest(
    request: Partial<CustomDesignRequest> & {
      customerId?: string;
      clientEmail?: string;
      clientPhone?: string;
      clientCompany?: string;
      description?: string;
    }
  ): Promise<CustomDesignRequest> {
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

    // Lấy customerId từ session nếu không truyền
    let customerId = request.customerId;
    if (!customerId && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        customerId = sessionData?.session?.user?.id;
      } catch {
        // Tiếp tục không có customerId
      }
    }

    const fallbackId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockRequest: CustomDesignRequest = {
      id: request.id || fallbackId,
      clientName,
      clientInitials,
      title,
      previewMessage: messageText,
      time: timeStr,
      status: 'Pending',
      unread: true,
      budget: request.budget || '—',
      deadline: request.deadline || '—',
      serviceType: request.serviceType || 'custom_cad',
      targetSpecs: request.targetSpecs || {
        material: 'PLA/PETG',
        infill: '30%',
        nozzle: '0.4mm',
      },
      referenceFiles: request.referenceFiles || [],
      messages,
    };

    if (isSupabaseConfigured) {
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

        if (!error && data) {
          const created = rowToCustomDesignRequest(data);
          saveLocalRequest(created);
          return created;
        } else if (error) {
          console.warn('[customDesignService] Supabase insert thất bại, chuyển sang local store:', error.message);
        }
      } catch (err) {
        console.warn('[customDesignService] Supabase exception, chuyển sang local store:', err);
      }
    }

    // Fallback: Lưu vào local mock store
    saveLocalRequest(mockRequest);
    return mockRequest;
  },

  /**
   * Cập nhật trạng thái của yêu cầu thiết kế CAD.
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'quoted' | 'in_progress' | 'completed' | 'declined'
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('custom_design_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Cập nhật trạng thái thất bại: ${error.message}`);
    }
  },

  /**
   * Thêm một tin nhắn vào luồng trao đổi kỹ thuật của yêu cầu CAD.
   */
  async appendMessage(id: string, message: CustomDesignMessage): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { data: current, error: fetchErr } = await supabase
      .from('custom_design_requests')
      .select('messages')
      .eq('id', id)
      .single();

    if (fetchErr) {
      throw new Error(`Không tìm thấy yêu cầu: ${fetchErr.message}`);
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
      throw new Error(`Gửi tin nhắn thất bại: ${error.message}`);
    }
  },

  /**
   * Phát hành báo giá kỹ thuật CAD kèm cập nhật trạng thái 'quoted'.
   */
  async sendQuote(id: string, quoteMessage: CustomDesignMessage): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { data: current, error: fetchErr } = await supabase
      .from('custom_design_requests')
      .select('messages')
      .eq('id', id)
      .single();

    if (fetchErr) {
      throw new Error(`Không tìm thấy yêu cầu: ${fetchErr.message}`);
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
      throw new Error(`Gửi báo giá thất bại: ${error.message}`);
    }
  },

  /**
   * Đăng ký lắng nghe thay đổi thời gian thực (Supabase Realtime) trên bảng `custom_design_requests`.
   */
  subscribe(callback: (payload: any) => void): () => void {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const channel = supabase
      .channel('public:custom_design_requests')
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
