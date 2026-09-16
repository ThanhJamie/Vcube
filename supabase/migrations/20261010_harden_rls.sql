-- ==============================================================================
-- VCUBE — HARDEN RLS (20261010)
-- ==============================================================================
-- Mục tiêu: chấm dứt 3 lỗ hổng đang tồn tại trên production
--   (1) anon GHI được products/materials/printer_fleet/pricing_config
--   (2) anon ĐỌC được toàn bộ orders (tên, SĐT, địa chỉ, secure_access_token)
--   (3) anon ĐỌC được toàn bộ user_profiles (email, điện thoại, kyc_details)
--
-- NGUYÊN NHÂN GỐC: các policy trong 20260904_complete_vcube_schema_and_seeds.sql
--   (và các file sau) dùng `FOR ALL USING (true)` KHÔNG kiểm tra quyền, và các
--   migration "hardening" sau đó chỉ DROP policy TRÙNG TÊN của chính nó. Postgres
--   OR các policy permissive với nhau, nên policy `USING (true)` cũ vẫn còn hiệu lực
--   và vô hiệu hoá mọi policy siết chặt hơn.
--
-- ĐẶC ĐIỂM CỦA FILE NÀY
--   * Idempotent: chạy lại nhiều lần không lỗi, không nhân bản policy.
--   * Thích ứng: schema production không chắc chắn (4 file migration định nghĩa
--     trùng bảng orders/user_profiles với cột khác nhau), nên mọi policy được tạo
--     có kiểm tra sự tồn tại của bảng + cột trước khi tạo.
--   * Tự dọn: xoá MỌI policy còn sót trên bảng mục tiêu không nằm trong allowlist
--     (kể cả policy tạo tay trong Dashboard).
--   * Có kiểm tra cuối file: cảnh báo nếu còn policy permissive nào.
--
-- ⚠️ SAU KHI CHẠY: phải chạy `supabase/scripts/bootstrap_admin.sql` để cấp quyền
--    admin cho tài khoản của bạn (quyền admin nay đọc từ public.user_profiles.role,
--    KHÔNG còn đọc từ user_metadata hay email hardcode).
--    Kiểm chứng: `node scripts/verify-rls.mjs`
--
-- Rollback/khắc phục sự cố: xem docs/security/rls-runbook.md
-- ==============================================================================

begin;

-- ==============================================================================
-- 1. HELPER: hàm đọc vai trò của người gọi
-- ==============================================================================
-- Lý do dùng SECURITY DEFINER: policy trên user_profiles cần đọc user_profiles,
-- nếu đọc trực tiếp sẽ đệ quy vô hạn. Hàm này chạy bằng quyền owner (postgres) nên
-- bỏ qua RLS, nhưng CHỈ trả về vai trò của chính người gọi (lọc theo auth.uid()).
-- `set search_path` cố định để chống hijack.
do $do$
begin
  if to_regclass('public.user_profiles') is null then
    -- Không có bảng profile: mọi người là 'anon' trừ khi có nhánh fallback bên dưới.
    execute $fn$
      create or replace function public.current_app_role()
      returns text language sql stable security definer set search_path = public
      as $body$ select 'anon'::text $body$;
    $fn$;
  else
    execute $fn$
      create or replace function public.current_app_role()
      returns text language sql stable security definer set search_path = public
      as $body$
        select coalesce(
          (select up.role
             from public.user_profiles up
            where up.id::text = (select auth.uid())::text
            limit 1),
          'anon'
        );
      $body$;
    $fn$;
  end if;
end
$do$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $body$ select public.current_app_role() = 'admin' $body$;

-- is_admin_or_lab(): admin HOAC lab. Dung cho warranty_claims / order_files
-- (09-admin-settings.md §4: "Admin/lab doc tat ca + doi status").
create or replace function public.is_admin_or_lab()
returns boolean language sql stable security definer set search_path = public
as $body$ select public.current_app_role() in ('admin','lab') $body$;

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin_or_lab() to anon, authenticated;

comment on function public.current_app_role() is
  'VCUBE: vai trò thật của người gọi, đọc từ public.user_profiles.role. Không dùng user_metadata.';

-- current_workshop_partner_id(): partner_id của xưởng in đang đăng nhập (NULL nếu người
-- gọi không phải xưởng). Dùng cho 2 policy `orders` của xưởng (mục 5b) và trigger chống
-- sửa cột đặc quyền (mục 6c).
--
-- ⚠️ `workshop_profiles` KHÔNG có unique trên `user_id` (một user có thể có nhiều hàng),
-- nên helper phải `order by updated_at desc nulls last limit 1`: subquery trả >1 hàng
-- trong biểu thức policy sẽ nổ 21000 "more than one row returned by a subquery", và
-- `select ... where user_id = auth.uid()` trần cũng lỗi 42P10 nếu có >1 hàng.
--
-- SECURITY DEFINER: đọc `workshop_profiles` bằng quyền owner nên không phụ thuộc policy
-- của bảng đó; `search_path` cố định để chống hijack. Hàm chỉ trả `partner_id` CỦA CHÍNH
-- người gọi (lọc theo auth.uid()), không lộ dữ liệu của xưởng khác.
-- Cố ý CHỈ grant cho `authenticated`: cả 2 policy dùng hàm này đều `to authenticated`,
-- `anon` không có đường nào gọi tới nó.
create or replace function public.current_workshop_partner_id()
returns text language sql stable security definer set search_path = public
as $body$
  select wp.partner_id
    from public.workshop_profiles wp
   where wp.user_id::text = (select auth.uid())::text
     and wp.partner_id is not null
   order by wp.updated_at desc nulls last
   limit 1
$body$;

grant execute on function public.current_workshop_partner_id() to authenticated;

comment on function public.current_workshop_partner_id() is
  'VCUBE: partner_id của xưởng in đang đăng nhập (NULL nếu không phải xưởng). user_id không unique nên chỉ lấy hàng mới nhất; không lộ dữ liệu xưởng khác.';

-- ==============================================================================
-- 2. HELPER TẠM (bị xoá ở cuối file) — tạo policy có kiểm tra bảng + cột
-- ==============================================================================
create or replace function public._vcube_make_policy(
  p_table text,
  p_name  text,
  p_cmd   text,          -- select | insert | update | delete | all
  p_roles text[],
  p_using text,          -- null nếu không hợp lệ với p_cmd
  p_check text           -- null nếu không hợp lệ với p_cmd
) returns void
language plpgsql
as $fn$
declare
  v_sql text;
  v_kind "char";
begin
  select c.relkind into v_kind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = p_table;

  if v_kind is null then
    raise notice 'SKIP  policy % : public.% không tồn tại', p_name, p_table;
    return;
  end if;
  if v_kind not in ('r', 'p') then
    raise notice 'SKIP  policy % : public.% là % (view không nhận policy)', p_name, p_table, v_kind;
    return;
  end if;

  -- Chuẩn hoá theo loại lệnh: INSERT không có USING, SELECT/DELETE không có WITH CHECK.
  if p_cmd = 'insert' then p_using := null; end if;
  if p_cmd in ('select', 'delete') then p_check := null; end if;

  execute format('drop policy if exists %I on public.%I', p_name, p_table);

  v_sql := format(
    'create policy %I on public.%I for %s to %s',
    p_name, p_table, p_cmd, array_to_string(p_roles, ', ')
  );
  if p_using is not null then v_sql := v_sql || ' using (' || p_using || ')'; end if;
  if p_check is not null then v_sql := v_sql || ' with check (' || p_check || ')'; end if;

  execute v_sql;
  raise notice 'OK    policy % on public.%', p_name, p_table;
exception
  when others then
    raise warning 'FAIL  policy % on public.% : % (%)', p_name, p_table, sqlerrm, sqlstate;
end
$fn$;

create or replace function public._vcube_has_columns(p_table text, p_cols text[])
returns boolean
language sql stable
as $fn$
  select coalesce(bool_and(exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = p_table
       and c.column_name = col
  )), true)
  from unnest(coalesce(p_cols, array[]::text[])) as col;
$fn$;

