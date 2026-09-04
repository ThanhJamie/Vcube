import { create } from 'zustand';
import { CustomerProfile } from '../types';

export interface ExtendedCustomerProfile extends CustomerProfile {
  name: string;
  email: string;
  phone: string;
  customerType: 'B2C' | 'B2B';
  shippingAddressText?: string;
  totalOrders: number;
  totalSpendVnd: number;
  ndaStatus: 'None' | 'PendingReview' | 'Signed' | 'Expired';
  ndaDocumentUrl?: string;
  status: 'Active' | 'Blocked';
  assignedAccountManager?: string;
}

export interface RFQItem {
  id: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  taxId?: string;
  projectName: string;
  targetQuantity: number;
  targetTechnology: 'FDM' | 'SLA' | 'SLS' | 'MJF' | 'Metal';
  preferredMaterial: string;
  budgetEstimateVnd: number;
  quotedPriceVnd?: number;
  requiredDeadline: string;
  status: 'New' | 'UnderReview' | 'Quoted' | 'Accepted' | 'Declined';
  assignedWorkshopId?: string;
  assignedWorkshopName?: string;
  cadFileUrls: string[];
  specsNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAdminFilters {
  customerType: 'all' | 'B2C' | 'B2B';
  ndaStatus: 'all' | 'Signed' | 'PendingReview' | 'None';
  rfqStatus: 'all' | 'New' | 'UnderReview' | 'Quoted' | 'Accepted' | 'Declined';
  searchQuery: string;
}

export interface CustomerAdminState {
  customers: ExtendedCustomerProfile[];
  rfqs: RFQItem[];
  filters: CustomerAdminFilters;
  selectedCustomerId: string | null;
  selectedRfqId: string | null;

  // Filter actions
  setFilterCustomerType: (type: CustomerAdminFilters['customerType']) => void;
  setFilterNdaStatus: (status: CustomerAdminFilters['ndaStatus']) => void;
  setFilterRfqStatus: (status: CustomerAdminFilters['rfqStatus']) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCustomerId: (id: string | null) => void;
  setSelectedRfqId: (id: string | null) => void;

