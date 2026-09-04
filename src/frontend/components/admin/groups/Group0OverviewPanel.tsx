import React, { useState } from 'react';
import { useAdminOverviewStore, InkiriCostPillar } from '../../../stores/useAdminOverviewStore';
import { useProductionStore } from '../../../stores/useProductionStore';
import { Order, Product, PrinterProfile, MaterialProfile, AccessoryItem } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { AdminNavSection } from '../AdminSidebar';

interface Group0OverviewPanelProps {
  orders?: Order[];
  products?: Product[];
  printers?: PrinterProfile[];
  materials?: MaterialProfile[];
  accessories?: AccessoryItem[];
  onNavigateSection?: (section: AdminNavSection) => void;
  onNavigateTracking?: (order: Order) => void;
}

export const Group0OverviewPanel: React.FC<Group0OverviewPanelProps> = ({
  orders = [],
  products = [],
  printers = [],
  materials = [],
  accessories = [],
  onNavigateSection,
  onNavigateTracking
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const {
    timeframe,
    kpis,
    costPillars,
    alerts,
    isTelemetryLive,
    setTimeframe,
    dismissAlert,
    toggleTelemetry
  } = useAdminOverviewStore();

  const { jobs } = useProductionStore();

  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

  // Computed metrics from stores and props
  const totalFleetCount = printers.length > 0 ? printers.length : kpis.totalFleetPrinters;
  const printingPrintersCount = printers.length > 0
    ? printers.filter((p) => p.status === 'Printing').length
    : kpis.activePrintingPrinters;
  const fleetUtilPercent = totalFleetCount > 0
    ? Math.round((printingPrintersCount / totalFleetCount) * 1000) / 10
    : kpis.fleetUtilizationPercent;

  const ordersInProduction = jobs.length > 0
    ? jobs.filter((j) => j.stageIndex >= 1 && j.stageIndex <= 6).length
    : kpis.activeOrdersInProduction;

  const totalCalculatedRevenue = orders.length > 0
    ? orders.reduce((sum, o) => sum + (o.payment?.total || 0), 0)
    : kpis.revenueMonthVnd;

  const lowStockMaterials = materials.filter((m) => (m.stockRollsCount ?? 10) <= 5).length;
  const lowStockAccessories = accessories.filter((a) => a.stockCount <= a.lowStockThreshold).length;
  const totalLowStockAlerts = (lowStockMaterials + lowStockAccessories) || kpis.lowStockItemsCount;

  const activeAlerts = alerts.filter((a) => !a.isDismissed);
  const selectedPillar = costPillars.find((p) => p.id === selectedPillarId) || null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Executive Greeting */}
      <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#00687A]/10 text-[#00687A] font-tech text-[10px] font-bold rounded-md border border-[#00687A]/20 uppercase tracking-wider">
                GROUP 0: EXECUTIVE OVERVIEW
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className={`w-2 h-2 rounded-full ${isTelemetryLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {isTelemetryLive ? 'Hệ Thống Đang Trực Tuyến' : 'Telemetry Paused'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#091426] mt-1 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#00687A] text-2xl">dashboard</span>
              {isVi ? 'Tổng Quan Điều Hành Hệ Sinh Thái VCUBE' : 'VCUBE Executive Operations Hub'}
            </h1>
            <p className="text-xs sm:text-sm text-[#545F73] mt-0.5">
              {isVi
                ? 'Giám sát chỉ số KPI sản xuất thời gian thực, cơ cấu giá Inkiri đa thành phần và điều phối mạng lưới 3 trạm xưởng.'
                : 'Real-time production KPIs telemetry, Inkiri multi-pillar cost breakdown, and network dispatch orchestration.'}
            </p>
          </div>

          {/* Timeframe selector & Quick Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['today', 'week', 'month', 'quarter'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-white text-[#00687A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf === 'today'
                    ? (isVi ? 'Hôm Nay' : 'Today')
                    : tf === 'week'
                    ? (isVi ? 'Tuần Này' : 'Week')
                    : tf === 'month'
                    ? (isVi ? 'Tháng Này' : 'Month')
                    : (isVi ? 'Quý Này' : 'Quarter')}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigateSection?.('queue')}
              className="px-3 py-1.5 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              {isVi ? 'Hàng Đợi MES' : 'MES Queue'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Four Real-Time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Utilization Rate */}
        <div
          onClick={() => onNavigateSection?.('machines')}
          className="bg-white border border-[#CBD5E1] hover:border-[#00687A] p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-slate-500">
              TỶ LỆ SỬ DỤNG MÁY (FLEET UTILIZATION)
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <span className="material-symbols-outlined text-xl">print</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-tech text-[#091426]">
              {fleetUtilPercent}%
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +5.4%
            </span>
          </div>

          <div className="mt-3">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-[#00687A] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, fleetUtilPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 font-tech">
              <span>Đang in: <strong>{printingPrintersCount} máy</strong></span>
              <span>Tổng đội: <strong>{totalFleetCount} máy</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active Orders in Production */}
        <div
          onClick={() => onNavigateSection?.('queue')}
          className="bg-white border border-[#CBD5E1] hover:border-[#00687A] p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-slate-500">
              ĐƠN ĐANG CHẾ TÁC (IN PIPELINE)
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <span className="material-symbols-outlined text-xl">precision_manufacturing</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-tech text-[#091426]">
              {ordersInProduction}
            </span>
            <span className="text-xs text-slate-500">đơn hàng đang chạy</span>
          </div>

          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Tiến độ đúng hạn:</span>
            <span className="font-tech font-bold text-emerald-700">{kpis.onTimeDeliveryRate}% SLA</span>
          </div>
        </div>

        {/* KPI 3: Daily / Monthly Revenue */}
        <div
          onClick={() => onNavigateSection?.('orders')}
          className="bg-white border border-[#CBD5E1] hover:border-[#00687A] p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-slate-500">
              DOANH THU ({timeframe === 'today' ? 'HÔM NAY' : 'THÁNG NÀY'})
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-bold font-tech text-emerald-700">
              {timeframe === 'today'
                ? kpis.revenueTodayVnd.toLocaleString('vi-VN')
                : totalCalculatedRevenue.toLocaleString('vi-VN')}{' '}
              đ
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Tăng trưởng MoM:</span>
            <span className="font-tech font-bold text-emerald-600 flex items-center">
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
              +{kpis.revenueGrowthPercent}%
            </span>
          </div>
        </div>

        {/* KPI 4: Low Inventory & Operational Alerts */}
        <div
          onClick={() => onNavigateSection?.('inventory')}
          className="bg-white border border-[#CBD5E1] hover:border-amber-400 p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-slate-500">
              CẢNH BÁO TỒN KHO & VẬN HÀNH
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-tech ${totalLowStockAlerts > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {totalLowStockAlerts}
            </span>
            <span className="text-xs text-slate-500">vật tư dưới định mức</span>
          </div>

          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Cần bổ sung cuộn nhựa:</span>
            <span className="font-bold text-amber-700">{lowStockMaterials} loại nhựa</span>
          </div>
        </div>
      </div>

      {/* 3. Inkiri Cost Breakdown Structure (4 Core Pillars) */}
      <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#00687A]/10 text-[#00687A] font-tech text-[10px] font-bold rounded">
                INKIRI FORMULA V3.4
              </span>
              <span className="text-xs text-slate-500">Cơ cấu cấu thành giá chuẩn công nghiệp</span>
            </div>
            <h2 className="text-lg font-bold text-[#091426] mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">pie_chart</span>
              {isVi ? 'Biểu Đồ Phân Bổ Cơ Cấu Chi Phí & Định Giá Inkiri' : 'Inkiri Cost Structure & Pricing Breakdown'}
            </h2>
          </div>

          <button
            onClick={() => onNavigateSection?.('pricing')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            {isVi ? 'Cấu Hình Công Thức Giá' : 'Configure Pricing'}
          </button>
        </div>

        {/* Visual Segmented Distribution Bar */}
        <div className="space-y-2">
          <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
            {costPillars.map((pillar) => (
              <div
                key={pillar.id}
                onClick={() => setSelectedPillarId(pillar.id)}
                style={{
                  width: `${pillar.percent}%`,
                  backgroundColor: pillar.colorHex
                }}
                className={`h-full flex items-center justify-center text-white font-tech font-bold text-xs cursor-pointer transition-all hover:brightness-110 relative group ${
                  selectedPillarId === pillar.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                title={`${pillar.nameVi}: ${pillar.percent}%`}
              >
                <span className="truncate px-1 hidden sm:inline">{pillar.percent}%</span>
              </div>
            ))}
          </div>

          {/* Legend Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {costPillars.map((pillar) => {
              const isSelected = selectedPillarId === pillar.id;

              return (
                <div
                  key={pillar.id}
                  onClick={() => setSelectedPillarId(isSelected ? null : pillar.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#00687A] bg-sky-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: pillar.colorHex }}
                      />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {pillar.nameVi}
                      </span>
                    </div>
                    <span className="font-tech font-bold text-sm text-slate-900 shrink-0">
                      {pillar.percent}%
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-tech font-semibold text-slate-600">
                    {pillar.amountVnd.toLocaleString('vi-VN')} đ
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {pillar.descriptionVi}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Inspector Card for Selected Pillar */}
        {selectedPillar && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00687A]">help</span>
                Công thức & Quy chuẩn tính toán Inkiri: {selectedPillar.nameVi}
              </span>
              <button
                onClick={() => setSelectedPillarId(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
            <p className="text-slate-600">{selectedPillar.descriptionVi}</p>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-[#00687A]">
              <code>{selectedPillar.formulaNoteVi}</code>
            </div>
          </div>
        )}
      </div>

      {/* 4. Real-Time Operational Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Alerts */}
        <div className="lg:col-span-2 bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">notifications_active</span>
                Cảnh Báo Vận Hành & Lệnh Điều Phối Khẩn
              </h3>
              <p className="text-xs text-slate-500">Giám sát rủi ro trạm in, tồn kho và deadline giao hàng</p>
            </div>
            <span className="text-xs font-tech font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
              {activeAlerts.length} cảnh báo
            </span>
          </div>

          <div className="space-y-2.5">
            {activeAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-2xl block mb-1 text-emerald-500">check_circle</span>
                Tất cả trạm xưởng đang vận hành ổn định không có cảnh báo nào!
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/60 border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                      alert.severity === 'critical'
                        ? 'text-rose-600'
                        : alert.severity === 'warning'
                        ? 'text-amber-600'
                        : 'text-blue-600'
                    }`}>
                      {alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{alert.titleVi}</div>
                      <p className="text-slate-600 mt-0.5">{alert.descriptionVi}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        {alert.hubName && <span>🏢 {alert.hubName}</span>}
                        <span>🕒 {alert.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {alert.actionLabelVi && alert.targetSection && (
                      <button
                        onClick={() => onNavigateSection?.(alert.targetSection as AdminNavSection)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg border border-slate-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        {alert.actionLabelVi}
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      title="Bỏ qua"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Hub Telemetry Overview */}
        <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">hub</span>
              Mạng Lưới 3 Hub Vcube MES
            </h3>
            <p className="text-xs text-slate-500">Phủ sóng 3 miền Bắc - Trung - Nam</p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Hub Hanoi */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Hub Hà Nội (Miền Bắc)</span>
                <span className="text-[10px] font-tech font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                  11/16 máy chạy
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">Bambu X1C, Creality K1, Elegoo 12K</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-sky-600 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            {/* Hub Da Nang */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Hub Đà Nẵng (Miền Trung)</span>
                <span className="text-[10px] font-tech font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  5/8 máy chạy
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">Bambu P1S, Anycubic SLA 8K</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '62%' }} />
              </div>
            </div>

            {/* Hub HCM */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Mega Hub TP.HCM (Miền Nam)</span>
                <span className="text-[10px] font-tech font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                  19/28 máy chạy
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">Farm X1C, Prusa MK4, Formlabs Form 4</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateSection?.('partners')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Quản Lý Mạng Lưới Xưởng In (Group 1) ➔
          </button>
        </div>
      </div>
    </div>
  );
};

export default Group0OverviewPanel;
