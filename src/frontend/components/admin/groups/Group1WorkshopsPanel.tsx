import React, { useState, useMemo } from 'react';
import { useWorkshopAdminStore } from '../../../../stores/useWorkshopAdminStore';
import { useLanguage } from '../../../context/LanguageContext';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial } from '../../../../types';

export interface Group1WorkshopsPanelProps {
  printers?: any[];
  onUpdatePrinters?: (printers: any[]) => void;
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

export const Group1WorkshopsPanel: React.FC<Group1WorkshopsPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<'workshops' | 'fleet' | 'materials'>('workshops');

  // Zustand Store
  const {
    workshops,
    machines,
    materials,
    filters,
    setFilterRegion,
    setFilterStatus,
    setSearchQuery,
    approveWorkshop,
    suspendWorkshop,
    reactivateWorkshop,
    addWorkshop,
    updateMachineStatus,
    addMachine,
    updateMaterialStock,
    addMaterial,
    getDepreciationPerHour,
    getElectricityPerHour,
    getMachineTotalRunningCostPerHour,
    getLowStockMaterials,
    getWorkshopStats
  } = useWorkshopAdminStore();

  const stats = getWorkshopStats();
  const lowStockList = getLowStockMaterials();

  // Modals state
  const [isAddWorkshopModalOpen, setIsAddWorkshopModalOpen] = useState(false);
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

  // New Workshop form
  const [newWorkshopForm, setNewWorkshopForm] = useState({
    workshopName: '',
    address: '',
    region: 'Bắc' as 'Bắc' | 'Trung' | 'Nam',
    totalMachines: 2,
    activeMachinesNow: 0,
    electricityRateOverride: 2850,
    laborRateOverride: 65000,
    contactPhone: '',
    contactEmail: '',
    verifiedStatus: 'Pending' as 'Pending' | 'Verified' | 'Suspended'
  });

  // New Machine form
  const [newMachineForm, setNewMachineForm] = useState({
    workshopId: workshops[0]?.id || '',
    machineName: '',
    machineType: 'FDM' as WorkshopMachine['machineType'],
    avgPowerKW: 0.35,
    purchasePrice: 35000000,
    lifetimeHours: 8000,
    status: 'Free' as WorkshopMachine['status'],
    buildVolumeMm: { x: 256, y: 256, z: 256 }
  });

  // New Material form
  const [newMaterialForm, setNewMaterialForm] = useState({
    workshopId: workshops[0]?.id || '',
    materialName: '',
    materialType: 'PLA' as WorkshopMaterial['materialType'],
    pricePerKg: 380000,
    colorHex: '#1E293B',
    colorName: 'Đen Mờ',
    density: 1.24,
    currentStockGrams: 5000,
    lowStockThresholdGrams: 1500
  });

  // Filtered workshops
  const filteredWorkshops = useMemo(() => {
    return workshops.filter((w) => {
      const matchRegion = filters.region === 'all' || w.region === filters.region;
      const matchStatus = filters.status === 'all' || w.verifiedStatus === filters.status;
      const matchSearch =
        !filters.searchQuery ||
        w.workshopName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        w.address.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (w.contactPhone && w.contactPhone.includes(filters.searchQuery));
      return matchRegion && matchStatus && matchSearch;
    });
  }, [workshops, filters]);