-- ==============================================================================
-- 3. DROP TOÀN BỘ POLICY CŨ (mọi tên đã từng được tạo trong repo)
-- ==============================================================================
do $do$
declare
  rec record;
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
  v_names text[] := array[
    -- products
    'Public can view published products','Admins can manage products',
    'Public read published products','Admin full access',
    -- orders
    'Public can view orders','Public can insert orders','Admins can update orders',
    'Users can read their own orders','Guests can read order with matching secure token',
    'Public can create orders','Admins have full access to orders',
    'Users can read own orders','Guest token holder can read order',
    'Anyone can insert an order',
    -- user_profiles
    'Users can view profiles','Admins can manage profiles',
    'Users can read own profile','Users can update own profile','Admins can manage all profiles',
    -- catalog
    'Public can read materials','Admins can manage materials',
    'Public can read printer fleet','Admins can manage printer fleet',
    'Public can read pricing config','Admins can manage pricing config',
    'Public can read active pricing config','Admins can manage pricing configs',
    'Public can read site content','Admins can update site content',
    'Public can read accessories','Admins can manage accessories',
    'Public can read workshop partners','Admins can manage workshop partners',
    -- cost rules
    'Only admin can view and modify cost rules',
    -- payment
    'Anyone can record payment transaction','Admins can view payment transactions',
    -- workshop / role profiles
    'Public can view verified workshops','Workshop owners can update own profile',
    'Admins can manage all workshop profiles',
    'Public can view active machines','Workshop owners can manage own machines',
    'Public can view workshop materials','Workshop owners can manage own materials',
    'Workshop owners and admins can view inventory logs',
    'Workshop owners and admins can insert inventory logs',
    'Public can view designer profiles','Designers can update own profile',
    'Admins can manage all designer profiles',
    'Customers can view own profile','Customers can update own profile',
    'Admins can manage all customer profiles',
    'Public can view pricing settings','Admins can update pricing settings',
    'Public can view active accessories','Admins and workshops can manage accessories',
    -- app_settings / setting_audit / warranty_claims / order_files (2026-09)
    'app_settings_public_read','app_settings_admin_write',
    'setting_audit_admin_read','setting_audit_admin_insert',
    'warranty_claims_customer_read','warranty_claims_customer_insert',
    'warranty_claims_admin_update','order_files_buyer_read','order_files_admin_write',
    'Public can read app settings','Admins can manage app settings',
    'Admins can read setting audit','Anyone can insert setting audit',
    'Customers can read own warranty claims','Customers can create warranty claims',
    'Admins and lab can manage warranty claims','Buyers can read own order files',
    'Admins can manage order files'
  ];
begin
  for rec in
    select p.schemaname, p.tablename, p.policyname
      from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = any (v_tables)
       and p.policyname = any (v_names)
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
  raise notice 'Bước 3: đã xoá policy cũ theo tên (nếu tồn tại).';
end
$do$;

-- ==============================================================================
-- 4. BẬT RLS CHO MỌI BẢNG MỤC TIÊU
-- ==============================================================================
do $do$
declare
  t text;
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
begin
  foreach t in array v_tables loop
    -- CHỈ bật RLS cho bảng thật. `to_regclass` trả về cả VIEW, mà
    -- ALTER TABLE ... ENABLE ROW LEVEL SECURITY trên view sẽ lỗi 42809.
    -- View được bảo vệ bằng `security_invoker = true` + policy của bảng gốc.
    declare
      v_kind "char";
    begin
      select c.relkind into v_kind
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t;

      if v_kind is null then
        raise notice 'SKIP  enable RLS: public.% không tồn tại', t;
      elsif v_kind in ('r', 'p') then
        execute format('alter table public.%I enable row level security', t);
      else
        raise notice 'SKIP  enable RLS: public.% là % (không phải bảng)', t, v_kind;
      end if;
    end;
  end loop;

  -- Cấp quyền cho custom_design_requests
  if to_regclass('public.custom_design_requests') is not null then
    execute 'grant select, insert, update on public.custom_design_requests to authenticated';
  end if;
end
$do$;

-- ==============================================================================
-- 5. TẠO POLICY ĐÚNG
-- ==============================================================================
do $do$
declare
  -- catalog = dữ liệu bán hàng công khai: ai cũng đọc, chỉ admin ghi
  v_catalog_read text[] := array[
    'materials','printer_fleet','accessories','workshop_partners','site_content',
    'pricing_configs','workshop_machines','workshop_materials','designer_profiles',
    'pricing_global_settings','workshop_accessories'
  ];
  t text;
  v_owner_pred text;
  v_has_user_id boolean;
  v_has_email boolean;
  v_guest_check text;
