import React, { useState, useEffect, useCallback } from 'react';
import { CustomDesignRequest, CustomDesignMessage } from '../../../types';
import { customDesignService } from '../../../backend/services/customDesignService';
import { Icon } from '@frontend/ui';

export interface DesignerRequestsTabProps {
  currentDesignerName: string;
  /** uid tác giả — lọc yêu cầu theo đúng người (RLS cũng đã siết). */
  currentDesignerId?: string;
  onShowToast: (message: string) => void;
  selectedRequestId?: string;
}

export const DesignerRequestsTab: React.FC<DesignerRequestsTabProps> = ({
  currentDesignerName,
  currentDesignerId,
  onShowToast,
  selectedRequestId,
}) => {
  const [requests, setRequests] = useState<CustomDesignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReqId, setSelectedReqId] = useState<string>(selectedRequestId || '');
  const [chatInput, setChatInput] = useState('');
  const [showProjectBriefMobile, setShowProjectBriefMobile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quoteAmountInput, setQuoteAmountInput] = useState('');

  // Chữ cái đầu từ TÊN THẬT của người đang đăng nhập (trước đây hardcode 'LT').
  const senderInitials =
    currentDesignerName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—';

  const fetchRequests = useCallback(async () => {
    try {
      const data = await customDesignService.getRequests(currentDesignerId);
      setRequests(data);
      if (data.length > 0) {
        setSelectedReqId((prev) => {
          if (prev && data.some((r) => r.id === prev)) return prev;
          return data[0].id;
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu cầu CAD:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentDesignerId]);

  useEffect(() => {
    void fetchRequests();
    const unsubscribe = customDesignService.subscribe(() => {
      void fetchRequests();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchRequests]);

  const currentRequest = requests.find((r) => r.id === selectedReqId) || requests[0] || null;

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentRequest || isSending) return;

    const text = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    const newMsg: CustomDesignMessage = {
      id: `msg-${Date.now()}`,
      sender: 'designer',
      senderName: `${currentDesignerName} (Bạn)`,
      senderInitials,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    // Optimistic UI update
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === currentRequest.id) {
          return {
            ...req,
            messages: [...req.messages, newMsg],
            previewMessage: `Bạn: ${text}`,
            time: 'Vừa xong',
          };
        }
        return req;
      })
    );

    try {
      await customDesignService.appendMessage(currentRequest.id, newMsg);
    } catch (err: any) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      onShowToast(`Lỗi khi gửi tin nhắn: ${err.message || 'Không xác định'}`);
      void fetchRequests();
    } finally {
      setIsSending(false);
    }
  };

  const handleSendQuoteInChat = async () => {
    if (!currentRequest || isSending) return;
    const quoteAmount = Number(quoteAmountInput);
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      onShowToast('Nhập số tiền báo giá hợp lệ (VND) trước khi gửi.');
      return;
    }
    setIsSending(true);

    const quoteMsg: CustomDesignMessage = {
      id: `msg-quote-${Date.now()}`,
      sender: 'designer',
      senderName: `${currentDesignerName} (Bạn)`,
      senderInitials,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text: `Tôi đã phát hành Báo Giá Kỹ Thuật cho dự án "${currentRequest.title}".`,
      quote: {
        amount: quoteAmount,
        currency: 'VND',
        description: 'Báo giá kỹ thuật CAD — chi tiết phạm vi công việc hai bên trao đổi trong hội thoại.',
        status: 'sent',
      },
    };

    // Optimistic UI update
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === currentRequest.id) {
          return {
            ...req,
            status: 'Quoted',
            messages: [...req.messages, quoteMsg],
          };
        }
        return req;
      })
    );

    try {
      await customDesignService.sendQuote(currentRequest.id, quoteMsg);
      onShowToast(`Đã gửi báo giá 650.000 đ tới khách hàng ${currentRequest.clientName}!`);
    } catch (err: any) {
      console.error('Lỗi khi gửi báo giá:', err);
      onShowToast(`Lỗi khi phát hành báo giá: ${err.message || 'Không xác định'}`);
      void fetchRequests();
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-line rounded-sm p-12 text-center shadow-e1">
        <Icon name="hourglass_empty" size={36} className="mx-auto text-primary animate-spin mb-3" />
        <p className="text-xs text-fg-muted font-tech">Đang kết nối cơ sở dữ liệu yêu cầu CAD...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-sm p-12 text-center shadow-e1">
        <Icon name="chat" size={48} className="mx-auto text-fg-muted mb-3 opacity-40" />
        <h3 className="font-bold text-sm text-fg">Chưa có yêu cầu CAD nào</h3>
        <p className="text-xs text-fg-muted mt-1 max-w-md mx-auto">
          Khi khách hàng gửi yêu cầu thiết kế tùy chỉnh hoặc đặt hàng gia công CAD riêng, thông tin
          sẽ xuất hiện tại đây theo thời gian thực.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-sm overflow-hidden flex flex-col md:flex-row h-[700px] shadow-e1">
      {/* Left Conversations List */}
      <div className="w-full md:w-80 border-r border-line flex flex-col h-full bg-surface-muted shrink-0">
        <div className="p-3.5 border-b border-line flex items-center justify-between bg-surface">
          <h3 className="font-bold text-xs uppercase tracking-wider text-fg">
            Yêu Cầu CAD ({requests.length})
          </h3>

        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-line-subtle">
          {requests.map((req) => (
            <button
              key={req.id}
              onClick={() => setSelectedReqId(req.id)}
              className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                selectedReqId === req.id
                  ? 'bg-primary/10 border-l-4 border-l-primary'
                  : 'hover:bg-surface-muted'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 text-fg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {req.clientInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-bold text-xs text-fg truncate">{req.clientName}</span>
                  <span className="text-xs font-tech text-fg-muted">{req.time}</span>
                </div>
                <p className="text-xs font-semibold text-primary truncate">{req.title}</p>
                <p className="text-xs text-fg-muted truncate">{req.previewMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Live Chat Thread */}
      {currentRequest ? (
        <div className="flex-1 flex flex-col h-full bg-surface relative">
          {/* Chat Header */}
          <div className="h-14 border-b border-line px-4 flex items-center justify-between bg-canvas">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-fg flex items-center justify-center font-bold text-xs">
                {currentRequest.clientInitials}
              </div>
              <div>
                <h4 className="font-bold text-xs text-fg">{currentRequest.clientName}</h4>
                <p className="text-xs text-primary font-tech">
                  Dự án: {currentRequest.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={quoteAmountInput}
                onChange={(e) => setQuoteAmountInput(e.target.value)}
                placeholder="Số tiền (VND)"
                aria-label="Số tiền báo giá (VND)"
                className="hidden sm:block w-32 bg-surface border border-line-control px-2.5 py-1.5 text-xs font-tech rounded-sm focus:outline-none focus:border-primary text-fg"
              />
              <button
                onClick={handleSendQuoteInChat}
                disabled={isSending}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full flex items-center gap-1 touch-target-btn disabled:opacity-50"
              >
                <Icon name="request_quote" size={18} />
                Gửi Báo Giá CAD
              </button>
              <button
                aria-label="Thông tin dự án"
                onClick={() => setShowProjectBriefMobile(!showProjectBriefMobile)}
                className="lg:hidden p-1.5 border border-line-control rounded-full text-fg"
              >
                <Icon name="info" size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted">
            {currentRequest.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'designer' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-xs rounded-sm shadow-e1 leading-relaxed ${
                    msg.sender === 'designer'
                      ? 'bg-surface-inverse text-on-inverse'
                      : 'bg-surface border border-line text-fg'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.attachment && (
                    <div className="mt-2 p-2 bg-on-inverse/10 border border-line rounded-sm flex items-center gap-2">
                      <Icon name="view_in_ar" size={18} className="text-primary" />
                      <div>
                        <p className="font-tech font-bold text-xs">{msg.attachment.name}</p>
                        <p className="text-xs text-fg-muted">{msg.attachment.size}</p>
                      </div>
                    </div>
                  )}
                  {msg.quote && (
                    <div className="mt-2.5 p-3 bg-primary/10 border border-primary rounded-sm text-fg">
                      <div className="flex items-center justify-between font-bold text-xs text-primary mb-1">
                        <span>BÁO GIÁ KỸ THUẬT CAD</span>
                        <span className="font-tech text-sm">
                          {msg.quote.amount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted">{msg.quote.description}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-primary text-primary-fg text-xs font-tech uppercase rounded-sm">
                        ĐÃ GỬI ĐẾN KHÁCH HÀNG
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-tech text-fg-subtle mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-3 border-t border-line bg-surface flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Trao đổi kỹ thuật, dung sai, vật liệu..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-canvas border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full transition-colors touch-target-btn disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-fg-muted text-xs">
          Chưa có yêu cầu CAD nào được chọn
        </div>
      )}

      {/* Right Project Brief */}
      {currentRequest && (
        <div
          className={`w-72 border-l border-line bg-canvas p-4 space-y-4 shrink-0 ${
            showProjectBriefMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <h4 className="font-bold text-xs uppercase tracking-wider text-fg border-b border-line pb-2">
            Project Brief
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-xs font-tech text-fg-muted uppercase block">
                Ngân Sách Dự Kiến:
              </span>
              <span className="font-tech font-bold text-primary">{currentRequest.budget}</span>
            </div>
            <div>
              <span className="text-xs font-tech text-fg-muted uppercase block">
                Thời Hạn Bàn Giao:
              </span>
              <span className="font-tech font-bold text-fg">{currentRequest.deadline}</span>
            </div>
            <div>
              <span className="text-xs font-tech text-fg-muted uppercase block">
                Yêu Cầu Vật Liệu:
              </span>
              <span className="font-bold text-fg">{currentRequest.targetSpecs?.material || '—'}</span>
            </div>
            <div>
              <span className="text-xs font-tech text-fg-muted uppercase block">Mật Độ Infill:</span>
              <span className="text-fg">{currentRequest.targetSpecs?.infill || '—'}</span>
            </div>
            <div>
              <span className="text-xs font-tech text-fg-muted uppercase block">
                Kích Thước Đầu Phun (Nozzle):
              </span>
              <span className="text-fg">{currentRequest.targetSpecs?.nozzle || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
