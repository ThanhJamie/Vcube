/**
 * realtimeRegistry — MỘT chủ sở hữu kênh Supabase Realtime cho toàn bộ frontend.
 *
 * VẤN ĐỀ
 * -----------------------------------------------------------------------------
 * Trước module này, mỗi consumer tự `supabase.channel(...)`: `useCatalogData`
 * (`public:products`), `settingsService` (`vcube:settings`), `customDesignService`
 * (`public:custom_design_requests`), `useOrdersData` (`orders:me`). Hai component cùng
 * mount một hook ⇒ hai kênh CÙNG topic, hai lần join, hai subscription nhận trùng sự
 * kiện; StrictMode/HMR làm số kênh tăng thêm. Supabase không gộp hộ.
 *
 * CÁCH LÀM
 * -----------------------------------------------------------------------------
 * Registry giữ `Map<topic, Entry>` ở cấp module. Consumer đầu tiên của một topic tạo
 * channel và đăng ký các binding `postgres_changes`; consumer sau **dùng chung** channel
 * đó, chỉ thêm handler vào binding tương ứng (ref-count theo handler). Khi handler cuối
 * cùng rời đi mới `removeChannel` + xoá entry.
 *
 * HỢP ĐỒNG
 * -----------------------------------------------------------------------------
 * - Cùng một `topic` phải dùng cùng bộ lọc (event/schema/table/filter). Consumer mới xin
 *   thêm bộ lọc khác ⇒ registry join lại kênh để server nhận binding mới (realtime-js chỉ
 *   áp binding lúc join).
 * - `isSupabaseConfigured === false` ⇒ no-op (app chạy mock, không mở kết nối mạng).
 * - Lỗi subscribe (mạng, RLS realtime…) chỉ log cảnh báo; kênh vẫn giữ để Supabase tự
 *   retry. Consumer phải có lưới an toàn riêng nếu dữ liệu quan trọng (ví dụ
 *   `visibilitychange` của `useOrdersData`).
 * - Handler ném lỗi không được kéo consumer khác xuống: registry bọc try/catch từng handler.
 * - Cleanup khi HMR: module bị thay ⇒ gỡ toàn bộ kênh của module cũ, tránh rò socket.
 *
 * KHÔNG dùng `any`: payload chỉ lộ đúng phần registry đọc được (`eventType`/`new`/`old`),
 * consumer tự kiểm kiểu cột trước khi merge (data-honesty).
 */

import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import type {
  RealtimeChannel,
  RealtimePostgresChangesFilter,
  RealtimePostgresChangesPayload,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
} from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@backend/supabase/client';

/** Loại sự kiện mà consumer có thể đăng ký (giá trị khớp tham số `event` của Supabase). */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/** Loại sự kiện thực tế server gửi về; `UNKNOWN` khi payload thiếu trường này (không đoán). */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';

/**
 * Payload tối thiểu giao cho consumer. Chỉ 3 trường registry đọc được — giữ nguyên
 * `Partial` vì payload realtime có thể thiếu cột; consumer quyết định merge cột nào.
 */
export interface RealtimeChangePayload<Row = Record<string, unknown>> {
  eventType: RealtimeEventType;
  /** Hàng sau thay đổi; `null` khi DELETE hoặc khi payload không có hàng. */
  new: Partial<Row> | null;
  /** Hàng trước thay đổi; `null` khi INSERT hoặc khi payload không có hàng. */
  old: Partial<Row> | null;
}

export type RealtimeChangeHandler<Row = Record<string, unknown>> = (
  payload: RealtimeChangePayload<Row>
) => void;

/** Một binding `postgres_changes` mà consumer muốn nghe trên topic. */
export interface RealtimeChange<Row = Record<string, unknown>> {
  /** Bảng nguồn (`public.orders`, `public.products`, …). */
  table: string;
  /** Mặc định `'*'` (mọi thay đổi). */
  event?: RealtimeEvent;
  /** Mặc định `'public'`. */
  schema?: string;
  /** Bộ lọc dạng Postgres (`status=eq.pending`), tuỳ chọn. */
  filter?: string;
  handler: RealtimeChangeHandler<Row>;
}

export type Unsubscribe = () => void;

/** Topic mặc định của luồng đơn hàng (giữ tên cũ `orders:me` để log/trace không đổi). */
export const ORDERS_TOPIC = 'orders:me';

/**
 * Cột `orders` mà realtime được phép mang tới. Chỉ khai cột đã có trong baseline
 * (`20260901_baseline_schema.sql`); cột lạ vẫn đi qua index signature nhưng consumer
 * phải tự kiểm kiểu.
 */
export interface OrderRealtimeRow {
  id?: string | null;
  status?: string | null;
  status_stage_index?: number | string | null;
  layer_progress?: number | string | null;
  time_remaining?: string | number | null;
  assigned_workshop_id?: string | null;
  [key: string]: unknown;
}