begin
  -- ---------- 5.1 products ----------
  perform public._vcube_make_policy(
    'products', 'vcube_products_public_read', 'select', array['anon','authenticated'],
    $p$status in ('published','Published')$p$, null);
  perform public._vcube_make_policy(
    'products', 'vcube_products_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.2 orders ----------
  -- (a) chủ đơn đọc đơn của mình — chỉ tạo nếu suy ra được danh tính chủ đơn
  select exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='orders' and column_name='user_id')
    into v_has_user_id;
  select exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='orders' and column_name='customer_email')
    into v_has_email;

  if v_has_user_id then
    v_owner_pred := 'user_id::text = (select auth.uid())::text';
    if v_has_email then
      v_owner_pred := v_owner_pred || ' or customer_email = (select auth.jwt() ->> ''email'')';
    end if;
  elsif v_has_email then
    v_owner_pred := 'customer_email = (select auth.jwt() ->> ''email'')';
  else
    v_owner_pred := null;
    raise warning 'orders: không có cột user_id/customer_email — bỏ policy đọc theo chủ đơn.';
  end if;

  if v_owner_pred is not null then
    perform public._vcube_make_policy(
      'orders', 'vcube_orders_owner_read', 'select', array['authenticated'], v_owner_pred, null);
  end if;

  -- (b) admin toàn quyền
  perform public._vcube_make_policy(
    'orders', 'vcube_orders_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- (c) guest checkout: CHO PHÉP insert nhưng phải có token tra cứu hợp lệ.
  --     (không có policy SELECT cho anon — tra cứu đi qua RPC get_order_by_guest_token)
  if public._vcube_has_columns('orders', array['secure_access_token']) then
    -- Dựng biểu thức Ở THỜI ĐIỂM TẠO policy. KHÔNG được gọi hàm tạm `_vcube_*`
    -- bên trong biểu thức policy: các hàm đó bị drop ở bước 10, policy sẽ vỡ lúc
    -- runtime với lỗi "function public._vcube_has_columns does not exist".
    v_guest_check := 'secure_access_token is not null and length(btrim(secure_access_token)) >= 12';
    if public._vcube_has_columns('orders', array['customer_email']) then
      v_guest_check := v_guest_check || ' and coalesce(btrim(customer_email), '''') <> ''''';
    end if;
    if public._vcube_has_columns('orders', array['items']) then
      v_guest_check := v_guest_check || ' and items is not null';
    end if;

    -- Chủ đơn — chống MẠO DANH: `user_id` do CLIENT gửi lên
    -- (src/backend/supabase/database.ts:290). ĐÃ KIỂM CHỨNG THẬT trên production: insert bằng anon
    -- với `user_id` của NGƯỜI KHÁC trả HTTP 201 — DB nhận một đơn thuộc về người khác.
    -- Luật: `user_id is null` (guest checkout — và trường hợp client không suy ra được phiên)
    -- VẪN hợp lệ; mọi giá trị khác PHẢI bằng `auth.uid()` của người đang đăng nhập.
    if public._vcube_has_columns('orders', array['user_id']) then
      v_guest_check := v_guest_check
        || ' and (user_id is null or user_id::text = (select auth.uid())::text)';
    else
      raise warning 'orders: thiếu cột user_id — không ràng buộc được chủ đơn khi insert.';
    end if;

    -- Không ràng buộc `status`: client hiện gửi status tuỳ ý khi tạo đơn. Chỉ admin
    -- được UPDATE nên rủi ro còn lại là sai dữ liệu, không phải leo quyền. Cách đúng
    -- là tạo đơn qua Edge Function để ép status ở phía server.
    perform public._vcube_make_policy(
      'orders', 'vcube_orders_guest_insert', 'insert', array['anon','authenticated'],
      null, v_guest_check);
  else
    raise warning 'orders: thiếu cột secure_access_token — guest checkout cần xử lý thủ công.';
  end if;
  -- Lưu ý: KHÔNG tạo policy SELECT cho anon/authenticated trên orders.

  -- ---------- 5.3 user_profiles ----------
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_self_read', 'select', array['authenticated'],
    'id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_self_update', 'update', array['authenticated'],
    'id::text = (select auth.uid())::text', 'id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');
  -- Không có policy nào cho anon ⇒ anon không đọc được profile của bất kỳ ai.

  -- ---------- 5.4 catalog công khai ----------
  foreach t in array v_catalog_read loop
    perform public._vcube_make_policy(
      t, 'vcube_' || t || '_public_read', 'select', array['anon','authenticated'], 'true', null);
    perform public._vcube_make_policy(
      t, 'vcube_' || t || '_admin_write', 'all', array['authenticated'],
      'public.is_admin()', 'public.is_admin()');
  end loop;

  -- workshop_profiles: chỉ xưởng đã xác minh được xem công khai
  perform public._vcube_make_policy(
    'workshop_profiles', 'vcube_workshop_profiles_public_read', 'select', array['anon','authenticated'],
    $p$verified_status = 'Verified'$p$, null);
  if public._vcube_has_columns('workshop_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_read', 'select', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()', null);
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_update', 'update', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
    -- B1 (P0): chủ sở hữu TỰ TẠO hồ sơ xưởng. Trước mục này, `workshop_profiles` chỉ có
    -- select/update/admin ⇒ tài khoản xưởng THẬT không thể lưu hồ sơ (onboarding chặn ở
    -- tầng DB; `WorkshopOnboardingWizard` gọi `saveWorkshopProfile` và nhận 42501).
    --
    -- 🔴 HAI CỘT BỊ KHOÁ — đây là chống LEO THANG ĐẶC QUYỀN, không phải cho đẹp:
    --   * `partner_id is null`: helper `current_workshop_partner_id()` (mục 1) đọc CHÍNH
    --     cột này để cấp quyền đọc/cập nhật `orders` của xưởng (2 policy mục 5b + trigger
    --     mục 6c). Nếu chủ sở hữu được tự đặt `partner_id` tuỳ ý thì chỉ cần insert một
    --     hàng với `partner_id` của xưởng KHÁC là đọc và sửa được đơn của xưởng đó.
    --     Admin gán mã đối tác SAU, qua `vcube_workshop_profiles_admin_all`.
    --   * `verified_status = 'Pending'`: không ai tự xác minh mình. Hồ sơ `Verified` được
    --     đọc công khai (`vcube_workshop_profiles_public_read`) nên tự đặt 'Verified' là
    --     tự cấp cho mình trạng thái đã được duyệt.
    -- Cột `verified_status` có DEFAULT 'Pending' ⇒ client KHÔNG cần gửi cột này (DEFAULT
    -- được áp trước khi WITH CHECK chạy). `WorkshopOnboardingWizard.tsx:386` có gửi
    -- 'Pending' tường minh ⇒ khớp cả hai đường.
    --
    -- KHÔNG khoá `total_machines` / `active_machines_now` (quyết định CÓ Ý THỨC, đã báo
    -- coordinator):
    --   (1) VÔ HIỆU: `vcube_workshop_profiles_owner_update` ngay trên cho chủ sở hữu UPDATE
    --       mọi cột, nên khoá lúc INSERT thì họ đặt lại số ngay sau đó bằng một lệnh PATCH.
    --   (2) PHÁ LUỒNG THẬT: `saveWorkshopProfile` là UPSERT và LUÔN gửi 2 cột này
    --       (`workshopService.ts:548-549`); wizard gửi `machines.length`
    --       (`WorkshopOnboardingWizard.tsx:382-383`) ⇒ ép `= 0` làm insert fail 42501 với
    --       MỌI xưởng khai ≥1 máy — đúng P0 đang sửa.
    --   (3) Cách đúng (nếu muốn "số năng lực phải được xác minh"): trigger chặn cột cho CẢ
    --       insert lẫn update, cùng khuôn `fn_protect_order_privileged_columns` (mục 6c).
    --       Đã đề xuất coordinator; CHƯA thêm vì ngoài phạm vi được giao.
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_insert', 'insert', array['authenticated'],
      null,
      $p$user_id::text = (select auth.uid())::text and partner_id is null and verified_status = 'Pending'$p$);
    -- ⚠️ Policy trên chỉ đóng đường INSERT. Đường UPDATE (`vcube_workshop_profiles_owner_update`)
    -- vẫn KHÔNG giới hạn cột ⇒ cùng lớp leo thang vẫn đi qua được bằng PATCH `partner_id`
    -- hoặc `verified_status` trên hàng của chính mình. RLS không giới hạn được cột; cần
    -- trigger chặn cột (đã báo coordinator, xem mục 6c để biết khuôn).
  end if;
  perform public._vcube_make_policy(
    'workshop_profiles', 'vcube_workshop_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- customer_profiles / designer_profiles: chủ sở hữu + admin
  if public._vcube_has_columns('customer_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'customer_profiles', 'vcube_customer_profiles_owner_all', 'all', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
  end if;
  perform public._vcube_make_policy(
    'customer_profiles', 'vcube_customer_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  if public._vcube_has_columns('designer_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'designer_profiles', 'vcube_designer_profiles_owner_all', 'all', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
  end if;
  perform public._vcube_make_policy(
    'designer_profiles', 'vcube_designer_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- material_inventory_logs: xưởng sở hữu vật liệu hoặc admin
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_owner_read', 'select', array['authenticated'],
    $p$public.is_admin() or exists (
         select 1 from public.workshop_materials wm
           join public.workshop_profiles wp on wp.id = wm.workshop_id
          where wm.id = material_inventory_logs.material_id
            and wp.user_id::text = (select auth.uid())::text
       )$p$, null);
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_owner_insert', 'insert', array['authenticated'],
    null,
    $p$public.is_admin() or exists (
         select 1 from public.workshop_materials wm
           join public.workshop_profiles wp on wp.id = wm.workshop_id
          where wm.id = material_inventory_logs.material_id
            and wp.user_id::text = (select auth.uid())::text
       )$p$);
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- payment_transactions: CHỈ admin (webhook thật phải dùng service_role, bypass RLS)
  perform public._vcube_make_policy(
    'payment_transactions', 'vcube_payment_transactions_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- cost_rules: chỉ admin
  perform public._vcube_make_policy(
    'cost_rules', 'vcube_cost_rules_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- pricing_config legacy: nếu là BẢNG thì siết policy; nếu là VIEW thì xử lý ở bước 7
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname = 'pricing_config' and c.relkind = 'r') then
    perform public._vcube_make_policy(
      'pricing_config', 'vcube_pricing_config_public_read', 'select', array['anon','authenticated'], 'true', null);
    perform public._vcube_make_policy(
      'pricing_config', 'vcube_pricing_config_admin_write', 'all', array['authenticated'],
      'public.is_admin()', 'public.is_admin()');
  end if;

  -- ---------- 5.4b app_settings / setting_audit ----------
  -- app_settings: noi dung phap ly hien thi cong khai (ten phap nhan, dia chi
  -- xuat hoa don, hotline, email, so tai khoan, dieu khoan). Cho anon doc, nhung
  -- CHI admin ghi. Ma so thue de NULL khi chua cau hinh — UI phai an, khong doan.
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_public_read', 'select', array['anon','authenticated'],
    $p$true$p$, null);
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_admin_insert', 'insert', array['authenticated'],
    null, 'public.is_admin()');
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_admin_update', 'update', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- setting_audit: append-only. Chi admin doc va ghi; KHONG tao policy UPDATE
  -- hay DELETE cho bat ky vai tro nao ⇒ nhat ky khong the bi sua/xoa tu client.
  perform public._vcube_make_policy(
    'setting_audit', 'vcube_setting_audit_admin_read', 'select', array['authenticated'],
    'public.is_admin()', null);
  perform public._vcube_make_policy(
    'setting_audit', 'vcube_setting_audit_admin_insert', 'insert', array['authenticated'],
    null, 'public.is_admin()');

  -- ---------- 5.4c warranty_claims ----------
  -- Khach doc/tao claim cua CHINH minh (user_id = auth.uid()). Khach KHONG co
  -- policy UPDATE ⇒ khong the tu doi status/resolution/handled_by.
  if public._vcube_has_columns('warranty_claims', array['user_id']) then
    perform public._vcube_make_policy(
      'warranty_claims', 'vcube_warranty_claims_customer_read', 'select', array['authenticated'],
      'user_id::text = (select auth.uid())::text', null);
    perform public._vcube_make_policy(
      'warranty_claims', 'vcube_warranty_claims_customer_insert', 'insert', array['authenticated'],
      null, 'user_id::text = (select auth.uid())::text');
  else
    raise warning 'warranty_claims: thieu cot user_id — khach khong tao duoc claim';
  end if;
  -- admin/lab: doc tat ca + cap nhat trang thai / ghi chu xu ly
  perform public._vcube_make_policy(
    'warranty_claims', 'vcube_warranty_claims_staff_read', 'select', array['authenticated'],
    'public.is_admin_or_lab()', null);
  perform public._vcube_make_policy(
    'warranty_claims', 'vcube_warranty_claims_staff_update', 'update', array['authenticated'],
    'public.is_admin_or_lab()', 'public.is_admin_or_lab()');

  -- ---------- 5.4d order_files (mo khoa DoD #19: tai file CAD sau khi mua) ----------
  -- Nguoi mua doc duoc file thuoc DON CUA MINH qua bang lien ket that, thay cho
  -- heuristic `orders.items::text like '%…%'` truoc day.
  if public._vcube_has_columns('order_files', array['order_id','storage_path'])
     and public._vcube_has_columns('orders', array['user_id']) then
    perform public._vcube_make_policy(
      'order_files', 'vcube_order_files_buyer_read', 'select', array['authenticated'],
      $p$public.is_admin_or_lab() or exists (
           select 1 from public.orders o
            where o.id = order_files.order_id
              and o.user_id::text = (select auth.uid())::text
         )$p$, null);
  else
    raise warning 'order_files: thieu cot order_id/storage_path hoac orders.user_id — bo qua policy nguoi mua';
  end if;
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_staff_insert', 'insert', array['authenticated'],
    null, 'public.is_admin_or_lab()');
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_staff_update', 'update', array['authenticated'],
    'public.is_admin_or_lab()', 'public.is_admin_or_lab()');
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_admin_delete', 'delete', array['authenticated'],
    'public.is_admin()', null);

  -- ---------- 5.4e reviews (Đợt 10) ----------
  -- Ai cũng đọc bản ĐÃ published; tác giả đọc bản của mình (kể cả pending/hidden), CHỈ
  -- chèn được khi author_id = auth.uid(), và chỉ sửa/xoá khi còn 'pending'.
  -- `status = 'pending'` trong WITH CHECK là CỐ Ý siết thêm so với brief: nếu tác giả được
  -- tự chèn thẳng status='published' thì bước duyệt pending -> published vô nghĩa, và bất
  -- kỳ ai cũng bơm được điểm vào products.rating qua trigger (20260901 mục 9.6).
  -- Admin vẫn publish/ẩn được nhờ policy full ở dưới.
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_public_read', 'select', array['anon','authenticated'],
    $p$status = 'published'$p$, null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_read', 'select', array['authenticated'],
    'author_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_insert', 'insert', array['authenticated'],
    null,
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_update', 'update', array['authenticated'],
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$,
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_delete', 'delete', array['authenticated'],
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$, null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4f digital_assets (Đợt 10) ----------
  -- ĐIỂM SỐNG CÒN: storage_path là đường lấy file trong bucket PRIVATE 'cad-files'.
  --   * designer CHỈ thấy file của mình (designer_id = auth.uid()), admin toàn quyền.
  --   * KHÔNG có policy nào cho anon/khách ⇒ khách không đọc được DÒNG NÀO, nên không bao
  --     giờ nhận được storage_path. (RLS là mức DÒNG chứ không phải mức CỘT — cách duy nhất
  --     để chắc chắn không lộ cột là không cho đọc dòng. GRANT cũng không mở cho anon.)
  --   * Khách cần tải file ⇒ tầng service dùng service_role + createSignedUrl NGẮN HẠN, sau
  --     khi service tự kiểm tra quyền mua. KHÔNG đưa storage_path ra client khách.
  perform public._vcube_make_policy(
    'digital_assets', 'vcube_digital_assets_designer_all', 'all', array['authenticated'],
    'designer_id::text = (select auth.uid())::text',
    'designer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'digital_assets', 'vcube_digital_assets_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4g cart_items (Đợt 10) ----------
  -- Chỉ chủ sở hữu đọc/ghi giỏ của mình. Admin CHỈ ĐỌC (đúng brief: "admin đọc") — KHÔNG
  -- có policy UPDATE/DELETE cho admin, nên không ai sửa được giỏ của khách qua API.
  perform public._vcube_make_policy(
    'cart_items', 'vcube_cart_items_owner_all', 'all', array['authenticated'],
    'user_id::text = (select auth.uid())::text',
    'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'cart_items', 'vcube_cart_items_admin_read', 'select', array['authenticated'],
    'public.is_admin()', null);

  -- ---------- 5.4h quotes (Đợt 10 — W5) ----------
  -- VÌ SAO CẦN: `quotes` đã có RLS bật + GRANT cho `authenticated` nhưng KHÔNG có policy
  -- nào ⇒ deny-all, nên `src/backend/supabase/database.ts` gọi `insert into quotes` LUÔN
  -- thất bại 42501. Bảng rỗng trên production đúng với việc insert chưa từng thành công.
  -- Đây là lớp lỗi mà `audit` kiểu "bảng thiếu RLS" KHÔNG bắt được (deny-all là an toàn).
  -- Chủ sở hữu toàn quyền trên báo giá của mình; admin toàn quyền. Không có anon.
  -- D5(b): BỎ DELETE khỏi quyền chủ sở hữu — GIỮ LỊCH SỬ BÁO GIÁ để đối soát.
  -- Cố ý KHÔNG có policy delete ⇒ client không xoá được báo giá; admin vẫn xoá được qua
  -- `vcube_quotes_admin_all` khi thật cần.
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_read', 'select', array['authenticated'],
    'user_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_insert', 'insert', array['authenticated'],
    null, 'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_update', 'update', array['authenticated'],
    'user_id::text = (select auth.uid())::text',
    'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4i kyc_records (Đợt 10 — W5) ----------
  -- PII NẶNG: `doc_number` / `tax_id` / `bank_account`. Chỉ CHỦ SỞ HỮU và admin đọc được;
  -- KHÔNG grant, KHÔNG policy cho anon.
  -- Chủ sở hữu CHỈ được ĐỌC + NỘP MỚI, CỐ Ý KHÔNG có UPDATE/DELETE: kết quả duyệt
  -- (`status`/`reviewed_by`/`reviewed_at`) phải bất biến từ phía người dùng — muốn sửa thì
  -- nộp bản mới. WITH CHECK của insert chặn luôn việc TỰ DUYỆT: status phải là 'pending'
  -- và reviewed_* phải rỗng, nếu không người dùng tự ghi status='verified'.
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_owner_read', 'select', array['authenticated'],
    'user_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_owner_insert', 'insert', array['authenticated'],
    null,
    $p$user_id::text = (select auth.uid())::text and coalesce(status, 'pending') = 'pending' and reviewed_by is null and reviewed_at is null$p$);
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4j order_items (Đợt 25) ----------
  -- Dòng tiền của đơn. Chủ đơn đọc dòng của mình; admin toàn quyền.
  -- Biểu thức chủ đơn sao ĐÚNG logic của `vcube_orders_owner_read`: khớp `user_id` HOẶC
  -- `customer_email` (đơn khách để `user_id` NULL). Khách tra cứu đơn vẫn đi qua RPC
  -- `get_order_by_guest_token` (SECURITY DEFINER) nên không cần policy cho anon.
  perform public._vcube_make_policy(
    'order_items', 'vcube_order_items_owner_read', 'select', array['authenticated'],
    $p$exists (
         select 1 from public.orders o
          where o.id = order_items.order_id
            and (o.user_id::text = (select auth.uid())::text
                 or o.customer_email = (select auth.jwt() ->> 'email'))
       )$p$, null);
  perform public._vcube_make_policy(
    'order_items', 'vcube_order_items_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4k workshop_commission_terms (Đợt 25) ----------
  -- CHỈ ADMIN. Bảng này chứa GIÁ ĐÀM PHÁN RIÊNG của từng đối tác ⇒ cố ý KHÔNG public-read,
  -- KHÔNG anon, KHÔNG chủ xưởng. Nó tồn tại ở bảng RIÊNG (không nằm trên `workshop_partners`)
  -- đúng vì `workshop_partners` là catalog công khai — xem mục 2e của file baseline.
  perform public._vcube_make_policy(
    'workshop_commission_terms', 'vcube_workshop_commission_terms_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');
  -- KHÔNG có policy INSERT/UPDATE/DELETE cho chủ đơn: đây là DÒNG TIỀN, chỉ service/admin
  -- được ghi. KHÔNG có policy nào cho anon.
  --
  -- LỰA CHỌN CÓ Ý THỨC — KHÔNG mở đường đọc cho xưởng in (dù spec cho phép cân nhắc):
  --   * RLS là mức DÒNG, không phải mức CỘT. Nếu cho xưởng đọc dòng của đơn được giao thì
  --     họ đọc được LUÔN `platform_fee_amount` = biên lợi nhuận của nền tảng trên chính đơn
  --     đó. Không có cách chặn cột bằng policy.
  --   * Xưởng KHÔNG cần bảng này để làm việc: mặt hàng của đơn đã nằm trong `orders.items`
  --     (jsonb) mà xưởng đọc được qua `vcube_orders_workshop_read` (mục 5b).
  --   * Nếu sau này UI xưởng cần "phần tiền của tôi": tạo VIEW `security_invoker` chỉ phơi
  --     các cột KHÔNG nhạy cảm (id, order_id, product_id, quantity, fulfillment) rồi cấp
  --     select theo `assigned_workshop_id` — việc riêng, cần chốt trước khi làm.

  -- ---------- 5.4l custom_design_requests (Đợt 30 — Studio Designer) ----------
  -- Yêu cầu CAD tuỳ chỉnh. Khách hàng đọc/nộp/sửa yêu cầu của mình.
  -- Designer CHỈ đọc/ghi yêu cầu ĐƯỢC GÁN cho mình (designer_id = auth.uid()) hoặc còn TRỐNG
  -- (designer_id is null — chợ mở để nhận việc); admin toàn quyền. KHÔNG dùng
  -- `current_app_role() in ('designer','admin')` vì như vậy MỌI designer đọc được yêu cầu của
  -- designer khác (rò dữ liệu khách hàng).
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_select', 'select', array['authenticated'],
    'customer_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_insert', 'insert', array['authenticated'],
    null, 'customer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_update', 'update', array['authenticated'],
    'customer_id::text = (select auth.uid())::text',
    'customer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_designer_select', 'select', array['authenticated'],
    $p$public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null$p$, null);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_designer_update', 'update', array['authenticated'],
    $p$public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null$p$,
    $p$public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null$p$);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.5 xưởng in (role lab/workshop) quản lý tài sản của chính mình ----------
  -- workshop_machines / workshop_materials: chủ xưởng hoặc admin
  foreach t in array array['workshop_machines','workshop_materials'] loop
    if public._vcube_has_columns(t, array['workshop_id']) then
      perform public._vcube_make_policy(
        t, 'vcube_' || t || '_owner_all', 'all', array['authenticated'],
        'public.is_admin() or exists (select 1 from public.workshop_profiles wp
           where wp.id = ' || quote_ident(t) || '.workshop_id
             and wp.user_id::text = (select auth.uid())::text)',
        'public.is_admin() or exists (select 1 from public.workshop_profiles wp
           where wp.id = ' || quote_ident(t) || '.workshop_id
             and wp.user_id::text = (select auth.uid())::text)');
    else
      raise warning '% : thiếu cột workshop_id — chỉ admin quản lý được', t;
    end if;
  end loop;

  -- workshop_accessories: bản ghi riêng của xưởng (workshop_id khác null) mới cho xưởng sửa
  if public._vcube_has_columns('workshop_accessories', array['workshop_id']) then
    perform public._vcube_make_policy(
      'workshop_accessories', 'vcube_workshop_accessories_owner_all', 'all', array['authenticated'],
      'public.is_admin() or (workshop_id is not null and exists (
         select 1 from public.workshop_profiles wp
          where wp.id = workshop_accessories.workshop_id
            and wp.user_id::text = (select auth.uid())::text))',
      'public.is_admin() or (workshop_id is not null and exists (
         select 1 from public.workshop_profiles wp
          where wp.id = workshop_accessories.workshop_id
            and wp.user_id::text = (select auth.uid())::text))');
  end if;
