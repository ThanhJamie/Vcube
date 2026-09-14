import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Icon } from '@frontend/ui';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex justify-end">
      <div className="bg-surface w-full max-w-md h-full flex flex-col shadow-e3 text-fg">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-surface text-fg flex items-center justify-between border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary flex items-center justify-center rounded-full border border-primary/20">
              <Icon name="smart_toy" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-fg">
                {t('supportAssistant', 'Trợ lý tự động', 'Automated assistant')}
              </h3>
              <p className="text-xs text-fg-muted font-sans">Phản hồi tự động • Không phải kỹ sư trực ca</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors touch-target-btn cursor-pointer"
            aria-label="Đóng trò chuyện"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-surface-muted">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-3.5 sm:p-4 text-xs leading-relaxed font-sans ${
                  m.sender === 'user'
                    ? 'bg-surface-inverse text-on-inverse border border-surface-inverse'
                    : 'bg-surface text-fg border border-line-subtle'
                }`}
              >
                {m.text}
              </div>
              <span className="text-xs font-tech text-fg-muted mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Quick questions chips */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-surface border-t border-line-subtle flex gap-2 overflow-x-auto font-sans">
          {['Hỏi về dung sai', 'Thời gian giao hàng?', 'Đổi màu nhựa'].map((q) => (
            <button
              key={q}
              onClick={() => setInputMessage(q)}
              className="px-3 py-1.5 rounded-full bg-surface-muted hover:bg-surface-inverse hover:text-on-inverse text-fg text-xs uppercase tracking-wider font-semibold border border-line-subtle shrink-0 transition-colors touch-target-btn whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3.5 sm:p-4 bg-surface border-t border-line-subtle flex gap-2 font-sans">
          <input
            type="text"
            placeholder="Nhập câu hỏi kỹ thuật..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-surface-muted border border-line-control px-3 py-2.5 text-xs text-fg focus:outline-none focus:border-primary font-sans"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse text-xs font-sans uppercase tracking-widest font-bold transition-colors touch-target-btn"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
};
