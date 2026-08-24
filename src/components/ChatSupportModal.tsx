import React, { useState } from 'react';

interface ChatSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSupportModal: React.FC<ChatSupportModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Array<{ sender: 'agent' | 'user'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Chào kỹ sư Minh! Tôi là Long - Kỹ thuật viên trưởng tại phòng in VCUBE. Bạn cần hỗ trợ gì về dung sai, vật liệu hay tiến độ in?',
      time: '10:15'
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

    // Simulate smart engineer reply
    setTimeout(() => {
      let reply = 'Đã nhận yêu cầu của bạn! Chúng tôi sẽ kiểm tra và điều chỉnh profile in trên máy Bambu Lab để đảm bảo kích thước ren M3 đạt chuẩn ±0.03mm.';
      if (userText.toLowerCase().includes('petg') || userText.toLowerCase().includes('nhựa')) {
        reply = 'Vật liệu PETG Technical Pro chịu nhiệt đến 75°C và chống va đập tốt hơn PLA 35%. Lô in của bạn đang chạy ở tốc độ 120mm/s để đảm bảo độ liên kết giữa các lớp in tối đa.';
      } else if (userText.toLowerCase().includes('khi nào') || userText.toLowerCase().includes('giao')) {
        reply = 'Đơn hàng đang in lớp 384/600, dự kiến hoàn thiện lúc 14:30 chiều nay và bàn giao cho VCUBE Express ngay trong ngày.';
      }

      setMessages(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <div className="bg-[#F7F6F2] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-black/15 text-[#1C1C1C]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1C1C1C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-white/10 text-white flex items-center justify-center font-bold text-xs font-sans">
                HL
              </div>
              <span className="w-2 h-2 rounded-full bg-white border border-[#1C1C1C] absolute -bottom-0.5 -right-0.5"></span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-white">Kỹ sư Hoàng Long (VCUBE Lab)</h3>
              <p className="text-[10px] text-[#D5CFC5] font-sans">Kỹ sư trực xưởng • Hotline 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-target-btn"
            aria-label="Đóng trò chuyện"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#F7F6F2]">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-3.5 sm:p-4 text-xs leading-relaxed font-sans ${
                  m.sender === 'user'
                    ? 'bg-[#1C1C1C] text-white border border-[#1C1C1C]'
                    : 'bg-white text-[#1C1C1C] border border-black/10'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] font-tech text-[#7D7565] mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Quick questions chips */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white border-t border-black/10 flex gap-2 overflow-x-auto font-sans">
          {['Hỏi về dung sai', 'Thời gian giao hàng?', 'Đổi màu nhựa'].map((q) => (
            <button
              key={q}
              onClick={() => setInputMessage(q)}
              className="px-3 py-1.5 bg-[#F7F6F2] hover:bg-black hover:text-white text-[#1C1C1C] text-[10px] uppercase tracking-wider font-semibold border border-black/10 shrink-0 transition-colors touch-target-btn whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3.5 sm:p-4 bg-white border-t border-black/10 flex gap-2 font-sans">
          <input
            type="text"
            placeholder="Nhập câu hỏi kỹ thuật..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-[#F7F6F2] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-black font-sans"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-[10px] font-sans uppercase tracking-widest font-bold transition-colors touch-target-btn"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
};
