/**
 * W3-A probe — "chưa cấu hình" phải VẮNG MẶT thật, và thao tác XOÁ phải ghi được.
 *
 * Chạy code THẬT của `dbService` (không phải bản sao logic) nhưng chặn `fetch`:
 * KHÔNG chạm Supabase/DB. Mọi request được ghi lại và trả lời bằng dữ liệu giả.
 */
import { pathToFileURL } from 'node:url';

const ROOT = '/home/thanh/projects/Vcube/src/';

type Call = { method: string; url: string; body: any };
const calls: Call[] = [];
let getQueue: Array<{ status?: number; body: any }> = [];

const fetchStub = async (input: any, init: any = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  const method = String(init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ method, url, body });
  if (method === 'GET') {
    const next = getQueue.shift();
    if (!next) return new Response('', { status: 500, headers: { 'content-type': 'application/json' } });
    const status = next.status ?? 200;
    return new Response(JSON.stringify(next.body), { status, headers: { 'content-type': 'application/json' } });
  }
  if (method === 'POST' || method === 'PATCH') {
    return new Response('', { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};
(globalThis as any).fetch = fetchStub;

const { dbService } = await import(pathToFileURL(ROOT + 'backend/supabase/database.ts').href);
const { DEFAULT_SITE_CONTENT } = await import(pathToFileURL(ROOT + 'data/mockData.ts').href);

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`);
  if (!ok) failures++;
}

// 1) Hằng số mặc định không còn bịa phí ship / ngưỡng freeship.
check(
  'DEFAULT_SITE_CONTENT KHÔNG có standardShippingFee',
  !('standardShippingFee' in DEFAULT_SITE_CONTENT),
  JSON.stringify(DEFAULT_SITE_CONTENT.standardShippingFee)
);
check(
  'DEFAULT_SITE_CONTENT KHÔNG có freeShippingThreshold',
  !('freeShippingThreshold' in DEFAULT_SITE_CONTENT),
  JSON.stringify(DEFAULT_SITE_CONTENT.freeShippingThreshold)
);
check(
  'DEFAULT_SITE_CONTENT: không còn số 25000/300000 ở bất kỳ đâu',
  !JSON.stringify(DEFAULT_SITE_CONTENT).includes('25000') && !JSON.stringify(DEFAULT_SITE_CONTENT).includes('300000'),
  'tim thay 25000/300000 trong DEFAULT_SITE_CONTENT'
);

for (const key of ['seoTitle', 'seoDescription', 'seoKeywords', 'seoOgImage', 'seoCanonicalUrl', 'seoStructuredData']) {
  check(
    `DEFAULT_SITE_CONTENT KHÔNG có ${key}`,
    !(key in (DEFAULT_SITE_CONTENT as any)),
    JSON.stringify((DEFAULT_SITE_CONTENT as any)[key])
  );
}
check(
  'DEFAULT_SITE_CONTENT: không còn JSON-LD LocalBusiness',
  !JSON.stringify(DEFAULT_SITE_CONTENT).includes('LocalBusiness'),
  'con LocalBusiness'
);
check(
  'DEFAULT_SITE_CONTENT: không còn URL images.unsplash.com',
  !JSON.stringify(DEFAULT_SITE_CONTENT).includes('unsplash'),
  'con unsplash'
);
check(
  'DEFAULT_SITE_CONTENT: không còn canonical https://vcube.vn',
  !JSON.stringify(DEFAULT_SITE_CONTENT).includes('vcube.vn'),
  'con vcube.vn'
);
check(
  'DEFAULT_SITE_CONTENT: không còn tên bên thứ ba trong từ khoá (bambu lab/formlabs)',
  !/bambu lab|formlabs/i.test(JSON.stringify(DEFAULT_SITE_CONTENT)),
  'con ten ben thu ba'
);

const rowBase = {
  id: 'default',
  hero_badge: '', hero_title: '', hero_subtitle: '', phone: '', email: '',
  hanoi_workshop_address: '', hcm_workshop_address: '',
  announcement_text: '', announcement_enabled: false,
};

// 2) ĐỌC: hàng có thật nhưng jsonb CHƯA từng có 2 khoá ⇒ phải VẮNG MẶT (không bịa).
getQueue = [{ body: { ...rowBase, settings: {} } }];
const read1: any = await dbService.getSiteContent();
check(
  'getSiteContent(settings={}): standardShippingFee VẮNG (undefined, không phải 25000)',
  read1.standardShippingFee === undefined && !('standardShippingFee' in read1),
  JSON.stringify(read1.standardShippingFee)
);
check(
  'getSiteContent(settings={}): freeShippingThreshold VẮNG (undefined, không phải 300000)',
  read1.freeShippingThreshold === undefined && !('freeShippingThreshold' in read1),
  JSON.stringify(read1.freeShippingThreshold)
);
check(
  'getSiteContent(settings={}): không có 25000/300000 trong payload trả về',
  !JSON.stringify(read1).includes('25000') && !JSON.stringify(read1).includes('300000'),
  JSON.stringify(read1).slice(0, 200)
);
for (const key of ['seoTitle', 'seoDescription', 'seoKeywords', 'seoOgImage', 'seoCanonicalUrl', 'seoStructuredData']) {
  check(
    `getSiteContent(settings={}): ${key} VẮNG (không bịa)`,
    (read1 as any)[key] === undefined && !(key in (read1 as any)),
    JSON.stringify((read1 as any)[key])
  );
}
check(
  'getSiteContent(settings={}): không còn unsplash / LocalBusiness / vcube.vn',
  !/unsplash|LocalBusiness|vcube\.vn/.test(JSON.stringify(read1)),
  JSON.stringify(read1).slice(0, 200)
);

// 3) ĐỌC: cấu hình THẬT vẫn phải đi qua nguyên vẹn.
getQueue = [{ body: { ...rowBase, settings: { standardShippingFee: 25000, freeShippingThreshold: 300000, toleranceSpec: 'x', seoTitle: 'SEO THẬT', seoStructuredData: '{"@type":"Organization"}' } } }];
const read2: any = await dbService.getSiteContent();
check(
  'getSiteContent(settings có cấu hình thật): đọc đúng 25000/300000',
  read2.standardShippingFee === 25000 && read2.freeShippingThreshold === 300000,
  JSON.stringify({ f: read2.standardShippingFee, t: read2.freeShippingThreshold })
);
check(
  'getSiteContent(settings có cấu hình thật): SEO thật đi qua nguyên vẹn',
  read2.seoTitle === 'SEO THẬT' && read2.seoStructuredData === '{"@type":"Organization"}',
  JSON.stringify({ t: read2.seoTitle, s: read2.seoStructuredData })
);

// 4) GHI (Bug 2): form đầy đủ đã XOÁ cả 2 ô ⇒ jsonb phải MẤT 2 khoá đó; khoá của
//    người khác (nhóm SEO) phải còn nguyên.
calls.length = 0;
getQueue = [{
  body: {
    settings: {
      standardShippingFee: 25000,
      freeShippingThreshold: 300000,
      toleranceSpec: '±0.05mm (cũ)',
      seoTitle: 'SEO của người khác — KHÔNG được xoá',
      seoKeywords: 'giu-nguyen',
    },
  },
}];
const save1 = await dbService.saveSiteContent({ ...DEFAULT_SITE_CONTENT });
const post1 = calls.find((c) => c.method === 'POST');
check('saveSiteContent: có gửi POST upsert', !!post1, JSON.stringify(calls.map((c) => c.method)));
check('saveSiteContent: trả success', save1.success === true, JSON.stringify(save1));
check(
  'Bug2: settings ghi ra KHÔNG còn standardShippingFee (đã xoá thật)',
  post1 && post1.body.settings.standardShippingFee === undefined && !('standardShippingFee' in post1.body.settings),
  JSON.stringify(post1?.body?.settings)
);
check(
  'Bug2: settings ghi ra KHÔNG còn freeShippingThreshold (đã xoá thật)',
  post1 && post1.body.settings.freeShippingThreshold === undefined && !('freeShippingThreshold' in post1.body.settings),
  JSON.stringify(post1?.body?.settings)
);
check(
  'Bug2: khoá KHÔNG thuộc hàm này (nhóm SEO) được GIỮ NGUYÊN (không ghi đè jsonb)',
  post1 && post1.body.settings.seoTitle === 'SEO của người khác — KHÔNG được xoá' && post1.body.settings.seoKeywords === 'giu-nguyen',
  JSON.stringify(post1?.body?.settings)
);

// 5) GHI: hàng CHƯA tồn tại (PGRST116) ⇒ vẫn ghi `settings` (không bỏ cột) và không có số bịa.
calls.length = 0;
getQueue = [{ status: 406, body: { code: 'PGRST116', details: 'Results contain 0 rows', message: 'JSON object requested, multiple (or no) rows returned', hint: null } }];
const save2 = await dbService.saveSiteContent({ ...DEFAULT_SITE_CONTENT });
const post2 = calls.find((c) => c.method === 'POST');
check(
  'Bug2: hàng chưa tồn tại ⇒ vẫn gửi cột settings (không bỏ qua)',
  !!post2 && !!post2.body.settings,
  JSON.stringify({ success: save2.success, post: post2?.body?.settings })
);
check(
  'Bug2: hàng chưa tồn tại ⇒ không có 25000/300000 trong payload ghi',
  !!post2 && !JSON.stringify(post2.body).includes('25000') && !JSON.stringify(post2.body).includes('300000'),
  JSON.stringify(post2?.body)
);

// 6) GHI: không đọc được jsonb ⇒ KHÔNG ghi bừa, trả lỗi thật, KHÔNG có POST nào.
calls.length = 0;
getQueue = [{ status: 500, body: { code: '42501', message: 'permission denied for table site_content', details: null, hint: null } }];
const save3 = await dbService.saveSiteContent({ ...DEFAULT_SITE_CONTENT });
check('Đọc jsonb lỗi ⇒ success=false (không âm thầm ghi đè)', save3.success === false && !!save3.error, JSON.stringify(save3));
check('Đọc jsonb lỗi ⇒ KHÔNG có request ghi nào được gửi', !calls.some((c) => c.method === 'POST'), JSON.stringify(calls.map((c) => c.method)));

console.log(`\nW3A_PROBE_FAILURES=${failures}`);
process.exit(failures === 0 ? 0 : 1);
