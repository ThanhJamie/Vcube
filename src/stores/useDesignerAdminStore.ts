import { create } from 'zustand';
import { DesignerProfile } from '../types';

export interface ExtendedDesignerProfile extends DesignerProfile {
  email: string;
  phone?: string;
  activeModelsCount: number;
  joinedDate: string;
  pendingRoyaltyPayout: number;
  lifetimeCompletedOrders: number;
  monthlyRevenueVnd: number;
  status: 'Active' | 'UnderReview' | 'Suspended';
}

export interface DesignerWithdrawalRequest {
  id: string;
  designerId: string;
  designerName: string;
  amountVnd: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'Pending' | 'Approved' | 'Transferred' | 'Rejected';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  note?: string;
}

export interface DesignerAdminFilters {
  badgeTier: 'all' | 'Standard' | 'TopCreator' | 'VerifiedEngineer' | 'PioneerMaker';
  status: 'all' | 'Active' | 'UnderReview' | 'Suspended';
  searchQuery: string;
}

export interface DesignerAdminState {
  designers: ExtendedDesignerProfile[];
  withdrawals: DesignerWithdrawalRequest[];
  filters: DesignerAdminFilters;
  selectedDesignerId: string | null;

  // Filter actions
  setFilterBadgeTier: (badgeTier: DesignerAdminFilters['badgeTier']) => void;
  setFilterStatus: (status: DesignerAdminFilters['status']) => void;
  setSearchQuery: (query: string) => void;
  setSelectedDesignerId: (id: string | null) => void;