type RawHandler = RealtimeChangeHandler<Record<string, unknown>>;

interface Binding {
  /** Handler đang sống → số lượt đăng ký (ref-count; cùng hàm được đăng ký 2 lần vẫn đủ). */
  handlers: Map<RawHandler, number>;
}

interface Entry {
  channel: RealtimeChannel;
  /** Key = event|schema|table|filter ⇒ binding dùng chung cho mọi consumer cùng bộ lọc. */
  bindings: Map<string, Binding>;
  /** Không còn handler nào — đang chờ đóng hẳn (consumer mới có thể "hồi sinh" entry). */
  idle: boolean;
  /** Đã bị gỡ khỏi registry ⇒ callback async đến muộn không được join lại. */
  removed: boolean;
  /** Tăng mỗi lần đổi bộ binding; callback join lại cũ chỉ chạy khi còn là bản mới nhất. */
  generation: number;
}

const entries = new Map<string, Entry>();

/** Hàm huỷ rỗng dùng chung — consumer gọi vô hại khi registry đang no-op. */
const noop: Unsubscribe = () => {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Chuẩn hoá hàng payload; payload rỗng/không phải object ⇒ `null` (không bịa hàng). */
function toRow<Row>(value: unknown): Partial<Row> | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).length === 0) return null;
  return value as Partial<Row>;
}

function bindingKey(change: RealtimeChange<unknown>): string {
  return [
    change.event ?? '*',
    change.schema ?? 'public',
    change.table,
    change.filter ?? '',
  ].join('|');
}

