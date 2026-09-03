import React, { useState } from 'react';
import { PrinterProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminMachinesPanelProps {
  printers: PrinterProfile[];
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onShowToast: (message: string) => void;
}

export const AdminMachinesPanel: React.FC<AdminMachinesPanelProps> = ({
  printers,
  onUpdatePrinters,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [editingPrinter, setEditingPrinter] = useState<PrinterProfile | null>(null);
  const [isNewPrinterOpen, setIsNewPrinterOpen] = useState(false);

  const [printerForm, setPrinterForm] = useState<Partial<PrinterProfile>>({
    name: '',
    brand: 'Bambu Lab',
    technology: 'FDM',
    bedDimensions: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    powerKW: 0.18,
    acquisitionCost: 28000000,
    expectedLifetimeHours: 8000,
    consumablesHourlyRate: 2500,
    hourlyRate: 25000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 110,
    hasEnclosure: true,
    hasAMS: true,
    status: 'Idle'
  });

  const handleSaveNewPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerForm.name?.trim()) {
      onShowToast(isVi ? 'Vui lòng nhập tên máy in!' : 'Please enter printer name');
      return;
    }
    const newId = `prn-${Date.now()}`;
    const newPrinter: PrinterProfile = {
      id: newId,
      name: printerForm.name,
      brand: printerForm.brand || 'Bambu Lab',
      technology: printerForm.technology || 'FDM',
      bedDimensions: printerForm.bedDimensions || { x: 256, y: 256, z: 256 },
      nozzleDiameter: Number(printerForm.nozzleDiameter) || 0.4,
      powerKW: Number(printerForm.powerKW) || 0.18,
      acquisitionCost: Number(printerForm.acquisitionCost) || 25000000,
      expectedLifetimeHours: Number(printerForm.expectedLifetimeHours) || 8000,
      consumablesHourlyRate: Number(printerForm.consumablesHourlyRate) || 2500,
      hourlyRate: Number(printerForm.hourlyRate) || 25000,
      maxPrintSpeedMmS: Number(printerForm.maxPrintSpeedMmS) || 500,
      heatedBedMaxTemp: Number(printerForm.heatedBedMaxTemp) || 100,
      hasEnclosure: printerForm.hasEnclosure ?? true,
      hasAMS: printerForm.hasAMS ?? true,
      status: printerForm.status || 'Idle'
    };
    const updatedList = [...printers, newPrinter];
    onUpdatePrinters(updatedList);
    setIsNewPrinterOpen(false);
    onShowToast(isVi ? `Đã thêm máy in mới: "${newPrinter.name}"` : `Added new printer "${newPrinter.name}"`);
    setPrinterForm({
      name: '',
      brand: 'Bambu Lab',
      technology: 'FDM',
      bedDimensions: { x: 256, y: 256, z: 256 },
      nozzleDiameter: 0.4,
      powerKW: 0.18,
      acquisitionCost: 28000000,
      expectedLifetimeHours: 8000,
      consumablesHourlyRate: 2500,
      hourlyRate: 25000,
      maxPrintSpeedMmS: 500,
      heatedBedMaxTemp: 110,
      hasEnclosure: true,
      hasAMS: true,
      status: 'Idle'
    });
  };

  const handleSaveEditPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter) return;
    const updatedList = printers.map(p => p.id === editingPrinter.id ? editingPrinter : p);
    onUpdatePrinters(updatedList);
    setEditingPrinter(null);
    onShowToast(isVi ? `Đã cập nhật máy in: "${editingPrinter.name}"` : `Updated printer "${editingPrinter.name}"`);
  };

  const handleDeletePrinter = (id: string, name: string) => {
    if (printers.length <= 1) {
      onShowToast(isVi ? 'Cần duy trì tối thiểu 1 máy in trong hệ thống!' : 'Minimum 1 printer required in system!');
      return;
    }
    if (window.confirm(isVi ? `Xóa máy in "${name}" khỏi đội máy?` : `Delete printer "${name}"?`)) {
      const updatedList = printers.filter(p => p.id !== id);
      onUpdatePrinters(updatedList);
      onShowToast(isVi ? `Đã xóa máy in "${name}"` : `Deleted printer "${name}"`);
    }
  };

  const handleToggleStatus = (printer: PrinterProfile) => {
    const nextStatus: 'Idle' | 'Printing' | 'Maintenance' = printer.status === 'Printing' ? 'Idle' : printer.status === 'Idle' ? 'Maintenance' : 'Printing';
    const updatedList = printers.map(p => p.id === printer.id ? { ...p, status: nextStatus } : p);
    onUpdatePrinters(updatedList);
    onShowToast(isVi ? `Đã chuyển "${printer.name}" sang: ${nextStatus}` : `Set ${printer.name} status to: ${nextStatus}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
              MACHINES FLEET TELEMETRY
            </span>
            <span className="text-xs text-[#545F73]">Đội máy in 3D công nghiệp FDM & SLA</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">print</span>
            {isVi ? 'Quản Lý Đội Máy In 3D & Khấu Hao Giờ Máy' : '3D Printer Fleet & Depreciation Specs'}
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Cấu hình kích thước bàn in (X/Y/Z), công suất điện tiêu thụ (kW), khấu hao máy và đơn giá tính phí theo giờ in.
          </p>
        </div>

        <button
          onClick={() => setIsNewPrinterOpen(true)}
          className="px-4 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          {isVi ? 'Thêm Máy In Mới' : 'Add New Printer'}
        </button>
      </div>

      {/* Printer 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {printers.map((printer) => {
          const hourlyDepreciation = Math.round(printer.acquisitionCost / (printer.expectedLifetimeHours || 8000));
          const totalHourlyCost = (printer.hourlyRate || 25000) + (printer.consumablesHourlyRate || 2500);

          return (
            <div
              key={printer.id}
              className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/60 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header with status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
                      {printer.brand} • {printer.technology}
                    </span>
                    <h3 className="font-bold text-sm text-[#091426] line-clamp-1">
                      {printer.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(printer)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-tech font-bold uppercase cursor-pointer transition-all ${
                      printer.status === 'Printing'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : printer.status === 'Idle'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                    title="Nhấp để chuyển trạng thái nhanh"
                  >
                    ● {printer.status || 'Idle'}
                  </button>
                </div>

                {/* Specs Box */}
                <div className="bg-[#F8F9FF] p-3 rounded-lg border border-[#C5C6CD]/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Kích thước bàn in:</span>
                    <span className="font-tech font-bold text-[#091426]">
                      {printer.bedDimensions.x} × {printer.bedDimensions.y} × {printer.bedDimensions.z} mm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Đường kính đầu phun:</span>
                    <span className="font-tech font-bold text-[#091426]">{printer.nozzleDiameter} mm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Công suất điện:</span>
                    <span className="font-tech font-bold text-[#091426]">{printer.powerKW} kW (~{Math.round(printer.powerKW * 1000)}W)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Tốc độ in tối đa:</span>
                    <span className="font-tech font-bold text-[#091426]">{printer.maxPrintSpeedMmS || 500} mm/s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Tính năng buồng kín / Đổi màu:</span>
                    <span className="font-tech font-bold text-[#00687A]">
                      {printer.hasEnclosure ? 'Buồng Kín' : 'Hở'} • {printer.hasAMS ? 'Đa Màu AMS' : '1 Màu'}
                    </span>
                  </div>
                </div>

                {/* Financial Rates Breakdown */}
                <div className="p-3 bg-[#FAFBFD] rounded-lg border border-[#CBD5E1] space-y-1.5 text-xs font-tech">
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73] font-sans">Giá mua ban đầu:</span>
                    <span className="font-bold text-[#091426]">{printer.acquisitionCost.toLocaleString()} đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73] font-sans">Khấu hao máy theo giờ:</span>
                    <span className="font-bold text-indigo-700">{hourlyDepreciation.toLocaleString()} đ/h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73] font-sans">Hao mòn vòi phun / dầu mỡ:</span>
                    <span className="font-bold text-amber-700">{printer.consumablesHourlyRate.toLocaleString()} đ/h</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#CBD5E1]">
                    <span className="text-[#091426] font-bold font-sans">Đơn giá chạy máy (Inkiri):</span>
                    <span className="font-bold text-[#00687A] text-sm">{totalHourlyCost.toLocaleString()} đ/h</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  onClick={() => setEditingPrinter({ ...printer })}
                  className="px-3 py-1.5 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  {isVi ? 'Sửa' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDeletePrinter(printer.id, printer.name)}
                  className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                  {isVi ? 'Xóa' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Printer Modal */}
      {editingPrinter && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Chỉnh Sửa Thông Số Máy In' : 'Edit Printer Profile'}
              </h3>
              <button onClick={() => setEditingPrinter(null)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditPrinter} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên máy in *</label>
                <input
                  type="text"
                  value={editingPrinter.name}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Hãng sản xuất</label>
                  <input
                    type="text"
                    value={editingPrinter.brand}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, brand: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Công nghệ</label>
                  <select
                    value={editingPrinter.technology}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, technology: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="FDM">FDM / FFF (Đùn nhựa)</option>
                    <option value="SLA">SLA / DLP / MSLA (Resin UV)</option>
                    <option value="SLS">SLS (Laser bột nylon)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn X (mm)</label>
                  <input
                    type="number"
                    value={editingPrinter.bedDimensions.x}
                    onChange={(e) => setEditingPrinter({
                      ...editingPrinter,
                      bedDimensions: { ...editingPrinter.bedDimensions, x: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn Y (mm)</label>
                  <input
                    type="number"
                    value={editingPrinter.bedDimensions.y}
                    onChange={(e) => setEditingPrinter({
                      ...editingPrinter,
                      bedDimensions: { ...editingPrinter.bedDimensions, y: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Chiều cao Z (mm)</label>
                  <input
                    type="number"
                    value={editingPrinter.bedDimensions.z}
                    onChange={(e) => setEditingPrinter({
                      ...editingPrinter,
                      bedDimensions: { ...editingPrinter.bedDimensions, z: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Công suất điện (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPrinter.powerKW}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, powerKW: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Đơn giá giờ máy (VNĐ/h)</label>
                  <input
                    type="number"
                    value={editingPrinter.hourlyRate}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, hourlyRate: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setEditingPrinter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Lưu Thông Số Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Printer Modal */}
      {isNewPrinterOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Thêm Máy In 3D Vào Đội Máy' : 'Add 3D Printer'}
              </h3>
              <button onClick={() => setIsNewPrinterOpen(false)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewPrinter} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên máy in *</label>
                <input
                  type="text"
                  placeholder="VD: Bambu Lab P1S Combo"
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Hãng sản xuất</label>
                  <input
                    type="text"
                    value={printerForm.brand}
                    onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Công nghệ</label>
                  <select
                    value={printerForm.technology}
                    onChange={(e) => setPrinterForm({ ...printerForm, technology: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="FDM">FDM / FFF (Đùn nhựa)</option>
                    <option value="SLA">SLA / DLP / MSLA (Resin UV)</option>
                    <option value="SLS">SLS (Laser bột nylon)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn X (mm)</label>
                  <input
                    type="number"
                    value={printerForm.bedDimensions?.x}
                    onChange={(e) => setPrinterForm({
                      ...printerForm,
                      bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), x: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn Y (mm)</label>
                  <input
                    type="number"
                    value={printerForm.bedDimensions?.y}
                    onChange={(e) => setPrinterForm({
                      ...printerForm,
                      bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), y: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Chiều cao Z (mm)</label>
                  <input
                    type="number"
                    value={printerForm.bedDimensions?.z}
                    onChange={(e) => setPrinterForm({
                      ...printerForm,
                      bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), z: Number(e.target.value) }
                    })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Công suất điện (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={printerForm.powerKW}
                    onChange={(e) => setPrinterForm({ ...printerForm, powerKW: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Đơn giá giờ máy (VNĐ/h)</label>
                  <input
                    type="number"
                    value={printerForm.hourlyRate}
                    onChange={(e) => setPrinterForm({ ...printerForm, hourlyRate: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setIsNewPrinterOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Thêm Vào Đội Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
