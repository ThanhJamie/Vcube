import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Button, Icon, Input, Modal } from '@frontend/ui';

interface ChatSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSupportModal: React.FC<ChatSupportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  // AT-09: đây là TRỢ LÝ TỰ ĐỘNG, không phải kỹ sư trực ca. Không nêu tên người, không
  // cam kết SLA và không nêu thông số kỹ thuật nào khi chưa đọc từ dữ liệu thật của đơn.
  const [messages, setMessages] = useState<Array<{ sender: 'agent' | 'user'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Chào bạn! Đây là trợ lý tự động của VCUBE. Bạn cần hỗ trợ gì về đơn hàng, vật liệu hay tệp CAD?',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // KHÔNG `return null` khi đóng: mount có điều kiện làm effect của `Modal` chạy
  // mount→cleanup→mount dưới StrictMode, và `dialog.close()` trong cleanup đóng modal vừa
  // mở ⇒ bấm nút trợ lý trông như nút chết. Luôn render, chỉ đổi prop `open`.
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setInputMessage('');

    // Trợ lý tự động: KHÔNG bịa tiến độ, định mức, dung sai hay thời điểm giao.
    // Câu trả lời chỉ xác nhận đã ghi nhận và nói rõ bước tiếp theo do người phụ trách.
    setTimeout(() => {
      const reply = 'VCUBE đã ghi nhận câu hỏi của bạn. Đây là trợ lý tự động: tiến độ, vật liệu và dung sai của đơn sẽ do bộ phận phụ trách kiểm tra trên dữ liệu thật rồi phản hồi lại cho bạn.';

      setMessages(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1000);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      placement="right"
      showCloseButton={false}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      aria-label={t('supportAssistant', 'Trợ lý tự động')}
    >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-surface text-fg flex items-center justify-between border-b border-line">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand text-fg shadow-soft">
              <Icon name="smart_toy" size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-fg">
                {t('supportAssistant', 'Trợ lý tự động')}
              </h3>
              <p className="truncate font-sans text-xs text-fg-muted">Phản hồi tự động • Không phải kỹ sư trực ca</p>
            </div>
          </div>
          <Button
            iconOnly
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng trò chuyện"
          >
            <Icon name="close" size={20} />
          </Button>
        </div>

        {/* Message history */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-surface">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed font-sans ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-fg'
                    : 'border-0 bg-surface-muted text-fg'
                }`}
              >
                {m.text}
              </div>
              <span className="text-xs font-tech text-fg-muted mt-1 px-1 tabular-nums">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Quick questions chips */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-surface border-t border-line-subtle flex gap-2 overflow-x-auto font-sans">
          {['Hỏi về dung sai', 'Thời gian giao hàng?', 'Đổi màu nhựa'].map((q) => (
            <button
              key={q}
              onClick={() => setInputMessage(q)}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-line bg-surface-muted px-3.5 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-200 hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 border-t border-line-subtle bg-surface p-3.5 font-sans sm:p-4">
          <Input
            type="text"
            placeholder="Nhập câu hỏi kỹ thuật..."
            aria-label="Nhập câu hỏi kỹ thuật"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="primary">
            Gửi
          </Button>
        </form>
    </Modal>
  );
};