/** Gắn một binding `postgres_changes` lên channel; handler đọc Set sống tại thời điểm gọi. */
function attachBinding(
  channel: RealtimeChannel,
  change: RealtimeChange<unknown>,
  binding: Binding
): void {
  const filter = {
    event: change.event ?? '*',
    schema: change.schema ?? 'public',
    table: change.table,
    ...(change.filter ? { filter: change.filter } : {}),
  } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`>;

  channel.on(
    'postgres_changes',
    filter,
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const eventType: RealtimeEventType =
        payload.eventType === 'INSERT' ||
        payload.eventType === 'UPDATE' ||
        payload.eventType === 'DELETE'
          ? payload.eventType
          : 'UNKNOWN';

      const changePayload: RealtimeChangePayload<Record<string, unknown>> = {
        eventType,
        new: eventType === 'DELETE' ? null : toRow(payload.new),
        old: eventType === 'INSERT' ? null : toRow(payload.old),
      };

      // Lỗi của một consumer không được chặn consumer khác cùng topic.
      binding.handlers.forEach((_count, handler) => {
        try {
          handler(changePayload);
        } catch (err) {
          console.warn(`[realtime] handler của bảng "${change.table}" ném lỗi:`, err);
        }
      });
    }
  );
}

/** Số lần thử join lại tối đa — chặn vòng lặp nếu kênh kẹt ở trạng thái lạ. */
const MAX_JOIN_ATTEMPTS = 3;

/**
 * Join kênh, hoặc join lại khi bộ binding vừa đổi (realtime-js chỉ áp binding lúc join và
 * `subscribe()` là no-op khi kênh chưa đóng hẳn).
 *
 * Vì vậy: đang joined/joining/leaving ⇒ `unsubscribe()` trước, đợi đóng rồi join lại. Mỗi
 * lượt có `generation` riêng; lượt cũ đến muộn sẽ tự bỏ.
 */
function scheduleJoin(topic: string, entry: Entry): void {
  const status = (state: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
    if (
      state === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
      state === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
    ) {
      console.warn(`[realtime] kênh "${topic}" lỗi/không phản hồi: ${state}`, err ?? '');
    }
  };

  const generation = ++entry.generation;
  let attempts = 0;

  const attempt = (): void => {
    if (entry.removed || entries.get(topic) !== entry || entry.generation !== generation) return;

    attempts += 1;
    if (attempts > MAX_JOIN_ATTEMPTS) {
      console.warn(
        `[realtime] không join lại được kênh "${topic}" sau ${MAX_JOIN_ATTEMPTS} lần thử.`
      );
      return;
    }

    if (entry.channel.state === 'closed') {
      entry.channel.subscribe(status);
      return;
    }

    void entry.channel.unsubscribe().then(attempt);
  };

  attempt();
}

function isValidChange(change: RealtimeChange<unknown> | undefined): change is RealtimeChange<unknown> {
  return Boolean(change) && typeof change?.table === 'string' && change.table.trim() !== '' &&
    typeof change?.handler === 'function';
}

/**
 * Đăng ký nghe một hoặc nhiều binding `postgres_changes` trên một topic.
 *
 * Nhiều consumer cùng `topic` dùng chung một channel: chỉ consumer cuối cùng rời đi mới
 * channel bị `removeChannel`. Trả hàm `unsubscribe` (gọi nhiều lần vô hại).
 *
 * @example
 * const stop = subscribe('public:products', {
 *   table: 'products',
 *   event: '*',
 *   handler: (payload) => { … },
 * });
 */
export function subscribe<Row = Record<string, unknown>>(
  topic: string,
  changes: RealtimeChange<Row> | ReadonlyArray<RealtimeChange<Row>>
): Unsubscribe {
  if (!isSupabaseConfigured) return noop;
  if (typeof topic !== 'string' || topic.trim() === '') return noop;

  const list: ReadonlyArray<RealtimeChange<Row>> = Array.isArray(changes) ? changes : [changes];
  const valid = list.filter((change): change is RealtimeChange<Row> =>
    isValidChange(change as RealtimeChange<unknown> | undefined)
  );
  if (valid.length === 0) return noop;

  let entry = entries.get(topic);
  const revived = Boolean(entry?.idle);
  if (!entry) {
    entry = {
      channel: supabase.channel(topic),
      bindings: new Map(),
      idle: false,
      removed: false,
      generation: 0,
    };
    entries.set(topic, entry);
  } else if (revived) {
    // Consumer mới tới khi entry đang chờ đóng ⇒ hồi sinh, không tạo kênh thứ hai.
    entry.idle = false;
  }
  const currentEntry = entry;

  /** Binding + handler mà lượt đăng ký này sở hữu — dùng để gỡ đúng phần của mình. */
  const owned: Array<{ binding: Binding; handler: RawHandler }> = [];
  let addedBinding = false;

  for (const change of valid) {
    const key = bindingKey(change);
    let binding = currentEntry.bindings.get(key);
    if (!binding) {
      binding = { handlers: new Map() };
      currentEntry.bindings.set(key, binding);
      attachBinding(currentEntry.channel, change, binding);
      addedBinding = true;
    }
    const handler = change.handler as RawHandler;
    binding.handlers.set(handler, (binding.handlers.get(handler) ?? 0) + 1);
    owned.push({ binding, handler });
  }

  // Kênh mới/bộ binding mới/hồi sinh/kênh đã đóng ⇒ (re)join. Consumer chỉ thêm handler vào
  // binding có sẵn trên kênh đang sống thì không đụng tới socket.
  if (addedBinding || revived || currentEntry.channel.state === 'closed') {
    scheduleJoin(topic, currentEntry);
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;

    for (const { binding, handler } of owned) {
      const count = binding.handlers.get(handler) ?? 0;
      if (count <= 1) binding.handlers.delete(handler);
      else binding.handlers.set(handler, count - 1);
    }

    const remaining = Array.from(currentEntry.bindings.values()).reduce(
      (total, binding) => total + binding.handlers.size,
      0
    );
    if (remaining > 0) return;

    // Consumer cuối rời topic ⇒ đóng kênh thật, nhưng để entry "rảnh" tới khi leave xong:
    // StrictMode mount→cleanup→mount ngay sau đó sẽ hồi sinh đúng kênh thay vì tạo kênh mới.
    currentEntry.idle = true;
    const generation = ++currentEntry.generation;
    void currentEntry.channel.unsubscribe().then(() => {
      if (
        currentEntry.removed ||
        !currentEntry.idle ||
        currentEntry.generation !== generation
      ) {
        return;
      }
      currentEntry.removed = true;
      if (entries.get(topic) === currentEntry) entries.delete(topic);
      void supabase.removeChannel(currentEntry.channel);
    });
  };
}

/**
 * Lắng nghe thay đổi của bảng `public.orders` (UPDATE + INSERT) qua registry.
 *
 * Topic `orders:me` giữ nguyên như trước để log/trace không đổi. RLS quyết định dòng nào
 * tới được client; registry KHÔNG lọc theo email/vai trò.
 */
export function subscribeOrders(handler: RealtimeChangeHandler<OrderRealtimeRow>): Unsubscribe {
  return subscribe<OrderRealtimeRow>(ORDERS_TOPIC, [
    { table: 'orders', event: 'UPDATE', handler },
    { table: 'orders', event: 'INSERT', handler },
  ]);
}

/** Interface HMR tối thiểu — không cần thêm type `vite/client` chỉ vì một callback. */
interface HotContext {
  dispose(callback: () => void): void;
}

const hot = (import.meta as ImportMeta & { hot?: HotContext }).hot;
if (hot) {
  // Module bị thay khi HMR ⇒ đóng kênh của module cũ, tránh hai bản registry cùng join.
  hot.dispose(() => {
    entries.forEach((entry) => {
      entry.removed = true;
      void supabase.removeChannel(entry.channel);
    });
    entries.clear();
  });
}
