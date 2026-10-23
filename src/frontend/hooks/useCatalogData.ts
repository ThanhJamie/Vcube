/**
 * useCatalogData — domain catalog của `MainApp` (Phase 3c), tách NGUYÊN VĂN logic khỏi
 * `src/App.tsx` để route/hook hoá dần.
 *
 * Hợp đồng (hành vi giữ y nguyên):
 * - `products` là nguồn DUY NHẤT từ DB (không fixture/localStorage); `loadProducts` chống
 *   double-fetch (StrictMode/retry), revision-guard để fetch cũ không đè cập nhật mới của
 *   realtime/admin, và xếp hàng refetch khi auth context đổi giữa chừng.
 * - Realtime `public:products` giữ nguyên channel/table/callback/cleanup (`removeChannel`).
 * - materials/printers/accessories nạp 1 lần từ DB; bảng RỖNG là dữ liệu thật ⇒ `[]`.
 * - CRUD sản phẩm: optimistic update + rollback + toast khi DB lỗi (giữ nguyên flow).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccessoryItem, MaterialProfile, PrinterProfile, Product } from '@/types';
import { dbService } from '@backend/supabase/database';
import { rowToProduct } from '@backend/supabase/mappers';
import { supabase } from '@backend/supabase/client';
import { useAuth } from '@frontend/context/AuthContext';

export interface CatalogData {
  products: Product[];
  productsLoading: boolean;
  productsError: boolean;
  loadProducts: () => Promise<void>;
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  handleAddNewProduct: (prod: Product) => Promise<void>;
  handleUpdateProduct: (updated: Product) => Promise<void>;
  handleDeleteProduct: (productId: string) => Promise<void>;
  handleUpdateMaterials: (newMaterials: MaterialProfile[]) => void;
  handleUpdatePrinters: (newPrinters: PrinterProfile[]) => void;
  handleUpdateAccessories: (newAccessories: AccessoryItem[]) => void;
}

export function useCatalogData({ showToast }: { showToast: (msg: string) => void }): CatalogData {
  const { user, role, loading: authLoading } = useAuth();

  // Core App State — DB là nguồn duy nhất cho dữ liệu DB-backed (products/site content/
  // materials/printers). Khởi tạo RỖNG rồi nạp từ Supabase; KHÔNG còn cache localStorage
  // (Phase 3: bỏ nguồn sự thật thứ hai — docs/tasks/optimization/PLAN.md).
  const [products, setProducts] = useState<Product[]>([]);
  /** Đang nạp catalog từ DB — HomeView dùng để hiện skeleton thay vì "0 bản vẽ". */
  const [productsLoading, setProductsLoading] = useState(true);
  /** Lỗi đọc catalog lần gần nhất (D1=1A: chỉ boolean, không lộ err.message). */
  const [productsError, setProductsError] = useState(false);
  /** Theo dõi mounted để không setState sau unmount. */
  const mountedRef = useRef(true);
  /** Chặn double-fetch (StrictMode / retry khi in-flight). */
  const productsLoadingRef = useRef(false);
  /** Tăng mỗi khi realtime/admin cập nhật state để fetch cũ không đè (D6/D7). */
  const productsRevisionRef = useRef(0);
  /**
   * Khoá ngữ cảnh auth (`user?.id|role`) của lượt fetch: `requestAuthKeyRef` = lượt SẮP gọi,
   * `activeAuthKeyRef` = lượt ĐANG bay. Nếu guard `productsLoadingRef` chặn một lượt có khoá
   * KHÁC lượt đang bay (user/role đổi giữa chừng) thì ghi vào `pendingRefetchRef` để chạy lại
   * sau `finally`. CÙNG khoá (StrictMode double-invoke) KHÔNG xếp hàng ⇒ vẫn chống double-fetch.
   */
  const requestAuthKeyRef = useRef<string | null>(null);
  const activeAuthKeyRef = useRef<string | null>(null);
  const pendingRefetchRef = useRef<string | null>(null);

  const [materials, setMaterials] = useState<MaterialProfile[]>([]);

  const [printers, setPrinters] = useState<PrinterProfile[]>([]);

  // Đợt T: danh mục phụ kiện do DB quyết định — khởi tạo rỗng.
  // Trước đây state gán fixture rỗng trong mockData nhưng
  // KHÔNG có chỗ nào nạp từ bảng `accessories`, nên trang quản trị luôn trống.
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);

  /**
   * Ref tới giá trị MỚI NHẤT cho các handler CRUD — để handler giữ **identity ổn định**
   * (`useCallback`) mà vẫn tính đúng phần "đã bị xoá" khi danh sách đổi.
   *
   * VÌ SAO: trước đây các `handleUpdate*` là hàm thường ⇒ identity mới sau MỖI render. Panel
   * admin nhận handler qua props và đưa nó vào dep của `useCallback`/`useEffect` (vd
   * `Group1WorkshopsPanel.loadFleet`) ⇒ mỗi lần state catalog đổi lại tạo effect mới ⇒
   * **vòng lặp fetch vô hạn + ghi DB lặp** (bug "UI nhảy" ở Admin → Xưởng in & Thiết bị).
   */
  const productsRef = useRef<Product[]>([]);
  const materialsRef = useRef<MaterialProfile[]>([]);
  const printersRef = useRef<PrinterProfile[]>([]);
  const accessoriesRef = useRef<AccessoryItem[]>([]);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    productsRef.current = products;
    materialsRef.current = materials;
    printersRef.current = printers;
    accessoriesRef.current = accessories;
    showToastRef.current = showToast;
  }, [products, materials, printers, accessories, showToast]);

  // Synchronize products from Supabase DB on startup (retryable, revision-guarded)
  //
  // `loadProducts` là nguồn DUY NHẤT thay `products` từ DB. Cờ `productsLoadingRef` chặn
  // double-fetch (StrictMode/retry khi in-flight); `productsRevisionRef` nhường quyền cho
  // realtime/admin mới hơn đã cập nhật state trong lúc fetch còn bay (R1/R3/R8).
  const loadProducts = useCallback(async () => {
    const authKey = requestAuthKeyRef.current;
    if (productsLoadingRef.current) {
      // Đang có lượt bay. Chỉ hẹn chạy lại khi ngữ cảnh auth ĐÃ ĐỔI; cùng ngữ cảnh (StrictMode)
      // thì bỏ qua để không tạo double-fetch.
      if (authKey !== activeAuthKeyRef.current) pendingRefetchRef.current = authKey;
      return;
    }
    productsLoadingRef.current = true;
    activeAuthKeyRef.current = authKey;
    setProductsLoading(true);
    setProductsError(false);
    const startRev = productsRevisionRef.current;
    try {
      const remote = await dbService.getProducts();          // RLS quyết định; KHÔNG seed fixture
      if (!mountedRef.current) return;
      if (productsRevisionRef.current !== startRev) return;  // nhường realtime/admin mới hơn
      // DB rỗng + không lỗi ⇒ [] là dữ liệu THẬT (empty-state nói thật). Không còn cache
      // localStorage để xoá/ghi đè.
      setProducts(remote);
    } catch (err) {
      console.warn('[vcube] Could not sync remote products:', err);
      if (mountedRef.current) setProductsError(true);        // giữ state đã nạp (D2) — DB vẫn là nguồn duy nhất
    } finally {
      productsLoadingRef.current = false;
      if (mountedRef.current) setProductsLoading(false);
      // Lượt bị nuốt khi auth/user/role đổi giữa chừng → chạy lại một lần với ngữ cảnh mới nhất.
      const pendingKey = pendingRefetchRef.current;
      pendingRefetchRef.current = null;
      if (pendingKey !== null && pendingKey !== activeAuthKeyRef.current && mountedRef.current) {
        requestAuthKeyRef.current = pendingKey;
        void loadProducts();
      }
    }
  }, []);

  // Theo dõi mounted để không setState sau unmount (StrictMode-safe).
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch catalog sau khi auth đã resolve — tránh anon RLS trả [] rồi set state rỗng oan (F14/F15).
  useEffect(() => {
    if (authLoading) return;
    // Ghi ngữ cảnh auth của lượt sắp gọi để `loadProducts` phân biệt "đổi user/role" với
    // StrictMode double-invoke cùng ngữ cảnh.
    requestAuthKeyRef.current = `${user?.id ?? 'anon'}|${role ?? ''}`;
    void loadProducts();
  }, [authLoading, user?.id, role, loadProducts]);

  // Supabase Realtime Channel for Multi-user Sync — tách riêng khỏi fetch (D6).
  useEffect(() => {
    let isMounted = true;

    const channel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newRecord: any = payload.new;
            productsRevisionRef.current++;
            setProducts((prev) => {
              if (prev.some((p) => p.id === newRecord.id)) return prev;
              // Dùng CHÍNH mapper của tầng dữ liệu (cùng hàm mà `dbService.getProducts()` dùng ở
              // trên). Bản map viết tay trước đây đoán hộ 4 dữ kiện cho hàng CHƯA khai: `cad_format
              // || 'STL'`, `print_time || '2h'`, `supported_materials || ['PLA Tough']`,
              // `production_readiness || 'ready_to_print'` — khách nhìn một định dạng/thời gian in/độ
              // sẵn sàng sản xuất chưa từng được ai khai (docs/design/data-honesty.md).
              return [rowToProduct(newRecord), ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord: any = payload.new;
            productsRevisionRef.current++;
            setProducts((prev) =>
              prev.map((p) =>
                p.id === updatedRecord.id
                  ? {
                      ...p,
                      name: updatedRecord.name || p.name,
                      category: updatedRecord.category || p.category,
                      pricePhysical: Number(updatedRecord.price_physical ?? p.pricePhysical),
                      priceDigital: Number(updatedRecord.price_digital ?? p.priceDigital),
                      status: (updatedRecord.status || p.status).toLowerCase() as any,
                      badge: updatedRecord.badge !== undefined ? updatedRecord.badge : p.badge,
                      images: Array.isArray(updatedRecord.images) ? updatedRecord.images : p.images,
                      thumbnailUrl: updatedRecord.thumbnail_url || p.thumbnailUrl,
                    }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRecord: any = payload.old;
            productsRevisionRef.current++;
            if (deletedRecord?.id) {
              setProducts((prev) => prev.filter((p) => p.id !== deletedRecord.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch materials/printers/accessories từ Supabase on mount.
  // (Phần pricing config / site content nằm ở `useSiteSettings` — tách theo domain; mỗi
  // effect vẫn giữ deps `[]` và cleanup `isMounted` như bản gộp trước đây.)
  useEffect(() => {
    let isMounted = true;

    dbService.getMaterials().then((remoteMats) => {
      if (isMounted && remoteMats && remoteMats.length > 0) setMaterials(remoteMats);
    }).catch((err) => console.warn('Could not load remote materials:', err));

    dbService.getPrinters().then((remotePrinters) => {
      if (isMounted && remotePrinters && remotePrinters.length > 0) setPrinters(remotePrinters);
    }).catch((err) => console.warn('Could not load remote printers:', err));

    // Đợt T: nạp danh mục phụ kiện từ bảng `accessories`.
    // Khác materials/printers: bảng RỖNG là thông tin thật ⇒ gán luôn `[]`
    // (để UI hiện trạng thái trống), KHÔNG giữ fixture và không bịa danh mục.
    dbService.getAccessories().then((remoteAccessories) => {
      if (isMounted && Array.isArray(remoteAccessories)) setAccessories(remoteAccessories);
    }).catch((err) => console.warn('Could not load remote accessories:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Identity ỔN ĐỊNH (useCallback + ref) — xem khối `*Ref` ở trên.
  const handleUpdateMaterials = useCallback((newMaterials: MaterialProfile[]) => {
    // Xoá trên DB những vật liệu đã bị bỏ khỏi danh sách (trước đây chỉ upsert phần còn lại
    // nên hàng đã xoá vẫn sống trong DB và quay lại sau khi tải lại).
    const removed = materialsRef.current.filter((m) => !newMaterials.some((n) => n.id === m.id));
    setMaterials(newMaterials);
    newMaterials.forEach((m) => {
      dbService.saveMaterial(m).catch((e) => console.warn('Failed to sync material to Supabase:', e));
    });
    removed.forEach((m) => {
      dbService.deleteMaterial(m.id).catch((e) => console.warn('Failed to delete material from Supabase:', e));
    });
  }, []);

  const handleUpdatePrinters = useCallback((newPrinters: PrinterProfile[]) => {
    const removed = printersRef.current.filter((p) => !newPrinters.some((n) => n.id === p.id));
    setPrinters(newPrinters);
    newPrinters.forEach((p) => {
      dbService.savePrinter(p).catch((e) => console.warn('Failed to sync printer to Supabase:', e));
    });
    removed.forEach((p) => {
      dbService.deletePrinter(p.id).catch((e) => console.warn('Failed to delete printer from Supabase:', e));
    });
  }, []);

  const handleUpdateAccessories = useCallback((newAccessories: AccessoryItem[]) => {
    const removed = accessoriesRef.current.filter((a) => !newAccessories.some((n) => n.id === a.id));
    setAccessories(newAccessories);
    newAccessories.forEach((a) => {
      dbService.saveAccessory(a).catch((e) => console.warn('Failed to sync accessory to Supabase:', e));
    });
    removed.forEach((a) => {
      dbService.deleteAccessory(a.id).catch((e) => console.warn('Failed to delete accessory from Supabase:', e));
    });
  }, []);

  // Product Handlers — DB (Supabase) là nguồn duy nhất, optimistic update + rollback khi lỗi.
  const handleAddNewProduct = useCallback(async (prod: Product) => {
    const previous = [...productsRef.current];
    // Optimistic UI update
    setProducts((prev) => {
      productsRevisionRef.current++;
      const updated = [prod, ...prev];
      return updated;
    });

    // FL-2a-fix: sản phẩm MỚI phải INSERT (không upsert) để designer insert được sau khi
    // migration products-designer áp; upsert cần UPDATE policy ⇒ 42501 với designer.
    const res = await dbService.insertProduct(prod);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback adding product due to DB error:', res.error);
      setProducts(previous);
      showToastRef.current('Không thể lưu vào Supabase. Đã hoàn tác.');
    } else {
      showToastRef.current('Đã thêm sản phẩm thành công!');
    }
  }, []);

  const handleUpdateProduct = useCallback(async (updated: Product) => {
    const previous = [...productsRef.current];
    // Optimistic UI update
    setProducts((prev) => {
      productsRevisionRef.current++;
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      return next;
    });

    const res = await dbService.saveProduct(updated);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback updating product due to DB error:', res.error);
      setProducts(previous);
      showToastRef.current('Lỗi cập nhật trên Supabase. Đã hoàn tác.');
    } else {
      showToastRef.current('Đã cập nhật sản phẩm thành công!');
    }
  }, []);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    const previous = [...productsRef.current];
    // Optimistic UI update
    setProducts((prev) => {
      productsRevisionRef.current++;
      const next = prev.filter((p) => p.id !== productId);
      return next;
    });

    const res = await dbService.deleteProduct(productId);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback deleting product due to DB error:', res.error);
      setProducts(previous);
      showToastRef.current('Lỗi xóa trên Supabase. Đã hoàn tác.');
    } else {
      showToastRef.current('Đã xóa sản phẩm thành công!');
    }
  }, []);

  return {
    products,
    productsLoading,
    productsError,
    loadProducts,
    materials,
    printers,
    accessories,
    handleAddNewProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleUpdateMaterials,
    handleUpdatePrinters,
    handleUpdateAccessories,
  };
}