end
$do$;

-- ==============================================================================
-- 5b. ORDERS — XƯỞNG IN ĐƯỢC GIAO ĐƠN (đọc + cập nhật tiến độ)
-- ==============================================================================
-- VÌ SAO CẦN: trước mục này, `orders` chỉ có 3 policy — chủ đơn đọc, admin toàn quyền,
-- guest insert. KHÔNG có policy nào cho vai `lab`/`workshop`, nên xưởng bấm "Nhận việc"
-- bị RLS chặn và hàng đợi việc không chạy được (W1b đã đo được trên DB thật).
--
-- VÌ SAO DDL THẲNG Ở ĐÂY, KHÔNG dùng `_vcube_make_policy` (mục 5): helper đó bắt MỌI lỗi
-- rồi chỉ `raise warning` ⇒ nếu biểu thức hỏng thì migration vẫn commit mà policy KHÔNG
-- được tạo, và tính năng chết ÂM THẦM (đúng lớp sự cố W1b vừa gặp). DDL thẳng làm
-- migration ABORT nếu sai — hỏng là biết ngay. (`drop policy if exists` giữ idempotent.)
--
-- ⚠️ `orders` chứa PII của khách (tên, SĐT, địa chỉ, `secure_access_token`). Policy đọc
-- dưới đây chỉ mở cho ĐÚNG xưởng được giao đơn đó (`assigned_workshop_id` = `partner_id`
-- của người gọi); khách và xưởng khác vẫn 0 dòng như trước. Xưởng nhìn thấy thông tin
-- liên hệ của đơn mình in là cần thiết để giao hàng — nhưng chỉ đơn được giao cho mình.
--
-- ⚠️ RLS là mức DÒNG, không phải mức CỘT: 2 policy này vẫn cho xưởng PATCH `total_amount`,
-- `payment_status`, `user_id`… của đơn được giao. Trigger ở mục 6c chặn phần đó.

