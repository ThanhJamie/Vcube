import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WorkshopPartner } from '../../types';
import { WORKSHOP_PARTNERS } from '../../data/mockData';
import { dbService } from '../../../backend';
import { useLanguage } from '../../context/LanguageContext';

interface AdminPartnersPanelProps {
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

export const AdminPartnersPanel: React.FC<AdminPartnersPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [partners, setPartners] = useState<WorkshopPartner[]>(WORKSHOP_PARTNERS);
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'hanoi' | 'danang' | 'hcm'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPartner, setEditingPartner] = useState<WorkshopPartner | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New partner form state
  const [newPartner, setNewPartner] = useState<Partial<WorkshopPartner>>({
    name: '',
    region: 'hanoi',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    supportedTechnologies: ['FDM', 'SLA'],
    activePrintersCount: 4,
    availablePrintersCount: 4,
    slaRating: 4.9,
    currentQueueLength: 0,
    status: 'active',
    maxBuildVolume: { x: 256, y: 256, z: 256 },
    completedJobsCount: 0,
    inStockMaterials: ['PLA', 'PETG', 'Resin']
  });

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setIsLoading(true);
        const data = await dbService.getWorkshopPartners();
        if (data && data.length > 0) {
          setPartners(data);
        }
      } catch (err) {
        console.warn('Failed to load workshop partners from db:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  const filteredPartners = partners.filter((p) => {
    const matchRegion = selectedRegion === 'all' || p.region === selectedRegion;
    const matchQuery =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRegion && matchQuery;
  });

  const totalPrinters = partners.reduce((acc, p) => acc + (p.activePrintersCount + p.availablePrintersCount), 0);
  const activePrinters = partners.reduce((acc, p) => acc + p.activePrintersCount, 0);
  const avgSla = (partners.reduce((acc, p) => acc + p.slaRating, 0) / (partners.length || 1)).toFixed(2);
  const totalQueueHours = partners.reduce((acc, p) => acc + p.currentQueueLength, 0).toFixed(1);

  const handleToggleStatus = (partnerId: string) => {
    setPartners((prev) =>
      prev.map((p) => {
        if (p.id === partnerId) {
          const nextStatus = p.status === 'active' ? 'busy' : 'active';
          const updated = { ...p, status: nextStatus as any };
          dbService.saveWorkshopPartner(updated).catch(console.warn);
          onShowToast?.(
            isVi
              ? `Đã cập nhật trạng thái xưởng: ${p.name} -> ${nextStatus}`
              : `Updated status for ${p.name}: ${nextStatus}`
          );
          return updated;
        }
        return p;
      })
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    setPartners((prev) =>
      prev.map((p) => (p.id === editingPartner.id ? editingPartner : p))
    );
    dbService.saveWorkshopPartner(editingPartner).catch(console.warn);
    onShowToast?.(
      isVi
        ? `Đã lưu thay đổi cấu hình trạm xưởng ${editingPartner.name}`
        : `Saved changes for workshop ${editingPartner.name}`
    );
    setEditingPartner(null);
  };

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.address) {
      onShowToast?.(isVi ? 'Vui lòng nhập tên xưởng và địa chỉ' : 'Please enter workshop name and address');
      return;
    }

    const created: WorkshopPartner = {
      id: `hub-${Date.now().toString(36)}`,
      name: newPartner.name || 'Xưởng In Mới',
      region: (newPartner.region as any) || 'hanoi',
      address: newPartner.address || '',
      contactPerson: newPartner.contactPerson || 'Trưởng Kỹ Thuật',
      phone: newPartner.phone || '1900 6833',
      email: newPartner.email || 'mes@vcube.vn',
      supportedTechnologies: (newPartner.supportedTechnologies?.length ? newPartner.supportedTechnologies : ['FDM']) as any,
      maxBuildVolume: newPartner.maxBuildVolume || { x: 256, y: 256, z: 256 },
      activePrintersCount: Number(newPartner.activePrintersCount) || 2,
      availablePrintersCount: Number(newPartner.availablePrintersCount) || 2,
      slaRating: Number(newPartner.slaRating) || 5.0,
      completedJobsCount: 0,
      currentQueueLength: 0,
      inStockMaterials: newPartner.inStockMaterials || ['PLA', 'PETG'],
      status: (newPartner.status as any) || 'active'
    };

    setPartners((prev) => [created, ...prev]);
    dbService.saveWorkshopPartner(created).catch(console.warn);
    onShowToast?.(
      isVi
        ? `Đã thêm xưởng in mới vào mạng lưới: ${created.name}`
        : `Added new workshop partner: ${created.name}`
    );
    setIsAddModalOpen(false);
    setNewPartner({
      name: '',
      region: 'hanoi',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
      supportedTechnologies: ['FDM', 'SLA'],
      activePrintersCount: 4,
      availablePrintersCount: 4,
      slaRating: 4.9,
      currentQueueLength: 0,
      status: 'active',
      maxBuildVolume: { x: 256, y: 256, z: 256 },
      completedJobsCount: 0,
      inStockMaterials: ['PLA', 'PETG', 'Resin']
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A] text-28">factory</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isVi ? 'Mạng Lưới Xưởng In Đối Tác (MES Hubs)' : 'Workshop Partner MES Network'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isVi
              ? 'Hệ thống điều phối năng lực sản xuất phân tán 3 miền: Hà Nội, Đà Nẵng, TP. Hồ Chí Minh'
              : 'Distributed manufacturing network across 3 regional hubs: Hanoi, Da Nang, HCM City'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add_business</span>
            {isVi ? 'Thêm Xưởng In Mới' : 'Add New Partner'}
          </button>
          {onNavigateSection && (
            <button
              onClick={() => onNavigateSection('queue')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#00687A] border border-[#00687A]/30 text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              {isVi ? 'Hàng Đợi MES' : 'Production Queue'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isVi ? 'Tổng Trạm Hubs' : 'Total Hubs'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-cyan-50 text-[#00687A] flex items-center justify-center material-symbols-outlined text-sm">
              hub
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{partners.length}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">100% Online Ready</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isVi ? 'Máy In Hoạt Động' : 'Active Printers'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center material-symbols-outlined text-sm">
              print
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {activePrinters} / {totalPrinters}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {Math.round((activePrinters / (totalPrinters || 1)) * 100)}% {isVi ? 'công suất' : 'capacity'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isVi ? 'SLA Đúng Hạn' : 'SLA On-Time'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center material-symbols-outlined text-sm">
              verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{avgSla} / 5.0</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">★ 99.2% {isVi ? 'đạt chuẩn' : 'compliance'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isVi ? 'Giờ In Tồn Đọng' : 'Total Queue'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center material-symbols-outlined text-sm">
              schedule
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalQueueHours}h</div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {isVi ? 'Ước tính bàn giao: 24h' : 'Lead time avg: 24h'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {(['all', 'hanoi', 'danang', 'hcm'] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedRegion === reg
                  ? 'bg-[#00687A] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {reg === 'all' && (isVi ? 'Tất Cả Vùng' : 'All Regions')}
              {reg === 'hanoi' && (isVi ? 'Miền Bắc (Hà Nội)' : 'North (Hanoi)')}
              {reg === 'danang' && (isVi ? 'Miền Trung (Đà Nẵng)' : 'Central (Da Nang)')}
              {reg === 'hcm' && (isVi ? 'Miền Nam (TP.HCM)' : 'South (HCMC)')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isVi ? 'Tìm trạm xưởng, địa chỉ...' : 'Search hub, address...'}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00687A] text-slate-800"
          />
        </div>
      </div>

      {/* Workshop Hub Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPartners.map((hub) => {
          const totalHubPrinters = hub.activePrintersCount + hub.availablePrintersCount;
          const loadPercent = Math.round((hub.activePrintersCount / (totalHubPrinters || 1)) * 100);

          return (
            <div
              key={hub.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-[#00687A]/40 transition-all shadow-2xs flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      hub.region === 'hanoi'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : hub.region === 'danang'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {hub.region.toUpperCase()} HUB
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      hub.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hub.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {hub.status === 'active'
                      ? isVi
                        ? 'Sẵn Sàng In'
                        : 'Active'
                      : isVi
                      ? 'Đang Quá Tải'
                      : 'High Load'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#00687A] transition-colors leading-tight">
                  {hub.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                  <span className="material-symbols-outlined text-xs shrink-0">location_on</span>
                  {hub.address}
                </p>
              </div>

              {/* Card Body Specs */}
              <div className="p-5 space-y-4 text-xs text-slate-600 flex-1">
                {/* Tech Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {hub.supportedTechnologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 font-tech font-bold text-[11px] rounded border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-cyan-50 text-[#00687A] font-tech font-bold text-[11px] rounded border border-cyan-100">
                    Max: {hub.maxBuildVolume.x}×{hub.maxBuildVolume.y}×{hub.maxBuildVolume.z}mm
                  </span>
                </div>

                {/* Capacity Progress */}
                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mb-1">
                    <span>{isVi ? 'Tải máy in' : 'Printer Utilization'}</span>
                    <span>
                      {hub.activePrintersCount} / {totalHubPrinters} ({loadPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 85 ? 'bg-rose-500' : loadPercent > 50 ? 'bg-amber-500' : 'bg-[#00687A]'
                      }`}
                      style={{ width: `${Math.min(100, loadPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics 2-column grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">{isVi ? 'Đánh giá SLA:' : 'SLA Rating:'}</span>
                    <span className="font-bold text-slate-800">★ {hub.slaRating} / 5.0</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isVi ? 'Hàng đợi tồn:' : 'Current Queue:'}</span>
                    <span className="font-bold text-amber-600">{hub.currentQueueLength} giờ in</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isVi ? 'Liên hệ:' : 'Contact:'}</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{hub.contactPerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Hotline:</span>
                    <span className="font-mono font-semibold text-slate-800">{hub.phone}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(hub.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    hub.status === 'active'
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                  title={isVi ? 'Bật / Tắt nhận thêm đơn' : 'Toggle workload reception'}
                >
                  {hub.status === 'active'
                    ? isVi
                      ? 'Tạm Giảm Tải'
                      : 'Throttle'
                    : isVi
                    ? 'Nhận Đơn Lại'
                    : 'Activate'}
                </button>

                <button
                  onClick={() => setEditingPartner({ ...hub })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">tune</span>
                  {isVi ? 'Cấu Hình' : 'Configure'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Hub Modal */}
      {editingPartner && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {isVi ? `Cấu Hình Trạm: ${editingPartner.name}` : `Configure Hub: ${editingPartner.name}`}
              </h3>
              <button
                onClick={() => setEditingPartner(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Tên Xưởng MES' : 'MES Hub Name'}
                </label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Người Quản Trị' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={editingPartner.contactPerson}
                    onChange={(e) => setEditingPartner({ ...editingPartner, contactPerson: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hotline</label>
                  <input
                    type="text"
                    value={editingPartner.phone}
                    onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Địa Chỉ Xưởng' : 'Address'}
                </label>
                <input
                  type="text"
                  value={editingPartner.address}
                  onChange={(e) => setEditingPartner({ ...editingPartner, address: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Số Máy Sẵn Sàng (Idle)' : 'Available Printers'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingPartner.availablePrintersCount}
                    onChange={(e) =>
                      setEditingPartner({
                        ...editingPartner,
                        availablePrintersCount: Number(e.target.value)
                      })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Hàng Đợi Hiện Tại (giờ)' : 'Current Queue (hours)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingPartner.currentQueueLength}
                    onChange={(e) =>
                      setEditingPartner({
                        ...editingPartner,
                        currentQueueLength: Number(e.target.value)
                      })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00687A] hover:bg-[#005260] text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {isVi ? 'Lưu Cấu Hình' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add New Hub Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-cyan-50 text-[#00687A] flex items-center justify-center material-symbols-outlined text-lg">
                  add_business
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isVi ? 'Thêm Xưởng In Mới Vào Mạng Lưới MES' : 'Add New Workshop Partner Hub'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Mở rộng mạng lưới sản xuất phân tán VCUBE</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Tên Xưởng In / Trạm MES *' : 'Workshop Partner Name *'}
                </label>
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  placeholder="VD: Xưởng In 3D CNC Cần Thơ TechHub"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Khu Vực Địa Lý *' : 'Region *'}
                  </label>
                  <select
                    value={newPartner.region}
                    onChange={(e) => setNewPartner({ ...newPartner, region: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="hanoi">{isVi ? 'Miền Bắc (Hà Nội & lân cận)' : 'North (Hanoi)'}</option>
                    <option value="danang">{isVi ? 'Miền Trung (Đà Nẵng)' : 'Central (Da Nang)'}</option>
                    <option value="hcm">{isVi ? 'Miền Nam (TP. Hồ Chí Minh)' : 'South (HCMC)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Đánh Giá SLA Ban Đầu' : 'Initial SLA Rating'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={newPartner.slaRating}
                    onChange={(e) => setNewPartner({ ...newPartner, slaRating: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Địa Chỉ Xưởng Chi Tiết *' : 'Full Workshop Address *'}
                </label>
                <input
                  type="text"
                  value={newPartner.address}
                  onChange={(e) => setNewPartner({ ...newPartner, address: e.target.value })}
                  placeholder="VD: Số 123 Đường 3/2, Q. Ninh Kiều, TP. Cần Thơ"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Người Đại Diện / Quản Trị' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={newPartner.contactPerson}
                    onChange={(e) => setNewPartner({ ...newPartner, contactPerson: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hotline Liên Hệ</label>
                  <input
                    type="text"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Số Máy In Hoạt Động' : 'Active Printers'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPartner.activePrintersCount}
                    onChange={(e) => setNewPartner({ ...newPartner, activePrintersCount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Số Máy In Dự Phòng' : 'Available / Idle Printers'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPartner.availablePrintersCount}
                    onChange={(e) => setNewPartner({ ...newPartner, availablePrintersCount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Công Nghệ Hỗ Trợ' : 'Supported Technologies'}
                </label>
                <div className="flex items-center gap-4 pt-1">
                  {(['FDM', 'SLA', 'SLS'] as const).map((tech) => {
                    const isChecked = newPartner.supportedTechnologies?.includes(tech);
                    return (
                      <label key={tech} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = newPartner.supportedTechnologies || [];
                            if (e.target.checked) {
                              setNewPartner({ ...newPartner, supportedTechnologies: [...current, tech] });
                            } else {
                              setNewPartner({ ...newPartner, supportedTechnologies: current.filter(t => t !== tech) });
                            }
                          }}
                          className="rounded text-[#00687A]"
                        />
                        <span>{tech}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  {isVi ? 'Tạo Trạm Xưởng In' : 'Create Workshop Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPartnersPanel;

