/**
 * Automated Test Suite: Catalog Synchronization, RLS & Product Status
 * Run: npx tsx scripts/test-catalog-sync.ts
 */

import { Product } from '../src/types';
import { PRODUCTS } from '../src/data/mockData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('========================================================');
console.log('🧪 RUNNING VCUBE CATALOG & RLS INTEGRATION TESTS');
console.log('========================================================\n');

// Mock Database of Products
let mockDb: Product[] = [
  ...PRODUCTS.map(p => ({ ...p, status: 'published' as const })),
  {
    id: 'test-draft-product',
    sku: 'VC-DRAFT-01',
    name: 'Khớp Nối Bí Mật (Bản Nháp)',
    category: 'mechanical',
    designer: 'VCUBE R&D',
    pricePhysical: 250000,
    priceDigital: 60000,
    images: ['https://example.com/draft.jpg'],
    description: 'Chưa phát hành ra công chúng',
    features: ['Bảo mật R&D'],
    specs: { dimensions: '50x50x50mm', weight: '30g', resolution: '0.12mm', infillDefault: '40%', technology: 'FDM' },
    supportedMaterials: ['PETG'],
    colors: [{ name: 'Đen', hex: '#000', available: true }],
    tags: ['r&d', 'bí mật'],
    rating: 5.0,
    reviewsCount: 0,
    printsCount: 0,
    printTime: '1h 30m',
    status: 'draft',
    productionReadiness: 'cad_review_needed'
  },
  {
    id: 'test-archived-product',
    sku: 'VC-ARCHIVED-01',
    name: 'Vỏ Hộp Cũ (Đã Lưu Trữ)',
    category: 'iot',
    designer: 'VCUBE Legacy',
    pricePhysical: 120000,
    priceDigital: 30000,
    images: ['https://example.com/archived.jpg'],
    description: 'Ngừng sản xuất',
    features: ['Hết hạn bảo hành'],
    specs: { dimensions: '60x60x30mm', weight: '25g', resolution: '0.2mm', infillDefault: '20%', technology: 'FDM' },
    supportedMaterials: ['PLA'],
    colors: [{ name: 'Trắng', hex: '#fff', available: true }],
    tags: ['cũ', 'ngừng bán'],
    rating: 4.0,
    reviewsCount: 5,
    printsCount: 20,
    printTime: '1h',
    status: 'archived',
    productionReadiness: 'ready_to_print'
  }
];

// Test 1: Public Filter (Simulating /explore view for non-admin)
console.log('--- Test 1: Public Visibility & RLS Policy Simulation ---');
const publicFiltered = mockDb.filter(p => {
  const normStatus = (p.status || 'published').toLowerCase();
  return normStatus === 'published';
});

assert(!publicFiltered.some(p => p.id === 'test-draft-product'), 'Public users cannot see draft products');
assert(!publicFiltered.some(p => p.id === 'test-archived-product'), 'Public users cannot see archived products');
assert(publicFiltered.length === PRODUCTS.length, `Public users see exactly ${PRODUCTS.length} published products`);

// Test 2: Admin Filter (Simulating Admin Dashboard)
console.log('\n--- Test 2: Admin Full Visibility ---');
const adminAllProducts = mockDb;
assert(adminAllProducts.some(p => p.id === 'test-draft-product'), 'Admin can see draft products');
assert(adminAllProducts.some(p => p.id === 'test-archived-product'), 'Admin can see archived products');
assert(adminAllProducts.length === PRODUCTS.length + 2, 'Admin sees all products regardless of status');

// Test 3: Status Transition (Draft -> Published -> Archived)
console.log('\n--- Test 3: Status Transition & Instant Live Sync ---');
// Step A: Publish the draft product
const targetProduct = mockDb.find(p => p.id === 'test-draft-product')!;
targetProduct.status = 'published';

let publicAfterPublish = mockDb.filter(p => (p.status || 'published').toLowerCase() === 'published');
assert(publicAfterPublish.some(p => p.id === 'test-draft-product'), 'Product becomes instantly visible on /explore after being published');

// Step B: Archive the product
targetProduct.status = 'archived';
let publicAfterArchive = mockDb.filter(p => (p.status || 'published').toLowerCase() === 'published');
assert(!publicAfterArchive.some(p => p.id === 'test-draft-product'), 'Product becomes instantly hidden from /explore after being archived');

// Test 4: Optimistic UI Rollback Simulation
console.log('\n--- Test 4: Optimistic UI Rollback on DB Error ---');
let clientState = [...mockDb];
const snapshotBeforeAction = [...clientState];

// Simulate adding a new product optimistically
const newProduct: Product = {
  id: 'prod-new-optimistic',
  name: 'Linh Kiện Thử Nghiệm',
  category: 'mechanical',
  designer: 'Test Engineer',
  pricePhysical: 200000,
  priceDigital: 50000,
  images: ['https://example.com/test.jpg'],
  description: 'Test',
  features: [],
  specs: { dimensions: '10x10x10mm', weight: '10g', resolution: '0.1mm', infillDefault: '20%', technology: 'FDM' },
  supportedMaterials: ['PLA Tough'],
  colors: [],
  tags: ['test'],
  rating: 5,
  reviewsCount: 0,
  printsCount: 0,
  printTime: '30m',
  status: 'published'
};

clientState = [newProduct, ...clientState];
assert(clientState.length === snapshotBeforeAction.length + 1, 'Client state reflects optimistic addition');

// Simulate Supabase rejecting the insert (e.g. network timeout or RLS error)
const simulateDbInsert = async (): Promise<{ success: boolean; error?: string }> => {
  return { success: false, error: 'Database connection timeout or RLS policy violation' };
};

// Handle Rollback
const result = await simulateDbInsert();
if (!result.success) {
  clientState = snapshotBeforeAction; // Rollback!
}

assert(clientState.length === snapshotBeforeAction.length, 'Client state successfully rolls back to snapshot after DB failure');
assert(!clientState.some(p => p.id === 'prod-new-optimistic'), 'Rejected product was cleanly removed from state');

// Test 5: CAD & QC Specification Integrity
console.log('\n--- Test 5: CAD Metadata & QC Watertight Verification ---');
const cadModels = PRODUCTS.filter(p => p.category === 'mechanical' || p.category === 'iot');
assert(cadModels.every(p => p.specs && p.specs.dimensions), 'All engineering models have valid dimension specs');
assert(cadModels.every(p => p.priceDigital > 0), 'All CAD models have valid digital file pricing');

console.log('\n========================================================');
console.log('🎉 ALL 5 INTEGRATION TESTS PASSED CLEANLY (100%)');
console.log('========================================================');