  // Designer profile management
  setBadgeTier: (designerId: string, badgeTier: DesignerProfile['badgeTier']) => void;
  updateRoyaltyPercent: (designerId: string, percent: number) => void;
  updateDesignerStatus: (designerId: string, status: ExtendedDesignerProfile['status']) => void;
  updateDesigner: (designerId: string, updates: Partial<ExtendedDesignerProfile>) => void;
  addDesigner: (designer: Omit<ExtendedDesignerProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;

  // Withdrawal management
  approveWithdrawal: (withdrawalId: string, adminNote?: string) => void;
  completePayoutTransfer: (withdrawalId: string, txRef?: string) => void;
  rejectWithdrawal: (withdrawalId: string, reason: string) => void;

  // Aggregate stats
  getDesignerStats: () => {
    totalDesigners: number;
    topCreatorsCount: number;
    verifiedEngineersCount: number;
    pioneerMakersCount: number;
    totalRoyaltiesPaidVnd: number;
    pendingPayoutVnd: number;
    totalActiveModels: number;
  };
}

const INITIAL_DESIGNERS: ExtendedDesignerProfile[] = [
  {
    id: 'des-01',
    userId: 'usr-des-01',
    displayName: 'Nguyễn Minh Tuấn (VoxelMaster)',
    email: 'tuan.voxel@gmail.com',
    phone: '0918 882 123',
    bio: 'Kỹ sư thiết kế cơ khí 3D CAD chuyên nghiệp. Tác giả bộ sưu tập phụ kiện Desk Setup & Gear Modular.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    defaultRoyaltyPercent: 15,
    licenseMode: 'CommercialSubscription',
    badgeTier: 'TopCreator',
    payoutBankInfo: 'Techcombank - 19034567890011 - NGUYEN MINH TUAN',
    totalSalesCount: 1420,
    totalRoyaltiesEarned: 86500000,
    pendingRoyaltyPayout: 12400000,
    activeModelsCount: 38,
    joinedDate: '2024-03-15T00:00:00Z',
    lifetimeCompletedOrders: 890,
    monthlyRevenueVnd: 28400000,
    status: 'Active',
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2026-03-01T08:30:00Z'
  },
  {
    id: 'des-02',
    userId: 'usr-des-02',
    displayName: 'Lê Hoàng An (PrecisionCAD Lab)',
    email: 'hoangan.eng@gmail.com',
    phone: '0903 112 445',
    bio: 'Chuyên gia thiết kế khuôn gá JIG, chi tiết máy in 3D công nghiệp và vỏ hộp thiết bị IoT chống nước.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    defaultRoyaltyPercent: 18,
    licenseMode: 'CommercialSubscription',
    badgeTier: 'VerifiedEngineer',
    payoutBankInfo: 'Vietcombank - 0071000892233 - LE HOANG AN',
    totalSalesCount: 960,
    totalRoyaltiesEarned: 114200000,
    pendingRoyaltyPayout: 18500000,
    activeModelsCount: 24,
    joinedDate: '2024-06-20T00:00:00Z',
    lifetimeCompletedOrders: 640,
    monthlyRevenueVnd: 35000000,
    status: 'Active',
    createdAt: '2024-06-20T00:00:00Z',
    updatedAt: '2026-02-27T14:15:00Z'
  },
  {
    id: 'des-03',
    userId: 'usr-des-03',
    displayName: 'Trần Thùy Linh (DecoCraft 3D)',
    email: 'thuylinh.craft3d@yahoo.com',
    phone: '0977 334 556',
    bio: 'Nghệ nhân tạo mẫu Decor gia dụng, chậu cây Geometric và đèn ngủ phong cách Origami tối giản.',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
    defaultRoyaltyPercent: 12,
    licenseMode: 'PrintOnly',
    badgeTier: 'PioneerMaker',
    payoutBankInfo: 'MB Bank - 8880192837465 - TRAN THUY LINH',
    totalSalesCount: 780,
    totalRoyaltiesEarned: 42000000,
    pendingRoyaltyPayout: 6800000,
    activeModelsCount: 42,
    joinedDate: '2024-09-01T00:00:00Z',
    lifetimeCompletedOrders: 510,
    monthlyRevenueVnd: 14200000,
    status: 'Active',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2026-02-25T11:00:00Z'
  },
  {
    id: 'des-04',
    userId: 'usr-des-04',
    displayName: 'Đỗ Duy Khoa (RoboMechanics)',
    email: 'duykhoa.robot@outlook.com',
    phone: '0938 990 112',
    bio: 'Kỹ sư Robot sinh học, mô hình bàn tay Robot bionic và khung xe tự hành cho sinh viên trường kỹ thuật.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    defaultRoyaltyPercent: 10,
    licenseMode: 'PrintOnly',
    badgeTier: 'Standard',
    payoutBankInfo: 'VietinBank - 101869403822 - DO DUY KHOA',
    totalSalesCount: 230,
    totalRoyaltiesEarned: 13500000,
    pendingRoyaltyPayout: 3200000,
    activeModelsCount: 15,
    joinedDate: '2025-08-10T00:00:00Z',
    lifetimeCompletedOrders: 145,
    monthlyRevenueVnd: 4800000,
    status: 'UnderReview',
    createdAt: '2025-08-10T00:00:00Z',
    updatedAt: '2026-02-18T09:20:00Z'
  }
];

const INITIAL_WITHDRAWALS: DesignerWithdrawalRequest[] = [
  {
    id: 'wd-001',
    designerId: 'des-01',
    designerName: 'Nguyễn Minh Tuấn (VoxelMaster)',
    amountVnd: 12400000,
    bankName: 'Techcombank',
    accountNumber: '19034567890011',
    accountName: 'NGUYEN MINH TUAN',
    status: 'Pending',
    requestedAt: '2026-03-01T08:30:00Z',
    note: 'Yêu cầu rút hoa hồng doanh thu thiết kế tháng 02/2026'
  },
  {
    id: 'wd-002',
    designerId: 'des-02',
    designerName: 'Lê Hoàng An (PrecisionCAD Lab)',
    amountVnd: 18500000,
    bankName: 'Vietcombank',
    accountNumber: '0071000892233',
    accountName: 'LE HOANG AN',
    status: 'Pending',
    requestedAt: '2026-02-27T14:15:00Z',
    note: 'Rút số dư royalty tích lũy qua cổng thanh toán Vcube Escrow'
  },
  {
    id: 'wd-003',
    designerId: 'des-03',
    designerName: 'Trần Thùy Linh (DecoCraft 3D)',
    amountVnd: 8500000,
    bankName: 'MB Bank',
    accountNumber: '8880192837465',
    accountName: 'TRAN THUY LINH',
    status: 'Transferred',
    requestedAt: '2026-02-15T09:00:00Z',
    processedAt: '2026-02-16T10:20:00Z',
    processedBy: 'Admin Tài Chính',
    note: 'Đã hoàn tất chuyển khoản qua VietQR Napas 24/7 (Ref: VCB9948210)'
  },
  {
    id: 'wd-004',
    designerId: 'des-01',
    designerName: 'Nguyễn Minh Tuấn (VoxelMaster)',
    amountVnd: 15000000,
    bankName: 'Techcombank',
    accountNumber: '19034567890011',
    accountName: 'NGUYEN MINH TUAN',
    status: 'Transferred',
    requestedAt: '2026-01-20T11:00:00Z',
    processedAt: '2026-01-21T14:00:00Z',
    processedBy: 'Admin Tài Chính',
    note: 'Chuyển tiền hoa hồng đợt Tết Nguyên Đán'
  }
];

export const useDesignerAdminStore = create<DesignerAdminState>((set, get) => ({
  designers: INITIAL_DESIGNERS,
  withdrawals: INITIAL_WITHDRAWALS,
  filters: {
    badgeTier: 'all',
    status: 'all',
    searchQuery: ''
  },
  selectedDesignerId: null,

  setFilterBadgeTier: (badgeTier) =>
    set((state) => ({ filters: { ...state.filters, badgeTier } })),

  setFilterStatus: (status) =>
    set((state) => ({ filters: { ...state.filters, status } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  setSelectedDesignerId: (selectedDesignerId) =>
    set({ selectedDesignerId }),

  setBadgeTier: (designerId, badgeTier) =>
    set((state) => ({
      designers: state.designers.map((d) =>
        d.id === designerId ? { ...d, badgeTier, updatedAt: new Date().toISOString() } : d
      )
    })),

  updateRoyaltyPercent: (designerId, percent) => {
    // Ceiling cap at 25%, minimum 5% according to marketplace policy
    const clamped = Math.max(5, Math.min(25, percent));
    set((state) => ({
      designers: state.designers.map((d) =>
        d.id === designerId ? { ...d, defaultRoyaltyPercent: clamped, updatedAt: new Date().toISOString() } : d
      )
    }));
  },

  updateDesignerStatus: (designerId, status) =>
    set((state) => ({
      designers: state.designers.map((d) =>
        d.id === designerId ? { ...d, status, updatedAt: new Date().toISOString() } : d
      )
    })),

  updateDesigner: (designerId, updates) =>
    set((state) => ({
      designers: state.designers.map((d) =>
        d.id === designerId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      )
    })),

  addDesigner: (designerData) => {
    const newDesigner: ExtendedDesignerProfile = {
      ...designerData,
      id: `des-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ designers: [newDesigner, ...state.designers] }));
  },

  approveWithdrawal: (withdrawalId, adminNote) =>
    set((state) => ({
      withdrawals: state.withdrawals.map((w) =>
        w.id === withdrawalId
          ? {
              ...w,
              status: 'Approved',
              processedAt: new Date().toISOString(),
              processedBy: 'Admin Điều Hành',
              note: adminNote || w.note
            }
          : w
      )
    })),

  completePayoutTransfer: (withdrawalId, txRef) =>
    set((state) => {
      const targetWithdrawal = state.withdrawals.find((w) => w.id === withdrawalId);
      if (!targetWithdrawal) return state;

      const updatedWithdrawals = state.withdrawals.map((w) =>
        w.id === withdrawalId
          ? {
              ...w,
              status: 'Transferred' as const,
              processedAt: new Date().toISOString(),
              processedBy: 'Kế Toán Trưởng',
              note: `${w.note || ''} | Đã tất toán mã GD: ${txRef || 'VIETQR-' + Date.now().toString(36).toUpperCase()}`
            }
          : w
      );

      // Deduct from designer pendingRoyaltyPayout
      const updatedDesigners = state.designers.map((d) => {
        if (d.id === targetWithdrawal.designerId) {
          return {
            ...d,
            pendingRoyaltyPayout: Math.max(0, d.pendingRoyaltyPayout - targetWithdrawal.amountVnd),
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });

      return {
        withdrawals: updatedWithdrawals,
        designers: updatedDesigners
      };
    }),

  rejectWithdrawal: (withdrawalId, reason) =>
    set((state) => ({
      withdrawals: state.withdrawals.map((w) =>
        w.id === withdrawalId
          ? {
              ...w,
              status: 'Rejected',
              processedAt: new Date().toISOString(),
              processedBy: 'Admin Kiểm Duyệt',
              note: `Từ chối rút tiền: ${reason}`
            }
          : w
      )
    })),

  getDesignerStats: () => {
    const { designers, withdrawals } = get();
    const topCreatorsCount = designers.filter((d) => d.badgeTier === 'TopCreator').length;
    const verifiedEngineersCount = designers.filter((d) => d.badgeTier === 'VerifiedEngineer').length;
    const pioneerMakersCount = designers.filter((d) => d.badgeTier === 'PioneerMaker').length;
    const totalRoyaltiesPaidVnd = designers.reduce((acc, d) => acc + (d.totalRoyaltiesEarned || 0), 0);
    const pendingPayoutVnd = withdrawals
      .filter((w) => w.status === 'Pending' || w.status === 'Approved')
      .reduce((acc, w) => acc + w.amountVnd, 0);
    const totalActiveModels = designers.reduce((acc, d) => acc + (d.activeModelsCount || 0), 0);

    return {
      totalDesigners: designers.length,
      topCreatorsCount,
      verifiedEngineersCount,
      pioneerMakersCount,
      totalRoyaltiesPaidVnd,
      pendingPayoutVnd,
      totalActiveModels
    };
  }
}));