drop policy if exists vcube_orders_workshop_read on public.orders;
create policy vcube_orders_workshop_read on public.orders
  for select to authenticated
  using (assigned_workshop_id is not null
         and assigned_workshop_id = public.current_workshop_partner_id());

drop policy if exists vcube_orders_workshop_update_progress on public.orders;
create policy vcube_orders_workshop_update_progress on public.orders
  for update to authenticated
  using (assigned_workshop_id is not null
         and assigned_workshop_id = public.current_workshop_partner_id())
  with check (assigned_workshop_id = public.current_workshop_partner_id());
-- ==============================================================================
-- 6. CHỐNG TỰ NÂNG QUYỀN: chặn đổi các cột đặc quyền trong user_profiles
-- ==============================================================================
-- Policy UPDATE ở trên cho phép người dùng sửa profile của mình; trigger này chặn
-- việc tự đổi role / kyc_status / account_status / total_* (chỉ admin hoặc
-- service_role được đổi).
create or replace function public.fn_protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.kyc_status is distinct from old.kyc_status
     or (to_jsonb(new) ? 'account_status' and to_jsonb(new)->>'account_status'
          is distinct from to_jsonb(old)->>'account_status')
     or (to_jsonb(new) ? 'total_orders' and to_jsonb(new)->>'total_orders'
          is distinct from to_jsonb(old)->>'total_orders')
     or (to_jsonb(new) ? 'total_spent' and to_jsonb(new)->>'total_spent'
          is distinct from to_jsonb(old)->>'total_spent') then
    raise exception 'VCUBE: không được tự thay đổi role/kyc_status/account_status/total_* (RLS hardening 20261010)'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.user_profiles') is not null then
    execute 'drop trigger if exists trg_protect_profile_privileged_columns on public.user_profiles';
    execute 'create trigger trg_protect_profile_privileged_columns
               before update on public.user_profiles
               for each row execute function public.fn_protect_profile_privileged_columns()';
    raise notice 'OK    trigger chống nâng quyền trên public.user_profiles';
  end if;
