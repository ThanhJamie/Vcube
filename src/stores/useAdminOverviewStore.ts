import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InkiriCostPillar {
  id: string;
  nameVi: string;
  nameEn: string;
  percent: number; // percentage of total
  amountVnd: number;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  descriptionVi: string;
  formulaNoteVi: string;
}

export interface OperationalAlert {
  id: string;
  type: 'low_stock' | 'printer_offline' | 'qc_alert' | 'rush_order' | 'dispatch_pending';
  severity: 'info' | 'warning' | 'critical';
  titleVi: string;
  descriptionVi: string;
  hubName?: string;
  timestamp: string;
  actionLabelVi?: string;
  targetSection?: string;
  isDismissed: boolean;
}

export interface AdminOverviewKPIs {
  fleetUtilizationPercent: number;
  totalFleetPrinters: number;
  activePrintingPrinters: number;
  idlePrinters: number;
  maintenancePrinters: number;
  activeOrdersInProduction: number;
  revenueTodayVnd: number;
  revenueMonthVnd: number;
  revenueTargetMonthVnd: number;
  revenueGrowthPercent: number;
  lowStockItemsCount: number;
  onTimeDeliveryRate: number;
  qcPassRate: number;
  avgSlicingTurnaroundMins: number;
}

export interface AdminOverviewStoreState {
  timeframe: 'today' | 'week' | 'month' | 'quarter';
  kpis: AdminOverviewKPIs;
  costPillars: InkiriCostPillar[];
  alerts: OperationalAlert[];
  isTelemetryLive: boolean;

  // Actions
  setTimeframe: (tf: 'today' | 'week' | 'month' | 'quarter') => void;
  dismissAlert: (alertId: string) => void;
  toggleTelemetry: () => void;
  recalculateTelemetry: (customPrintersActive?: number, customOrdersCount?: number) => void;
  updateCostPillarWeights: (pillars: { id: string; percent: number }[]) => void;
  resetToDefaults: () => void;
}

const DEFAULT_COST_PILLARS: InkiriCostPillar[] = [
  {
    id: 'depreciation_power',
    nameVi: 'Khấu hao Máy & Điện năng',
    nameEn: 'Machine Depreciation & Power',
    percent: 22,
    amountVnd: 62612000,
    colorHex: '#0284c7', // sky-600
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700 border-sky-200',
    descriptionVi: 'Khấu hao theo giờ in thực tế (Giá máy / Số giờ tuổi thọ) + Điện năng KWh (2,850đ/kWh)',
    formulaNoteVi: 'DepreciationPerHour = Price / LifetimeHours | Power = AvgKW * 2,850đ'
  },
  {
    id: 'material_waste',
    nameVi: 'Nhựa, Resin & Dự phòng Hao hụt (5%)',
    nameEn: 'Filament, Resin & Scrap Reserve',
    percent: 38,
    amountVnd: 108148000,
    colorHex: '#059669', // emerald-600
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700 border-emerald-200',
    descriptionVi: 'Chi phí cuộn nhựa/resin theo gram sản phẩm + Hộc phụ kiện + 5% dự phòng rủi ro in hỏng',
    formulaNoteVi: 'MaterialCost = Grams * PricePerGram + 5% ScrapBuffer'
  },
  {
    id: 'labor_cam',
    nameVi: 'Nhân công CAM/CAD & Hậu kỳ',
    nameEn: 'CAM Slicing & Finishing Labor',
    percent: 18,
    amountVnd: 51228000,
    colorHex: '#7c3aed', // violet-600
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700 border-violet-200',
    descriptionVi: 'Công kỹ sư slicing chuẩn bị file, xếp bàn, gỡ support, ngâm cồn UV & đo kiểm QC',
    formulaNoteVi: 'LaborCost = PrepTime * LaborRate + PostProcessingTime * LaborRate'
  },
  {
    id: 'margin_platform',
    nameVi: 'Lợi nhuận ròng Inkiri & Phí Sàn',
    nameEn: 'Inkiri Net Margin & Platform Fee',
    percent: 22,
    amountVnd: 62612000,
    colorHex: '#ea580c', // orange-600
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700 border-orange-200',
    descriptionVi: 'Biên lợi nhuận gộp xưởng in 15% + 7% phí vận hành sàn, API & hạ tầng cloud VCUBE',
    formulaNoteVi: 'Margin = 15% Workshop Profit + 7% Marketplace Fee (hoặc Markup 35%)'
  }
];