  // Customer actions
  updateCustomerStatus: (customerId: string, status: 'Active' | 'Blocked') => void;
  updateCustomer: (customerId: string, updates: Partial<ExtendedCustomerProfile>) => void;
  addCustomer: (customer: Omit<ExtendedCustomerProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;

  // NDA actions
  approveCustomerNDA: (customerId: string, documentUrl?: string) => void;
  revokeCustomerNDA: (customerId: string) => void;
  requestCustomerNDA: (customerId: string) => void;

  // RFQ actions
  updateRFQStatus: (rfqId: string, status: RFQItem['status'], quotedPriceVnd?: number) => void;
  assignRFQToWorkshop: (rfqId: string, workshopId: string, workshopName: string) => void;
  addRFQ: (rfq: Omit<RFQItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteRFQ: (rfqId: string) => void;

  // Stats
  getCustomerStats: () => {
    totalCustomers: number;
    b2bCount: number;
    b2cCount: number;
    signedNDACount: number;
    pendingNDACount: number;
    totalRFQsCount: number;
    pendingRFQsCount: number;
    totalQuotedValueVnd: number;
    totalCustomerSpendVnd: number;
  };
}

const INITIAL_CUSTOMERS: ExtendedCustomerProfile[] = [
  {
    id: 'cust-01',
    userId: 'usr-c-01',
    name: 'Trịnh Quốc Bảo',
    email: 'bao.trinh@robotek.vn',
    phone: '0908 776 554',
    customerType: 'B2B',
    companyName: 'Công Ty Cổ Phần Công Nghệ Robotek Việt Nam',
    taxId: '0316889210',
    billingEmail: 'accounting@robotek.vn',
    preferredPaymentMethod: 'vietqr',
    totalOrders: 18,
    totalSpendVnd: 186000000,
    ndaSigned: true,
    ndaSignedAt: '2025-05-12T09:00:00Z',
    ndaStatus: 'Signed',
    ndaDocumentUrl: '/docs/nda/NDA-ROBOTEK-VCUBE-2025.pdf',
    status: 'Active',
    assignedAccountManager: 'Nguyễn Văn Minh (Sales B2B Lead)',
    shippingAddressText: 'Tòa nhà Robotek, Đường S9, KCN Tân Bình, Tân Phú, TP.HCM',
    createdAt: '2025-05-10T08:00:00Z',
    updatedAt: '2026-02-28T16:00:00Z'
  },
  {
    id: 'cust-02',
    userId: 'usr-c-02',
    name: 'Phạm Hồng Ánh',
    email: 'honganh.rnd@vinautomotive.com',
    phone: '0919 223 344',
    customerType: 'B2B',
    companyName: 'Viện R&D VinAutomotive Labs',
    taxId: '0108994321',
    billingEmail: 'invoices@vinautomotive.com',
    preferredPaymentMethod: 'vietqr',
    totalOrders: 32,
    totalSpendVnd: 412000000,
    ndaSigned: true,
    ndaSignedAt: '2025-02-18T10:30:00Z',
    ndaStatus: 'Signed',
    ndaDocumentUrl: '/docs/nda/NDA-VINAUTO-VCUBE-STRICT.pdf',
    status: 'Active',
    assignedAccountManager: 'Đặng Mai Phương (Key Account Specialist)',
    shippingAddressText: 'Tổ hợp Công Nghệ Cao Gia Lâm, Hà Nội',
    createdAt: '2025-02-15T09:00:00Z',
    updatedAt: '2026-03-01T11:45:00Z'
  },
  {
    id: 'cust-03',
    userId: 'usr-c-03',
    name: 'Vũ Đức Thành',
    email: 'thanh.vu.iot@gmail.com',
    phone: '0978 112 889',
    customerType: 'B2C',
    preferredPaymentMethod: 'momo',
    totalOrders: 7,
    totalSpendVnd: 9400000,
    ndaSigned: false,
    ndaStatus: 'None',
    status: 'Active',
    shippingAddressText: 'Số 24 ngõ 165 Cầu Giấy, Hà Nội',
    createdAt: '2025-10-12T14:20:00Z',
    updatedAt: '2026-02-24T18:00:00Z'
  },
  {
    id: 'cust-04',
    userId: 'usr-c-04',
    name: 'KTS. Mai Hoàng Nam',
    email: 'nam.architect@khonggianviet.vn',
    phone: '0933 667 889',
    customerType: 'B2B',
    companyName: 'Studio Thiết Kế Nội Thất & Sa Bàn Không Gian Việt',
    taxId: '0401988234',
    billingEmail: 'finance@khonggianviet.vn',
    preferredPaymentMethod: 'vnpay',
    totalOrders: 11,
    totalSpendVnd: 68500000,
    ndaSigned: false,
    ndaStatus: 'PendingReview',
    ndaDocumentUrl: '/docs/nda/NDA-KHONGGIANVIET-SUBMITTED.pdf',
    status: 'Active',
    assignedAccountManager: 'Nguyễn Văn Minh (Sales B2B Lead)',
    shippingAddressText: '78 Nguyễn Thị Minh Khai, Hải Châu, Đà Nẵng',
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-02-27T10:15:00Z'
  },
  {
    id: 'cust-05',
    userId: 'usr-c-05',
    name: 'Ngô Thanh Sơn',
    email: 'son.cosplay.maker@gmail.com',
    phone: '0982 445 667',
    customerType: 'B2C',
    preferredPaymentMethod: 'cod',
    totalOrders: 3,
    totalSpendVnd: 3850000,
    ndaSigned: false,
    ndaStatus: 'None',
    status: 'Active',
    shippingAddressText: '112/15 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM',
    createdAt: '2026-01-22T13:40:00Z',
    updatedAt: '2026-02-15T09:30:00Z'
  }
];

const INITIAL_RFQS: RFQItem[] = [
  {
    id: 'rfq-2026-001',
    customerId: 'cust-01',
    customerName: 'Trịnh Quốc Bảo',
    companyName: 'Công Ty Cổ Phần Công Nghệ Robotek Việt Nam',
    taxId: '0316889210',
    projectName: 'Sản xuất lô 300 khớp tay bionic Robot B-ARM v4',
    targetQuantity: 300,
    targetTechnology: 'SLS',
    preferredMaterial: 'PA12 Nylon SLS Chịu Lực Va Đập Cao',
    budgetEstimateVnd: 85000000,
    quotedPriceVnd: 79500000,
    requiredDeadline: '2026-03-25',
    status: 'Quoted',
    assignedWorkshopId: 'ws-hcm-05',
    assignedWorkshopName: 'Hub Nam - VCUBE Mega Workshop TP.HCM',
    cadFileUrls: ['b-arm-v4-joint-a.step', 'b-arm-v4-joint-b.step'],
    specsNotes: 'Dung sai lắp ghép ±0.08mm. Yêu cầu xử lý bề mặt nhuộm đen công nghiệp mịn (Vapor Smoothing). Đã ký NDA cấp 2.',
    createdAt: '2026-02-25T10:00:00Z',
    updatedAt: '2026-02-27T15:30:00Z'
  },
  {
    id: 'rfq-2026-002',
    customerId: 'cust-02',
    customerName: 'Phạm Hồng Ánh',
    companyName: 'Viện R&D VinAutomotive Labs',
    taxId: '0108994321',
    projectName: 'Bộ ngàm gá cảm biến LiDAR xe tự hành (Test Batch 50 chiếc)',
    targetQuantity: 50,
    targetTechnology: 'FDM',
    preferredMaterial: 'PETG Carbon Fiber Chống Giòn & Kháng Nhiệt',
    budgetEstimateVnd: 28000000,
    quotedPriceVnd: 24500000,
    requiredDeadline: '2026-03-15',
    status: 'Accepted',
    assignedWorkshopId: 'ws-hn-01',
    assignedWorkshopName: 'Hub Bắc - VCUBE Tech Lab Hà Nội',
    cadFileUrls: ['lidar-mount-bracket-r2.step', 'mounting-bracket-side.3mf'],
    specsNotes: 'Infill tối thiểu 60% Gyroid. Chịu nhiệt độ môi trường buồng động cơ xe 75°C liên tục.',
    createdAt: '2026-02-28T08:30:00Z',
    updatedAt: '2026-03-01T14:20:00Z'
  },
  {
    id: 'rfq-2026-003',
    customerId: 'cust-04',
    customerName: 'KTS. Mai Hoàng Nam',
    companyName: 'Studio Thiết Kế Nội Thất & Sa Bàn Không Gian Việt',
    taxId: '0401988234',
    projectName: 'Sa bàn quy hoạch đô thị sinh thái sông Hàn (Tỉ lệ 1:500)',
    targetQuantity: 120,
    targetTechnology: 'SLA',
    preferredMaterial: 'Resin Độ Phân Giải Cao 8K Màu Trắng Sứ',
    budgetEstimateVnd: 45000000,
    requiredDeadline: '2026-04-05',
    status: 'UnderReview',
    assignedWorkshopId: 'ws-dn-03',
    assignedWorkshopName: 'Hub Trung - Smart FabLab Đà Nẵng',
    cadFileUrls: ['han-river-model-tiles-01-to-12.stl'],
    specsNotes: 'Yêu cầu bề mặt chi tiết cao rõ từng ban công nhà và tán cây cảnh quan. Khách hàng đang chờ duyệt NDA.',
    createdAt: '2026-03-01T09:15:00Z',
    updatedAt: '2026-03-02T10:00:00Z'
  },
  {
    id: 'rfq-2026-004',
    customerId: 'cust-01',
    customerName: 'Trịnh Quốc Bảo',
    companyName: 'Công Ty Cổ Phần Công Nghệ Robotek Việt Nam',
    taxId: '0316889210',
    projectName: 'Gia công 500 nắp che hộp số hành tinh Robot',
    targetQuantity: 500,
    targetTechnology: 'FDM',
    preferredMaterial: 'ABS Kỹ Thuật Chịu Dầu Mỡ',
    budgetEstimateVnd: 62000000,
    requiredDeadline: '2026-04-20',
    status: 'New',
    cadFileUrls: ['gearbox-cover-500.step'],
    specsNotes: 'Yêu cầu ren ốc gắn sẵn Brass Heat-Set Inserts M4x8. Báo giá bao gồm phụ kiện ốc ren.',
    createdAt: '2026-03-02T16:00:00Z',
    updatedAt: '2026-03-02T16:00:00Z'
  }
];

export const useCustomerAdminStore = create<CustomerAdminState>((set, get) => ({
  customers: INITIAL_CUSTOMERS,
  rfqs: INITIAL_RFQS,
  filters: {
    customerType: 'all',
    ndaStatus: 'all',
    rfqStatus: 'all',
    searchQuery: ''
  },
  selectedCustomerId: null,
  selectedRfqId: null,

  setFilterCustomerType: (customerType) =>
    set((state) => ({ filters: { ...state.filters, customerType } })),

  setFilterNdaStatus: (ndaStatus) =>
    set((state) => ({ filters: { ...state.filters, ndaStatus } })),

  setFilterRfqStatus: (rfqStatus) =>
    set((state) => ({ filters: { ...state.filters, rfqStatus } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  setSelectedCustomerId: (selectedCustomerId) =>
    set({ selectedCustomerId }),

  setSelectedRfqId: (selectedRfqId) =>
    set({ selectedRfqId }),

  updateCustomerStatus: (customerId, status) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, status, updatedAt: new Date().toISOString() } : c
      )
    })),

  updateCustomer: (customerId, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    })),

