import React, { useState } from 'react';
import {
  useProductionStore,
  KANBAN_STAGES,
  ProductionJob,
  ProductionStageKey,
  WorkshopTelemetryNode
} from '../../../stores/useProductionStore';
import { Order, PrinterProfile } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

interface Group5ProductionPanelProps {
  orders?: Order[];
  printers?: PrinterProfile[];
  onUpdateOrderStatus?: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onNavigateTracking?: (order: Order) => void;
  onShowToast?: (message: string) => void;
}

export const Group5ProductionPanel: React.FC<Group5ProductionPanelProps> = ({
  orders,
  printers,
  onUpdateOrderStatus,
  onNavigateTracking,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Zustand production store
  const {
    jobs,
    workshops,
    selectedJobId,
    activeStageFilter,
    activeRegionFilter,
    activeWorkshopFilter,
    searchQuery,
    setSelectedJobId,
    setActiveStageFilter,
    setActiveRegionFilter,
    setActiveWorkshopFilter,
    setSearchQuery,
    advanceStage,
    regressStage,
    setJobStage,
    confirmDispatch,
    reassignWorkshop,
    assignPrinter,
    updateOperatorNotes,
    updateQcStatus,
    resetToDefaultData
  } = useProductionStore();

  // Local view tabs
  const [activeTab, setActiveTab] = useState<'kanban' | 'dispatcher' | 'fleet'>('kanban');
  const [editingJobNotes, setEditingJobNotes] = useState<string>('');
  const [qcNotesInput, setQcNotesInput] = useState<string>('');
  const [overrideWorkshopId, setOverrideWorkshopId] = useState<string>('');
  const [overridePrinterId, setOverridePrinterId] = useState<string>('');

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (activeStageFilter !== 'all' && job.stageKey !== activeStageFilter) return false;
    if (activeRegionFilter !== 'all' && job.region !== activeRegionFilter) return false;
    if (activeWorkshopFilter !== 'all' && job.assignedWorkshopId !== activeWorkshopFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = job.orderNumber.toLowerCase().includes(q);
      const matchCustomer = job.customerName.toLowerCase().includes(q);
      const matchItem = job.itemsSummary.toLowerCase().includes(q);
      const matchMat = job.materialName.toLowerCase().includes(q);
      if (!matchNumber && !matchCustomer && !matchItem && !matchMat) return false;
    }
    return true;
  });

  // Stage Advance Handler
  const handleAdvance = (jobId: string) => {
    const result = advanceStage(jobId);
    if (result.success && result.newStage) {
      const msg = isVi
        ? `Đã chuyển sang: ${result.newStage.labelVi}`
        : `Advanced to: ${result.newStage.labelEn}`;
      onShowToast?.(msg);

      // Sync with parent order status if parent callback exists
      if (onUpdateOrderStatus) {
        const job = jobs.find((j) => j.id === jobId);
        if (job) {
          const mappedStatus: Order['status'] =
            result.newStage.key === 'pending_payment'
              ? 'pending_payment'
              : result.newStage.key === 'cad_prep' || result.newStage.key === 'slicing'
              ? 'processing'
              : result.newStage.key === 'printing'
              ? 'printing'
              : result.newStage.key === 'post_processing'
              ? 'post_processing'
              : result.newStage.key === 'qc_inspection' || result.newStage.key === 'packaging'
              ? 'packaging'
              : result.newStage.key === 'delivering'
              ? 'shipping'
              : 'completed';
          onUpdateOrderStatus(job.orderId, result.newStage.index, mappedStatus, job.layerProgress);
        }
      }
    } else if (result.message) {
      onShowToast?.(result.message);
    }
  };

  const handleRegress = (jobId: string) => {
    const result = regressStage(jobId);
    if (result.success && result.newStage) {
      onShowToast?.(isVi ? `Đã lùi về: ${result.newStage.shortVi}` : `Moved back`);
    }
  };

  const handleConfirmDispatch = (jobId: string) => {
    confirmDispatch(jobId, 'Điều phối viên MES Trung Tâm');
    const job = jobs.find((j) => j.id === jobId);
    onShowToast?.(
      isVi
        ? `Đã xác nhận điều phối đơn ${job?.orderNumber || ''} tới xưởng in!`
        : `Dispatch confirmed for ${job?.orderNumber}`
    );
  };

  const handleApplyOverride = (jobId: string) => {
    if (!overrideWorkshopId) {
      onShowToast?.(isVi ? 'Vui lòng chọn trạm xưởng in cần chuyển' : 'Please select a workshop');
      return;
    }
    reassignWorkshop(jobId, overrideWorkshopId, overridePrinterId || undefined);
    onShowToast?.(isVi ? 'Đã điều chuyển sang trạm xưởng mới thành công!' : 'Workshop reassigned!');
    setOverrideWorkshopId('');
    setOverridePrinterId('');
  };

  // Metrics
  const totalJobs = jobs.length;
  const printingCount = jobs.filter((j) => j.stageKey === 'printing').length;
  const suggestedDispatchCount = jobs.filter((j) => j.dispatchStatus === 'suggested' || j.dispatchStatus === 'unassigned').length;
  const qcCount = jobs.filter((j) => j.stageKey === 'qc_inspection').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with MES Telemetry Summary */}
      <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#00687A]/10 text-[#00687A] font-tech text-[10px] font-bold rounded-md border border-[#00687A]/20 uppercase tracking-wider">
                GROUP 5: PRODUCTION & MES ORCHESTRATION
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Shopfloor Telemetry Live
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#091426] mt-1.5 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#00687A] text-2xl">precision_manufacturing</span>
              {isVi ? 'Vận Hành Sản Xuất: Kanban 8 Nấc & Geo-Dispatcher' : 'MES Production: 8-Stage Kanban & Geo-Dispatcher'}
            </h1>
            <p className="text-xs sm:text-sm text-[#545F73] mt-0.5">
              {isVi
                ? 'Điều phối trạm in thông minh Bắc-Trung-Nam, phân bổ máy in FDM/SLA tự động có Human-in-the-loop và giám sát chất lượng QC.'
                : 'Smart geo-dispatch across North-Central-South hubs, automated printer assignment with human-in-the-loop oversight.'}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500 text-lg">format_list_bulleted</span>
              <div>
                <div className="text-[10px] font-tech uppercase text-slate-500 font-bold">Tổng Đơn Hàng Đợi</div>
                <div className="text-sm font-bold text-slate-900">{totalJobs} jobs</div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">print</span>
              <div>
                <div className="text-[10px] font-tech uppercase text-emerald-700 font-bold">Đang Chạy Máy</div>
                <div className="text-sm font-bold text-emerald-900">{printingCount} máy in</div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-lg">share_location</span>
              <div>
                <div className="text-[10px] font-tech uppercase text-amber-700 font-bold">Chờ Điều Phối</div>
                <div className="text-sm font-bold text-amber-900">{suggestedDispatchCount} đơn</div>
              </div>
            </div>

            <button
              onClick={resetToDefaultData}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset mock data"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kanban'
                  ? 'bg-white text-[#00687A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_kanban</span>
              {isVi ? 'Bảng Kanban 8 Nấc' : '8-Stage Kanban'}
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-tech">
                {filteredJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dispatcher')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dispatcher'
                  ? 'bg-white text-[#00687A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              {isVi ? 'Geo-Dispatcher Thông Minh' : 'Geo-Dispatcher'}
              {suggestedDispatchCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-tech animate-pulse">
                  {suggestedDispatchCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fleet'
                  ? 'bg-white text-[#00687A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">factory</span>
              {isVi ? 'Trạm Xưởng & Fleet Máy' : 'Workshop Fleet'}
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-tech">
                {workshops.length} Hubs
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm mã đơn, khách hàng, vật liệu...' : 'Search jobs...'}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00687A] focus:bg-white w-48 sm:w-64"
              />
              <span className="material-symbols-outlined text-sm text-slate-400 absolute left-2.5 top-2 pointer-events-none">
                search
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 text-xs font-medium">
              {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setActiveRegionFilter(reg)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeRegionFilter === reg
                      ? 'bg-[#00687A] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {reg === 'all' ? (isVi ? 'Toàn Quốc' : 'All') : `Miền ${reg}`}
                </button>
              ))}
            </div>

            {/* Workshop Filter */}
            <select
              value={activeWorkshopFilter}
              onChange={(e) => setActiveWorkshopFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#00687A]"
            >
              <option value="all">{isVi ? 'Tất cả 3 Trạm MES' : 'All MES Hubs'}</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.region})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTENT: KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#00687A]">touch_app</span>
              Bấm nút mũi tên xanh <span className="font-bold">➔</span> trên từng thẻ để chuyển nấc sản xuất tự động
            </span>
            <span>Hiển thị {filteredJobs.length} / {jobs.length} đơn</span>
          </div>

          {/* Kanban 8 Columns Horizontal Scroll Container */}
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300">
            <div className="flex items-start gap-3.5 min-w-[2100px]">
              {KANBAN_STAGES.map((stage) => {
                const stageJobs = filteredJobs.filter((j) => j.stageIndex === stage.index);

                return (
                  <div
                    key={stage.key}
                    className="w-[260px] shrink-0 bg-slate-100/80 border border-slate-200 rounded-2xl p-3 flex flex-col max-h-[780px]"
                  >
                    {/* Column Header */}
                    <div className="pb-2.5 mb-2 border-b border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${stage.bgColor} ${stage.color} flex items-center justify-center shrink-0 border ${stage.borderColor}`}>
                          <span className="material-symbols-outlined text-sm">{stage.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {isVi ? stage.shortVi : stage.key}
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate">{stage.role}</p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-tech font-bold px-2 py-0.5 rounded-full ${
                        stageJobs.length > 0 ? 'bg-white text-slate-800 border border-slate-300 shadow-2xs' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {stageJobs.length}
                      </span>
                    </div>

                    {/* Column Job Cards List */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin scrollbar-thumb-slate-300">
                      {stageJobs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                          <span className="material-symbols-outlined text-xl block mb-1 opacity-40">inbox</span>
                          {isVi ? 'Không có đơn nấc này' : 'Empty stage'}
                        </div>
                      ) : (
                        stageJobs.map((job) => (
                          <div
                            key={job.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:shadow-sm hover:border-[#00687A]/40 transition-all text-xs space-y-2 group"
                          >
                            {/* Card Top: Order Number & Priority */}
                            <div className="flex items-center justify-between">
                              <span className="font-tech font-bold text-xs text-[#00687A] flex items-center gap-1">
                                {job.orderNumber}
                              </span>

                              <div className="flex items-center gap-1">
                                {/* Region Tag */}
                                <span className={`text-[9px] font-tech font-bold px-1.5 py-0.2 rounded ${
                                  job.region === 'Bắc'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : job.region === 'Trung'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  Miền {job.region}
                                </span>

                                {/* Priority Badge */}
                                {job.priority === 'urgent' && (
                                  <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                    Hỏa tốc
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer & Items */}
                            <div>
                              <div className="font-bold text-slate-800 truncate">{job.customerName}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {job.itemsSummary}
                              </div>
                            </div>

                            {/* Material & Specs */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                                style={{ backgroundColor: job.colorHex }}
                              />
                              <span className="truncate font-medium">{job.materialName}</span>
                              <span className="text-slate-400">|</span>
                              <span className="font-tech font-semibold shrink-0">{job.totalGrams}g</span>
                            </div>

                            {/* Dispatch status & Assigned Machine */}
                            <div className="text-[11px] space-y-1">
                              {job.assignedWorkshopName ? (
                                <div className="flex items-center gap-1 text-slate-700 truncate" title={job.assignedWorkshopName}>
                                  <span className="material-symbols-outlined text-xs text-[#00687A]">factory</span>
                                  <span className="truncate">{job.assignedWorkshopName}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <span className="material-symbols-outlined text-xs">warning</span>
                                  <span>Chưa điều phối trạm xưởng</span>
                                </div>
                              )}

                              {job.assignedPrinterName && (
                                <div className="flex items-center gap-1 text-emerald-700 font-medium">
                                  <span className="material-symbols-outlined text-xs">print</span>
                                  <span className="truncate">{job.assignedPrinterName}</span>
                                </div>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-tech">
                                <span>Tiến độ nấc</span>
                                <span className="font-bold text-slate-800">{job.layerProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#00687A] rounded-full transition-all duration-300"
                                  style={{ width: `${job.layerProgress}%` }}
                                />
                              </div>
                            </div>

                            {/* Operator Note preview */}
                            {job.operatorNotes && (
                              <p className="text-[10px] text-slate-500 italic bg-amber-50/50 p-1 rounded border border-amber-100 line-clamp-1">
                                💬 {job.operatorNotes}
                              </p>
                            )}

                            {/* Card Action Controls */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button
                                onClick={() => {
                                  setSelectedJobId(job.id);
                                  setEditingJobNotes(job.operatorNotes);
                                  setQcNotesInput(job.qcNotes || '');
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#00687A] hover:bg-slate-50 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">info</span>
                                Chi tiết
                              </button>

                              <div className="flex items-center gap-1">
                                {stage.index > 0 && (
                                  <button
                                    onClick={() => handleRegress(job.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                    title="Lùi lại 1 nấc"
                                  >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                  </button>
                                )}

                                {stage.index < KANBAN_STAGES.length - 1 && (
                                  <button
                                    onClick={() => handleAdvance(job.id)}
                                    className="px-2.5 py-1 bg-[#00687A] hover:bg-[#005463] text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title={`Chuyển sang: ${KANBAN_STAGES[stage.index + 1].shortVi}`}
                                  >
                                    <span>Tiếp</span>
                                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: GEO-DISPATCHER (HUMAN-IN-THE-LOOP) */}
      {activeTab === 'dispatcher' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-xl">share_location</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Hệ Thống Phân Phối Tải Đơn Hàng Thông Minh (Geo-Dispatch & Fleet Allocation)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  AI gợi ý trạm xưởng tối ưu nhất dựa trên vị trí khách hàng (Bắc - Trung - Nam), tình trạng máy rảnh (Free) và tồn kho nhựa. 
                  Điều phối viên kiểm tra và xác nhận hoặc ghi đè phân bổ bằng tay (Human-in-the-loop).
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs font-tech font-bold px-2.5 py-1 rounded-lg bg-white text-amber-900 border border-amber-300 shadow-2xs">
                {suggestedDispatchCount} đơn cần xử lý
              </span>
            </div>
          </div>

          {/* Job Dispatch List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map((job) => {
              const rec = job.geoRecommendation;
              const isConfirmed = job.dispatchStatus === 'confirmed';

              return (
                <div
                  key={job.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all space-y-4 ${
                    isConfirmed ? 'border-slate-200' : 'border-amber-300 ring-2 ring-amber-100'
                  }`}
                >
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-tech font-bold text-sm text-[#00687A]">{job.orderNumber}</span>
                        <span className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded-full ${
                          job.region === 'Bắc'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : job.region === 'Trung'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          Khu vực: Miền {job.region}
                        </span>
                        {isConfirmed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Đã chốt điều phối
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full animate-pulse">
                            Chờ xác nhận
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 mt-1">{job.customerName}</h4>
                      <p className="text-xs text-slate-500">
                        📍 {job.customerAddress}, {job.customerCity}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-tech font-bold text-slate-800">
                        {job.totalGrams}g nhựa
                      </div>
                      <div className="text-[11px] text-slate-500">~{job.estimatedPrintHours}h in</div>
                    </div>
                  </div>

                  {/* Requirements summary */}
                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#00687A]">layers</span>
                      {job.itemsSummary}
                    </div>
                    <div className="text-slate-500 flex items-center gap-2 pt-0.5">
                      <span>Vật liệu: <strong className="text-slate-700">{job.materialName}</strong></span>
                      <span>•</span>
                      <span>Màu: <strong className="text-slate-700">{job.colorName}</strong></span>
                      <span>•</span>
                      <span>Lớp in: <strong className="text-slate-700">{job.layerHeightMm}mm</strong></span>
                    </div>
                  </div>

                  {/* AI Recommendation Box */}
                  {rec && (
                    <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <span className="material-symbols-outlined text-emerald-600 text-base">auto_awesome</span>
                          Đề Xuất Điều Phối Tối Ưu (AI Recommendation)
                        </span>
                        <span className="text-xs font-tech font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-md shadow-2xs">
                          {rec.matchScore}% Match
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-500 uppercase font-tech">Trạm Xưởng Đề Xuất</div>
                          <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5 truncate">
                            <span className="material-symbols-outlined text-xs text-emerald-600">store</span>
                            {rec.workshopName}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Khoảng cách ~{rec.distanceEstimateKm} km</div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-slate-500 uppercase font-tech">Máy In Trống Phù Hợp</div>
                          <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5 truncate">
                            <span className="material-symbols-outlined text-xs text-emerald-600">print</span>
                            {rec.suggestedPrinterName}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Trạng thái: Trống (Free)
                          </div>
                        </div>
                      </div>

                      {/* Stock Check Badge */}
                      <div className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100">
                        <span className="text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-emerald-600">inventory</span>
                          Tồn kho nhựa xưởng:
                        </span>
                        <span className="font-bold text-emerald-700">
                          {(rec.availableStockGrams / 1000).toFixed(1)} kg (Đủ cho {job.totalGrams}g)
                        </span>
                      </div>

                      {/* Match Reasons */}
                      <ul className="text-[11px] text-emerald-800 space-y-0.5 list-disc list-inside">
                        {rec.matchReasons.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Current Active Assignment Status if already confirmed */}
                  {isConfirmed && job.assignedWorkshopName && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-tech text-slate-500 font-bold">Xưởng Đang Chế Tác</div>
                        <div className="font-bold text-slate-900">{job.assignedWorkshopName}</div>
                        <div className="text-slate-600 text-[11px]">Máy: {job.assignedPrinterName || 'Chưa gán'}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <div>Xác nhận bởi:</div>
                        <div className="font-semibold text-slate-700">{job.dispatchConfirmedBy}</div>
                      </div>
                    </div>
                  )}

                  {/* Dispatcher Actions (Human-in-the-loop) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    {/* Confirm Button */}
                    {!isConfirmed ? (
                      <button
                        onClick={() => handleConfirmDispatch(job.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer flex-1"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        {isVi ? 'Xác Nhận Điều Phối Đơn Này' : 'Confirm Dispatch'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConfirmDispatch(job.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Cập nhật điều phối
                      </button>
                    )}

                    {/* Override Manual Controls */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={overrideWorkshopId}
                        onChange={(e) => setOverrideWorkshopId(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#00687A]"
                      >
                        <option value="">-- Đổi trạm khác --</option>
                        {workshops.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>

                      {overrideWorkshopId && (
                        <button
                          onClick={() => handleApplyOverride(job.id)}
                          className="px-2.5 py-1.5 bg-[#00687A] text-white text-xs font-bold rounded-lg hover:bg-[#005463] transition-colors cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: FLEET & WORKSHOP OVERVIEW */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workshops.map((ws) => (
              <div key={ws.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-tech font-bold px-2 py-0.5 bg-[#00687A]/10 text-[#00687A] rounded">
                      KHU VỰC MIỀN {ws.region.toUpperCase()}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{ws.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">📍 {ws.address}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <span className="material-symbols-outlined text-lg">factory</span>
                  </div>
                </div>

                {/* Machine Fleet Telemetry */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                    <span className="font-semibold">Đội máy in (Fleet)</span>
                    <span className="font-tech text-emerald-700 font-bold">
                      {ws.freeMachines} máy rảnh / {ws.totalMachines} máy
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ws.fleet.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs border border-slate-100"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-800 truncate">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.type} • {m.currentMaterial || 'Sẵn sàng'}</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded-full ${
                              m.status === 'Free'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.status === 'Busy'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {m.status === 'Free' ? 'Trống (Free)' : m.status === 'Busy' ? `Đang in (${m.progressPercent}%)` : 'Bảo trì'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stock Materials Summary */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-700 mb-1.5">Tồn kho vật liệu chính</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ws.materialsStock.map((mat, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-[10px] font-tech px-2 py-1 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mat.colorHex }} />
                        {mat.materialName}: <strong>{(mat.stockGrams / 1000).toFixed(1)}kg</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. JOB DETAILS MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00687A] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-xl">precision_manufacturing</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-tech font-bold text-base text-[#00687A]">
                      {selectedJob.orderNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-tech">
                      Nấc {selectedJob.stageIndex + 1}: {KANBAN_STAGES[selectedJob.stageIndex].shortVi}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedJob.customerName}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedJobId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 text-xs">
              {/* Stage Progression Buttons */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Chuyển Nấc Trực Tiếp (Bỏ qua hoặc đặt lại quy trình)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {KANBAN_STAGES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setJobStage(selectedJob.id, s.index)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedJob.stageIndex === s.index
                          ? 'bg-[#00687A] text-white border-[#00687A] font-bold shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-tech text-[10px] opacity-75">Nấc #{s.index + 1}</div>
                      <div className="text-[11px] font-semibold truncate">{s.shortVi}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-tech">Vật Liệu</span>
                  <div className="font-bold text-slate-800">{selectedJob.materialName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-tech">Màu Sắc</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: selectedJob.colorHex }} />
                    {selectedJob.colorName}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-tech">Độ Dày Lớp In</span>
                  <div className="font-bold text-slate-800">{selectedJob.layerHeightMm} mm</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-tech">Độ Đặc (Infill)</span>
                  <div className="font-bold text-slate-800">{selectedJob.infillPercent}%</div>
                </div>
              </div>

              {/* Operator Notes Box */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Ghi chú Kỹ Thuật Viên / Trưởng Xưởng:
                </label>
                <textarea
                  value={editingJobNotes}
                  onChange={(e) => setEditingJobNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#00687A]"
                  placeholder="Nhập hướng dẫn gá đặt, nhiệt độ bàn, dung sai thước kẹp..."
                />
                <button
                  onClick={() => {
                    updateOperatorNotes(selectedJob.id, editingJobNotes);
                    onShowToast?.(isVi ? 'Đã lưu ghi chú kỹ thuật!' : 'Notes saved');
                  }}
                  className="mt-2 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Lưu Ghi Chú
                </button>
              </div>

              {/* QC Verification Section */}
              <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-rose-600">verified</span>
                    Kiểm Định Đo Dung Sai & QC (Quality Control)
                  </span>
                  <span className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded ${
                    selectedJob.qcInspectionPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedJob.qcInspectionPassed ? 'ĐẠT TIÊU CHUẨN' : 'CHƯA PHÊ DUYỆT'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateQcStatus(selectedJob.id, true, qcNotesInput || 'Đạt tiêu chuẩn dung sai VCUBE');
                      onShowToast?.(isVi ? 'Đã xác nhận QC PASS!' : 'QC Passed');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-xs">check</span>
                    Xác nhận QC Đạt (Pass)
                  </button>

                  <button
                    onClick={() => {
                      updateQcStatus(selectedJob.id, false, 'Cần in lại do cong vênh bề mặt');
                      onShowToast?.(isVi ? 'Đã đánh dấu yêu cầu in lại' : 'Marked for reprint');
                    }}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    Không đạt (In lại)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <div className="text-[11px] text-slate-500">
                Mã định danh MES: <strong className="font-tech">{selectedJob.id}</strong>
              </div>
              <button
                onClick={() => setSelectedJobId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Group5ProductionPanel;