end
$do$;

-- ==============================================================================
-- 6b. TỰ ĐỘNG TẠO PROFILE KHI CÓ USER MỚI
-- ==============================================================================
-- Vì sao cần: client hiện KHÔNG ghi vào public.user_profiles cho người dùng thật
-- (AuthContext chỉ dựng profile trong bộ nhớ từ auth metadata). Nếu bảng không có
-- dòng tương ứng thì public.is_admin() luôn false ⇒ không ai quản trị được.
-- Trigger này bảo đảm mỗi user mới luôn có một dòng profile role='customer'.
do $do$
declare
  v_cols text := 'id, email, role';
  v_vals text := 'new.id::text, coalesce(new.email, ''''), ''customer''';
begin
  if to_regclass('public.user_profiles') is null then
    raise warning 'Bỏ qua trigger tạo profile: public.user_profiles không tồn tại';
    return;
  end if;

  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='user_profiles' and column_name='display_name') then
    v_cols := v_cols || ', display_name';
    v_vals := v_vals || ', coalesce(new.raw_user_meta_data->>''full_name'', split_part(coalesce(new.email, ''user''), ''@'', 1))';
  end if;

  execute format($fn$
    create or replace function public.fn_create_profile_for_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $body$
    begin
      begin
        insert into public.user_profiles (%s) values (%s)
        on conflict (id) do nothing;
      exception when others then
        null;  -- không được chặn việc tạo tài khoản vì lỗi profile
      end;
      return new;
    end
    $body$;
  $fn$, v_cols, v_vals);

  begin
    execute 'drop trigger if exists trg_create_profile_for_new_user on auth.users';
    execute 'create trigger trg_create_profile_for_new_user
               after insert on auth.users
               for each row execute function public.fn_create_profile_for_new_user()';
    raise notice 'OK    trigger tạo profile tự động trên auth.users';
  exception when others then
    raise warning 'Không tạo được trigger trên auth.users (%): hãy chạy bootstrap_admin.sql cho từng tài khoản', sqlerrm;
  end;
end
$do$;

-- ==============================================================================
-- 6c. CHỐNG XƯỞNG IN SỬA CỘT ĐẶC QUYỀN CỦA ĐƠN (RLS không giới hạn được cột)
-- ==============================================================================
-- VÌ SAO BẮT BUỘC: policy `vcube_orders_workshop_update_progress` (mục 5b) chỉ kiểm tra
-- DÒNG. Không có trigger này, xưởng được giao đơn có thể PATCH `total_amount`,
-- `shipping_fee`, `payment_status`, `items`, `user_id`, `customer_email`,
-- `assigned_workshop_id`… của đơn mình — đó là lỗ hổng TIỀN và ĐỊNH DANH, không phải
-- chuyện nhỏ. Cùng khuôn với `fn_protect_profile_privileged_columns` (mục 6) — hàm đó
-- chặn người dùng tự đổi `role`/`kyc_status`/`total_*` của chính mình.
--
-- LUẬT:
--   * admin (`public.is_admin()`) ⇒ đi qua.
--   * người gọi LÀ xưởng được giao chính đơn này (`old.assigned_workshop_id` =
--     `current_workshop_partner_id()`) ⇒ CHỈ được đổi 4 cột:
--         status, status_stage_index, layer_progress, updated_at
--     đổi bất kỳ cột nào khác ⇒ `raise exception` 42501 nêu rõ tên cột bị chặn.
--   * MỌI trường hợp khác (khách, xưởng khác, service_role, SQL tay không có auth.uid())
--     ⇒ `return new`, để RLS quyết định — trigger KHÔNG tự chặn ai ở đây.
--
-- So sánh bằng `to_jsonb(new) - <cột được phép>` nên KHÔNG phải bảo trì danh sách: nếu
-- `orders` thêm cột mới, cột đó TỰ ĐỘNG thuộc nhóm bị chặn (fail-closed, không fail-open).
create or replace function public.fn_protect_order_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_allowed text[] := array['status','status_stage_index','layer_progress','updated_at'];
  v_partner text;
  v_new     jsonb;
  v_old     jsonb;
  v_changed text;
begin
  if public.is_admin() then
    return new;
  end if;

  v_partner := public.current_workshop_partner_id();

  -- Chỉ áp cho xưởng đang được giao ĐÚNG đơn này; các trường hợp khác để RLS quyết định.
  if v_partner is null
     or old.assigned_workshop_id is null
     or old.assigned_workshop_id <> v_partner then
    return new;
  end if;

  v_new := to_jsonb(new) - v_allowed;
  v_old := to_jsonb(old) - v_allowed;

  if v_new is distinct from v_old then
    select string_agg(k, ', ' order by k)
      into v_changed
      from jsonb_object_keys(v_new) k
     where v_new -> k is distinct from v_old -> k;

    raise exception 'VCUBE: xưởng in chỉ được đổi status/status_stage_index/layer_progress/updated_at của đơn được giao (bị chặn: %)',
      coalesce(v_changed, '?')
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.orders') is not null then
    execute 'drop trigger if exists trg_protect_order_privileged_columns on public.orders';
    execute 'create trigger trg_protect_order_privileged_columns
               before update on public.orders
               for each row execute function public.fn_protect_order_privileged_columns()';
    raise notice 'OK    trigger chống xưởng sửa cột đặc quyền trên public.orders';
  else
    raise warning 'Bỏ qua trigger chống sửa cột đặc quyền: public.orders không tồn tại';
  end if;
end
$do$;