  addCustomer: (customerData) => {
    const newCustomer: ExtendedCustomerProfile = {
      ...customerData,
      id: `cust-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ customers: [newCustomer, ...state.customers] }));
  },

  approveCustomerNDA: (customerId, documentUrl) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              ndaSigned: true,
              ndaSignedAt: new Date().toISOString(),
              ndaStatus: 'Signed',
              ndaDocumentUrl: documentUrl || c.ndaDocumentUrl || `/docs/nda/NDA-${c.id}-APPROVED.pdf`,
              updatedAt: new Date().toISOString()
            }
          : c
      )
    })),

  revokeCustomerNDA: (customerId) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              ndaSigned: false,
              ndaStatus: 'Expired',
              updatedAt: new Date().toISOString()
            }
          : c
      )
    })),

  requestCustomerNDA: (customerId) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              ndaStatus: 'PendingReview',
              updatedAt: new Date().toISOString()
            }
          : c
      )
    })),

  updateRFQStatus: (rfqId, status, quotedPriceVnd) =>
    set((state) => ({
      rfqs: state.rfqs.map((r) =>
        r.id === rfqId
          ? {
              ...r,
              status,
              quotedPriceVnd: quotedPriceVnd !== undefined ? quotedPriceVnd : r.quotedPriceVnd,
              updatedAt: new Date().toISOString()
            }
          : r
      )
    })),

  assignRFQToWorkshop: (rfqId, workshopId, workshopName) =>
    set((state) => ({
      rfqs: state.rfqs.map((r) =>
        r.id === rfqId
          ? {
              ...r,
              assignedWorkshopId: workshopId,
              assignedWorkshopName: workshopName,
              status: r.status === 'New' ? 'UnderReview' : r.status,
              updatedAt: new Date().toISOString()
            }
          : r
      )
    })),

  addRFQ: (rfqData) => {
    const newRfq: RFQItem = {
      ...rfqData,
      id: `rfq-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ rfqs: [newRfq, ...state.rfqs] }));
  },

  deleteRFQ: (rfqId) =>
    set((state) => ({
      rfqs: state.rfqs.filter((r) => r.id !== rfqId)
    })),

  getCustomerStats: () => {
    const { customers, rfqs } = get();
    const b2bCount = customers.filter((c) => c.customerType === 'B2B').length;
    const b2cCount = customers.filter((c) => c.customerType === 'B2C').length;
    const signedNDACount = customers.filter((c) => c.ndaStatus === 'Signed').length;
    const pendingNDACount = customers.filter((c) => c.ndaStatus === 'PendingReview').length;

    const pendingRFQsCount = rfqs.filter((r) => r.status === 'New' || r.status === 'UnderReview').length;
    const totalQuotedValueVnd = rfqs
      .filter((r) => r.quotedPriceVnd)
      .reduce((acc, r) => acc + (r.quotedPriceVnd || 0), 0);
    const totalCustomerSpendVnd = customers.reduce((acc, c) => acc + c.totalSpendVnd, 0);

    return {
      totalCustomers: customers.length,
      b2bCount,
      b2cCount,
      signedNDACount,
      pendingNDACount,
      totalRFQsCount: rfqs.length,
      pendingRFQsCount,
      totalQuotedValueVnd,
      totalCustomerSpendVnd
    };
  }
}));