  // Fleet filters
  const [fleetStatusFilter, setFleetStatusFilter] = useState<'all' | 'Free' | 'Busy' | 'Maintenance'>('all');
  const [fleetWorkshopFilter, setFleetWorkshopFilter] = useState<string>('all');

  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchStatus = fleetStatusFilter === 'all' || m.status === fleetStatusFilter;
      const matchWs = fleetWorkshopFilter === 'all' || m.workshopId === fleetWorkshopFilter;
      return matchStatus && matchWs;
    });
  }, [machines, fleetStatusFilter, fleetWorkshopFilter]);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  const handleApprove = (id: string, name: string) => {
    approveWorkshop(id);
    onShowToast?.(isVi ? `Đã duyệt kích hoạt xưởng: ${name}` : `Approved workshop: ${name}`);
  };

  const handleSuspend = (id: string, name: string) => {
    suspendWorkshop(id);
    onShowToast?.(isVi ? `Đã tạm đình chỉ xưởng: ${name}` : `Suspended workshop: ${name}`);
  };

  const handleCreateWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkshopForm.workshopName || !newWorkshopForm.address) {
      alert(isVi ? 'Vui lòng điền tên xưởng và địa chỉ' : 'Please provide workshop name and address');
      return;
    }
    addWorkshop(newWorkshopForm);
    setIsAddWorkshopModalOpen(false);
    onShowToast?.(isVi ? 'Đã thêm xưởng in mới thành công!' : 'Successfully added new workshop!');
    setNewWorkshopForm({
      workshopName: '',
      address: '',
      region: 'Bắc',
      totalMachines: 2,
      activeMachinesNow: 0,
      electricityRateOverride: 2850,
      laborRateOverride: 65000,
      contactPhone: '',
      contactEmail: '',
      verifiedStatus: 'Pending'
    });
  };

  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineForm.machineName) {
      alert(isVi ? 'Vui lòng nhập tên máy in' : 'Please enter printer name');
      return;
    }
    addMachine(newMachineForm);
    setIsAddMachineModalOpen(false);
    onShowToast?.(isVi ? 'Đã biên chế máy in mới vào hệ thống!' : 'Added new machine to fleet!');
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialForm.materialName) {
      alert(isVi ? 'Vui lòng nhập tên vật liệu' : 'Please enter material name');
      return;
    }
    addMaterial(newMaterialForm);
    setIsAddMaterialModalOpen(false);
    onShowToast?.(isVi ? 'Đã cập nhật cuộn nhựa vào kho!' : 'Added new material to inventory!');
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00687A]/10 text-[#00687A]">
              Group 1
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isVi ? 'Quản Trị Mạng Lưới Xưởng In & Đội Máy (Workshops Hub)' : 'Workshops & Fleet Network Hub'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isVi
              ? 'Điều phối xưởng in 3 miền Bắc - Trung - Nam, thanh tra hiệu suất máy in real-time và kiểm soát tồn kho nhựa.'
              : 'Orchestrate regional workshops across North, Central, and South Vietnam, inspect fleet real-time, and monitor materials.'}
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('workshops')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'workshops'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">home_work</span>
            {isVi ? 'Danh Sách Xưởng' : 'Workshops'}
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">precision_manufacturing</span>
            {isVi ? 'Đội Máy (Fleet)' : 'Fleet Inspector'}
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            {isVi ? 'Tồn Kho Nhựa' : 'Materials'}
            {stats.lowStockMaterialsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full">
                {stats.lowStockMaterialsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">{isVi ? 'Tổng Xưởng' : 'Total Hubs'}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalWorkshops}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{stats.verifiedCount} {isVi ? 'Đã duyệt' : 'Verified'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-amber-700">{isVi ? 'Chờ Duyệt' : 'Pending Review'}</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats.pendingCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">{isVi ? 'Cần phê duyệt' : 'Action needed'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">{isVi ? 'Tổng Máy In' : 'Fleet Size'}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalMachines}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">3 {isVi ? 'Miền Bắc-Trung-Nam' : 'Regions'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">{isVi ? 'Máy Rảnh (Free)' : 'Printers Free'}</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.freeMachinesCount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{isVi ? 'Sẵn sàng nhận lệnh' : 'Available now'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-blue-700">{isVi ? 'Đang In (Busy)' : 'Printing Now'}</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.busyMachinesCount}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
            {stats.totalMachines > 0 ? Math.round((stats.busyMachinesCount / stats.totalMachines) * 100) : 0}% {isVi ? 'công suất' : 'load'}
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-2xs ${stats.lowStockMaterialsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className={`text-[11px] font-bold uppercase ${stats.lowStockMaterialsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {isVi ? 'Cảnh Báo Nhựa' : 'Low Stock Alert'}
          </div>
          <div className={`text-2xl font-black mt-1 ${stats.lowStockMaterialsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {stats.lowStockMaterialsCount}
          </div>
          <div className={`text-[11px] font-semibold mt-0.5 ${stats.lowStockMaterialsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {stats.lowStockMaterialsCount > 0 ? (isVi ? 'Sắp hết cuộn' : 'Items low') : (isVi ? 'Đủ tồn kho' : 'Stock OK')}
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH XƯỞNG */}
      {activeTab === 'workshops' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Khu vực:' : 'Region:'}</span>
                {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRegion(r)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.region === r
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r === 'all' ? (isVi ? 'Tất cả' : 'All') : r}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Trạng thái:' : 'Status:'}</span>
                {(['all', 'Verified', 'Pending', 'Suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.status === s
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all' ? (isVi ? 'Tất cả' : 'All') : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm tên xưởng, địa chỉ, sđt...' : 'Search workshop...'}
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A] focus:bg-white"
                />
              </div>

              <button
                onClick={() => setIsAddWorkshopModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                {isVi ? 'Thêm Xưởng In' : 'Add Workshop'}
              </button>
            </div>
          </div>

          {/* Workshop Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkshops.map((w) => {
              const wsMachines = machines.filter((m) => m.workshopId === w.id);
              const freeCount = wsMachines.filter((m) => m.status === 'Free').length;
              const busyCount = wsMachines.filter((m) => m.status === 'Busy').length;

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              w.region === 'Bắc'
                                ? 'bg-sky-100 text-sky-700'
                                : w.region === 'Trung'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            Miền {w.region}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.verifiedStatus === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : w.verifiedStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {w.verifiedStatus === 'Verified'
                              ? '● ' + (isVi ? 'Đã duyệt' : 'Verified')
                              : w.verifiedStatus === 'Pending'
                              ? '⏳ ' + (isVi ? 'Chờ duyệt' : 'Pending')
                              : '✕ ' + (isVi ? 'Đình chỉ' : 'Suspended')}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-2 line-clamp-1">{w.workshopName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 line-clamp-1">
                          <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                          {w.address}
                        </p>
                      </div>
                    </div>

                    {/* Machine summary mini badges */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-slate-50 rounded-lg text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{isVi ? 'Tổng máy' : 'Total'}</div>
                        <div className="text-base font-black text-slate-800">{w.totalMachines}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">{isVi ? 'Rảnh' : 'Free'}</div>
                        <div className="text-base font-black text-emerald-600">{freeCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-600 font-bold uppercase">{isVi ? 'Đang In' : 'Busy'}</div>
                        <div className="text-base font-black text-blue-600">{busyCount}</div>
                      </div>
                    </div>

                    {/* Rates & Contact */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVi ? 'Đơn giá điện:' : 'Power rate:'}</span>
                        <span className="font-semibold text-slate-700">{formatVnd(w.electricityRateOverride || 2850)}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVi ? 'Nhân công vận hành:' : 'Labor rate:'}</span>
                        <span className="font-semibold text-slate-700">{formatVnd(w.laborRateOverride || 65000)}/h</span>
                      </div>
                      {w.contactPhone && (
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-400">{isVi ? 'Hotline:' : 'Contact:'}</span>
                          <span className="font-mono text-slate-700">{w.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-slate-50/70 flex items-center justify-between gap-2">
                    {w.verifiedStatus === 'Pending' ? (
                      <button
                        onClick={() => handleApprove(w.id, w.workshopName)}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {isVi ? 'Phê Duyệt Xưởng Này' : 'Approve Workshop'}
                      </button>
                    ) : w.verifiedStatus === 'Verified' ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => {
                            setActiveTab('fleet');
                            setFleetWorkshopFilter(w.id);
                          }}
                          className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">view_timeline</span>
                          {isVi ? 'Xem Đội Máy' : 'View Fleet'}
                        </button>
                        <button
                          onClick={() => handleSuspend(w.id, w.workshopName)}
                          className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          title={isVi ? 'Đình chỉ xưởng' : 'Suspend workshop'}
                        >
                          {isVi ? 'Đình Chỉ' : 'Suspend'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          reactivateWorkshop(w.id);
                          onShowToast?.(isVi ? `Đã kích hoạt lại xưởng: ${w.workshopName}` : `Reactivated workshop: ${w.workshopName}`);
                        }}
                        className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">replay</span>
                        {isVi ? 'Khôi Phục Hoạt Động' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ĐỘI MÁY IN TOÀN HỆ THỐNG (FLEET INSPECTOR) */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {/* Fleet Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Trạng thái máy:' : 'Printer Status:'}</span>
                {(['all', 'Free', 'Busy', 'Maintenance'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFleetStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      fleetStatusFilter === s
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all'
                      ? (isVi ? 'Tất cả' : 'All')
                      : s === 'Free'
                      ? (isVi ? '🟢 Rảnh (Free)' : '🟢 Free')
                      : s === 'Busy'
                      ? (isVi ? '🔵 Đang In' : '🔵 Busy')
                      : (isVi ? '🟠 Bảo Trì' : '🟠 Maint')}
                  </button>
                ))}
              </div>

              {/* Filter by Workshop */}
              <select
                value={fleetWorkshopFilter}
                onChange={(e) => setFleetWorkshopFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00687A]"
              >
                <option value="all">{isVi ? 'Tất cả trạm xưởng' : 'All Workshops'}</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.workshopName} ({w.region})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddMachineModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {isVi ? 'Biên Chế Máy Mới' : 'Register Printer'}
            </button>
          </div>

          {/* Machine Fleet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMachines.map((m) => {
              const ws = workshops.find((w) => w.id === m.workshopId);
              const depPerHour = getDepreciationPerHour(m);
              const elecPerHour = getElectricityPerHour(m, ws?.electricityRateOverride);
              const totalHourlyCost = depPerHour + elecPerHour;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                          {m.machineType}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            m.status === 'Free'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.status === 'Busy'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'Free'
                                ? 'bg-emerald-500 animate-pulse'
                                : m.status === 'Busy'
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          {m.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-2">{m.machineName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">warehouse</span>
                        {ws?.workshopName || 'N/A'} ({ws?.region})
                      </p>
                    </div>

                    {m.buildVolumeMm && (
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 block">{isVi ? 'Khổ in (mm)' : 'Volume'}</span>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {m.buildVolumeMm.x}×{m.buildVolumeMm.y}×{m.buildVolumeMm.z}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hourly Cost Breakdown Card (Inkiri Standard) */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                      <span>{isVi ? 'Định Mức Chi Phí Vận Hành' : 'Operational Cost Engine'}</span>
                      <span className="font-bold text-[#00687A]">{formatVnd(totalHourlyCost)}/h</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {isVi ? 'Khấu hao máy/giờ:' : 'Depreciation/h:'}
                        </div>
                        <div className="font-bold text-slate-800 font-mono">{formatVnd(depPerHour)}/h</div>
                        <div className="text-[9px] text-slate-400">
                          ({formatVnd(m.purchasePrice)} / {m.lifetimeHours}h)
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {isVi ? 'Tiền điện máy/giờ:' : 'Electricity/h:'}
                        </div>
                        <div className="font-bold text-slate-800 font-mono">{formatVnd(elecPerHour)}/h</div>
                        <div className="text-[9px] text-slate-400">
                          ({m.avgPowerKW} kW × {ws?.electricityRateOverride || 2850}đ)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Machine Action Bar */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">
                      {m.currentJobId ? (
                        <span className="text-blue-600 font-semibold font-mono">Job: {m.currentJobId}</span>
                      ) : (
                        isVi ? 'Đang chờ lệnh in' : 'Idle ready'
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateMachineStatus(m.id, m.status === 'Free' ? 'Busy' : 'Free')}
                        className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                          m.status === 'Free'
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {m.status === 'Free' ? (isVi ? 'Đặt Bận (Busy)' : 'Set Busy') : (isVi ? 'Đặt Rảnh (Free)' : 'Set Free')}
                      </button>
                      <button
                        onClick={() =>
                          updateMachineStatus(m.id, m.status === 'Maintenance' ? 'Free' : 'Maintenance')
                        }
                        className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-amber-700 bg-slate-100 rounded hover:bg-amber-50 cursor-pointer"
                        title={isVi ? 'Chuyển sang bảo trì' : 'Toggle maintenance'}
                      >
                        <span className="material-symbols-outlined text-[14px]">build</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TỒN KHO & NHỰA TOÀN MẠNG LƯỚI */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Low stock warning banner */}
          {lowStockList.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-rose-600 text-2xl mt-0.5">warning</span>
              <div className="flex-1">
                <h4 className="font-bold text-rose-900 text-sm">
                  {isVi
                    ? `Cảnh Báo: Có ${lowStockList.length} cuộn/loại vật liệu đang dưới ngưỡng an toàn!`
                    : `Alert: ${lowStockList.length} material spools are below safe stock threshold!`}
                </h4>
                <p className="text-xs text-rose-700 mt-1">
                  {isVi
                    ? 'Cần nhập bổ sung ngay để không gián đoạn các đơn hàng in 3D đang dispatch tới xưởng.'
                    : 'Restock immediately to prevent dispatch bottlenecks across network workshops.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockList.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-white border border-rose-300 text-rose-800 text-[11px] font-bold rounded-md"
                    >
                      {m.materialName}: {m.currentStockGrams}g / {m.lowStockThresholdGrams}g
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Material inventory table controls */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              {isVi
                ? `Đang theo dõi ${materials.length} mã vật liệu trên toàn mạng lưới xưởng.`
                : `Tracking ${materials.length} material SKUs across all workshops.`}
            </div>

            <button
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {isVi ? 'Thêm Cuộn Nhựa / Resin' : 'Add Material SKU'}
            </button>
          </div>

          {/* Materials Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{isVi ? 'Vật liệu' : 'Material'}</th>
                    <th className="py-3 px-3">{isVi ? 'Loại' : 'Type'}</th>
                    <th className="py-3 px-3">{isVi ? 'Xưởng giữ kho' : 'Workshop'}</th>
                    <th className="py-3 px-3">{isVi ? 'Đơn giá/kg' : 'Price/kg'}</th>
                    <th className="py-3 px-3">{isVi ? 'Tồn kho hiện tại' : 'Current Stock'}</th>
                    <th className="py-3 px-3">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isVi ? 'Điều chỉnh nhanh' : 'Quick Adjust'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((mat) => {
                    const ws = workshops.find((w) => w.id === mat.workshopId);
                    const isLow = mat.stockStatus === 'LowStock' || mat.stockStatus === 'OutOfStock';

                    return (
                      <tr key={mat.id} className={`hover:bg-slate-50/70 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: mat.colorHex }}
                              title={mat.colorName || mat.colorHex}
                            />
                            <div>
                              <div className="font-bold text-slate-900">{mat.materialName}</div>
                              <div className="text-[10px] text-slate-400">{mat.colorName} • {mat.density} g/cm³</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px]">
                            {mat.materialType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {ws?.workshopName || 'N/A'} ({ws?.region})
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          {formatVnd(mat.pricePerKg)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold font-mono text-slate-900">{mat.currentStockGrams}g</div>
                          <div className="text-[10px] text-slate-400">
                            Ngưỡng min: {mat.lowStockThresholdGrams || 1000}g
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mat.stockStatus === 'Tracking'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mat.stockStatus === 'LowStock'
                                ? 'bg-amber-100 text-amber-800 font-black animate-pulse'
                                : 'bg-rose-100 text-rose-800 font-black'
                            }`}
                          >
                            {mat.stockStatus === 'Tracking'
                              ? isVi ? 'Đầy đủ' : 'In Stock'
                              : mat.stockStatus === 'LowStock'
                              ? isVi ? 'Sắp hết' : 'Low Stock'
                              : isVi ? 'Hết hàng' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const nextStock = Math.max(0, mat.currentStockGrams - 500);
                                updateMaterialStock(mat.id, nextStock);
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded cursor-pointer"
                              title="-500g"
                            >
                              -500g
                            </button>
                            <button
                              onClick={() => {
                                const nextStock = mat.currentStockGrams + 1000;
                                updateMaterialStock(mat.id, nextStock);
                              }}
                              className="px-2 py-0.5 bg-[#00687A]/10 hover:bg-[#00687A]/20 text-[#00687A] text-[11px] font-bold rounded cursor-pointer"
                              title="+1kg (1000g)"
                            >
                              +1kg
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM XƯỞNG IN */}
      {isAddWorkshopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {isVi ? 'Thêm Xưởng In Mới Vào Mạng Lưới' : 'Register New Partner Workshop'}
              </h3>
              <button
                onClick={() => setIsAddWorkshopModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateWorkshop} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Tên xưởng in:' : 'Workshop Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Smart 3D FabLab Đà Nẵng"
                  value={newWorkshopForm.workshopName}
                  onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, workshopName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Khu vực (Miền):' : 'Region:'}
                  </label>
                  <select
                    value={newWorkshopForm.region}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, region: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  >
                    <option value="Bắc">Miền Bắc (Hà Nội, Hải Phòng...)</option>
                    <option value="Trung">Miền Trung (Đà Nẵng, Huế...)</option>
                    <option value="Nam">Miền Nam (TP.HCM, Bình Dương...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Trạng thái ban đầu:' : 'Initial Status:'}
                  </label>
                  <select
                    value={newWorkshopForm.verifiedStatus}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, verifiedStatus: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  >
                    <option value="Pending">Chờ duyệt (Pending)</option>
                    <option value="Verified">Đã duyệt (Verified)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Địa chỉ xưởng:' : 'Address:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                  value={newWorkshopForm.address}
                  onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Số điện thoại:' : 'Phone:'}
                  </label>
                  <input
                    type="text"
                    placeholder="0988 xxx xxx"
                    value={newWorkshopForm.contactPhone}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactPhone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Email liên hệ:' : 'Email:'}
                  </label>
                  <input
                    type="email"
                    placeholder="workshop@vcube.vn"
                    value={newWorkshopForm.contactEmail}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactEmail: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Giá điện riêng (VNĐ/kWh):' : 'Electricity Rate (VND/kWh):'}
                  </label>
                  <input
                    type="number"
                    value={newWorkshopForm.electricityRateOverride}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, electricityRateOverride: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Công nhân công (VNĐ/giờ):' : 'Labor Rate (VND/h):'}
                  </label>
                  <input
                    type="number"
                    value={newWorkshopForm.laborRateOverride}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, laborRateOverride: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddWorkshopModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Lưu & Khởi Tạo Xưởng' : 'Save Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BIÊN CHẾ MÁY MỚI */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isVi ? 'Biên Chế Máy In Vào Hệ Thống' : 'Register New Machine'}
              </h3>
              <button
                onClick={() => setIsAddMachineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateMachine} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Xưởng tiếp nhận:' : 'Workshop:'}</label>
                <select
                  value={newMachineForm.workshopId}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, workshopId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                >
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>{w.workshopName} ({w.region})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Tên máy in:' : 'Machine Name:'}</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bambu Lab X1-Carbon #05"
                  value={newMachineForm.machineName}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, machineName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Công nghệ in:' : 'Technology:'}</label>
                  <select
                    value={newMachineForm.machineType}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, machineType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  >
                    <option value="FDM">FDM (Dây nhựa)</option>
                    <option value="SLA">SLA (Resin lỏng)</option>
                    <option value="SLS">SLS (Bột nylon)</option>
                    <option value="PolyJet">PolyJet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Công suất chạy (kW):' : 'Avg Power (kW):'}</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newMachineForm.avgPowerKW}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, avgPowerKW: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Giá mua máy (VNĐ):' : 'Purchase Price:'}</label>
                  <input
                    type="number"
                    value={newMachineForm.purchasePrice}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, purchasePrice: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Tuổi thọ khấu hao (giờ):' : 'Lifetime (Hours):'}</label>
                  <input
                    type="number"
                    value={newMachineForm.lifetimeHours}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, lifetimeHours: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMachineModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Thêm Máy' : 'Add Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM VẬT LIỆU */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isVi ? 'Thêm Cuộn Nhựa / Vật Liệu Mới' : 'Add Material SKU'}
              </h3>
              <button
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Xưởng lưu kho:' : 'Workshop:'}</label>
                <select
                  value={newMaterialForm.workshopId}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, workshopId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                >
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>{w.workshopName} ({w.region})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Tên vật liệu:' : 'Material Name:'}</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: PETG-CF Carbon Fiber Đen"
                  value={newMaterialForm.materialName}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Họ nhựa:' : 'Polymer Type:'}</label>
                  <select
                    value={newMaterialForm.materialType}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  >
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="TPU">TPU</option>
                    <option value="PA">PA (Nylon)</option>
                    <option value="Resin">Resin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Đơn giá/kg (VNĐ):' : 'Price/kg:'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.pricePerKg}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, pricePerKg: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Tồn kho ban đầu (grams):' : 'Stock (g):'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.currentStockGrams}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, currentStockGrams: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isVi ? 'Ngưỡng cảnh báo (grams):' : 'Threshold (g):'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.lowStockThresholdGrams}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, lowStockThresholdGrams: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Lưu Cuộn Nhựa' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Group1WorkshopsPanel;