-- ==============================================================================
-- 6d. CHỐNG CHỦ XƯỞNG TỰ ĐỔI partner_id / verified_status (RLS không giới hạn cột)
-- ==============================================================================
-- VÌ SAO BẮT BUỘC: `vcube_workshop_profiles_owner_update` cho chủ sở hữu UPDATE **mọi cột**
-- (RLS là mức DÒNG, không phải mức CỘT). Mà `public.current_workshop_partner_id()` đọc
-- CHÍNH `partner_id` để cấp quyền đọc/cập nhật `orders` (policy mục 5b + trigger mục 6c).
-- ⇒ Không có trigger này, chủ xưởng chỉ cần:
--        update public.workshop_profiles set partner_id = '<mã của xưởng khác>'
--         where user_id = auth.uid();
--   là đọc và sửa được ĐƠN CỦA XƯỞNG ĐÓ ⇒ LEO THANG ĐẶC QUYỀN. Tương tự, tự đặt
--   `verified_status = 'Verified'` là tự xác minh mình (hồ sơ Verified được đọc công khai).
--   Policy INSERT ở mục 5.4 chỉ đóng đường INSERT ⇒ phải chặn thêm đường UPDATE.
--
-- KHÁC `orders` (mục 6c) — ĐỌC KỸ: ở `orders` ý đồ là ALLOW-LIST ("mọi cột khác đều đặc
-- quyền") nên dùng `to_jsonb(new) - v_allowed` để fail-closed với cột thêm sau này. Ở đây
-- ý đồ NGƯỢC LẠI: DENY-LIST đúng 2 cột — `workshop_name`, `address`, `region`, `contact_*`,
-- `electricity_rate_override`, `labor_rate_override` PHẢI tiếp tục sửa được, và cột thêm
-- sau này mặc định sửa được. Nên so sánh TƯỜNG MINH 2 cột, KHÔNG dùng khuôn `to_jsonb`.
--
-- 5 NHÁNH (thứ tự có lý do, không được bỏ nhánh nào):
--   1. `public.is_admin()` ⇒ đi qua (đây là đường admin gán partner_id / duyệt hồ sơ).
--   2. lấy `v_uid := (select auth.uid())`.
--   3. `v_uid is null` ⇒ đi qua. ⚠️ BẮT BUỘC: `auth.uid()` NULL khi gọi bằng secret key /
--      SQL Editor / service_role; thiếu nhánh này là CHẶN CẢ ĐƯỜNG QUẢN TRỊ HỢP LỆ.
--   4. `old.user_id is distinct from v_uid` ⇒ đi qua (chỉ áp cho CHÍNH chủ hàng; người khác
--      để RLS quyết định — không tự chặn ở tầng trigger).
--   5. còn lại = chủ sở hữu, không phải admin ⇒ nếu 1 trong 2 cột ĐỔI GIÁ TRỊ thì raise 42501
--      và nêu rõ tên cột. Giá trị KHÔNG đổi thì `is distinct from` = false ⇒ KHÔNG báo lỗi
--      (đây là điều kiện để upsert/ghi lại hồ sơ hiện tại vẫn chạy được).
--
-- CHỈ `before update`: đường INSERT đã bị policy `vcube_workshop_profiles_owner_insert`
-- (mục 5.4) khoá bằng `partner_id is null and verified_status = 'Pending'`, còn admin/service
--_role thì đi đường riêng. Thêm `before insert` sẽ phải thêm nhánh TG_OP mà không tăng bảo vệ.
create or replace function public.fn_protect_workshop_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid     uuid;
  v_partner boolean;
  v_verify  boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  v_uid := (select auth.uid());

  if v_uid is null then
    return new;
  end if;

  if old.user_id is distinct from v_uid then
    return new;
  end if;

  v_partner := new.partner_id      is distinct from old.partner_id;
  v_verify  := new.verified_status is distinct from old.verified_status;

  if v_partner or v_verify then
    raise exception 'VCUBE: chủ xưởng không được tự đổi % của hồ sơ xưởng (chỉ quản trị viên). Tên/địa chỉ/khu vực/liên hệ/đơn giá thì sửa được.',
      concat_ws(', ',
        case when v_partner then 'partner_id' end,
        case when v_verify  then 'verified_status' end)
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.workshop_profiles') is not null then
    execute 'drop trigger if exists trg_protect_workshop_profile_privileged_columns on public.workshop_profiles';
    execute 'create trigger trg_protect_workshop_profile_privileged_columns
               before update on public.workshop_profiles
               for each row execute function public.fn_protect_workshop_profile_privileged_columns()';
    raise notice 'OK    trigger chống chủ xưởng tự đổi partner_id/verified_status';
  else
    raise warning 'Bỏ qua trigger workshop_profiles: bảng không tồn tại';
  end if;
end
$do$;
-- ==============================================================================
-- 7. VIEW pricing_config: view bỏ qua RLS ⇒ bắt buộc security_invoker
-- ==============================================================================
do $do$
declare
  v_relkind "char";
begin
  select c.relkind into v_relkind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'pricing_config';

  if v_relkind = 'v' then
    begin
      execute 'alter view public.pricing_config set (security_invoker = true)';
      raise notice 'OK    pricing_config là VIEW → đã bật security_invoker';
    exception when others then
      raise warning 'Không bật được security_invoker cho view pricing_config: %', sqlerrm;
    end;
  elsif v_relkind = 'r' then
    raise notice 'INFO  pricing_config là TABLE (không phải view) → đã siết policy ở bước 5';
  else
    raise notice 'INFO  pricing_config không tồn tại';
  end if;
end
$do$;

-- ==============================================================================
-- 8. STORAGE POLICIES
-- ==============================================================================
do $do$
declare
  rec record;
  v_ok text[] := array[
    'vcube_product_images_public_read',
    'vcube_product_images_admin_write',
    'vcube_cad_files_admin_all',
    'vcube_cad_files_buyer_read',
    'vcube_cad_files_order_files_read',
    'vcube_cad_files_digital_owner_rw'
  ];
begin
  if to_regclass('storage.objects') is null then
    raise notice 'SKIP  storage.objects không tồn tại (bỏ qua bước 8)';
    return;
  end if;

  -- 8.1 xoá policy cũ của repo
  for rec in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('Public product-images read','Admin product-images write','Admin cad-files write')
  loop
    execute format('drop policy if exists %I on storage.objects', rec.policyname);
  end loop;

  -- 8.2 dọn policy lạ còn sót trên 2 bucket này
  for rec in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (coalesce(qual, '') like '%product-images%' or coalesce(with_check, '') like '%product-images%'
            or coalesce(qual, '') like '%cad-files%' or coalesce(with_check, '') like '%cad-files%')
       and policyname <> all (v_ok)
  loop
    execute format('drop policy if exists %I on storage.objects', rec.policyname);
    raise notice 'DROPPED policy storage lạ: %', rec.policyname;
  end loop;

  -- 8.3 tạo policy đúng
  execute 'drop policy if exists vcube_product_images_public_read on storage.objects';
  execute $pol$create policy vcube_product_images_public_read on storage.objects
             for select to anon, authenticated
             using (bucket_id = 'product-images')$pol$;

  execute 'drop policy if exists vcube_product_images_admin_write on storage.objects';
  execute $pol$create policy vcube_product_images_admin_write on storage.objects
             for all to authenticated
             using (bucket_id = 'product-images' and public.is_admin())
             with check (bucket_id = 'product-images' and public.is_admin())$pol$;

  execute 'drop policy if exists vcube_cad_files_admin_all on storage.objects';
  execute $pol$create policy vcube_cad_files_admin_all on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files' and public.is_admin())
             with check (bucket_id = 'cad-files' and public.is_admin())$pol$;

  -- cad-files (1/2): đường CHÍNH XÁC — file có trong bảng order_files thuộc đơn của
  -- người mua (hoặc admin/lab). Đây là thứ mở khoá DoD #19 cùng createSignedUrl.
  if to_regclass('public.order_files') is not null
     and public._vcube_has_columns('order_files', array['order_id','storage_path']) then
    execute 'drop policy if exists vcube_cad_files_order_files_read on storage.objects';
    execute $pol$create policy vcube_cad_files_order_files_read on storage.objects
               for select to authenticated
               using (
                 bucket_id = 'cad-files'
                 and exists (
                   select 1 from public.order_files of
                     join public.orders o on o.id = of.order_id
                    where of.storage_path = storage.objects.name
                      and (o.user_id::text = (select auth.uid())::text
                           or public.is_admin_or_lab())
                 )
               )$pol$;
    raise notice 'OK    cad-files: policy nguoi mua theo public.order_files (chinh xac)';
  else
    raise warning 'cad-files: chua co public.order_files — chi con policy heuristic orders.items';
  end if;

  -- cad-files (2/2): đường LUI cho đơn đã mua trước khi bảng order_files tồn tại.
  -- LƯU Ý: đây là heuristic dựa trên orders.items (JSONB, chứa đường dẫn/tên file).
  if to_regclass('public.orders') is not null
     and public._vcube_has_columns('orders', array['user_id','items']) then
    execute 'drop policy if exists vcube_cad_files_buyer_read on storage.objects';
    execute $pol$create policy vcube_cad_files_buyer_read on storage.objects
               for select to authenticated
               using (
                 bucket_id = 'cad-files'
                 and exists (
                   select 1 from public.orders o
                    where o.user_id::text = (select auth.uid())::text
                      and o.items::text like '%' || storage.objects.name || '%'
                 )
               )$pol$;
    raise notice 'OK    cad-files: policy đọc cho người mua (heuristic orders.items)';
  else
    raise warning 'cad-files: chưa tạo được policy người mua (thiếu orders.user_id/items). Dùng signed URL.';
  end if;
  -- cad-files (3/3): DESIGNER tự quản file số của mình — quy ước digital/<auth.uid()>/...
  -- ĐÂY LÀ ĐIỀU KIỆN SỐNG CÒN của mục 1a (bán file số): bucket cad-files là PRIVATE và trước
  -- policy này chỉ có admin + người mua, nên designer KHÔNG upload/tải được file của chính
  -- mình ⇒ tính năng lõi của chợ 3 bên không chạy được.
  -- Phạm vi hẹp có chủ ý: chỉ đúng thư mục cấp 1 = 'digital' và cấp 2 = uid của người gọi,
  -- nên designer A KHÔNG chạm được file của designer B, và không chạm được file CAD của đơn
  -- (những file đó nằm ngoài digital/<uid>/). Khách vẫn không có quyền gì trên bucket này.
  execute 'drop policy if exists vcube_cad_files_digital_owner_rw on storage.objects';
  execute $pol$create policy vcube_cad_files_digital_owner_rw on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'digital'
                    and (storage.foldername(name))[2] = (select auth.uid())::text)
             with check (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'digital'
                    and (storage.foldername(name))[2] = (select auth.uid())::text)$pol$;
  raise notice 'OK    cad-files: designer tự quản file số trong digital/<uid>/';
