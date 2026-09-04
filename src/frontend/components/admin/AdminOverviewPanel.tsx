import React from 'react';
import { Order, Product, PrinterProfile, MaterialProfile, AccessoryItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { AdminNavSection } from './AdminSidebar';

interface AdminOverviewPanelProps {
  orders: Order[];
  products: Product[];
  printers: PrinterProfile[];
  materials: MaterialProfile[];
  accessories: AccessoryItem[];
  onNavigateSection: (section: AdminNavSection) => void;
  onNavigateTracking: (order: Order) => void;
}

export const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({
  orders,
  products,
  printers,
  materials,
  accessories,
  onNavigateSection,
  onNavigateTracking,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.payment?.total || 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const printingPrinters = printers.filter(p => p.status === 'Printing').length;
  const readyPrinters = printers.filter(p => p.status === 'Idle').length;
  
  // Stock alerts
  const lowMaterials = materials.filter(m => (m.stockRollsCount ?? 10) <= 5);
  const lowAccessories = accessories.filter(a => a.stockCount <= a.lowStockThreshold);
  const totalAlertsCount = lowMaterials.length + lowAccessories.length;

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
                VCUBE FORGECONTROL HUB
              </span>
              <span className="text-xs text-[#545F73]">Trung tâm điều hành xưởng in & thương mại</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#091426] mt-1">
              {isVi ? 'Tổng Quan Hoạt Động Xưởng VCUBE' : 'VCUBE Operations & Fabrication Hub'}
            </h1>
            <p className="text-xs text-[#545F73] mt-0.5">
              {isVi
                ? 'Theo dõi hàng đợi in 3D, tình trạng máy móc, quản lý đơn hàng thương mại và kho vật liệu theo thời gian thực.'
                : 'Monitor real-time 3D print queues, machine telemetry, orders flow, and inventory levels.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateSection('quote-calc')}
              className="px-3.5 py-2 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">request_quote</span>
              {isVi ? 'Tạo Báo Giá Nhanh (BOM)' : 'Quick BOM Quote'}
            </button>
            <button
              onClick={() => onNavigateSection('queue')}
              className="px-3.5 py-2 bg-[#091426] hover:bg-[#1E293B] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              {isVi ? 'Hàng Đợi Sản Xuất' : 'Production Queue'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div
          onClick={() => onNavigateSection('orders')}
          className="bg-white border border-[#C5C6CD] p-5 rounded-xl hover:border-[#00687A] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
              {isVi ? 'Doanh Thu Đơn Hàng' : 'Total Revenue'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-tech text-[#091426] mt-2">
            {totalRevenue.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-[#545F73]">
            <span>{orders.length} {isVi ? 'tổng đơn hàng' : 'total orders'}</span>
            <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* Active Production Queue */}
        <div
          onClick={() => onNavigateSection('queue')}
          className="bg-white border border-[#C5C6CD] p-5 rounded-xl hover:border-[#00687A] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
              {isVi ? 'Đang Chế Tác (Queue)' : 'Active Jobs'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-tech text-[#00687A] mt-2">
            {activeOrders.length} <span className="text-xs font-sans font-normal text-[#545F73]">{isVi ? 'lô gia công' : 'active batches'}</span>
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-[#545F73]">
            <span>{orders.filter(o => o.status === 'printing').length} {isVi ? 'đang chạy trên bàn in' : 'printing now'}</span>
            <span className="text-[#00687A] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* 3D Fleet Online */}
        <div
          onClick={() => onNavigateSection('machines')}
          className="bg-white border border-[#C5C6CD] p-5 rounded-xl hover:border-[#00687A] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
              {isVi ? 'Đội Máy In 3D' : 'Machines Fleet'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">print</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-tech text-[#091426] mt-2">
            {readyPrinters + printingPrinters}/{printers.length} <span className="text-xs font-sans font-normal text-emerald-700 font-bold">{isVi ? 'Khả Dụng' : 'Online'}</span>
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-[#545F73]">
            <span>{printingPrinters} {isVi ? 'máy đang chạy' : 'busy printing'}</span>
            <span className="text-[#00687A] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* Inventory Stock Health */}
        <div
          onClick={() => onNavigateSection('inventory')}
          className="bg-white border border-[#C5C6CD] p-5 rounded-xl hover:border-[#00687A] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
              {isVi ? 'Tồn Kho & Kệ Xưởng' : 'Inventory Health'}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              totalAlertsCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <span className="material-symbols-outlined text-lg">shelves</span>
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold font-tech mt-2 ${
            totalAlertsCount > 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {totalAlertsCount > 0 ? `${totalAlertsCount} Cảnh Báo` : isVi ? 'Ổn Định 100%' : 'All Healthy'}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-[#545F73]">
            <span>{materials.length} {isVi ? 'loại nhựa' : 'materials'} • {accessories.length} {isVi ? 'phụ kiện' : 'hardware'}</span>
            <span className="text-rose-700 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </div>

      {/* 4-Stakeholder Ecosystem Architecture Banner */}
      <div className="bg-gradient-to-r from-[#091426] to-[#0A2540] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
              <span className="font-tech text-xs uppercase tracking-widest text-[#57DFFE] font-bold">
                {isVi ? 'HỆ SINH THÁI 4 NHÓM TÁC NHÂN // 4-ROLE STAKEHOLDER MESH' : '4-ROLE STAKEHOLDER PLATFORM'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-1 text-white">
              {isVi ? 'Mô Hình Kết Nối Đa Bên: Khách In • Tác Giả • Xưởng In • Quản Trị' : 'Multi-Stakeholder Platform: Customers • Creators • MES Labs • Admin'}
            </h3>
          </div>
          <button
            onClick={() => onNavigateSection('users')}
            className="px-3.5 py-1.5 bg-[#57DFFE]/15 hover:bg-[#57DFFE]/25 text-[#57DFFE] text-xs font-bold font-tech rounded-lg border border-[#57DFFE]/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>{isVi ? 'Quản Lý 4 Nhóm & KYC' : 'Manage Roles & KYC'}</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        {/* 4 Role Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
          {/* 1. Customer */}
          <div
            onClick={() => onNavigateSection('orders')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech font-bold uppercase text-blue-300">Khách Hàng (Customer)</span>
              <span className="material-symbols-outlined text-base text-blue-400">person</span>
            </div>
            <p className="text-xl font-tech font-bold text-white mt-1.5">142 tài khoản</p>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">
              8-Stage tracking • {orders.length} đơn hàng • 98.4% CSAT
            </p>
          </div>

          {/* 2. Designer */}
          <div
            onClick={() => onNavigateSection('products')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech font-bold uppercase text-amber-300">Tác Giả 3D (Creator)</span>
              <span className="material-symbols-outlined text-base text-amber-400">design_services</span>
            </div>
            <p className="text-xl font-tech font-bold text-amber-300 mt-1.5">28 Creators</p>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">
              Hoa hồng 85% • {products.length} mã CAD • 124.5M đ Royalty
            </p>
          </div>

          {/* 3. MES Lab Hub */}
          <div
            onClick={() => onNavigateSection('machines')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech font-bold uppercase text-emerald-300">Xưởng In 3D (MES Lab)</span>
              <span className="material-symbols-outlined text-base text-emerald-400">precision_manufacturing</span>
            </div>
            <p className="text-xl font-tech font-bold text-emerald-300 mt-1.5">12 Xưởng Hub</p>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">
              {printers.length} máy in • Hà Nội / HCM / ĐN • 99.2% OTD
            </p>
          </div>

          {/* 4. Super Admin */}
          <div
            onClick={() => onNavigateSection('users')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech font-bold uppercase text-purple-300">Quản Trị & KYC</span>
              <span className="material-symbols-outlined text-base text-purple-400">admin_panel_settings</span>
            </div>
            <p className="text-xl font-tech font-bold text-purple-300 mt-1.5">4 Chờ Duyệt</p>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">
              Doanh nghiệp & CCCD • Inkiri v3.4 • ISO/ASTM 52900
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Orders Overview */}
        <div className="lg:col-span-8 bg-white border border-[#C5C6CD] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A]">receipt_long</span>
                {isVi ? 'Đơn Hàng Gần Đây Cần Xử Lý' : 'Recent Orders Awaiting Action'}
              </h2>
              <p className="text-xs text-[#545F73]">5 đơn hàng mới nhất trong luồng sản xuất xưởng</p>
            </div>

            <button
              onClick={() => onNavigateSection('orders')}
              className="text-xs font-bold text-[#00687A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {isVi ? 'Xem tất cả đơn' : 'View all orders'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Orders Mini Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FF] text-[#545F73] font-tech uppercase text-[10px] border-b border-[#C5C6CD]">
                <tr>
                  <th className="py-2.5 px-3">Mã Đơn</th>
                  <th className="py-2.5 px-3">Khách Hàng</th>
                  <th className="py-2.5 px-3">Chi Tiết Sản Phẩm</th>
                  <th className="py-2.5 px-3">Tổng Tiền</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Theo Dõi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EEFF]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-tech font-bold text-[#00687A]">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#091426]">{order.shippingAddress.fullName}</p>
                      <p className="text-[11px] text-[#545F73] font-tech">{order.shippingAddress.phone}</p>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <p className="truncate text-[11px] text-[#091426]">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-tech font-bold text-[#091426]">
                      {order.payment.total.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'printing'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status === 'completed'
                          ? 'Đã Giao'
                          : order.status === 'printing'
                          ? 'Đang In'
                          : order.status === 'post_processing'
                          ? 'Xử Lý Hậu Kỳ'
                          : 'Đang Xử Lý'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigateTracking(order)}
                        className="px-2 py-1 bg-[#091426] hover:bg-[#1E293B] text-white text-[10px] font-bold rounded"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fleet Live Snapshot & Quick Links */}
        <div className="lg:col-span-4 space-y-4">
          {/* Fleet Status Card */}
          <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-2">
              <h3 className="font-bold text-xs text-[#091426] uppercase tracking-wider font-tech flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00687A]">print</span>
                {isVi ? 'Trạng Thái Đội Máy' : '3D Fleet Live'}
              </h3>
              <button
                onClick={() => onNavigateSection('machines')}
                className="text-[11px] text-[#00687A] font-bold hover:underline cursor-pointer"
              >
                Quản lý máy →
              </button>
            </div>

            <div className="space-y-2">
              {printers.slice(0, 4).map((printer) => (
                <div key={printer.id} className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FF] text-xs">
                  <div>
                    <p className="font-bold text-[#091426]">{printer.name}</p>
                    <p className="text-[10px] text-[#545F73] font-tech">{printer.brand} • {printer.technology}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                      printer.status === 'Printing'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : printer.status === 'Idle'
                        ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {printer.status || 'Sẵn Sàng'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Nav Shortcut Matrix */}
          <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-[#091426] uppercase tracking-wider font-tech">
              {isVi ? 'Lối Tắt Truy Cập Nhanh' : 'Quick Navigation'}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateSection('products')}
                className="p-3 border border-[#C5C6CD] hover:border-[#00687A] rounded-lg text-left transition-all hover:bg-[#F8FAFC] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#00687A] block mb-1 text-base">inventory_2</span>
                <span className="font-bold text-[#091426] block">Sản Phẩm</span>
                <span className="text-[10px] text-[#545F73]">{products.length} mã CAD</span>
              </button>

              <button
                onClick={() => onNavigateSection('materials')}
                className="p-3 border border-[#C5C6CD] hover:border-[#00687A] rounded-lg text-left transition-all hover:bg-[#F8FAFC] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#00687A] block mb-1 text-base">layers</span>
                <span className="font-bold text-[#091426] block">Nhựa In</span>
                <span className="text-[10px] text-[#545F73]">{materials.length} cấu hình</span>
              </button>

              <button
                onClick={() => onNavigateSection('cost-rules')}
                className="p-3 border border-[#C5C6CD] hover:border-[#00687A] rounded-lg text-left transition-all hover:bg-[#F8FAFC] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#00687A] block mb-1 text-base">calculate</span>
                <span className="font-bold text-[#091426] block">Định Giá</span>
                <span className="text-[10px] text-[#545F73]">Inkiri Formula</span>
              </button>

              <button
                onClick={() => onNavigateSection('hardware')}
                className="p-3 border border-[#C5C6CD] hover:border-[#00687A] rounded-lg text-left transition-all hover:bg-[#F8FAFC] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#00687A] block mb-1 text-base">extension</span>
                <span className="font-bold text-[#091426] block">Phụ Kiện</span>
                <span className="text-[10px] text-[#545F73]">{accessories.length} linh kiện</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
