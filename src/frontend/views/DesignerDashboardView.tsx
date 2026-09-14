import React, { useCallback, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, CustomDesignRequest, PayoutTransaction, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CUSTOM_REQUESTS, PAYOUT_TRANSACTIONS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { Button, Icon, PageHeader } from '@frontend/ui';

/**
 * Tab của `/designer` — PHẢI khớp `DESIGNER_NAV` trong `src/App.tsx`
 * (`SideNav` dựng ở đó trỏ tới `/designer/<id>`).
 */
type DesignerTabId = 'overview' | 'models' | 'wizard' | 'payouts' | 'requests';

const DESIGNER_TAB_IDS: DesignerTabId[] = ['overview', 'models', 'wizard', 'payouts', 'requests'];

interface DesignerDashboardViewProps {
  products: Product[];
  onAddNewProduct: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const DesignerDashboardView: React.FC<DesignerDashboardViewProps> = ({
  products,
  onAddNewProduct,
  onUpdateProduct,
  onDeleteProduct,
  materials = [],
  pricingConfig,
  onNavigate,
  onShowToast
}) => {
  const { user, profile } = useAuth();
  // §3: KHÔNG bịa tên tác giả. Không có hồ sơ ⇒ để trống cho tới khi người dùng đặt tên.
  const currentDesignerName = profile?.displayName || user?.email || '—';

  /**
   * Tab đang mở đọc từ URL (`/designer/:tab`) — URL là NGUỒN SỰ THẬT DUY NHẤT, nên
   * deep-link `/designer/payouts` mở đúng tab và `SideNav` (ở `App.tsx`) highlight đúng mục.
   * Giá trị lạ ⇒ rơi về tab đầu (`overview`).
   */
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: DesignerTabId = DESIGNER_TAB_IDS.includes(tabParam as DesignerTabId)
    ? (tabParam as DesignerTabId)
    : 'overview';
  const setActiveTab = useCallback(
    (next: DesignerTabId) => {
      navigate(`/designer/${next}`);
    },
    [navigate],
  );

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number>(2); // 1: Upload, 2: Configure & 3D, 3: Pricing & Publish
  const [modelName, setModelName] = useState('Heavy Duty Planetary Gear Assembly');
  const [modelDesc, setModelDesc] = useState('Hệ thống bánh răng hành tinh chịu tải cao với dung sai in-place tối ưu cho đầu đùn 0.4mm. Khuyến nghị in bằng PETG Technical hoặc Nylon-CF.');
  const [tags, setTags] = useState<string[]>(['cơ khí', 'bánh răng', 'robotics', 'in-place']);
  const [newTagInput, setNewTagInput] = useState('');
  const [licenseType, setLicenseType] = useState<'Standard' | 'Commercial' | 'Exclusive'>('Standard');
  const [standardPrice, setStandardPrice] = useState('120000');
  const [physicalPrice, setPhysicalPrice] = useState('285000');
  const [selectedCategory, setSelectedCategory] = useState('mechanical');
  const [selectedModelType, setSelectedModelType] = useState<'gear' | 'case' | 'figurine' | 'bracket' | 'drone'>('gear');
  const [uploadedFileName, setUploadedFileName] = useState('Planetary_Gear_Heavy_Duty_v2.stl');
  const [uploadedFileSize, setUploadedFileSize] = useState('24.5 MB');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Models filter state
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all');
  const [modelStatusFilter, setModelStatusFilter] = useState('all');
  const [modelAuthorFilter, setModelAuthorFilter] = useState<'all' | 'mine'>('all');
  const [searchModelQuery, setSearchModelQuery] = useState('');

  // Editing Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPricePhysical, setEditPricePhysical] = useState('');
  const [editPriceDigital, setEditPriceDigital] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLicense, setEditLicense] = useState<'Standard' | 'Commercial' | 'Exclusive'>('Standard');
  const [editStatus, setEditStatus] = useState<'Published' | 'Under Review' | 'Draft'>('Published');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // 3D Preview Modal State
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Custom Requests state
  const [requests, setRequests] = useState<CustomDesignRequest[]>(CUSTOM_REQUESTS);
  const [selectedReqId, setSelectedReqId] = useState<string>(CUSTOM_REQUESTS[0]?.id || '');
  const [chatInput, setChatInput] = useState('');
  const [showProjectBriefMobile, setShowProjectBriefMobile] = useState(false);

  // Payouts state
  const [payouts, setPayouts] = useState<PayoutTransaction[]>(PAYOUT_TRANSACTIONS);
  const [availableBalance, setAvailableBalance] = useState(48500000);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState('10000000');

  const currentRequest = requests.find(r => r.id === selectedReqId) || requests[0] || null;

  // Helper for tagging
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(newTagInput.trim().toLowerCase())) {
        setTags([...tags, newTagInput.trim().toLowerCase()]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Open Edit Modal
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku || '');
    setEditCategory(prod.category || 'mechanical');
    setEditPricePhysical(prod.pricePhysical?.toString() || '0');
    setEditPriceDigital(prod.priceDigital?.toString() || '0');
    setEditDesc(prod.description || '');
    setEditLicense(prod.licenseType || 'Standard');
    setEditStatus((prod.status as any) || 'Published');
    setEditTags(prod.tags || []);
  };

  // Save Edit Product Changes
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updatedProd: Product = {
      ...editingProduct,
      name: editName.trim() || editingProduct.name,
      sku: editSku.trim() || editingProduct.sku,
      category: editCategory || editingProduct.category,
      pricePhysical: Number(editPricePhysical) || editingProduct.pricePhysical,
      priceDigital: Number(editPriceDigital) || editingProduct.priceDigital,
      description: editDesc.trim() || editingProduct.description,
      licenseType: editLicense,
      status: editStatus as any,
      tags: editTags.length > 0 ? editTags : editingProduct.tags,
    };

    if (onUpdateProduct) {
      onUpdateProduct(updatedProd);
    }
    setEditingProduct(null);
    onShowToast(`Đã cập nhật ấn phẩm "${updatedProd.name}" vào Catalog thành công!`);
  };

  // Quick Toggle Status
  const handleToggleProductStatus = (prod: Product) => {
    const nextStatus = (prod.status === 'Published') ? 'Draft' : 'Published';
    const updatedProd: Product = {
      ...prod,
      status: nextStatus as any,
    };
    if (onUpdateProduct) {
      onUpdateProduct(updatedProd);
    }
    onShowToast(`Đã chuyển trạng thái sang "${nextStatus === 'Published' ? 'Đã Xuất Bản' : 'Bản Nháp'}"`);
  };

  // Delete product with confirm
  const handleDeleteConfirm = (prod: Product) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ấn phẩm "${prod.name}" khỏi Catalog không?`)) {
      if (onDeleteProduct) {
        onDeleteProduct(prod.id);
        onShowToast(`Đã xóa ấn phẩm "${prod.name}" khỏi cơ sở dữ liệu.`);
      }
    }
  };

  // Giá gợi ý theo định mức MẪU — không phải số đo từ tệp của tác giả (PC-09).
  const handleAutoEstimatePrice = () => {
    // §3 (PC-09): 125g và 3.5h là ĐỊNH MỨC MẪU, không đo từ tệp nào.
    const weightGrams = 125;
    const materialCost = weightGrams * 450; // 450d/gram
    const machinePrintTimeHours = 3.5;
    const machineHourRate = 35000;
    const laborPrep = 30000;
    const totalEst = Math.round((materialCost + (machinePrintTimeHours * machineHourRate) + laborPrep) / 5000) * 5000;
    setPhysicalPrice(totalEst.toString());
    onShowToast(`Đã điền giá TẠM TÍNH theo định mức mẫu (125g nhựa, 3.5h máy — chưa đo từ tệp của bạn): ${totalEst.toLocaleString('vi-VN')} đ. Hãy sửa lại theo cân nặng & thời gian in thật.`);
  };

  // Publish New Model
  const handlePublishModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        sku: `VC-${Math.floor(1000 + Math.random() * 9000)}X`,
        name: modelName.trim(),
        category: selectedCategory,
        designer: `${currentDesignerName} (Bạn)`,
        designerAvatar: profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        // §3 (AT-07): ấn phẩm mới chưa được đo kiểm ⇒ không gắn nhãn Pro/Verified.
        isPro: false,
        isVerified: false,
        pricePhysical: Number(physicalPrice) || 285000,
        priceDigital: Number(standardPrice) || 89000,
        images: [
          'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
        ],
        description: modelDesc,
        features: [
          'Tối ưu hóa dung sai in-place 0.15mm',
          'Khuyến nghị in bằng PETG / Nylon kỹ thuật',
          licenseType === 'Commercial' ? 'Bản quyền thương mại sản phẩm vật lý' : 'Bản quyền sử dụng cá nhân'
        ],
        // §3 (AT-07): chưa đo tệp ⇒ thông số để trống, không bịa kích thước/khối lượng.
        specs: {
          dimensions: '—',
          weight: '—',
          resolution: '—',
          infillDefault: '—',
          technology: '—'
        },
        supportedMaterials: ['PETG Technical Pro', 'ABS Industrial Grade', 'Resin Engineering 8K'],
        colors: [
          { name: 'Xám Titan', hex: '#64748b', available: true },
          { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true }
        ],
        tags: tags.length ? tags : ['Mechanical', 'CAD', 'Precision'],
        badge: 'MỚI',
        rating: 0,
        reviewsCount: 0,
        printsCount: 0,
        salesCount: 0,
        printTime: '—',
        isCustomizable: true,
        licenseType,
        status: 'Published'
      };

      onAddNewProduct(newProd);
      setIsSubmitting(false);
      onShowToast(`Đã xuất bản thành công bản vẽ "${newProd.name}" vào Catalog VCUBE!`);
      setActiveTab('models');
    }, 800);
  };

  // Chat message send
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentRequest) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'designer' as const,
      senderName: `${currentDesignerName} (Bạn)`,
      senderInitials: 'LT',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text: chatInput.trim()
    };

    setRequests(prev => prev.map(req => {
      if (req.id === currentRequest.id) {
        return {
          ...req,
          messages: [...req.messages, newMsg],
          previewMessage: `Bạn: ${chatInput.trim()}`,
          time: 'Vừa xong'
        };
      }
      return req;
    }));

    setChatInput('');
  };

  // Send CAD quote in chat
  const handleSendQuoteInChat = () => {
    if (!currentRequest) return;
    const quoteAmount = 650000;

    const quoteMsg = {
      id: `msg-quote-${Date.now()}`,
      sender: 'designer' as const,
      senderName: `${currentDesignerName} (Bạn)`,
      senderInitials: 'LT',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text: `Tôi đã phát hành Báo Giá Kỹ Thuật cho dự án "${currentRequest.title}".`,
      quote: {
        amount: quoteAmount,
        currency: 'VND',
        description: 'Bao gồm chỉnh sửa kích thước CAD, bổ sung gân gia cường và 02 lần hiệu chỉnh miễn phí.',
        status: 'sent' as const
      }
    };

    setRequests(prev => prev.map(req => {
      if (req.id === currentRequest.id) {
        return {
          ...req,
          status: 'Quoted',
          messages: [...req.messages, quoteMsg]
        };
      }
      return req;
    }));

    onShowToast(`Đã gửi báo giá 650.000 đ tới khách hàng ${currentRequest.clientName}!`);
  };

  // Payout request
  const handleRequestPayout = () => {
    const amount = Number(payoutAmountInput) || 10000000;
    if (amount > availableBalance) {
      onShowToast('Số dư khả dụng không đủ');
      return;
    }

    const newTx: PayoutTransaction = {
      id: `TRX-${Math.floor(10000 + Math.random() * 90000)}-Z`,
      date: new Date().toLocaleDateString('vi-VN'),
      reference: `VCUBE-WITHDRAW-${Date.now().toString().slice(-5)}`,
      method: 'Vietcombank (*1234)',
      amount,
      status: 'COMPLETED'
    };

    setPayouts([newTx, ...payouts]);
    setAvailableBalance(prev => prev - amount);
    setIsPayoutModalOpen(false);
    onShowToast(`Đã chuyển ${amount.toLocaleString('vi-VN')} đ về tài khoản Vietcombank thành công!`);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (modelAuthorFilter === 'mine') {
        const isMine = p.designer?.toLowerCase().includes('bạn') || 
                       p.designer?.toLowerCase().includes('thắng') || 
                       p.designer?.toLowerCase().includes('alexei');
        if (!isMine) return false;
      }
      if (modelCategoryFilter !== 'all' && p.category !== modelCategoryFilter) return false;
      if (modelStatusFilter !== 'all' && (p.status || 'Published') !== modelStatusFilter) return false;
      if (searchModelQuery.trim()) {
        const q = searchModelQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || p.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [products, modelAuthorFilter, modelCategoryFilter, modelStatusFilter, searchModelQuery]);

  return (
    <div className="flex w-full flex-col gap-section font-sans text-fg">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Quản Lý Ẩn Phẩm &amp; Giá In 3D</span>
            <span className="rounded-sm border border-warning/30 bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning">
              CREATOR LEVEL 3
            </span>
          </span>
        }
        description="Ấn phẩm số, giá bán và quyết toán bản quyền của tác giả."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Icon name="storefront" size={16} />}
              onClick={() => onNavigate('explore')}
            >
              Xem Catalog VCUBE
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="upload_file" size={16} />}
              onClick={() => {
                setActiveTab('wizard');
                setWizardStep(1);
              }}
            >
              Đăng Tải Ẩn Phẩm Mới
            </Button>
          </>
        }
      />

      <div className="flex w-full flex-col gap-block">
        
        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">Doanh Thu & Hoa Hồng Khả Dụng</span>
                  <Icon name="payments" size={24} className="text-primary" />
                </div>
                <div className="text-2xl font-bold font-tech text-fg">{availableBalance.toLocaleString('vi-VN')} đ</div>
                <div className="text-xs text-primary font-tech mt-2 flex items-center gap-1">
                  <Icon name="trending_up" size={16} /> +22.4% hoa hồng tháng này
                </div>
              </div>

              <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">Lượt Tải File Số STL / STEP</span>
                  <Icon name="download" size={24} className="text-fg-muted" />
                </div>
                <div className="text-2xl font-bold font-tech text-fg">1.842</div>
                <div className="text-xs text-fg-muted mt-2 font-tech">Hưởng 90% giá bán file số</div>
              </div>

              <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">Đơn In 3D Vật Lý Đã Xuất</span>
                  <Icon name="precision_manufacturing" size={24} className="text-fg-muted" />
                </div>
                <div className="text-2xl font-bold font-tech text-fg">529</div>
                <div className="text-xs text-primary font-tech mt-2">Hưởng 10% hoa hồng trên mỗi chi tiết</div>
              </div>

              <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">Độ Tin Cậy QC & In Thành Công</span>
                  <Icon name="verified" size={24} className="text-primary" />
                </div>
                <div className="text-2xl font-bold font-tech text-fg">99.2%</div>
                <div className="w-full bg-line-subtle h-1.5 mt-2 rounded-sm overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '99.2%' }}></div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Inquiries */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-surface p-6 rounded-sm space-y-4 shadow-e1">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-fg flex items-center gap-2">
                    <Icon name="chat" size={24} className="text-primary" />
                    Yêu Cầu CAD Riêng Từ Khách Hàng
                  </h3>
                  <button onClick={() => setActiveTab('requests')} className="text-xs text-primary font-bold hover:underline">
                    Xem Toàn Bộ Hộp Thư →
                  </button>
                </div>
                <div className="divide-y divide-line-subtle">
                  {requests.map(req => (
                    <div 
                      key={req.id} 
                      onClick={() => { setSelectedReqId(req.id); setActiveTab('requests'); }} 
                      className="py-3 flex items-center justify-between hover:bg-surface-muted px-2 rounded-sm cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-fg font-bold flex items-center justify-center text-xs">
                          {req.clientInitials}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-fg">{req.title}</p>
                          <p className="text-xs text-fg-muted">{req.clientName} • {req.previewMessage}</p>
                        </div>
                      </div>
                      <span className="text-xs font-tech font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-sm">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-surface-inverse text-on-inverse p-6 rounded-sm flex flex-col justify-between shadow-e2">
                <div>
                  <span className="text-xs font-tech uppercase tracking-widest text-accent">CHÍNH SÁCH ĐỒNG BỘ CATALOG</span>
                  <h3 className="text-lg font-bold mt-1">Đồng Bộ Trực Tiếp Vào Database</h3>
                  <p className="text-xs text-fg-subtle mt-2 leading-relaxed">
                    Mọi ấn phẩm do bạn tạo mới hoặc điều chỉnh giá sẽ tự động được lưu trữ vào Catalog DB chung của VCUBE, xuất hiện ngay lập tức trên Marketplace và hệ thống báo giá in.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveTab('wizard'); setWizardStep(1); }}
                  className="w-full mt-6 py-3 bg-accent hover:bg-accent/80 text-surface-inverse font-bold text-xs uppercase tracking-wider rounded-full transition-colors touch-target-btn"
                >
                  Tải Lên Ấn Phẩm Mới Ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ ẤN PHẨM & ĐIỀU CHỈNH GIÁ */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-fg">Kho Ấn Phẩm & Điều Chỉnh Giá In</h2>
                <p className="text-xs text-fg-muted">
                  Quản lý {products.length} ấn phẩm trong Catalog DB. Bạn có thể chỉnh sửa thông tin kỹ thuật, giá in vật lý và giá file số.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Tìm theo tên, SKU, tag..."
                  value={searchModelQuery}
                  onChange={(e) => setSearchModelQuery(e.target.value)}
                  className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm w-full sm:w-52 focus:outline-none focus:border-primary"
                />

                <select
                  value={modelAuthorFilter}
                  onChange={(e) => setModelAuthorFilter(e.target.value as any)}
                  className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                >
                  <option value="all">Tất Cả Ấn Phẩm</option>
                  <option value="mine">Ấn Phẩm Của Tôi</option>
                </select>

                <select
                  value={modelCategoryFilter}
                  onChange={(e) => setModelCategoryFilter(e.target.value)}
                  className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                >
                  <option value="all">Mọi Danh Mục</option>
                  <option value="mechanical">Cơ khí</option>
                  <option value="iot">Vỏ hộp IoT</option>
                  <option value="robotics">Robot</option>
                  <option value="art">Nghệ thuật</option>
                  <option value="tools">Công cụ</option>
                </select>

                <select
                  value={modelStatusFilter}
                  onChange={(e) => setModelStatusFilter(e.target.value)}
                  className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                >
                  <option value="all">Mọi Trạng Thái</option>
                  <option value="Published">Đã Xuất Bản</option>
                  <option value="Under Review">Chờ Duyệt</option>
                  <option value="Draft">Bản Nháp</option>
                </select>
              </div>
            </div>

            {/* Models Table */}
            <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-e1">
              <div className="responsive-table-wrapper">
                <table className="text-left text-xs w-full">
                  <thead className="bg-primary/10 border-b border-line text-fg-muted font-tech text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Ấn Phẩm & SKU</th>
                      <th className="p-3.5">Tác Giả</th>
                      <th className="p-3.5">Giấy Phép</th>
                      <th className="p-3.5 text-right">Giá Tải File Số</th>
                      <th className="p-3.5 text-right">Giá In 3D Vật Lý</th>
                      <th className="p-3.5 text-center">Trạng Thái</th>
                      <th className="p-3.5 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-canvas transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img 
                            src={prod.images?.[0] || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'} 
                            alt={prod.name} 
                            className="w-12 h-12 object-cover border border-line rounded-sm shrink-0 bg-surface-inverse" 
                          />
                          <div>
                            <span className="font-bold text-fg block leading-tight">{prod.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-tech text-xs text-fg-muted">SKU: {prod.sku || '—'}</span>
                              <span className="px-1.5 py-0.2 bg-line-subtle text-fg font-tech text-xs rounded-sm uppercase">
                                {prod.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-fg font-sans">
                          <span className="font-medium text-xs">{prod.designer}</span>
                        </td>

                        <td className="p-3.5 font-tech text-fg">
                          <span className="px-2 py-0.5 bg-primary/10 border border-line rounded-sm text-xs font-bold text-primary">
                            {prod.licenseType || 'Standard'}
                          </span>
                        </td>

                        <td className="p-3.5 font-tech text-right">
                          <span className="font-bold text-fg block text-xs">
                            {(prod.priceDigital || 0).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-primary">Nhận ~{Math.round((prod.priceDigital || 0) * 0.9).toLocaleString('vi-VN')} đ</span>
                        </td>

                        <td className="p-3.5 font-tech text-right">
                          <span className="font-bold text-fg block text-xs">
                            {(prod.pricePhysical || 0).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-fg-muted">Nhận ~{Math.round((prod.pricePhysical || 0) * 0.1).toLocaleString('vi-VN')} đ / sp</span>
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleProductStatus(prod)}
                            title="Bấm để đổi trạng thái"
                            className={`px-2.5 py-1 text-xs font-tech font-bold uppercase rounded-full transition-colors ${
                              prod.status === 'Under Review'
                                ? 'bg-warning/10 text-warning border border-warning/30'
                                : prod.status === 'Draft'
                                ? 'bg-line-subtle text-fg-muted border border-line-control'
                                : 'bg-positive/10 text-positive border border-positive/30'
                            }`}
                          >
                            {prod.status || 'Published'}
                          </button>
                        </td>

                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Sửa thông tin & Giá */}
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn shadow-e1"
                          >
                            <Icon name="edit" size={18} />
                            Sửa & Giá
                          </button>

                          {/* Xem 3D */}
                          <button
                            onClick={() => setPreviewProduct(prod)}
                            className="px-2.5 py-1.5 border border-line-control hover:bg-line-subtle text-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn"
                          >
                            <Icon name="view_in_ar" size={18} />
                            Xem 3D
                          </button>

                          {/* Xóa */}
                          <Button
                            iconOnly
                            size="sm"
                            variant="danger-ghost"
                            aria-label="Xoá ấn phẩm"
                            title="Xóa ấn phẩm"
                            onClick={() => handleDeleteConfirm(prod)}
                            leadingIcon={<Icon name="delete" size={14} />}
                          />
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-fg-muted text-xs">
                          Không tìm thấy ấn phẩm nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WIZARD UPLOAD & PUBLISH TO CATALOG DB */}
        {activeTab === 'wizard' && (
          <div className="space-y-6">
            {/* Progress Stepper */}
            <div className="bg-surface p-4 rounded-sm flex items-center justify-between max-w-2xl mx-auto shadow-e1">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`flex items-center gap-2 ${wizardStep >= 1 ? 'text-primary' : 'text-fg-subtle'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
                  wizardStep >= 1 ? 'bg-primary text-primary-fg' : 'border border-line'
                }`}>
                  1
                </span>
                <span className="font-tech text-xs font-bold">1. TẢI FILE 3D</span>
              </button>

              <div className={`flex-1 h-0.5 mx-4 ${wizardStep >= 2 ? 'bg-primary' : 'bg-line-subtle'}`}></div>

              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className={`flex items-center gap-2 ${wizardStep >= 2 ? 'text-primary' : 'text-fg-subtle'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
                  wizardStep >= 2 ? 'bg-primary text-primary-fg' : 'border border-line'
                }`}>
                  2
                </span>
                <span className="font-tech text-xs font-bold">2. XEM 3D & THÔNG SỐ</span>
              </button>

              <div className={`flex-1 h-0.5 mx-4 ${wizardStep >= 3 ? 'bg-primary' : 'bg-line-subtle'}`}></div>

              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`flex items-center gap-2 ${wizardStep >= 3 ? 'text-primary' : 'text-fg-subtle'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
                  wizardStep >= 3 ? 'bg-primary text-primary-fg' : 'border border-line'
                }`}>
                  3
                </span>
                <span className="font-tech text-xs font-bold">3. ĐỊNH GIÁ & XUẤT BẢN</span>
              </button>
            </div>

            {/* STEP 1: File Upload */}
            {wizardStep === 1 && (
              <div className="max-w-2xl mx-auto bg-surface p-6 rounded-sm space-y-6 shadow-e1">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-fg">Tải Lên Tệp Bản Vẽ 3D (STL, STEP, 3MF, OBJ)</h2>
                  <p className="text-xs text-fg-muted">
                    Hệ thống sẽ tự động quét lưới đa giác (mesh), kiểm tra độ kín nước (manifold) và tính toán dung tích in.
                  </p>
                </div>

                <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-8 text-center space-y-3 cursor-pointer hover:bg-primary/10 transition-all">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Icon name="upload_file" size={30} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-fg">Kéo thả file CAD vào đây hoặc bấm để chọn tệp</p>
                    <p className="text-xs text-fg-muted mt-1 font-tech">Hỗ trợ .STL, .STEP, .STP, .3MF, .OBJ (Tối đa 150 MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".stl,.step,.stp,.3mf,.obj"
                    className="hidden"
                    id="file-upload-designer"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const f = e.target.files[0];
                        setUploadedFileName(f.name);
                        setUploadedFileSize(`${(f.size / (1024 * 1024)).toFixed(1)} MB`);
                        setModelName(f.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '));
                        setWizardStep(2);
                        onShowToast(`Đã nhận file "${f.name}". Bắt đầu phân tích hình học 3D!`);
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload-designer"
                    className="inline-block px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase rounded-sm cursor-pointer"
                  >
                    Chọn Tệp Từ Máy Tính
                  </label>
                </div>

                {/* Preset sample files */}
                <div className="border-t border-line pt-4 space-y-2">
                  <span className="text-xs font-tech font-bold uppercase text-fg-muted">Hoặc chọn mẫu bản vẽ kỹ thuật có sẵn:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Cụm Bánh Răng Hành Tinh', file: 'Planetary_Gear_Assy.stl', type: 'gear' as const },
                      { name: 'Vỏ Hộp Cảm Biến IoT', file: 'IoT_Sensor_Enclosure_IP65.step', type: 'case' as const },
                      { name: 'Khung Gá Động Cơ Nema 17', file: 'Motor_Mount_Bracket.stl', type: 'bracket' as const },
                    ].map(sample => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => {
                          setUploadedFileName(sample.file);
                          setModelName(sample.name);
                          setSelectedModelType(sample.type);
                          setWizardStep(2);
                        }}
                        className="p-2.5 border border-line-control bg-canvas hover:border-primary rounded-full text-left transition-colors"
                      >
                        <p className="font-bold text-xs text-fg truncate">{sample.name}</p>
                        <p className="text-xs font-tech text-fg-muted mt-0.5">{sample.file}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 & 3: FORM CONFIGURATION & PUBLISH */}
            {wizardStep >= 2 && (
              <form onSubmit={handlePublishModel} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: 3D Preview & Specs */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-surface rounded-sm p-4 space-y-3 shadow-e1">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-surface-inverse text-on-inverse font-tech text-xs rounded-sm uppercase">{selectedCategory}</span>
                        <span className="px-2 py-0.5 bg-primary text-primary-fg font-tech text-xs rounded-sm">V1.0</span>
                      </div>
                      <span className="font-tech text-xs text-fg-muted">{uploadedFileName} • {uploadedFileSize}</span>
                    </div>

                    <div className="bg-surface-inverse border border-surface-inverse-raised rounded-sm p-2">
                      <ThreeModelViewer modelType={selectedModelType} color="#E0DDD5" className="h-[280px] w-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 font-tech text-xs">
                      <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                        <span className="text-fg-muted text-xs uppercase block">THỂ TÍCH MESH</span>
                        <span className="font-bold text-fg">124.5 cm³</span>
                      </div>
                      <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                        <span className="text-fg-muted text-xs uppercase block">KÍCH THƯỚC (X,Y,Z)</span>
                        <span className="font-bold text-fg">45 × 45 × 120 mm</span>
                      </div>
                      <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                        <span className="text-fg-muted text-xs uppercase block">ĐỘ KÍN NƯỚC (MANIFOLD)</span>
                        <span className="font-bold text-positive flex items-center gap-0.5">
                          <Icon name="check_circle" size={14} /> ĐẠT CHUẨN IN
                        </span>
                      </div>
                      <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                        <span className="text-fg-muted text-xs uppercase block">KHUYẾN NGHỊ VẬT LIỆU</span>
                        <span className="font-bold text-primary">PETG / Nylon-CF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Identity, Licensing, Pricing */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Section 1: Identity */}
                  <div className="bg-surface p-5 rounded-sm space-y-4 shadow-e1">
                    <h3 className="font-bold text-sm text-fg uppercase tracking-wider border-b border-line pb-2">
                      1. Thông Tin Bản Vẽ & Danh Mục
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs uppercase font-bold text-fg block mb-1">Tên Ấn Phẩm:</label>
                        <input
                          type="text"
                          required
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase font-bold text-fg block mb-1">Danh Mục:</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                        >
                          <option value="mechanical">Cơ khí chính xác</option>
                          <option value="iot">Vỏ hộp IoT & Thiết bị điện tử</option>
                          <option value="robotics">Robot & Tự động hóa</option>
                          <option value="art">Nghệ thuật & Điêu khắc</option>
                          <option value="tools">Dụng cụ & Đồ gá kỹ thuật</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-fg block mb-1">Mô Tả Kỹ Thuật & Hướng Dẫn In:</label>
                      <textarea
                        rows={3}
                        value={modelDesc}
                        onChange={(e) => setModelDesc(e.target.value)}
                        className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-fg block mb-1">Thẻ Phân Loại (Tags):</label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-canvas border border-line rounded-sm min-h-[38px]">
                        {tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-primary/10 text-fg rounded-sm text-xs font-tech flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-danger">×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="Thêm tag (nhấn Enter)..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          className="bg-transparent border-none text-xs focus:ring-0 p-0 text-fg min-w-[100px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Licensing */}
                  <div className="bg-surface p-5 rounded-sm space-y-3 shadow-e1">
                    <h3 className="font-bold text-sm text-fg uppercase tracking-wider border-b border-line pb-2">
                      2. Giấy Phép Bản Quyền (License)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`border p-3.5 rounded-sm cursor-pointer transition-all ${
                        licenseType === 'Standard' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-line hover:border-fg-muted'
                      }`}>
                        <input
                          type="radio"
                          name="license_type"
                          className="sr-only"
                          checked={licenseType === 'Standard'}
                          onChange={() => setLicenseType('Standard')}
                        />
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-fg">Standard (Cá Nhân)</span>
                          <Icon name="shield" size={16} className="text-primary" />
                        </div>
                        <p className="text-xs text-fg-muted leading-relaxed">
                          Chỉ dùng in cá nhân. Không được bán lại thành phẩm vật lý hoặc chia sẻ file nguồn.
                        </p>
                      </label>

                      <label className={`border p-3.5 rounded-sm cursor-pointer transition-all ${
                        licenseType === 'Commercial' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-line hover:border-fg-muted'
                      }`}>
                        <input
                          type="radio"
                          name="license_type"
                          className="sr-only"
                          checked={licenseType === 'Commercial'}
                          onChange={() => setLicenseType('Commercial')}
                        />
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-fg">Commercial (Thương Mại)</span>
                          <Icon name="verified" size={16} className="text-primary" />
                        </div>
                        <p className="text-xs text-fg-muted leading-relaxed">
                          Cho phép sản xuất và thương mại hóa thành phẩm vật lý. Tác giả nhận hoa hồng trọn đời.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Section 3: Pricing Strategy */}
                  <div className="bg-surface p-5 rounded-sm space-y-4 shadow-e1">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <h3 className="font-bold text-sm text-fg uppercase tracking-wider">
                        3. Chiến Lược Định Giá (File Số & In Vật Lý)
                      </h3>
                      <button
                        type="button"
                        onClick={handleAutoEstimatePrice}
                        className="text-xs font-tech text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <Icon name="calculate" size={18} />
                        Điền giá tạm tính (định mức mẫu)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase font-bold text-fg block mb-1">
                          Giá Tải File Thiết Kế Số (STL/STEP):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={standardPrice}
                            onChange={(e) => setStandardPrice(e.target.value)}
                            className="w-full bg-canvas border border-line-control p-2 text-xs font-tech text-fg rounded-sm focus:outline-none focus:border-primary"
                          />
                          <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">VNĐ</span>
                        </div>
                        <p className="text-xs text-primary font-tech mt-1">
                          Tác giả thực nhận: <strong>{((Number(standardPrice) || 0) * 0.9).toLocaleString('vi-VN')} đ</strong> (90%)
                        </p>
                      </div>

                      <div>
                        <label className="text-xs uppercase font-bold text-fg block mb-1">
                          Giá In 3D Vật Lý Thành Phẩm:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={physicalPrice}
                            onChange={(e) => setPhysicalPrice(e.target.value)}
                            className="w-full bg-canvas border border-line-control p-2 text-xs font-tech text-fg rounded-sm focus:outline-none focus:border-primary"
                          />
                          <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">VNĐ</span>
                        </div>
                        <p className="text-xs text-fg-muted font-tech mt-1">
                          Hoa hồng tác giả: <strong>{((Number(physicalPrice) || 0) * 0.1).toLocaleString('vi-VN')} đ</strong> / sản phẩm in
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('models')}
                      className="px-5 py-2.5 border border-line-control hover:bg-surface-muted text-xs font-bold uppercase rounded-full touch-target-btn"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5 shadow-e1 touch-target-btn"
                    >
                      <Icon name="cloud_upload" size={18} />
                      {isSubmitting ? 'ĐANG LƯU VÀO DB...' : 'XUẤT BẢN VÀO CATALOG'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: CUSTOM CAD REQUESTS & CHAT */}
        {activeTab === 'requests' && (
          <div className="bg-surface border border-line rounded-sm overflow-hidden flex flex-col md:flex-row h-[700px] shadow-e1">
            {/* Left Conversations List */}
            <div className="w-full md:w-80 border-r border-line flex flex-col h-full bg-surface-muted shrink-0">
              <div className="p-3.5 border-b border-line flex items-center justify-between bg-surface">
                <h3 className="font-bold text-xs uppercase tracking-wider text-fg">Yêu Cầu CAD ({requests.length})</h3>
                <span className="px-2 py-0.5 bg-accent/30 text-primary text-xs font-tech font-bold rounded-sm">Active</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-line-subtle">
                {requests.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      selectedReqId === req.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-surface-muted'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-fg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {req.clientInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-bold text-xs text-fg truncate">{req.clientName}</span>
                        <span className="text-xs font-tech text-fg-muted">{req.time}</span>
                      </div>
                      <p className="text-xs font-semibold text-primary truncate">{req.title}</p>
                      <p className="text-xs text-fg-muted truncate">{req.previewMessage}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Live Chat Thread */}
            {currentRequest ? (
              <div className="flex-1 flex flex-col h-full bg-surface relative">
                {/* Chat Header */}
                <div className="h-14 border-b border-line px-4 flex items-center justify-between bg-canvas">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-fg flex items-center justify-center font-bold text-xs">
                      {currentRequest.clientInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-fg">{currentRequest.clientName}</h4>
                      <p className="text-xs text-primary font-tech">Trực tuyến • Dự án: {currentRequest.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendQuoteInChat}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full flex items-center gap-1 touch-target-btn"
                    >
                      <Icon name="request_quote" size={18} />
                      Gửi Báo Giá CAD
                    </button>
                    <button aria-label="Thông tin dự án"
                      onClick={() => setShowProjectBriefMobile(!showProjectBriefMobile)}
                      className="lg:hidden p-1.5 border border-line-control rounded-full text-fg"
                    >
                      <Icon name="info" size={18} />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted">
                  {currentRequest.messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'designer' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 text-xs rounded-sm shadow-e1 leading-relaxed ${
                        msg.sender === 'designer' ? 'bg-surface-inverse text-on-inverse' : 'bg-surface border border-line text-fg'
                      }`}>
                        <p>{msg.text}</p>
                        {msg.attachment && (
                          <div className="mt-2 p-2 bg-on-inverse/10 border border-line rounded-sm flex items-center gap-2">
                            <Icon name="view_in_ar" size={18} className="text-primary" />
                            <div>
                              <p className="font-tech font-bold text-xs">{msg.attachment.name}</p>
                              <p className="text-xs text-fg-muted">{msg.attachment.size}</p>
                            </div>
                          </div>
                        )}
                        {msg.quote && (
                          <div className="mt-2.5 p-3 bg-primary/10 border border-primary rounded-sm text-fg">
                            <div className="flex items-center justify-between font-bold text-xs text-primary mb-1">
                              <span>BÁO GIÁ KỸ THUẬT CAD</span>
                              <span className="font-tech text-sm">{msg.quote.amount.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <p className="text-xs text-fg-muted">{msg.quote.description}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-primary text-primary-fg text-xs font-tech uppercase rounded-sm">
                              ĐÃ GỬI ĐẾN KHÁCH HÀNG
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-tech text-fg-subtle mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChatMessage} className="p-3 border-t border-line bg-surface flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Trao đổi kỹ thuật, dung sai, vật liệu..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-canvas border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full transition-colors touch-target-btn"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-fg-muted text-xs">
                Chưa có yêu cầu CAD nào được chọn
              </div>
            )}

            {/* Right Project Brief */}
            {currentRequest && (
              <div className={`w-72 border-l border-line bg-canvas p-4 space-y-4 shrink-0 ${
                showProjectBriefMobile ? 'block' : 'hidden lg:block'
              }`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-fg border-b border-line pb-2">
                  Project Brief
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-xs font-tech text-fg-muted uppercase block">Ngân Sách Dự Kiến:</span>
                    <span className="font-tech font-bold text-primary">{currentRequest.budget}</span>
                  </div>
                  <div>
                    <span className="text-xs font-tech text-fg-muted uppercase block">Thời Hạn Bàn Giao:</span>
                    <span className="font-tech font-bold text-fg">{currentRequest.deadline}</span>
                  </div>
                  <div>
                    <span className="text-xs font-tech text-fg-muted uppercase block">Yêu Cầu Vật Liệu:</span>
                    <span className="font-bold text-fg">{currentRequest.targetSpecs.material}</span>
                  </div>
                  <div>
                    <span className="text-xs font-tech text-fg-muted uppercase block">Mật Độ Infill:</span>
                    <span className="text-fg">{currentRequest.targetSpecs.infill}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REVENUE & PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Available Balance Hero Card */}
              <div className="md:col-span-5 bg-surface-inverse text-on-inverse p-6 rounded-sm flex flex-col justify-between space-y-4 shadow-e2">
                <div>
                  <span className="text-xs font-tech uppercase tracking-widest text-accent">SỐ DƯ KHẢ DỤNG</span>
                  <div className="text-3xl font-bold font-tech mt-1 text-on-inverse">
                    {availableBalance.toLocaleString('vi-VN')} đ
                  </div>
                  <p className="text-xs text-fg-subtle mt-1">
                    Doanh thu tích lũy từ lượt tải file STL và hoa hồng in 3D vật lý.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-colors touch-target-btn shadow-e2"
                  >
                    Yêu Cầu Rút Tiền Về Ngân Hàng
                  </button>
                  <p className="text-xs font-tech text-fg-subtle text-center">Tự động quyết toán ngày 15 hàng tháng</p>
                </div>
              </div>

              {/* Linked Accounts */}
              <div className="md:col-span-7 bg-surface p-5 rounded-sm space-y-4 shadow-e1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-fg border-b border-line pb-2">
                  Tài Khoản Nhận Thanh Toán
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 border-2 border-primary bg-primary/10 rounded-sm flex items-center gap-3">
                    <Icon name="account_balance" size={28} className="text-primary" />
                    <div>
                      <p className="font-bold text-xs text-fg">Vietcombank</p>
                      <p className="text-xs font-tech text-fg-muted">**** **** 1234 (Mặc định)</p>
                    </div>
                  </div>

                  <div className="p-3 bg-surface rounded-sm flex items-center gap-3">
                    <Icon name="account_balance_wallet" size={28} className="text-warning-strong" />
                    <div>
                      <p className="font-bold text-xs text-fg">Ví MoMo Business</p>
                      <p className="text-xs font-tech text-fg-muted">0987 654 321</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout History */}
            <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-e1">
              <div className="p-4 border-b border-line flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-fg">Lịch Sử Rút Tiền & Quyết Toán</h3>
                <span className="font-tech text-xs text-fg-muted">Sao kê tự động 90 ngày</span>
              </div>
              <div className="responsive-table-wrapper">
                <table className="text-left text-xs w-full">
                  <thead className="bg-primary/10 border-b border-line text-fg-muted font-tech text-xs uppercase">
                    <tr>
                      <th className="p-3">Ngày</th>
                      <th className="p-3">Mã Giao Dịch</th>
                      <th className="p-3">Phương Thức</th>
                      <th className="p-3 text-right">Số Tiền</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {payouts.map(p => (
                      <tr key={p.id} className="hover:bg-canvas">
                        <td className="p-3 font-tech text-fg">{p.date}</td>
                        <td className="p-3 font-tech text-fg-muted">{p.reference}</td>
                        <td className="p-3 text-fg">{p.method}</td>
                        <td className="p-3 font-tech font-bold text-right text-fg">
                          {p.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-positive/10 text-positive font-tech text-xs rounded-sm font-bold">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT PRODUCT DETAILS & PRICING */}
        {editingProduct && (
          <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface rounded-lg max-w-2xl w-full p-6 space-y-4 text-fg shadow-e3 my-8">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="edit" size={24} className="text-primary" />
                  <h3 className="font-bold text-sm text-fg uppercase">
                    Chỉnh Sửa Ấn Phẩm & Giá In (Catalog DB)
                  </h3>
                </div>
                <button onClick={() => setEditingProduct(null)} className="text-fg-subtle hover:text-fg">✕</button>
              </div>

              <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Tên Ấn Phẩm:</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Mã SKU:</label>
                    <input
                      type="text"
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs font-tech focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Danh Mục:</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="mechanical">Cơ khí chính xác</option>
                      <option value="iot">Vỏ hộp IoT</option>
                      <option value="robotics">Robot & Automation</option>
                      <option value="art">Nghệ thuật & Decor</option>
                      <option value="tools">Dụng cụ & Đồ gá</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Giấy Phép (License):</label>
                    <select
                      value={editLicense}
                      onChange={(e) => setEditLicense(e.target.value as any)}
                      className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="Standard">Standard (Cá nhân)</option>
                      <option value="Commercial">Commercial (Thương mại)</option>
                      <option value="Exclusive">Exclusive (Độc quyền)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Trạng Thái Xuất Bản:</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="Published">Published (Đã xuất bản)</option>
                      <option value="Under Review">Under Review (Chờ duyệt)</option>
                      <option value="Draft">Draft (Bản nháp)</option>
                    </select>
                  </div>
                </div>

                {/* PRICING FIELDS */}
                <div className="p-3.5 bg-primary/10 border border-line rounded-sm space-y-3">
                  <span className="font-bold text-xs text-primary block uppercase font-tech">
                    ĐIỀU CHỈNH GIÁ BÁN & HOA HỒNG (VNĐ)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-fg block mb-1">
                        Giá Tải File Thiết Kế Số:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                            value={editPriceDigital}
                          onChange={(e) => setEditPriceDigital(e.target.value)}
                          className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">đ</span>
                      </div>
                      <p className="text-xs text-primary font-tech mt-1">
                        Tác giả nhận: {Math.round((Number(editPriceDigital) || 0) * 0.9).toLocaleString('vi-VN')} đ (90%)
                      </p>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-fg block mb-1">
                        Giá In 3D Vật Lý Thành Phẩm:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={editPricePhysical}
                          onChange={(e) => setEditPricePhysical(e.target.value)}
                          className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">đ</span>
                      </div>
                      <p className="text-xs text-fg-muted font-tech mt-1">
                        Hoa hồng tác giả: {Math.round((Number(editPricePhysical) || 0) * 0.1).toLocaleString('vi-VN')} đ / sp
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Mô Tả Kỹ Thuật:</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-full uppercase transition-colors shadow-e1"
                  >
                    Lưu Thay Đổi Vào Catalog
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: 3D PREVIEW INSPECTION */}
        {previewProduct && (
          <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg max-w-2xl w-full p-6 space-y-4 text-fg shadow-e3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-bold text-sm text-fg">{previewProduct.name}</h3>
                  <p className="text-xs font-tech text-fg-muted">SKU: {previewProduct.sku || '—'} • {previewProduct.category}</p>
                </div>
                <button onClick={() => setPreviewProduct(null)} className="text-fg-subtle hover:text-fg">✕</button>
              </div>

              <div className="bg-surface-inverse border border-surface-inverse-raised rounded-sm p-2">
                <ThreeModelViewer 
                  modelType={previewProduct.category === 'iot' ? 'case' : 'gear'} 
                  color="#E0DDD5" 
                  className="h-[320px] w-full" 
                />
              </div>

              <div className="grid grid-cols-3 gap-2 font-tech text-xs">
                <div className="p-2 bg-canvas border border-line rounded-sm">
                  <span className="text-xs text-fg-muted block">GIÁ TẢI SỐ</span>
                  <span className="font-bold text-fg">{(previewProduct.priceDigital || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="p-2 bg-canvas border border-line rounded-sm">
                  <span className="text-xs text-fg-muted block">GIÁ IN VẬT LÝ</span>
                  <span className="font-bold text-fg">{(previewProduct.pricePhysical || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="p-2 bg-canvas border border-line rounded-sm">
                  <span className="text-xs text-fg-muted block">GIẤY PHÉP</span>
                  <span className="font-bold text-primary">{previewProduct.licenseType || 'Standard'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setPreviewProduct(null)}
                  className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = previewProduct;
                    setPreviewProduct(null);
                    handleOpenEditModal(prod);
                  }}
                  className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-full uppercase"
                >
                  Chỉnh Sửa Bản Vẽ Này
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: PAYOUT REQUEST */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4">
            <div className="bg-surface rounded-sm max-w-md w-full p-6 space-y-4 text-fg shadow-e3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-bold text-sm text-fg uppercase">Yêu Cầu Rút Tiền Về Ngân Hàng</h3>
                <button onClick={() => setIsPayoutModalOpen(false)} className="text-fg-subtle hover:text-fg">✕</button>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-fg-muted block mb-1">Số tiền muốn rút (VNĐ):</label>
                <input
                  type="number"
                  value={payoutAmountInput}
                  onChange={(e) => setPayoutAmountInput(e.target.value)}
                  className="w-full bg-canvas border border-line-control p-2.5 text-sm font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-fg-muted font-tech mt-1">Số dư hiện có: {availableBalance.toLocaleString('vi-VN')} đ</p>
              </div>

              <div className="p-3 bg-primary/10 border border-line rounded-sm text-xs">
                <span className="font-bold block text-primary">Tài khoản thụ hưởng:</span>
                <p className="font-tech text-xs mt-0.5">VIETCOMBANK • {currentDesignerName.toUpperCase()} (****1234)</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleRequestPayout}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-full uppercase transition-colors"
                >
                  Xác Nhận Rút
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DesignerDashboardView;