end
$do$;

-- ==============================================================================
-- 9. DỌN POLICY LẠ CÒN SÓT LẠI (allowlist)
-- ==============================================================================
do $do$
declare
  rec record;
  v_keep text[] := array[
    'vcube_products_public_read','vcube_products_admin_all',
    'vcube_orders_owner_read','vcube_orders_admin_all','vcube_orders_guest_insert',
    -- Đợt 10 (W2b): xưởng in được giao đơn — đọc + cập nhật tiến độ (mục 5b)
    'vcube_orders_workshop_read','vcube_orders_workshop_update_progress',
    'vcube_profiles_self_read','vcube_profiles_self_update','vcube_profiles_admin_all',
    'vcube_materials_public_read','vcube_materials_admin_write',
    'vcube_printer_fleet_public_read','vcube_printer_fleet_admin_write',
    'vcube_accessories_public_read','vcube_accessories_admin_write',
    'vcube_workshop_partners_public_read','vcube_workshop_partners_admin_write',
    'vcube_site_content_public_read','vcube_site_content_admin_write',
    'vcube_pricing_configs_public_read','vcube_pricing_configs_admin_write',
    'vcube_workshop_machines_public_read','vcube_workshop_machines_admin_write',
    'vcube_workshop_materials_public_read','vcube_workshop_materials_admin_write',
    'vcube_designer_profiles_public_read','vcube_designer_profiles_admin_write',
    'vcube_designer_profiles_owner_all','vcube_designer_profiles_admin_all',
    'vcube_pricing_global_settings_public_read','vcube_pricing_global_settings_admin_write',
    'vcube_workshop_accessories_public_read','vcube_workshop_accessories_admin_write',
    'vcube_workshop_profiles_public_read','vcube_workshop_profiles_owner_read',
    'vcube_workshop_profiles_owner_update','vcube_workshop_profiles_owner_insert',
    'vcube_workshop_profiles_admin_all',
    'vcube_customer_profiles_owner_all','vcube_customer_profiles_admin_all',
    'vcube_inventory_logs_owner_read','vcube_inventory_logs_owner_insert',
    'vcube_inventory_logs_admin_all',
    'vcube_payment_transactions_admin_all','vcube_cost_rules_admin_all',
    'vcube_pricing_config_public_read','vcube_pricing_config_admin_write',
    'vcube_workshop_machines_owner_all','vcube_workshop_materials_owner_all',
    'vcube_workshop_accessories_owner_all',
    -- app_settings / setting_audit / warranty_claims / order_files (2026-09)
    'vcube_app_settings_public_read','vcube_app_settings_admin_insert',
    'vcube_app_settings_admin_update',
    'vcube_setting_audit_admin_read','vcube_setting_audit_admin_insert',
    'vcube_warranty_claims_customer_read','vcube_warranty_claims_customer_insert',
    'vcube_warranty_claims_staff_read','vcube_warranty_claims_staff_update',
    'vcube_order_files_buyer_read','vcube_order_files_staff_insert',
    'vcube_order_files_staff_update','vcube_order_files_admin_delete',
    -- Đợt 10 (W2): reviews / digital_assets / cart_items
    'vcube_reviews_public_read','vcube_reviews_author_read','vcube_reviews_author_insert',
    'vcube_reviews_author_update','vcube_reviews_author_delete','vcube_reviews_admin_all',
    'vcube_digital_assets_designer_all','vcube_digital_assets_admin_all',
    'vcube_cart_items_owner_all','vcube_cart_items_admin_read',
    -- Đợt 10 (W5): quotes + kyc_records (RLS bật nhưng 0 policy ⇒ deny-all)
    'vcube_quotes_owner_read','vcube_quotes_owner_insert','vcube_quotes_owner_update',
    'vcube_quotes_admin_all',
    -- Đợt 25: dòng tiền của đơn
    'vcube_order_items_owner_read','vcube_order_items_admin_all',
    'vcube_workshop_commission_terms_admin_all',
    'vcube_kyc_owner_read','vcube_kyc_owner_insert','vcube_kyc_admin_all',
    -- Đợt 30: custom_design_requests (Studio Designer)
    'vcube_custom_design_requests_customer_select',
    'vcube_custom_design_requests_customer_insert',
    'vcube_custom_design_requests_customer_update',
    'vcube_custom_design_requests_designer_select',
    'vcube_custom_design_requests_designer_update',
    'vcube_custom_design_requests_admin_all'
  ];
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
begin
  for rec in
    select p.tablename, p.policyname from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = any (v_tables)
       and p.policyname <> all (v_keep)
  loop
    execute format('drop policy if exists %I on public.%I', rec.policyname, rec.tablename);
    raise notice 'DROPPED policy lạ: % trên public.%', rec.policyname, rec.tablename;
  end loop;
end
$do$;

-- ==============================================================================
-- 10. XOÁ HELPER TẠM
-- ==============================================================================
drop function if exists public._vcube_make_policy(text, text, text, text[], text, text);
drop function if exists public._vcube_has_columns(text, text[]);

-- ==============================================================================
-- 11. KIỂM TRA SAU KHI CHẠY
-- ==============================================================================
do $do$
declare
  rec record;
  v_bad int := 0;
begin
  raise notice '──────── KIỂM TRA SAU HARDENING ────────';


  -- Policy còn để lọt: dùng qual/with_check = 'true' trên bảng nhạy cảm
  for rec in
    select tablename, policyname, cmd, coalesce(qual,'') as q, coalesce(with_check,'') as w
      from pg_policies
     where schemaname = 'public'
       and tablename in ('orders','user_profiles','payment_transactions','products','cost_rules')
       and (btrim(coalesce(qual,'')) = 'true' or btrim(coalesce(with_check,'')) = 'true')
       and cmd <> 'INSERT'          -- INSERT WITH CHECK(true) chỉ còn ở nơi được kiểm soát
  loop
    v_bad := v_bad + 1;
    raise warning 'CÒN POLICY HỞ: %.% (cmd=%) — qual=%, check=%',
      rec.tablename, rec.policyname, rec.cmd, rec.q, rec.w;
  end loop;

  if v_bad = 0 then
    raise notice 'OK: không còn policy permissive trên các bảng nhạy cảm.';
  end if;

  raise notice 'Nhắc lại: chạy supabase/scripts/bootstrap_admin.sql để cấp quyền admin,';
  raise notice 'sau đó kiểm chứng bằng: node scripts/verify-rls.mjs';
end
$do$;

commit;





