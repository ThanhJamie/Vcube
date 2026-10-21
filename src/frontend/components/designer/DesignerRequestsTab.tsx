import React, { useState, useEffect, useCallback } from 'react';
import { CustomDesignRequest, CustomDesignMessage } from '../../../types';
import { customDesignService } from '../../../backend/services/customDesignService';
import { Badge, Button, EmptyState, Icon, Input, Skeleton } from '@frontend/ui';
import type { BadgeVariant } from '@frontend/ui';
import { formatCurrency } from '@frontend/lib/format';
import { reportError } from '@frontend/lib/reportError';

/** Trạng thái yêu cầu → biến thể badge §3.4 (enum chỉ sống trong code/DB). */
const REQUEST_STATUS_VARIANT: Record<CustomDesignRequest['status'], BadgeVariant> = {
  Pending: 'warning',
  'In Progress': 'info',
  Quoted: 'technical',
  Completed: 'success',
};

/** Nhãn VI — không render thô `Pending`/`In Progress`/`Quoted`/`Completed`. */
const REQUEST_STATUS_LABELS: Record<CustomDesignRequest['status'], string> = {
  Pending: 'Chờ duyệt',
  'In Progress': 'Đang thực hiện',
  Quoted: 'Đã báo giá',
  Completed: 'Hoàn thành',
};

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
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
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
      const board = await customDesignService.getRequestBoard(currentDesignerId);
      setRequests(board.requests);
      setOpenIds(new Set(board.openRequestIds));
      if (board.requests.length > 0) {
        setSelectedReqId((prev) => {
          if (prev && board.requests.some((r) => r.id === prev)) return prev;
          return board.requests[0].id;
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
  const isCurrentOpen = currentRequest ? openIds.has(currentRequest.id) : false;

  const displayClientName = (req: CustomDesignRequest) =>
    req.clientName.trim() || 'Khách hàng ẩn danh';

  const handleClaimRequest = async () => {
    if (!currentRequest || isSending) return;
    setIsSending(true);
    try {
      const res = await customDesignService.claimRequest(currentRequest.id);
      if (!res.success) {
        onShowToast(`Không nhận được yêu cầu: ${res.error}`);
        void fetchRequests();
        return;
      }
      onShowToast(`Đã nhận yêu cầu "${currentRequest.title}".`);
      await fetchRequests();
    } catch (err: any) {
      reportError('DesignerRequestsTab.claimRequest', err);
      onShowToast(`Lỗi khi nhận yêu cầu: ${err?.message || 'Không xác định'}`);
      void fetchRequests();
    } finally {
      setIsSending(false);
    }
  };

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
      const res = await customDesignService.appendMessage(currentRequest.id, newMsg);
      if (!res.success) {
        onShowToast(`Lỗi khi gửi tin nhắn: ${res.error}`);
        void fetchRequests();
      }
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
      const res = await customDesignService.sendQuote(currentRequest.id, quoteMsg);
      if (!res.success) {
        onShowToast(`Lỗi khi phát hành báo giá: ${res.error}`);
        void fetchRequests();
        return;
      }
      onShowToast(`Đã gửi báo giá ${formatCurrency(quoteAmount)} tới khách hàng ${displayClientName(currentRequest)}!`);
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
      <div className="rounded-lg border border-line bg-surface p-6" role="status" aria-label="Đang kết nối cơ sở dữ liệu yêu cầu CAD">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton variant="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 rounded-md border border-line-subtle p-3">
              <Skeleton variant="circle" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="35%" />
                <Skeleton variant="text" width="60%" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-muted">Đang kết nối cơ sở dữ liệu yêu cầu CAD...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        bordered
        live
        icon={<Icon name="chat" size={20} />}
        title="Chưa có yêu cầu CAD nào"
        description="Khi khách hàng gửi yêu cầu thiết kế tùy chỉnh hoặc đặt hàng gia công CAD riêng, thông tin sẽ xuất hiện tại đây theo thời gian thực."
      />
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface md:h-[700px] md:flex-row">
      {/* Left Conversations List */}
      <div className="flex w-full shrink-0 flex-col border-b border-line bg-surface-muted max-md:h-72 md:h-full md:w-80 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-line-subtle bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Yêu Cầu CAD ({requests.length})
          </h3>

        </div>
        <div className="flex-1 divide-y divide-line-subtle overflow-y-auto">
          {requests.map((req) => (
            <button
              key={req.id}
              onClick={() => setSelectedReqId(req.id)}
              className={`flex w-full items-start gap-3 p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedReqId === req.id
                  ? 'border-l-2 border-l-primary bg-primary-tint'
                  : 'border-l-2 border-l-transparent hover:bg-surface-muted'
              }`}
            >
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-semibold text-fg">
                {req.clientInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{displayClientName(req)}</span>
                  <span className="shrink-0 font-mono text-xs text-fg-subtle">{req.time}</span>
                </div>
                <p className="truncate text-sm font-medium text-fg">{req.title}</p>
                <p className="truncate text-xs text-fg-muted">
                  {openIds.has(req.id) ? (
                    <span className="font-semibold text-warning">Yêu cầu mở · Nhận việc</span>
                  ) : (
                    req.previewMessage
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Live Chat Thread */}
      {currentRequest ? (
        <div className="relative flex flex-1 flex-col bg-surface max-md:h-[560px] md:h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between gap-2 border-b border-line-subtle bg-surface px-4 max-md:h-auto max-md:flex-wrap max-md:py-2 md:h-14">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-semibold text-fg">
                {currentRequest.clientInitials}
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-fg">{displayClientName(currentRequest)}</h4>
                <p className="flex items-center gap-2 text-xs text-fg-muted">
                  <span className="truncate">Dự án: {currentRequest.title}</span>
                  <Badge variant={REQUEST_STATUS_VARIANT[currentRequest.status] ?? 'neutral'} dot>
                    {REQUEST_STATUS_LABELS[currentRequest.status] ?? currentRequest.status}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentOpen ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleClaimRequest}
                  disabled={isSending}
                  leadingIcon={<Icon name="handshake" size={16} />}
                >
                  Nhận Việc
                </Button>
              ) : (
                <>
                  <div className="hidden w-32 sm:block">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={quoteAmountInput}
                      onChange={(e) => setQuoteAmountInput(e.target.value)}
                      placeholder="Số tiền (VND)"
                      aria-label="Số tiền báo giá (VND)"
                      numeric
                      size="sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSendQuoteInChat}
                    disabled={isSending}
                    leadingIcon={<Icon name="request_quote" size={16} />}
                  >
                    Gửi Báo Giá CAD
                  </Button>
                </>
              )}
              <Button
                iconOnly
                size="sm"
                variant="secondary"
                aria-label="Thông tin dự án"
                title="Thông tin dự án"
                onClick={() => setShowProjectBriefMobile(!showProjectBriefMobile)}
                className="lg:hidden"
                leadingIcon={<Icon name="info" size={16} />}
              />
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted p-4">
            {isCurrentOpen ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-fg-muted">
                <Icon name="lock" size={32} className="text-fg-subtle" />
                <p className="max-w-xs">
                  Hội thoại và thông tin khách hàng chỉ hiển thị sau khi bạn nhận việc.
                </p>
              </div>
            ) : (
              currentRequest.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'designer' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                    msg.sender === 'designer'
                      ? 'border border-primary/20 bg-primary-tint text-fg'
                      : 'border border-line bg-surface text-fg'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.attachment && (
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-surface p-2">
                      <Icon name="view_in_ar" size={18} className="text-fg-muted" />
                      <div>
                        <p className="font-mono text-xs font-semibold text-fg">{msg.attachment.name}</p>
                        <p className="text-xs text-fg-muted">{msg.attachment.size}</p>
                      </div>
                    </div>
                  )}
                  {msg.quote && (
                    <div className="mt-2.5 rounded-md border border-line bg-surface p-3 text-fg">
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-fg">
                        <span>BÁO GIÁ KỸ THUẬT CAD</span>
                        <span className="font-mono text-sm tabular-nums">
                          {formatCurrency(msg.quote.amount)}
                        </span>
                      </div>
                      <p className="text-sm text-fg-muted">{msg.quote.description}</p>
                      <span className="mt-2 inline-flex items-center rounded-full border border-positive/20 bg-positive-tint px-2.5 py-1 text-xs font-medium text-positive">
                        ĐÃ GỬI ĐẾN KHÁCH HÀNG
                      </span>
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 font-mono text-xs text-fg-subtle">{msg.time}</span>
              </div>
            )))}
          </div>

          {/* Chat Input — chỉ cho yêu cầu đã nhận; yêu cầu mở phải nhận việc trước. */}
          {!isCurrentOpen && (
            <form
              onSubmit={handleSendChatMessage}
              className="flex items-center gap-2 border-t border-line-subtle bg-surface p-3"
            >
              <Input
                type="text"
                placeholder="Trao đổi kỹ thuật, dung sai, vật liệu..."
                aria-label="Nội dung tin nhắn"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary" disabled={isSending}>
                Gửi
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-fg-muted">
          Chưa có yêu cầu CAD nào được chọn
        </div>
      )}

      {/* Right Project Brief */}
      {currentRequest && (
        <div
          className={`w-72 shrink-0 space-y-4 border-line bg-surface-muted p-4 md:border-l ${
            showProjectBriefMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <h4 className="border-b border-line-subtle pb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Tóm tắt dự án
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Ngân Sách Dự Kiến:
              </span>
              <span className="font-mono font-semibold tabular-nums text-fg">{currentRequest.budget}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Thời Hạn Bàn Giao:
              </span>
              <span className="font-mono font-semibold text-fg">{currentRequest.deadline}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Yêu Cầu Vật Liệu:
              </span>
              <span className="font-medium text-fg">{currentRequest.targetSpecs?.material || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-fg-subtle">Độ đặc:</span>
              <span className="text-fg">{currentRequest.targetSpecs?.infill || '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Đường kính đầu phun:
              </span>
              <span className="text-fg">{currentRequest.targetSpecs?.nozzle || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
