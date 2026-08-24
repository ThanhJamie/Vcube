import React, { useState } from 'react';
import { Product, CustomDesignRequest, PayoutTransaction } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CUSTOM_REQUESTS, PAYOUT_TRANSACTIONS } from '../data/mockData';

interface DesignerDashboardViewProps {
  products: Product[];
  onAddNewProduct: (product: Product) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const DesignerDashboardView: React.FC<DesignerDashboardViewProps> = ({
  products,
  onAddNewProduct,
  onNavigate,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'wizard' | 'payouts' | 'requests'>('overview');

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number>(2); // 1: Upload, 2: Configure, 3: Publish
  const [modelName, setModelName] = useState('Heavy Duty Planetary Gear Assembly');
  const [modelDesc, setModelDesc] = useState('A high-precision planetary gear system designed for heavy torque applications. Print-in-place tolerances are optimized for 0.4mm nozzles.');
  const [tags, setTags] = useState<string[]>(['mechanical', 'gears', 'robotics']);
  const [newTagInput, setNewTagInput] = useState('');
  const [licenseType, setLicenseType] = useState<'Standard' | 'Commercial'>('Standard');
  const [isOfferForSale, setIsOfferForSale] = useState(true);
  const [standardPrice, setStandardPrice] = useState('120000');
  const [commercialPrice, setCommercialPrice] = useState('450000');
  const [selectedCategory, setSelectedCategory] = useState('mechanical');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Models filter state
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all');
  const [modelStatusFilter, setModelStatusFilter] = useState('all');
  const [searchModelQuery, setSearchModelQuery] = useState('');

  // Custom Requests state
  const [requests, setRequests] = useState<CustomDesignRequest[]>(CUSTOM_REQUESTS);
  const [selectedReqId, setSelectedReqId] = useState<string>(CUSTOM_REQUESTS[0].id);
  const [chatInput, setChatInput] = useState('');
  const [showProjectBriefMobile, setShowProjectBriefMobile] = useState(false);

  // Payouts state
  const [payouts, setPayouts] = useState<PayoutTransaction[]>(PAYOUT_TRANSACTIONS);
  const [availableBalance, setAvailableBalance] = useState(45250000);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState('10000000');

  const currentRequest = requests.find(r => r.id === selectedReqId) || requests[0];

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

  const handlePublishModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        sku: `MX-${Math.floor(1000 + Math.random() * 9000)}X`,
        name: modelName.trim(),
        category: selectedCategory,
        designer: 'Alexei Vanguard (Bạn)',
        designerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isPro: true,
        isVerified: true,
        pricePhysical: Number(commercialPrice) || 285000,
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
        specs: {
          dimensions: '45 x 45 x 120 mm',
          weight: '124.5g',
          resolution: '0.12 - 0.20 mm',
          infillDefault: '40% Gyroid',
          technology: 'FDM Engineering / SLA'
        },
        supportedMaterials: ['PETG Technical Pro', 'ABS Industrial Grade', 'Resin Engineering 8K'],
        colors: [
          { name: 'Xám Titan', hex: '#64748b', available: true },
          { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true }
        ],
        tags: tags.length ? tags : ['Mechanical', 'CAD', 'Precision'],
        badge: 'MỚI',
        rating: 5.0,
        reviewsCount: 0,
        printsCount: 0,
        salesCount: 0,
        printTime: '3h 15m',
        isCustomizable: true,
        licenseType,
        status: 'Published'
      };

      onAddNewProduct(newProd);
      setIsSubmitting(false);
      onShowToast(`Đã xuất bản thành công bản vẽ "${newProd.name}" lên sàn VCUBE!`);
      setActiveTab('models');
    }, 1000);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentRequest) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'designer' as const,
      senderName: 'Alexei Vanguard (Bạn)',
      senderInitials: 'AV',
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

  const handleSendQuoteInChat = () => {
    if (!currentRequest) return;
    const quoteAmount = 650000;

    const quoteMsg = {
      id: `msg-quote-${Date.now()}`,
      sender: 'designer' as const,
      senderName: 'Alexei Vanguard (Bạn)',
      senderInitials: 'AV',
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

  const filteredProducts = products.filter(p => {
    if (modelCategoryFilter !== 'all' && p.category !== modelCategoryFilter) return false;
    if (modelStatusFilter !== 'all' && (p.status || 'Published') !== modelStatusFilter) return false;
    if (searchModelQuery.trim()) {
      const q = searchModelQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30] py-6 sm:py-8 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#C5C6CD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#091426] text-white flex items-center justify-center font-bold text-sm">
              <span className="material-symbols-outlined text-[#57DFFE]">precision_manufacturing</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-tech uppercase tracking-widest text-[#545F73]">VCUBE Creator Command</span>
                <span className="px-1.5 py-0.5 bg-[#57DFFE]/20 text-[#00687A] text-[9px] font-tech font-bold rounded border border-[#57DFFE]/50">PRO TIER</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#091426]">
                Trung Tâm Tác Giả & Sản Xuất CAD
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('wizard'); setWizardStep(2); }}
              className="px-4 py-2.5 bg-[#00687A] hover:bg-[#004E5C] text-white text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap touch-target-btn"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              Đăng Tải & Cấu Hình Mới
            </button>
            <button
              onClick={() => onNavigate('designer_register')}
              className="px-3.5 py-2.5 border border-[#C5C6CD] hover:bg-white text-[#0B1C30] text-[11px] font-bold uppercase tracking-wider rounded transition-colors whitespace-nowrap touch-target-btn"
            >
              Hồ Sơ Tác Giả
            </button>
          </div>
        </div>

        {/* Global Navigation Bar for Creator Dashboard */}
        <div className="flex items-center gap-1 border-b border-[#C5C6CD] overflow-x-auto pb-0.5">
          {[
            { id: 'overview', label: 'Tổng Quan', icon: 'dashboard' },
            { id: 'models', label: `Kho Bản Vẽ (${products.length})`, icon: 'inventory_2' },
            { id: 'wizard', label: 'Cấu Hình License & Giá', icon: 'tune' },
            { id: 'requests', label: `Yêu Cầu CAD & Chat (${requests.length})`, icon: 'chat' },
            { id: 'payouts', label: 'Doanh Thu & Rút Tiền', icon: 'payments' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap touch-target-btn ${
                activeTab === tab.id
                  ? 'border-[#00687A] text-[#00687A] bg-[#E5EEFF]/60 font-extrabold'
                  : 'border-transparent text-[#545F73] hover:text-[#091426]'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded flex flex-col justify-between hover:border-[#00687A] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-[10px] text-[#545F73] uppercase tracking-wider">Doanh Thu Tác Giả</span>
                  <span className="material-symbols-outlined text-[#00687A]">payments</span>
                </div>
                <div className="text-2xl font-bold font-tech text-[#091426]">{availableBalance.toLocaleString('vi-VN')} đ</div>
                <div className="text-[11px] text-[#00687A] font-tech mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> +18.4% so với tháng trước
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded flex flex-col justify-between hover:border-[#00687A] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-[10px] text-[#545F73] uppercase tracking-wider">Lượt Tải File STL / STEP</span>
                  <span className="material-symbols-outlined text-[#75777D]">download</span>
                </div>
                <div className="text-2xl font-bold font-tech text-[#091426]">1.428</div>
                <div className="text-[11px] text-[#545F73] font-serif mt-2">Bản quyền mở Creative Commons</div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded flex flex-col justify-between hover:border-[#00687A] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-[10px] text-[#545F73] uppercase tracking-wider">Yêu Cầu CAD Tùy Chỉnh</span>
                  <span className="material-symbols-outlined text-[#75777D]">engineering</span>
                </div>
                <div className="text-2xl font-bold font-tech text-[#091426]">12</div>
                <div className="text-[11px] text-[#BA1A1A] font-tech mt-2">2 yêu cầu đang chờ báo giá</div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded flex flex-col justify-between hover:border-[#00687A] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-tech text-[10px] text-[#545F73] uppercase tracking-wider">Tỉ Lệ Đạt Kiểm Định QC</span>
                  <span className="material-symbols-outlined text-[#00687A]">verified</span>
                </div>
                <div className="text-2xl font-bold font-tech text-[#091426]">98.5%</div>
                <div className="w-full bg-[#E2E8F0] h-1.5 mt-2 rounded overflow-hidden">
                  <div className="bg-[#00687A] h-full" style={{ width: '98.5%' }}></div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent CAD Inquiries Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-[#C5C6CD] p-6 rounded space-y-4">
                <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#091426] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00687A]">chat</span>
                    Yêu Cầu Đặt Thiết Kế Riêng Mới Nhất
                  </h3>
                  <button onClick={() => setActiveTab('requests')} className="text-xs text-[#00687A] font-bold hover:underline">
                    Xem Hộp Thư CAD →
                  </button>
                </div>
                <div className="divide-y divide-[#E5EEFF]">
                  {requests.map(req => (
                    <div key={req.id} onClick={() => { setSelectedReqId(req.id); setActiveTab('requests'); }} className="py-3 flex items-center justify-between hover:bg-[#F8F9FF] px-2 rounded cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-[#D8E3FB] text-[#091426] font-bold flex items-center justify-center text-xs">
                          {req.clientInitials}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#091426]">{req.title}</p>
                          <p className="text-[11px] text-[#545F73]">{req.clientName} • {req.previewMessage}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-tech font-bold px-2 py-0.5 bg-[#E5EEFF] text-[#00687A] rounded">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#091426] text-white p-6 rounded flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-tech uppercase tracking-widest text-[#8590A6]">HỢP ĐỒNG TÁC GIẢ</span>
                  <h3 className="text-lg font-bold mt-1">VCUBE Creator Partnership</h3>
                  <p className="text-xs text-[#BCC7DE] mt-2 leading-relaxed font-serif">
                    Nhận 90% doanh thu khi người dùng tải file STL/STEP và 10% hoa hồng trên mỗi sản phẩm in vật lý hoàn thiện xuất xưởng.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveTab('wizard'); }}
                  className="w-full mt-6 py-3 bg-[#57DFFE] hover:bg-[#4CD7F6] text-[#001F26] font-bold text-xs uppercase tracking-wider rounded transition-colors"
                >
                  Tải Lên File 3D Mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MODELS INVENTORY */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#091426]">Kho Bản Vẽ & Bản Quyền CAD</h2>
                <p className="text-xs text-[#545F73]">Quản lý linh kiện cơ khí, mô hình kiến trúc và cụm lắp ráp của bạn.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã SKU..."
                  value={searchModelQuery}
                  onChange={(e) => setSearchModelQuery(e.target.value)}
                  className="bg-white border border-[#C5C6CD] px-3 py-2 text-xs rounded w-full md:w-56 focus:outline-none focus:border-[#00687A]"
                />
                <select
                  value={modelCategoryFilter}
                  onChange={(e) => setModelCategoryFilter(e.target.value)}
                  className="bg-white border border-[#C5C6CD] px-3 py-2 text-xs rounded focus:outline-none focus:border-[#00687A]"
                >
                  <option value="all">Tất Cả Danh Mục</option>
                  <option value="mechanical">Cơ khí</option>
                  <option value="iot">Vỏ hộp IoT</option>
                  <option value="architecture">Kiến trúc</option>
                </select>
                <select
                  value={modelStatusFilter}
                  onChange={(e) => setModelStatusFilter(e.target.value)}
                  className="bg-white border border-[#C5C6CD] px-3 py-2 text-xs rounded focus:outline-none focus:border-[#00687A]"
                >
                  <option value="all">Tất Cả Trạng Thái</option>
                  <option value="Published">Đã Xuất Bản</option>
                  <option value="Under Review">Đang Kiểm Định</option>
                  <option value="Draft">Bản Nháp</option>
                </select>
              </div>
            </div>

            {/* Models Table */}
            <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden">
              <div className="responsive-table-wrapper">
                <table className="text-left text-xs">
                  <thead className="bg-[#EFF4FF] border-b border-[#C5C6CD] text-[#545F73] font-tech text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Mẫu Thiết Kế</th>
                      <th className="p-3">Bản Quyền</th>
                      <th className="p-3">Giá File / In</th>
                      <th className="p-3">Đã Bán</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EEFF]">
                    {filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-[#F8FAFC] transition-colors group">
                        <td className="p-3 flex items-center gap-3">
                          <img src={prod.images[0]} alt={prod.name} className="w-12 h-12 object-cover border border-[#C5C6CD] rounded shrink-0 bg-[#1C1C1C]" />
                          <div>
                            <span className="font-bold text-[#091426] block">{prod.name}</span>
                            <span className="font-tech text-[10px] text-[#545F73]">SKU: {prod.sku || 'MX-8921A'}</span>
                          </div>
                        </td>
                        <td className="p-3 font-tech text-[#0B1C30]">
                          <span className="px-2 py-0.5 bg-[#EFF4FF] border border-[#C5C6CD] rounded text-[10px]">
                            {prod.licenseType || 'Commercial'}
                          </span>
                        </td>
                        <td className="p-3 font-tech text-[#091426]">
                          <span className="font-bold block">{prod.priceDigital.toLocaleString('vi-VN')} đ</span>
                          <span className="text-[10px] text-[#545F73]">In: {prod.pricePhysical.toLocaleString('vi-VN')} đ</span>
                        </td>
                        <td className="p-3 font-tech text-[#0B1C30]">{prod.salesCount || prod.printsCount || 12} lượt</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-tech font-bold uppercase rounded ${
                            prod.status === 'Under Review'
                              ? 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]'
                              : prod.status === 'Draft'
                              ? 'bg-[#F1F5F9] text-[#475569]'
                              : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                          }`}>
                            {prod.status || 'Published'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => onNavigate('product_detail', { product: prod })}
                            className="px-2.5 py-1.5 border border-[#091426] text-[#091426] hover:bg-[#091426] hover:text-white rounded text-[10px] uppercase font-bold transition-colors touch-target-btn"
                          >
                            Xem 3D
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WIZARD CONFIGURE LICENSE & PRICE */}
        {activeTab === 'wizard' && (
          <div className="space-y-6">
            {/* Wizard Progress Line */}
            <div className="bg-white border border-[#C5C6CD] p-4 rounded flex items-center justify-between max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#091426] text-white flex items-center justify-center text-xs font-bold font-tech">
                  <span className="material-symbols-outlined text-sm">check</span>
                </span>
                <span className="font-tech text-xs font-bold text-[#091426]">1. TẢI LÊN</span>
              </div>
              <div className="flex-1 h-0.5 bg-[#091426] mx-4"></div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#00687A] text-white flex items-center justify-center text-xs font-bold font-tech">
                  2
                </span>
                <span className="font-tech text-xs font-bold text-[#00687A]">2. CẤU HÌNH LICENSE & GIÁ</span>
              </div>
              <div className="flex-1 h-0.5 bg-[#C5C6CD] mx-4"></div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full border border-[#C5C6CD] text-[#75777D] flex items-center justify-center text-xs font-bold font-tech">
                  3
                </span>
                <span className="font-tech text-xs text-[#75777D]">3. XUẤT BẢN</span>
              </div>
            </div>

            <form onSubmit={handlePublishModel} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: 3D Preview & Specs */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-[#C5C6CD] rounded p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#091426] text-white font-tech text-[10px] rounded uppercase">{selectedCategory}</span>
                      <span className="px-2 py-0.5 bg-[#00687A] text-white font-tech text-[10px] rounded">V1.2</span>
                    </div>
                    <span className="font-tech text-[10px] text-[#545F73]">STL • 24.5 MB</span>
                  </div>

                  <div className="bg-[#091426] border border-[#1E293B] rounded p-2">
                    <ThreeModelViewer modelType="gear" color="#E0DDD5" className="h-[280px] w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 font-tech text-[11px]">
                    <div className="bg-[#F8F9FF] p-2.5 border border-[#C5C6CD] rounded">
                      <span className="text-[#545F73] text-[9px] uppercase block">THỂ TÍCH MESH</span>
                      <span className="font-bold text-[#091426]">124.5 cm³</span>
                    </div>
                    <div className="bg-[#F8F9FF] p-2.5 border border-[#C5C6CD] rounded">
                      <span className="text-[#545F73] text-[9px] uppercase block">KÍCH THƯỚC (X,Y,Z)</span>
                      <span className="font-bold text-[#091426]">45 × 45 × 120 mm</span>
                    </div>
                    <div className="bg-[#F8F9FF] p-2.5 border border-[#C5C6CD] rounded">
                      <span className="text-[#545F73] text-[9px] uppercase block">ĐỘ DÀY VÁCH NHỎ NHẤT</span>
                      <span className="font-bold text-[#091426]">1.2 mm</span>
                    </div>
                    <div className="bg-[#F8F9FF] p-2.5 border border-[#C5C6CD] rounded">
                      <span className="text-[#545F73] text-[9px] uppercase block">KHUYẾN NGHỊ VẬT LIỆU</span>
                      <span className="font-bold text-[#00687A]">PETG / ABS Pro</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Identity, Licensing, Pricing */}
              <div className="lg:col-span-7 space-y-6">
                {/* Section 1: Identity */}
                <div className="bg-white border border-[#C5C6CD] p-5 rounded space-y-4">
                  <h3 className="font-bold text-sm text-[#091426] uppercase tracking-wider border-b border-[#C5C6CD] pb-2">
                    1. Định Danh & Mô Tả Bản Vẽ
                  </h3>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Tên Model / Bản Vẽ:</label>
                    <input
                      type="text"
                      required
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Mô Tả Kỹ Thuật (Hỗ trợ Markdown):</label>
                    <textarea
                      rows={3}
                      value={modelDesc}
                      onChange={(e) => setModelDesc(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Thẻ Phân Loại (Tags):</label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded min-h-[42px]">
                      {tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-[#D3E4FE] text-[#091426] rounded text-[10px] font-tech flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-[#BA1A1A]">×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Thêm tag (nhấn Enter)..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="bg-transparent border-none text-xs focus:ring-0 p-0 text-[#091426] min-w-[120px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Licensing & Rights */}
                <div className="bg-white border border-[#C5C6CD] p-5 rounded space-y-4">
                  <h3 className="font-bold text-sm text-[#091426] uppercase tracking-wider border-b border-[#C5C6CD] pb-2">
                    2. Quyền Sử Dụng & Giấy Phép (Licensing)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`border p-4 rounded cursor-pointer transition-all ${
                      licenseType === 'Standard' ? 'border-[#00687A] bg-[#EFF4FF] ring-1 ring-[#00687A]' : 'border-[#CBD5E1] hover:border-[#75777D]'
                    }`}>
                      <input
                        type="radio"
                        name="license_type"
                        className="sr-only"
                        checked={licenseType === 'Standard'}
                        onChange={() => setLicenseType('Standard')}
                      />
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs text-[#091426]">Standard (Cá Nhân)</span>
                        <span className="material-symbols-outlined text-sm text-[#00687A]">shield</span>
                      </div>
                      <p className="text-[11px] text-[#545F73] leading-relaxed">
                        Chỉ sử dụng in cá nhân. Không được bán lại thành phẩm vật lý hoặc chia sẻ file nguồn.
                      </p>
                    </label>

                    <label className={`border p-4 rounded cursor-pointer transition-all ${
                      licenseType === 'Commercial' ? 'border-[#00687A] bg-[#EFF4FF] ring-1 ring-[#00687A]' : 'border-[#CBD5E1] hover:border-[#75777D]'
                    }`}>
                      <input
                        type="radio"
                        name="license_type"
                        className="sr-only"
                        checked={licenseType === 'Commercial'}
                        onChange={() => setLicenseType('Commercial')}
                      />
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs text-[#091426]">Commercial (Thương Mại)</span>
                        <span className="material-symbols-outlined text-sm text-[#00687A]">verified</span>
                      </div>
                      <p className="text-[11px] text-[#545F73] leading-relaxed">
                        Cho phép sản xuất và thương mại hóa thành phẩm vật lý. Tác giả nhận hoa hồng trọn đời.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Section 3: Pricing Strategy */}
                <div className="bg-white border border-[#C5C6CD] p-5 rounded space-y-4">
                  <h3 className="font-bold text-sm text-[#091426] uppercase tracking-wider border-b border-[#C5C6CD] pb-2">
                    3. Chiến Lược Định Giá
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Giá Tải File Số (Standard):</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={standardPrice}
                          onChange={(e) => setStandardPrice(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 text-xs font-tech text-[#091426] rounded focus:outline-none focus:border-[#00687A]"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-tech text-[#545F73]">VNĐ</span>
                      </div>
                      <p className="text-[10px] text-[#00687A] font-tech mt-1">
                        Tác giả thực nhận: <strong>{((Number(standardPrice) || 0) * 0.9).toLocaleString('vi-VN')} đ</strong> (90%)
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Giá Bản Quyền Thương Mại (Commercial):</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={commercialPrice}
                          onChange={(e) => setCommercialPrice(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 text-xs font-tech text-[#091426] rounded focus:outline-none focus:border-[#00687A]"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-tech text-[#545F73]">VNĐ</span>
                      </div>
                      <p className="text-[10px] text-[#545F73] font-tech mt-1">
                        Áp dụng khi khách mua gói sản xuất hàng loạt
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('models')}
                    className="px-5 py-2.5 border border-[#C5C6CD] hover:bg-white text-xs font-bold uppercase rounded touch-target-btn"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#00687A] hover:bg-[#004E5C] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-sm touch-target-btn"
                  >
                    <span className="material-symbols-outlined text-base">publish</span>
                    {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'XUẤT BẢN THIẾT KẾ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: CUSTOM DESIGN REQUESTS & CHAT */}
        {activeTab === 'requests' && (
          <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden flex flex-col md:flex-row h-[700px]">
            {/* Left Conversations List */}
            <div className="w-full md:w-80 border-r border-[#C5C6CD] flex flex-col h-full bg-[#F8F9FF] shrink-0">
              <div className="p-3.5 border-b border-[#C5C6CD] flex items-center justify-between bg-white">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426]">Yêu Cầu CAD ({requests.length})</h3>
                <span className="px-2 py-0.5 bg-[#57DFFE]/30 text-[#004E5C] text-[10px] font-tech font-bold rounded">Active</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5EEFF]">
                {requests.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      selectedReqId === req.id ? 'bg-[#E5EEFF] border-l-4 border-l-[#00687A]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#D8E3FB] text-[#091426] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {req.clientInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-bold text-xs text-[#091426] truncate">{req.clientName}</span>
                        <span className="text-[10px] font-tech text-[#545F73]">{req.time}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#00687A] truncate">{req.title}</p>
                      <p className="text-[11px] text-[#545F73] truncate">{req.previewMessage}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Live Chat Thread */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
              {/* Chat Header */}
              <div className="h-14 border-b border-[#C5C6CD] px-4 flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D8E3FB] text-[#091426] flex items-center justify-center font-bold text-xs">
                    {currentRequest.clientInitials}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#091426]">{currentRequest.clientName}</h4>
                    <p className="text-[10px] text-[#00687A] font-tech">Trực tuyến • Dự án: {currentRequest.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendQuoteInChat}
                    className="px-3 py-1.5 bg-[#00687A] hover:bg-[#004E5C] text-white text-[10px] font-bold uppercase rounded flex items-center gap-1 touch-target-btn"
                  >
                    <span className="material-symbols-outlined text-sm">request_quote</span>
                    Gửi Báo Giá CAD
                  </button>
                  <button
                    onClick={() => setShowProjectBriefMobile(!showProjectBriefMobile)}
                    className="lg:hidden p-1.5 border border-[#C5C6CD] rounded text-[#091426]"
                  >
                    <span className="material-symbols-outlined text-base">info</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FF]">
                {currentRequest.messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'designer' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 text-xs rounded shadow-sm leading-relaxed ${
                      msg.sender === 'designer' ? 'bg-[#091426] text-white' : 'bg-white border border-[#C5C6CD] text-[#091426]'
                    }`}>
                      <p>{msg.text}</p>
                      {msg.attachment && (
                        <div className="mt-2 p-2 bg-black/10 border border-black/20 rounded flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-[#00687A]">view_in_ar</span>
                          <div>
                            <p className="font-tech font-bold text-[11px]">{msg.attachment.name}</p>
                            <p className="text-[9px] text-[#545F73]">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                      {msg.quote && (
                        <div className="mt-2.5 p-3 bg-[#00687A]/10 border border-[#00687A] rounded text-[#0B1C30]">
                          <div className="flex items-center justify-between font-bold text-xs text-[#00687A] mb-1">
                            <span>BÁO GIÁ KỸ THUẬT CAD</span>
                            <span className="font-tech text-sm">{msg.quote.amount.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <p className="text-[10px] text-[#545F73]">{msg.quote.description}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-[#00687A] text-white text-[9px] font-tech uppercase rounded">
                            ĐÃ GỬI ĐẾN KHÁCH HÀNG
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-tech text-[#75777D] mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#C5C6CD] bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Trao đổi kỹ thuật, dung sai, vật liệu..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 text-xs rounded focus:outline-none focus:border-[#00687A]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold uppercase rounded transition-colors touch-target-btn"
                >
                  Gửi
                </button>
              </form>
            </div>

            {/* Right Project Brief */}
            <div className={`w-72 border-l border-[#C5C6CD] bg-[#F8FAFC] p-4 space-y-4 shrink-0 ${
              showProjectBriefMobile ? 'block' : 'hidden lg:block'
            }`}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#091426] border-b border-[#C5C6CD] pb-2">
                Project Brief
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-tech text-[#545F73] uppercase block">Ngân Sách Dự Kiến:</span>
                  <span className="font-tech font-bold text-[#00687A]">{currentRequest.budget}</span>
                </div>
                <div>
                  <span className="text-[10px] font-tech text-[#545F73] uppercase block">Thời Hạn Bàn Giao:</span>
                  <span className="font-tech font-bold text-[#091426]">{currentRequest.deadline}</span>
                </div>
                <div>
                  <span className="text-[10px] font-tech text-[#545F73] uppercase block">Yêu Cầu Vật Liệu:</span>
                  <span className="font-bold text-[#091426]">{currentRequest.targetSpecs.material}</span>
                </div>
                <div>
                  <span className="text-[10px] font-tech text-[#545F73] uppercase block">Mật Độ Infill & Nozzle:</span>
                  <span className="text-[#091426]">{currentRequest.targetSpecs.infill} • {currentRequest.targetSpecs.nozzle}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#C5C6CD]">
                <span className="text-[10px] font-tech text-[#545F73] uppercase block mb-1.5">Tập Tin Đính Kèm:</span>
                <div className="space-y-1.5">
                  {currentRequest.referenceFiles.map(f => (
                    <div key={f.name} className="p-2 bg-white border border-[#C5C6CD] rounded flex items-center gap-2 text-[11px] font-tech">
                      <span className="material-symbols-outlined text-sm text-[#00687A]">attachment</span>
                      <span className="truncate flex-1">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REVENUE & PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Available Balance Hero Card */}
              <div className="md:col-span-5 bg-[#091426] text-white p-6 rounded flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-tech uppercase tracking-widest text-[#57DFFE]">SỐ DƯ KHẢ DỤNG</span>
                  <div className="text-3xl font-bold font-tech mt-1 text-white">
                    {availableBalance.toLocaleString('vi-VN')} đ
                  </div>
                  <p className="text-xs text-[#8590A6] mt-1 font-serif">
                    Doanh thu từ 432 đơn in vật lý và 1.428 lượt tải file số STL.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="w-full py-3 bg-[#00687A] hover:bg-[#004E5C] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors touch-target-btn shadow-md"
                  >
                    Yêu Cầu Rút Tiền Về Ngân Hàng
                  </button>
                  <p className="text-[10px] font-tech text-[#BCC7DE] text-center">Tự động tất toán ngày 15 hàng tháng</p>
                </div>
              </div>

              {/* Linked Accounts */}
              <div className="md:col-span-7 bg-white border border-[#C5C6CD] p-5 rounded space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426] border-b border-[#C5C6CD] pb-2">
                  Tài Khoản Nhận Thanh Toán
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 border-2 border-[#00687A] bg-[#EFF4FF] rounded flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#00687A] text-2xl">account_balance</span>
                    <div>
                      <p className="font-bold text-xs text-[#091426]">Vietcombank</p>
                      <p className="text-[10px] font-tech text-[#545F73]">**** **** 1234 (Mặc định)</p>
                    </div>
                  </div>

                  <div className="p-3 border border-[#CBD5E1] bg-white rounded flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#EA580C] text-2xl">account_balance_wallet</span>
                    <div>
                      <p className="font-bold text-xs text-[#091426]">Ví MoMo Business</p>
                      <p className="text-[10px] font-tech text-[#545F73]">0987 654 321</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout History */}
            <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden">
              <div className="p-4 border-b border-[#C5C6CD] flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426]">Lịch Sử Rút Tiền & Quyết Toán</h3>
                <span className="font-tech text-[10px] text-[#545F73]">Sao kê tự động 90 ngày</span>
              </div>
              <div className="responsive-table-wrapper">
                <table className="text-left text-xs">
                  <thead className="bg-[#EFF4FF] border-b border-[#C5C6CD] text-[#545F73] font-tech text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Ngày</th>
                      <th className="p-3">Mã Giao Dịch</th>
                      <th className="p-3">Phương Thức</th>
                      <th className="p-3 text-right">Số Tiền</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EEFF]">
                    {payouts.map(p => (
                      <tr key={p.id} className="hover:bg-[#F8FAFC]">
                        <td className="p-3 font-tech text-[#0B1C30]">{p.date}</td>
                        <td className="p-3 font-tech text-[#545F73]">{p.reference}</td>
                        <td className="p-3 text-[#091426]">{p.method}</td>
                        <td className="p-3 font-tech font-bold text-right text-[#091426]">
                          {p.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#166534] font-tech text-[10px] rounded font-bold">
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

        {/* Payout Request Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#C5C6CD] rounded max-w-md w-full p-6 space-y-4 text-[#0B1C30] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
                <h3 className="font-bold text-sm text-[#091426] uppercase">Yêu Cầu Rút Tiền Về Ngân Hàng</h3>
                <button onClick={() => setIsPayoutModalOpen(false)} className="text-gray-500 hover:text-black">✕</button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Số tiền muốn rút (VNĐ):</label>
                <input
                  type="number"
                  value={payoutAmountInput}
                  onChange={(e) => setPayoutAmountInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-sm font-tech font-bold rounded focus:outline-none focus:border-[#00687A]"
                />
                <p className="text-[10px] text-[#545F73] font-tech mt-1">Số dư hiện có: {availableBalance.toLocaleString('vi-VN')} đ</p>
              </div>

              <div className="p-3 bg-[#EFF4FF] border border-[#C5C6CD] rounded text-xs">
                <span className="font-bold block text-[#00687A]">Tài khoản thụ hưởng:</span>
                <p className="font-tech text-[11px] mt-0.5">VIETCOMBANK • NGUYEN VAN MINH (****1234)</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-[#C5C6CD] text-xs font-bold rounded uppercase"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleRequestPayout}
                  className="px-5 py-2 bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold rounded uppercase transition-colors"
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
