import React, { useState } from 'react';
import { Product, Order, SiteContentConfig, MaterialProfile, PrinterProfile, InkiriCostFormulaConfig, AccessoryItem } from '../types';
import { CATEGORIES, MATERIALS_CATALOG } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { PricingConfigPanel } from '../components/admin/PricingConfigPanel';

interface AdminDashboardViewProps {
  products: Product[];
  orders: Order[];
  siteContent: SiteContentConfig;
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  pricingConfig: InkiriCostFormulaConfig;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig: (config: InkiriCostFormulaConfig) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  products,
  orders,
  siteContent,
  materials,
  printers,
  accessories,
  pricingConfig,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onUpdateSiteContent,
  onUpdateMaterials,
  onUpdatePrinters,
  onUpdateAccessories,
  onUpdatePricingConfig,
  onNavigate,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // 5 Core Admin Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'production' | 'pricing' | 'content'>('orders');

  // Product Management States
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
    name: '',
    category: 'mechanical',
    sku: `VC-${Math.floor(1000 + Math.random() * 9000)}`,
    pricePhysical: 180000,
    priceDigital: 45000,
    description: '',
    supportedMaterials: ['PLA Tough', 'PETG'],
    images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
    badge: 'MỚI',
    status: 'Published',
    designer: 'VCUBE Engineering Team',
    rating: 5.0,
    reviewsCount: 0,
    printsCount: 0,
    printTime: '2h 15m',
    features: ['Kiểm định ứng suất Finite Element Analysis (FEA)', 'Bề mặt láng mịn dung sai ±0.05mm'],
    specs: {
      dimensions: '80 x 80 x 45 mm',
      weight: '65g',
      resolution: '0.12mm Standard',
      infillDefault: '35% Gyroid',
      technology: 'FDM / SLA Precision'
    },
    colors: [
      { name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true },
      { name: 'Xám Titan', hex: '#64748b', available: true }
    ],
    tags: ['cơ khí', 'in 3d', 'linh kiện chính xác']
  });

  // Order Management States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Content Management Form State
  const [contentForm, setContentForm] = useState<SiteContentConfig>({ ...siteContent });

  // 8 Production Stages Definition
  const PRODUCTION_STAGES = [
    { index: 0, key: 'pending_payment', label: '1. Nhận đơn & Chờ xác nhận', desc: 'Kiểm tra thông tin thanh toán & file' },
    { index: 1, key: 'processing', label: '2. Chuẩn bị file & Cắt lớp', desc: 'Kỹ sư tạo G-code & phân tích ứng suất' },
    { index: 2, key: 'processing', label: '3. Xếp bàn in & Khởi động', desc: 'Vệ sinh bàn in PEI & cân bằng nhiệt' },
    { index: 3, key: 'printing', label: '4. Đang in 3D (FDM/SLA)', desc: 'Máy in công nghiệp Bambu Lab/Formlabs' },
    { index: 4, key: 'post_processing', label: '5. Xử lý bề mặt & Rửa UV', desc: 'Tách support, xử lý nhẵn & chiếu UV' },
    { index: 5, key: 'packaging', label: '6. Đo kiểm QC Dung sai', desc: 'Xác thực thước kẹp Mitutoyo ±0.05mm' },
    { index: 6, key: 'shipping', label: '7. Đóng gói & Bàn giao Shipper', desc: 'Bọc xốp chống sốc & gửi VCUBE Express' },
    { index: 7, key: 'completed', label: '8. Giao hàng thành công', desc: 'Khách hàng đã nhận & nghiệm thu' }
  ];

  // Handler for creating a new product
  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name?.trim()) {
      onShowToast(isVi ? 'Vui lòng nhập tên sản phẩm' : 'Please enter product name');
      return;
    }

    const created: Product = {
      id: `prod-${Date.now()}`,
      sku: newProductForm.sku || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newProductForm.name || 'Linh Kiện Mới',
      category: newProductForm.category || 'mechanical',
      designer: newProductForm.designer || 'VCUBE Engineering',
      pricePhysical: Number(newProductForm.pricePhysical) || 150000,
      priceDigital: Number(newProductForm.priceDigital) || 45000,
      images: newProductForm.images && newProductForm.images.length > 0 ? newProductForm.images : ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
      description: newProductForm.description || 'Linh kiện cơ khí tiêu chuẩn in 3D chính xác.',
      features: newProductForm.features || ['Độ chính xác cao', 'Kháng mài mòn'],
      specs: newProductForm.specs || {
        dimensions: '80 x 80 x 40 mm',
        weight: '60g',
        resolution: '0.12mm',
        infillDefault: '35% Gyroid',
        technology: 'FDM Industrial'
      },
      supportedMaterials: newProductForm.supportedMaterials || ['PLA Tough', 'PETG'],
      colors: newProductForm.colors || [{ name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true }],
      tags: newProductForm.tags || ['cơ khí', 'linh kiện'],
      badge: newProductForm.badge || 'MỚI',
      rating: 5.0,
      reviewsCount: 0,
      printsCount: 1,
      printTime: newProductForm.printTime || '2h 30m',
      status: 'Published'
    };

    onAddProduct(created);
    setIsNewProductModalOpen(false);
    onShowToast(isVi ? `Đã thêm sản phẩm "${created.name}" vào hệ thống` : `Added product "${created.name}"`);
    // reset form
    setNewProductForm({
      name: '',
      category: 'mechanical',
      sku: `VC-${Math.floor(1000 + Math.random() * 9000)}`,
      pricePhysical: 180000,
      priceDigital: 45000,
      description: '',
      supportedMaterials: ['PLA Tough', 'PETG'],
      images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
      badge: 'MỚI',
      status: 'Published'
    });
  };

  // Handler for editing existing product
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
    onShowToast(isVi ? `Đã cập nhật sản phẩm "${editingProduct.name}"` : `Updated product "${editingProduct.name}"`);
  };

  // Handler for deleting product
  const handleDeleteProductConfirm = (prod: Product) => {
    if (window.confirm(isVi ? `Bạn có chắc chắn muốn xóa sản phẩm "${prod.name}"?` : `Are you sure you want to delete "${prod.name}"?`)) {
      onDeleteProduct(prod.id);
      onShowToast(isVi ? `Đã xóa sản phẩm "${prod.name}"` : `Deleted "${prod.name}"`);
    }
  };

  // Handler for changing production stage
  const handleSetProductionStage = (orderId: string, stageIndex: number) => {
    const stage = PRODUCTION_STAGES[stageIndex];
    if (!stage) return;
    const progressCalc = Math.round(((stageIndex + 1) / PRODUCTION_STAGES.length) * 100);
    onUpdateOrderStatus(orderId, stageIndex, stage.key as Order['status'], progressCalc);
    onShowToast(isVi ? `Đã cập nhật trạng thái đơn ${orderId} sang: ${stage.label}` : `Updated order ${orderId} to: ${stage.label}`);
  };

  // Handler for saving basic site content
  const handleSaveContent = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteContent(contentForm);
    onShowToast(isVi ? 'Đã lưu cấu hình nội dung xưởng & giao diện thành công!' : 'Saved site content settings!');
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
    const matchCat = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    return matchSearch && matchCat;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress.fullName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress.phone.includes(orderSearch);
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  // Summary Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.payment.total, 0);
  const activeJobsCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const completedJobsCount = orders.filter(o => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30] py-6 sm:py-8 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#C5C6CD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#091426] text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[#57DFFE]">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-tech uppercase tracking-widest text-[#545F73]">VCUBE ForgeControl Console</span>
                <span className="inline-flex items-center gap-1 font-tech text-[9px] text-[#00687A] bg-[#57DFFE]/20 px-2 py-0.5 rounded border border-[#57DFFE]/40 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00687A] animate-pulse"></span>
                  ADMIN MODE ACTIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#091426]">
                {isVi ? 'Quản Trị Hệ Thống Chế Tác VCUBE' : 'VCUBE Fabrication & Order Admin'}
              </h1>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-tech text-xs">
            <div className="bg-white px-3 py-2 border border-[#C5C6CD] rounded">
              <span className="text-[10px] text-[#545F73] block uppercase">{isVi ? 'Tổng Sản Phẩm' : 'Products'}</span>
              <span className="font-bold text-sm text-[#091426]">{products.length}</span>
            </div>
            <div className="bg-white px-3 py-2 border border-[#C5C6CD] rounded">
              <span className="text-[10px] text-[#545F73] block uppercase">{isVi ? 'Đang Chế Tác' : 'Active Jobs'}</span>
              <span className="font-bold text-sm text-[#00687A]">{activeJobsCount}</span>
            </div>
            <div className="bg-white px-3 py-2 border border-[#C5C6CD] rounded">
              <span className="text-[10px] text-[#545F73] block uppercase">{isVi ? 'Tổng Doanh Thu' : 'Revenue'}</span>
              <span className="font-bold text-sm text-emerald-700">{totalRevenue.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ</span>
            </div>
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-2 bg-[#091426] text-white hover:bg-[#1E293B] text-xs font-bold uppercase rounded transition-colors"
            >
              {isVi ? 'Xem Trang Chủ' : 'View Store'}
            </button>
          </div>
        </div>

        {/* 4 MVP Primary Tabs */}
        <div className="flex border-b border-[#C5C6CD] gap-1 sm:gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#00687A] text-[#00687A] bg-white rounded-t'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            {isVi ? '1. Quản Lý Đơn Hàng' : '1. Order Management'}
            <span className="ml-1 px-1.5 py-0.2 bg-[#E5EEFF] text-[#00687A] rounded text-[10px] font-tech font-bold">{orders.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'production'
                ? 'border-[#00687A] text-[#00687A] bg-white rounded-t'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-base">precision_manufacturing</span>
            {isVi ? '2. Trạng Thái Sản Xuất' : '2. Production Telemetry'}
            <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-tech font-bold">{activeJobsCount} in job</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-[#00687A] text-[#00687A] bg-white rounded-t'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            {isVi ? '3. Quản Lý Sản Phẩm' : '3. Product Catalog'}
            <span className="ml-1 px-1.5 py-0.2 bg-[#E5EEFF] text-[#00687A] rounded text-[10px] font-tech font-bold">{products.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'border-[#00687A] text-[#00687A] bg-white rounded-t'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-base">calculate</span>
            {isVi ? '4. Bảng Giá & Xưởng In (Inkiri Cost Engine)' : '4. Pricing & Factory Cost Model'}
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-tech font-bold">Inkiri v3.4</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'content'
                ? 'border-[#00687A] text-[#00687A] bg-white rounded-t'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            {isVi ? '5. Quản Lý Nội Dung Xưởng' : '5. Site Content & Workshop Config'}
          </button>
        </div>

        {/* TAB 1: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 border border-[#C5C6CD] rounded flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#545F73] text-sm">search</span>
                  <input
                    type="text"
                    placeholder={isVi ? 'Tìm mã đơn, tên khách, số điện thoại...' : 'Search by order #, customer, phone...'}
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[11px] text-[#545F73] font-bold">{isVi ? 'Trạng thái:' : 'Status:'}</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-[#C5C6CD] rounded text-xs font-bold bg-white focus:outline-none focus:border-[#00687A]"
                >
                  <option value="all">{isVi ? 'Tất Cả Đơn Hàng' : 'All Orders'}</option>
                  <option value="processing">{isVi ? 'Đang Xử Lý & Cắt Lớp' : 'Processing'}</option>
                  <option value="printing">{isVi ? 'Đang In 3D' : 'Printing'}</option>
                  <option value="post_processing">{isVi ? 'Xử Lý Bề Mặt / QC' : 'Post Processing'}</option>
                  <option value="shipping">{isVi ? 'Đang Giao Hàng' : 'Shipping'}</option>
                  <option value="completed">{isVi ? 'Đã Hoàn Thành' : 'Completed'}</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-[#C5C6CD] rounded overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EFF4FF] text-[#091426] font-bold font-tech uppercase text-[10px] border-b border-[#C5C6CD]">
                  <tr>
                    <th className="py-3 px-4">Mã Đơn</th>
                    <th className="py-3 px-4">Ngày Đặt</th>
                    <th className="py-3 px-4">Khách Hàng</th>
                    <th className="py-3 px-4">Sản Phẩm & Chi Tiết</th>
                    <th className="py-3 px-4">Tổng Tiền</th>
                    <th className="py-3 px-4">Trạng Thái Gia Công</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EEFF]">
                  {filteredOrders.map((order) => {
                    const currentStage = PRODUCTION_STAGES[order.statusStageIndex || 0] || PRODUCTION_STAGES[0];

                    return (
                      <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 font-tech font-bold text-[#00687A]">
                          {order.orderNumber}
                          {order.customerType === 'guest' && (
                            <span className="block text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded w-max mt-0.5">
                              Khách vãng lai
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-tech text-[#545F73]">
                          {order.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#091426]">{order.shippingAddress.fullName}</p>
                          <p className="text-[11px] text-[#545F73] font-tech">{order.shippingAddress.phone}</p>
                          <p className="text-[10px] text-[#75777D] truncate max-w-[180px]">{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-[220px]">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-bold">{item.quantity}x</span>
                                <span className="truncate">{item.name}</span>
                                {item.material && (
                                  <span className="text-[9px] bg-gray-100 px-1 rounded font-tech text-gray-700 shrink-0">
                                    {item.material}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-tech font-bold text-[#091426]">
                          {order.payment.total.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                          <span className="block text-[9px] text-[#545F73] font-normal font-sans">
                            {order.payment.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                              order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'printing'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {currentStage.label}
                            </span>
                            <div className="w-28 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#00687A] h-full transition-all duration-300"
                                style={{ width: `${Math.round(((order.statusStageIndex + 1) / PRODUCTION_STAGES.length) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedOrderDetail(order)}
                              className="px-2.5 py-1 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] text-[11px] font-bold rounded flex items-center gap-1"
                              title="Xem chi tiết đơn"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              {isVi ? 'Chi tiết' : 'View'}
                            </button>
                            <button
                              onClick={() => {
                                onNavigate('order_tracking', { order });
                              }}
                              className="px-2.5 py-1 bg-[#091426] hover:bg-[#1E293B] text-white text-[11px] font-bold rounded flex items-center gap-1"
                              title="Xem trang tracking"
                            >
                              <span className="material-symbols-outlined text-xs">route</span>
                              Track
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="p-8 text-center text-[#545F73] text-xs">
                  {isVi ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.' : 'No orders found matching filters.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTION TELEMETRY & STATUS UPDATES */}
        {activeTab === 'production' && (
          <div className="space-y-6">
            <div className="bg-white p-5 border border-[#C5C6CD] rounded space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#091426] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00687A]">precision_manufacturing</span>
                    {isVi ? 'Bảng Điều Khiển & Cập Nhật Tiến Độ Sản Xuất 8 Bước' : '8-Stage Production Control Board'}
                  </h2>
                  <p className="text-xs text-[#545F73]">
                    {isVi
                      ? 'Chọn đơn hàng và nhấp vào từng nấc trạng thái để cập nhật trực tiếp cho khách hàng xem thời gian thực.'
                      : 'Select order and click any production milestone to update customer tracking view in real time.'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-tech text-[#545F73] block uppercase">Máy In Sẵn Sàng</span>
                  <span className="font-tech font-bold text-xs text-emerald-700">8/8 Bambu Lab X1C Online</span>
                </div>
              </div>
            </div>

            {/* Production Jobs Cards List */}
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                const currentStageIdx = order.statusStageIndex || 0;

                return (
                  <div key={order.id} className="bg-white border border-[#C5C6CD] rounded p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5EEFF]">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-[#091426] text-white font-tech font-bold text-xs rounded">
                          {order.orderNumber}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-[#091426]">
                            {order.shippingAddress.fullName} • <span className="font-normal text-[#545F73]">{order.shippingAddress.phone}</span>
                          </p>
                          <p className="text-[11px] text-[#545F73]">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-tech font-bold text-[#00687A]">
                          Tiến độ: {Math.round(((currentStageIdx + 1) / PRODUCTION_STAGES.length) * 100)}%
                        </span>
                        <button
                          onClick={() => onNavigate('order_tracking', { order })}
                          className="text-[10px] font-bold text-[#091426] underline hover:text-[#00687A]"
                        >
                          Xem khách
                        </button>
                      </div>
                    </div>

                    {/* 8-Stage Interactive Stepper for Admin */}
                    <div>
                      <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-[#545F73] block mb-2">
                        {isVi ? 'Nhấp chọn nấc tiến độ hiện tại của xưởng in:' : 'Click to set current stage:'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                        {PRODUCTION_STAGES.map((stg) => {
                          const isActive = stg.index === currentStageIdx;
                          const isDone = stg.index < currentStageIdx;

                          return (
                            <button
                              key={stg.index}
                              onClick={() => handleSetProductionStage(order.id, stg.index)}
                              className={`p-2.5 text-left rounded border transition-all flex flex-col justify-between min-h-[75px] ${
                                isActive
                                  ? 'bg-[#00687A] text-white border-[#00687A] shadow-md ring-2 ring-[#00687A]/20'
                                  : isDone
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-[#F8FAFC] text-[#545F73] border-[#CBD5E1] hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-tech text-[10px] font-bold">
                                  {isDone ? '✓ ' : ''}BƯỚC {stg.index + 1}
                                </span>
                                {isActive && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
                              </div>
                              <p className="font-bold text-[11px] leading-tight line-clamp-2 mt-1">
                                {stg.label.split('. ')[1]}
                              </p>
                              <span className="text-[9px] opacity-75 font-serif line-clamp-1 mt-0.5">
                                {stg.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCT CATALOG MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Header & Add Button */}
            <div className="bg-white p-4 border border-[#C5C6CD] rounded flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#545F73] text-sm">search</span>
                  <input
                    type="text"
                    placeholder={isVi ? 'Tìm theo tên sản phẩm, SKU...' : 'Search by name, SKU...'}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-[#C5C6CD] rounded text-xs font-bold bg-white focus:outline-none"
                >
                  <option value="all">{isVi ? 'Tất Cả Danh Mục' : 'All Categories'}</option>
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  {isVi ? 'Thêm Sản Phẩm Mới' : 'Add New Product'}
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-[#C5C6CD] rounded overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EFF4FF] text-[#091426] font-bold font-tech uppercase text-[10px] border-b border-[#C5C6CD]">
                  <tr>
                    <th className="py-3 px-4">Ảnh & Sản Phẩm</th>
                    <th className="py-3 px-4">Mã SKU</th>
                    <th className="py-3 px-4">Danh Mục</th>
                    <th className="py-3 px-4">Giá Bản In (Vật lý)</th>
                    <th className="py-3 px-4">Giá File (STL)</th>
                    <th className="py-3 px-4">Vật Liệu</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EEFF]">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-12 h-12 rounded object-cover border border-[#C5C6CD]"
                          />
                          <div>
                            <p className="font-bold text-[#091426] max-w-[200px] truncate">{prod.name}</p>
                            <p className="text-[10px] text-[#545F73]">{prod.designer}</p>
                            {prod.badge && (
                              <span className="inline-block text-[8px] font-tech font-bold px-1.5 py-0.2 bg-[#091426] text-white rounded mt-0.5">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-tech font-bold text-[#545F73]">
                        {prod.sku || 'VC-STD'}
                      </td>
                      <td className="py-3 px-4 font-sans text-[#545F73] capitalize">
                        {prod.category}
                      </td>
                      <td className="py-3 px-4 font-tech font-bold text-[#091426]">
                        {prod.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                      </td>
                      <td className="py-3 px-4 font-tech text-[#545F73]">
                        {prod.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {prod.supportedMaterials.slice(0, 2).map((m, idx) => (
                            <span key={idx} className="text-[9px] font-tech bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[10px] font-tech font-bold px-2 py-0.5 rounded ${
                          prod.status === 'Out of Stock'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {prod.status === 'Out of Stock' ? (isVi ? 'Tạm Ẩn' : 'Hidden') : (isVi ? 'Đang Bán' : 'Active')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct({ ...prod })}
                            className="p-1.5 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] rounded"
                            title="Sửa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProductConfirm(prod)}
                            className="p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded"
                            title="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PRICING & FACTORY COST MODEL (INKIRI 3D COST ENGINE) */}
        {activeTab === 'pricing' && (
          <PricingConfigPanel
            materials={materials}
            printers={printers}
            accessories={accessories}
            pricingConfig={pricingConfig}
            onUpdateMaterials={onUpdateMaterials}
            onUpdatePrinters={onUpdatePrinters}
            onUpdateAccessories={onUpdateAccessories}
            onUpdatePricingConfig={onUpdatePricingConfig}
            onShowToast={onShowToast}
          />
        )}

        {/* TAB 5: BASIC CONTENT & WORKSHOP MANAGEMENT */}
        {activeTab === 'content' && (
          <form onSubmit={handleSaveContent} className="space-y-6">
            <div className="bg-white p-6 border border-[#C5C6CD] rounded space-y-6">
              <div className="border-b border-[#C5C6CD] pb-3">
                <h2 className="text-base font-bold text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A]">tune</span>
                  {isVi ? 'Cấu Hình Nội Dung Trang Chủ & Thông Tin Xưởng In' : 'Site Announcement, Pricing & Contact Info'}
                </h2>
                <p className="text-xs text-[#545F73]">
                  {isVi
                    ? 'Nội dung chỉnh sửa tại đây sẽ lập tức hiển thị trên Banner đầu trang, Chân trang và phần Thanh toán đơn hàng.'
                    : 'Changes here update top announcement banner, footer contact, and checkout shipping fee calculation.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Announcement Bar */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 border border-[#CBD5E1] rounded">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#091426]">
                      {isVi ? '1. Banner Thông Báo Đầu Trang' : 'Top Announcement Bar'}
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contentForm.announcementActive}
                        onChange={(e) => setContentForm(prev => ({ ...prev, announcementActive: e.target.checked }))}
                        className="accent-[#00687A]"
                      />
                      <span className="font-bold">{isVi ? 'Kích hoạt' : 'Active'}</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={contentForm.announcementText}
                    onChange={(e) => setContentForm(prev => ({ ...prev, announcementText: e.target.value }))}
                    className="w-full p-2.5 border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A] bg-white"
                    placeholder="Nhập nội dung banner khuyến mãi..."
                  />
                </div>

                {/* 2. Shipping Config */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 border border-[#CBD5E1] rounded">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#091426] block">
                    {isVi ? '2. Cấu Hình Phí Vận Chuyển' : 'Shipping Fee Settings'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">{isVi ? 'Phí giao hàng chuẩn (VNĐ):' : 'Standard Fee (VND):'}</span>
                      <input
                        type="number"
                        value={contentForm.standardShippingFee}
                        onChange={(e) => setContentForm(prev => ({ ...prev, standardShippingFee: Number(e.target.value) }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs font-tech font-bold bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">{isVi ? 'Miễn phí ship từ (VNĐ):' : 'Free Ship Over (VND):'}</span>
                      <input
                        type="number"
                        value={contentForm.freeShippingThreshold}
                        onChange={(e) => setContentForm(prev => ({ ...prev, freeShippingThreshold: Number(e.target.value) }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs font-tech font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Hero Headlines */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 border border-[#CBD5E1] rounded md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#091426] block">
                    {isVi ? '3. Tiêu Đề & Lời Giới Thiệu Trang Chủ' : 'Home Hero Headline & Subtext'}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={contentForm.heroHeadline}
                      onChange={(e) => setContentForm(prev => ({ ...prev, heroHeadline: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded text-xs font-bold bg-white"
                      placeholder="Tiêu đề chính..."
                    />
                    <textarea
                      rows={2}
                      value={contentForm.heroSubheadline}
                      onChange={(e) => setContentForm(prev => ({ ...prev, heroSubheadline: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded text-xs bg-white"
                      placeholder="Đoạn văn mô tả tiêu chuẩn chế tác..."
                    />
                  </div>
                </div>

                {/* 4. Contact & Workshop Facilities */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 border border-[#CBD5E1] rounded md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#091426] block">
                    {isVi ? '4. Thông Tin Liên Hệ & Địa Chỉ Xưởng In 3D' : 'Contact & Workshop Facilities'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">Hotline tư vấn kỹ thuật:</span>
                      <input
                        type="text"
                        value={contentForm.hotline}
                        onChange={(e) => setContentForm(prev => ({ ...prev, hotline: e.target.value }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">Email tiếp nhận file CAD:</span>
                      <input
                        type="text"
                        value={contentForm.contactEmail}
                        onChange={(e) => setContentForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">Địa chỉ xưởng Hà Nội:</span>
                      <input
                        type="text"
                        value={contentForm.hanoiWorkshopAddress}
                        onChange={(e) => setContentForm(prev => ({ ...prev, hanoiWorkshopAddress: e.target.value }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#545F73] block mb-1">Địa chỉ chi nhánh HCM:</span>
                      <input
                        type="text"
                        value={contentForm.hcmWorkshopAddress}
                        onChange={(e) => setContentForm(prev => ({ ...prev, hcmWorkshopAddress: e.target.value }))}
                        className="w-full p-2 border border-[#C5C6CD] rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C5C6CD] flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white font-bold text-xs uppercase rounded transition-colors shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {isVi ? 'Lưu Cấu Hình Nội Dung' : 'Save Content Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODAL: ADD NEW PRODUCT */}
        {isNewProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded border border-[#C5C6CD] max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
                <h3 className="text-base font-bold text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A]">add_circle</span>
                  {isVi ? 'Thêm Sản Phẩm Mới Vào Kho VCUBE' : 'Add New Product to Catalog'}
                </h3>
                <button
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="text-[#545F73] hover:text-[#091426]"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveNewProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">Tên sản phẩm *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Vỏ Bọc Hộp Giảm Tốc NEMA 17"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded focus:outline-none focus:border-[#00687A]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Mã SKU</label>
                    <input
                      type="text"
                      value={newProductForm.sku}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Danh mục</label>
                    <select
                      value={newProductForm.category}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-bold"
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Giá In Vật Lý (VNĐ) *</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.pricePhysical}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, pricePhysical: Number(e.target.value) }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Giá File Số STL (VNĐ)</label>
                    <input
                      type="number"
                      value={newProductForm.priceDigital}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, priceDigital: Number(e.target.value) }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">Link Ảnh Sản Phẩm (URL)</label>
                    <input
                      type="text"
                      value={newProductForm.images?.[0] || ''}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, images: [e.target.value] }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">
                      {isVi ? 'Gắn Thẻ Tags (Ví dụ: 2/9, cơ khí, IoT, snap-fit...)' : 'Product Tags (e.g. 2/9, mechanics, IoT...)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Cách nhau bằng dấu phẩy, ví dụ: 2/9, IoT, Arduino"
                      value={newProductForm.tags?.join(', ') || ''}
                      onChange={(e) => setNewProductForm(prev => ({
                        ...prev,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[#545F73] font-bold">Gợi ý tag nhanh:</span>
                      {['2/9', 'Đại lễ 2/9', 'cơ khí', 'IoT', 'robotics', 'snap-fit', 'resin-8k', 'bán chạy'].map(sTag => (
                        <button
                          key={sTag}
                          type="button"
                          onClick={() => {
                            const cur = newProductForm.tags || [];
                            if (!cur.includes(sTag)) {
                              setNewProductForm(prev => ({ ...prev, tags: [...(prev.tags || []), sTag] }));
                            }
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                            sTag.includes('2/9')
                              ? 'bg-red-50 text-[#990000] border-red-300 font-bold'
                              : 'bg-[#E5EEFF] text-[#00687A] border-[#CBD5E1]'
                          }`}
                        >
                          + {sTag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">Mô tả sản phẩm</label>
                    <textarea
                      rows={3}
                      value={newProductForm.description}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                      placeholder="Mô tả kỹ thuật, công năng, độ bền..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                  <button
                    type="button"
                    onClick={() => setIsNewProductModalOpen(false)}
                    className="px-4 py-2 border border-[#C5C6CD] rounded font-bold hover:bg-black/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00687A] text-white rounded font-bold uppercase hover:bg-[#005463]"
                  >
                    Thêm Sản Phẩm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT EXISTING PRODUCT */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded border border-[#C5C6CD] max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
                <h3 className="text-base font-bold text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A]">edit</span>
                  {isVi ? `Chỉnh Sửa Sản Phẩm: ${editingProduct.name}` : `Edit Product: ${editingProduct.name}`}
                </h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-[#545F73] hover:text-[#091426]"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">Tên sản phẩm</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Giá In Vật Lý (VNĐ)</label>
                    <input
                      type="number"
                      value={editingProduct.pricePhysical}
                      onChange={(e) => setEditingProduct({ ...editingProduct, pricePhysical: Number(e.target.value) })}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Giá File Số STL (VNĐ)</label>
                    <input
                      type="number"
                      value={editingProduct.priceDigital}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceDigital: Number(e.target.value) })}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Trạng thái bán</label>
                    <select
                      value={editingProduct.status || 'Published'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                      className="w-full p-2 border border-[#C5C6CD] rounded font-bold"
                    >
                      <option value="Published">Đang Mở Bán (Published)</option>
                      <option value="Out of Stock">Tạm Ẩn / Hết Hàng (Out of Stock)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#091426] block mb-1">Huy hiệu hiển thị</label>
                    <input
                      type="text"
                      value={editingProduct.badge || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                      placeholder="MỚI, BÁN CHẠY, HOT..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">
                      {isVi ? 'Gắn Thẻ Tags (Ví dụ: 2/9, cơ khí, IoT, snap-fit...)' : 'Product Tags (e.g. 2/9, mechanics, IoT...)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Cách nhau bằng dấu phẩy, ví dụ: 2/9, IoT, Arduino"
                      value={editingProduct.tags?.join(', ') || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      })}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[#545F73] font-bold">Gợi ý tag nhanh:</span>
                      {['2/9', 'Đại lễ 2/9', 'cơ khí', 'IoT', 'robotics', 'snap-fit', 'resin-8k', 'bán chạy'].map(sTag => (
                        <button
                          key={sTag}
                          type="button"
                          onClick={() => {
                            const cur = editingProduct.tags || [];
                            if (!cur.includes(sTag)) {
                              setEditingProduct({ ...editingProduct, tags: [...cur, sTag] });
                            }
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                            sTag.includes('2/9')
                              ? 'bg-red-50 text-[#990000] border-red-300 font-bold'
                              : 'bg-[#E5EEFF] text-[#00687A] border-[#CBD5E1]'
                          }`}
                        >
                          + {sTag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#091426] block mb-1">Mô tả sản phẩm</label>
                    <textarea
                      rows={3}
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full p-2 border border-[#C5C6CD] rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 border border-[#C5C6CD] rounded font-bold hover:bg-black/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00687A] text-white rounded font-bold uppercase hover:bg-[#005463]"
                  >
                    Lưu Thay Đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW FULL ORDER DETAIL */}
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded border border-[#C5C6CD] max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
                <div>
                  <span className="text-[10px] font-tech uppercase tracking-wider text-[#545F73] block">Chi Tiết Đơn Hàng</span>
                  <h3 className="text-base font-bold text-[#091426] font-tech">
                    {selectedOrderDetail.orderNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="text-[#545F73] hover:text-[#091426]"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-3 rounded border border-[#E5EEFF]">
                  <div>
                    <span className="text-[10px] text-[#545F73] block uppercase font-bold">Người Nhận</span>
                    <p className="font-bold text-[#091426] text-sm">{selectedOrderDetail.shippingAddress.fullName}</p>
                    <p className="font-tech text-[#545F73]">{selectedOrderDetail.shippingAddress.phone}</p>
                    <p className="text-[#545F73] mt-1">{selectedOrderDetail.shippingAddress.address}, {selectedOrderDetail.shippingAddress.city}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#545F73] block uppercase font-bold">Thanh Toán & Vận Chuyển</span>
                    <p className="font-bold text-[#091426]">{selectedOrderDetail.payment.method}</p>
                    <p className="text-emerald-700 font-tech font-bold text-sm mt-0.5">
                      Tổng tiền: {selectedOrderDetail.payment.total.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </p>
                    <p className="text-[10px] text-[#545F73] mt-1">{selectedOrderDetail.carrier.name}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-[#545F73] block mb-2">
                    Danh Sách Sản Phẩm Chế Tác
                  </span>
                  <div className="divide-y divide-[#E5EEFF] border border-[#C5C6CD] rounded">
                    {selectedOrderDetail.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover border" />
                          <div>
                            <p className="font-bold text-[#091426]">{item.name}</p>
                            <p className="text-[10px] text-[#545F73]">
                              Vật liệu: <strong>{item.material || 'PLA Tough'}</strong> • Màu: {item.color || 'Đen'} • SL: <strong>{item.quantity}</strong>
                            </p>
                          </div>
                        </div>
                        <span className="font-tech font-bold text-[#091426]">
                          {(item.price * item.quantity).toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-4 py-2 bg-[#091426] text-white rounded font-bold uppercase hover:bg-[#1E293B]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
