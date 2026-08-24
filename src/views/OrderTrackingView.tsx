import React, { useState } from 'react';
import { Order } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';

interface OrderTrackingViewProps {
  order: Order;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenChat: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  order,
  onNavigate,
  onOpenChat,
  onOpenInvoice
}) => {
  const [layerProgress] = useState<number>(order.layerProgress || 64);

  const STAGES = [
    { label: 'Đã nhận đơn', icon: 'receipt', desc: 'Hệ thống xác nhận' },
    { label: 'Chuẩn bị file', icon: 'tune', desc: 'Cắt lớp G-code' },
    { label: 'Xếp bàn in', icon: 'grid_view', desc: 'Tối ưu layout' },
    { label: 'Gia nhiệt máy', icon: 'thermostat', desc: '220°C / 60°C' },
    { label: 'Đang in 3D', icon: 'precision_manufacturing', desc: `Tiến độ: ${layerProgress}%` },
    { label: 'Xử lý bề mặt', icon: 'cleaning_services', desc: 'Rửa cồn & UV' },
    { label: 'QC & Đóng gói', icon: 'inventory_2', desc: 'Sai số ±0.05mm' },
    { label: 'Đang giao hàng', icon: 'local_shipping', desc: 'VCUBE Express' }
  ];

  const currentStageIndex = order.statusStageIndex || 4;

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-black/10">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={() => onNavigate('my_orders')}
              className="p-2 border border-black/15 hover:bg-black/5 text-[#1C1C1C] transition-colors touch-target-btn shrink-0 mt-1 sm:mt-0"
              aria-label="Quay lại danh sách đơn hàng"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#A69C8A] block">
                  Live Telemetry // VCUBE Fabrication
                </span>
                <span className="px-2 py-0.5 bg-[#1C1C1C] text-white text-[9px] font-tech shrink-0">
                  {order.orderNumber}
                </span>
              </div>
              <h1 className="fluid-h2 text-[#1C1C1C]">
                Tiến Độ Gia Công & Đo Kiểm
              </h1>
              <p className="text-xs text-[#7D7565] font-sans mt-0.5">
                Ngày đặt: {order.date} • Dự kiến hoàn thiện: <strong className="text-[#1C1C1C]">{order.estimatedDelivery}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 font-sans w-full sm:w-auto">
            <button
              onClick={onOpenChat}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-[10px] uppercase tracking-widest font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 touch-target-btn"
            >
              <span className="material-symbols-outlined text-sm">support_agent</span>
              Kỹ Sư Vận Hành
            </button>
            <button
              onClick={() => onOpenInvoice(order)}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 border border-black/20 hover:bg-black/5 text-[#1C1C1C] text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1.5 touch-target-btn"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Hóa Đơn PDF
            </button>
          </div>
        </div>

        {/* 8-Stage Pipeline Card */}
        <div className="bg-white border border-black/10 p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <h2 className="font-serif font-bold text-base text-[#1C1C1C] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#1C1C1C]">linear_scale</span>
              Quy Trình 8 Bước Gia Công & Kiểm Tra Dung Sai (QC)
            </h2>
            <span className="text-[10px] font-sans uppercase tracking-widest text-[#1C1C1C] font-bold hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1C1C1C] animate-pulse"></span>
              Xưởng Chế Tác Trực Tuyến
            </span>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 font-sans">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div
                  key={stage.label}
                  className={`p-3 sm:p-3.5 border text-left transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#1C1C1C] bg-[#1C1C1C] text-white shadow-md'
                      : isPast
                      ? 'border-black/10 bg-[#F7F6F2] text-[#1C1C1C]'
                      : 'border-black/5 bg-[#FAFAFA] text-[#A69C8A] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-tech text-[10px] font-bold">0{idx + 1}</span>
                    <span className="material-symbols-outlined text-sm">
                      {isPast ? 'check' : stage.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-[11px] sm:text-xs leading-tight uppercase tracking-wider">
                      {stage.label}
                    </p>
                    <p className={`text-[9px] mt-1 truncate ${isCurrent ? 'text-white/70' : 'text-[#7D7565]'}`}>{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Layer & Machine Telemetry Bar */}
          <div className="bg-[#1C1C1C] p-4 sm:p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 border border-black/20">
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">
                  precision_manufacturing
                </span>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-widest text-[#D5CFC5]">Máy in #08 • VCUBE High-Precision X1</p>
                <p className="text-xs text-white/80 font-serif">
                  Thời gian ước tính: <strong className="text-white">{order.timeRemaining || '04h 12m'}</strong> • Lớp cắt: <strong>384 / 600</strong>
                </p>
              </div>
            </div>

            <div className="w-full md:w-80 flex items-center gap-4 font-sans">
              <div className="flex-1 bg-white/20 h-2 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500"
                  style={{ width: `${layerProgress}%` }}
                ></div>
              </div>
              <span className="font-tech font-bold text-xs text-white shrink-0">{layerProgress}%</span>
            </div>
          </div>
        </div>

        {/* 2-Column: Live 3D Simulation Viewport + Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left: 3D Realtime Layer Model View */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-black/10 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/10">
                <h3 className="font-serif font-bold text-sm text-[#1C1C1C] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#1C1C1C]">view_in_ar</span>
                  Mô Phỏng Lớp In 3D (Digital Twin)
                </h3>
                <span className="text-[10px] font-tech text-[#7D7565]">0.16mm Layer</span>
              </div>

              <div className="bg-[#1C1C1C] border border-black/20 p-2">
                <ThreeModelViewer
                  modelType="box"
                  color="#E0DDD5"
                  className="h-[280px] sm:h-[340px] lg:h-[360px] w-full"
                />
              </div>
            </div>
          </div>

          {/* Right: Items, Carrier & Shipping Details */}
          <div className="lg:col-span-6 space-y-6">
            {/* Ordered Items */}
            <div className="bg-white border border-black/10 p-4 sm:p-6 space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#1C1C1C] border-b border-black/10 pb-3">
                Linh Kiện Trong Đơn Hàng
              </h3>

              <div className="divide-y divide-black/10">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-3 truncate">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover border border-black/10 bg-[#2A2A2A] shrink-0" />
                      <div className="truncate">
                        <h4 className="font-serif font-bold text-sm text-[#1C1C1C] truncate">{item.name}</h4>
                        <p className="text-[10px] text-[#7D7565]">
                          {item.quantity}x • {item.material || 'File STL'} • {item.color || 'Kỹ thuật'}
                        </p>
                      </div>
                    </div>
                    <span className="font-tech font-bold text-sm text-[#1C1C1C] shrink-0 ml-3">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrier & Delivery Info */}
            <div className="bg-white border border-black/10 p-4 sm:p-6 space-y-4 text-xs font-sans">
              <h3 className="font-serif font-bold text-sm text-[#1C1C1C] border-b border-black/10 pb-3 flex items-center justify-between">
                <span>Vận Chuyển Chuyên Dụng</span>
                <span className="text-[#7D7565] font-normal text-xs">{order.carrier.name}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <span className="text-[#7D7565] text-[10px] uppercase tracking-widest block">Mã Vận Đơn:</span>
                  <span className="font-tech font-bold text-sm text-[#1C1C1C]">{order.carrier.trackingCode}</span>
                </div>
                <div>
                  <span className="text-[#7D7565] text-[10px] uppercase tracking-widest block">Người Nhận:</span>
                  <span className="font-bold text-[#1C1C1C]">{order.shippingAddress.fullName} ({order.shippingAddress.phone})</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#7D7565] text-[10px] uppercase tracking-widest block">Địa Chỉ Nhận:</span>
                  <span className="text-[#5A554C] font-serif">{order.shippingAddress.address}, {order.shippingAddress.district}, {order.shippingAddress.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