const DEFAULT_ALERTS: OperationalAlert[] = [
  {
    id: 'alert-1',
    type: 'low_stock',
    severity: 'warning',
    titleVi: 'Nhựa Resin 8K Siêu Nét sắp cạn tại Trạm Đà Nẵng',
    descriptionVi: 'Kho chỉ còn 2.1kg (ngưỡng an toàn 3.0kg). Đề xuất nhập thêm lô Anycubic UV Grey.',
    hubName: 'VCUBE Innovation Hub Đà Nẵng',
    timestamp: '10 phút trước',
    actionLabelVi: 'Xem kho',
    targetSection: 'inventory',
    isDismissed: false
  },
  {
    id: 'alert-2',
    type: 'dispatch_pending',
    severity: 'critical',
    titleVi: '2 Đơn hàng đang chờ Điều phối viên xác nhận trạm in',
    descriptionVi: 'Đơn #VC-8822 (Hà Nội, 280g) và #VC-8823 (Hà Nội, 510g) đã sẵn sàng file G-code.',
    hubName: 'VCUBE R&D Hà Nội',
    timestamp: '25 phút trước',
    actionLabelVi: 'Điều phối ngay',
    targetSection: 'queue',
    isDismissed: false
  },
  {
    id: 'alert-3',
    type: 'printer_offline',
    severity: 'warning',
    titleVi: 'Máy in Elegoo Saturn 4 #01 cần vệ sinh FEP film',
    descriptionVi: 'Máy đã hoàn thành 45 giờ in liên tục. Cần kiểm tra độ căng màng FEP trước khi nhận job mới.',
    hubName: 'VCUBE MES Farm Hà Nội',
    timestamp: '1 giờ trước',
    actionLabelVi: 'Bảo trì máy',
    targetSection: 'machines',
    isDismissed: false
  },
  {
    id: 'alert-4',
    type: 'rush_order',
    severity: 'info',
    titleVi: 'Đơn hàng #VC-8822 có yêu cầu Giao Hỏa Tốc trong 48h',
    descriptionVi: 'Khách hàng kỹ thuật cao cấp, ưu tiên bàn in Bambu X1-Carbon #03 để chạy ca đêm.',
    timestamp: '2 giờ trước',
    actionLabelVi: 'Xem đơn',
    targetSection: 'orders',
    isDismissed: false
  }
];

export const useAdminOverviewStore = create<AdminOverviewStoreState>()(
  persist(
    (set, get) => ({
      timeframe: 'month',
      kpis: {
        fleetUtilizationPercent: 78.5,
        totalFleetPrinters: 52,
        activePrintingPrinters: 35,
        idlePrinters: 14,
        maintenancePrinters: 3,
        activeOrdersInProduction: 18,
        revenueTodayVnd: 18450000,
        revenueMonthVnd: 284600000,
        revenueTargetMonthVnd: 350000000,
        revenueGrowthPercent: 24.8,
        lowStockItemsCount: 3,
        onTimeDeliveryRate: 98.4,
        qcPassRate: 99.1,
        avgSlicingTurnaroundMins: 18.5
      },
      costPillars: DEFAULT_COST_PILLARS,
      alerts: DEFAULT_ALERTS,
      isTelemetryLive: true,

      setTimeframe: (tf) => {
        set({ timeframe: tf });
        // Adjust simulated numbers smoothly
        const multiplier = tf === 'today' ? 0.065 : tf === 'week' ? 0.25 : tf === 'month' ? 1.0 : 3.2;
        const baseRev = 284600000;
        const currentCostPillars = get().costPillars.map((p) => ({
          ...p,
          amountVnd: Math.round(baseRev * multiplier * (p.percent / 100))
        }));
        set({ costPillars: currentCostPillars });
      },

      dismissAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, isDismissed: true } : a))
        }));
      },

      toggleTelemetry: () => set((state) => ({ isTelemetryLive: !state.isTelemetryLive })),

      recalculateTelemetry: (customPrintersActive, customOrdersCount) => {
        set((state) => {
          const active = customPrintersActive ?? state.kpis.activePrintingPrinters;
          const total = state.kpis.totalFleetPrinters;
          const utilization = Math.round((active / total) * 1000) / 10;
          return {
            kpis: {
              ...state.kpis,
              activePrintingPrinters: active,
              idlePrinters: total - active - state.kpis.maintenancePrinters,
              fleetUtilizationPercent: utilization,
              activeOrdersInProduction: customOrdersCount ?? state.kpis.activeOrdersInProduction
            }
          };
        });
      },

      updateCostPillarWeights: (pillars) => {
        set((state) => {
          const updated = state.costPillars.map((cp) => {
            const match = pillars.find((p) => p.id === cp.id);
            return match ? { ...cp, percent: match.percent } : cp;
          });
          return { costPillars: updated };
        });
      },

      resetToDefaults: () => {
        set({
          timeframe: 'month',
          costPillars: DEFAULT_COST_PILLARS,
          alerts: DEFAULT_ALERTS,
          isTelemetryLive: true
        });
      }
    }),
    {
      name: 'vcube_admin_overview_store_v1'
    }
  )
);
