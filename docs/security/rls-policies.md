# VCUBE Row Level Security (RLS) & Authorization Architecture

> **Security Baseline**: Supabase PostgreSQL 15+  
> **Enforcement Tier**: Database Kernel Layer (PostgreSQL Row Level Security)  
> **Policy Count**: 90 Table Policies + 6 Storage Policies (96 Policies Total) across 31 Target Tables + 1 View  
> **Compliance Target**: Zero Trust, Least Privilege, Vietnam Personal Data Protection Decree 13/2023/NĐ-CP

---

## 1. Core Security Principles & Anti-Pattern Eradication

Earlier prototype migrations suffered from classic Supabase security vulnerabilities that left customer data, commercial orders, and pricing configurations exposed. The VCUBE security baseline was completely overhauled to eradicate four fatal anti-patterns:

```
                          ┌────────────────────────┐
                          │    Client Request      │
                          └───────────┬────────────┘
                                      │
                         [PostgREST / Supabase API]
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [sb_publishable_...]                  [sb_secret_...]
       (VITE Frontend Key)                 (Server-Only Webhooks)
                   │                                     │
         ┌─────────┴─────────┐                           │
         │ PostgreSQL RLS    │                           │
         │ Evaluates Policy  │                           │
         └─────────┬─────────┘                           │
                   │                                     │
         ┌─────────▼─────────┐                           │
         │ public.is_admin() │                           │
         │ checks true role  │                           │
         │ in user_profiles  │                           │
         └─────────┬─────────┘                           │
                   │                                     │
                   ▼                                     ▼
      ┌─────────────────────────┐           ┌─────────────────────────┐
      │ Allowed Rows & Actions  │           │ Complete Admin Bypass   │
      └─────────────────────────┘           └─────────────────────────┘
```

### 1.1 DB-Enforced Roles vs. `user_metadata` Exploitation
- **The Vulnerability**: In default Supabase setups, developers frequently write RLS policies checking `(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'`. Because `user_metadata` is writable by the user through the standard client SDK (`supabase.auth.updateUser({ data: { role: 'admin' } })`), any unauthenticated or standard customer could elevate their own privileges to superadmin with a single HTTP PATCH.
- **The Remedy**: Role verification is strictly anchored in the physical relational table `public.user_profiles.role`. The helper function `public.current_app_role()` queries `public.user_profiles` directly using `auth.uid()` under `SECURITY DEFINER` with a fixed `search_path = public`. The UI role switcher (`switchDemoRole`) only modifies local state and metadata for testing without granting any database permissions.

### 1.2 Elimination of Permissive `FOR ALL USING (true)`
- **The Vulnerability**: Policies like `CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (true);` are open to the entire world. In PostgreSQL, permissive policies are combined with boolean `OR`. If any policy returns `true`, access is granted regardless of how restrictive subsequent policies are.
- **The Remedy**: All administrative policies explicitly specify `TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())`. All legacy permissive policies are dropped upon migration.

### 1.3 Elimination of Hardcoded Administrator Emails
- **The Vulnerability**: Hardcoding administrative emails (e.g. `auth.jwt() ->> 'email' = 'chithanhso10@gmail.com'`) in 40+ policy strings creates static attack vectors, prevents dynamic role delegation, and violates auditability.
- **The Remedy**: Administrative privileges are granted exclusively via `public.user_profiles.role = 'admin'`, provisioned through `supabase/scripts/bootstrap_admin.sql`. Zero hardcoded emails remain in any production migration file.

### 1.4 Fail-Closed Architecture
`public.current_app_role()` is authored in PL/pgSQL and intercepts `undefined_table` exceptions:
```sql
create or replace function public.current_app_role()
returns text language plpgsql stable security definer set search_path = public as $fn$
declare v_role text;
begin
  begin
    select up.role into v_role from public.user_profiles up
     where up.id::text = (select auth.uid())::text limit 1;
  exception
    when undefined_table then return 'anon';
  end;
  return coalesce(v_role, 'anon');
end $fn$;
```
If the user is unauthenticated or the profile table is being migrated, the function safely returns `'anon'`.

---

## 2. Key Hierarchy & Security Boundary

| Key Identifier | Location | Safe for Frontend? | RLS Enforced? | Scope & Responsibilities |
|---|---|:---:|:---:|---|
| **Publishable Key**<br>`VITE_SUPABASE_PUBLISHABLE_KEY`<br>(`sb_publishable_...`) | `.env`<br>Vite Bundle | **YES** | **YES** | Distributed to browsers. Can only perform actions explicitly granted by RLS policies. |
| **Secret / Service-Role Key**<br>`SUPABASE_SECRET_KEY`<br>(`sb_secret_...`) | Server `.env`<br>CI/CD Secrets | **NO** (Server Only) | **NO** (Bypasses RLS) | Must **never** be included in client bundles. Used exclusively by backend servers, webhooks, and migrations. |

---

## 3. High-Level Role Access Matrix

The system governs 5 distinct actors:
1. **Anon (`anon`)**: Unauthenticated public visitors and guest shoppers.
2. **Customer (`authenticated`, `role = 'customer'`)**: Registered retail and B2B buyers.
3. **Designer (`authenticated`, `role = 'designer'`)**: CAD creators and 3D modeling engineers.
4. **Workshop (`authenticated`, `role = 'workshop'`)**: Fabrication partners operating printer fleets.
5. **Admin / QC Lab (`authenticated`, `role = 'admin'` or `'lab'`)**: Platform operators and quality control engineers.

| Table / Entity | Anon (`anon`) | Customer | Designer | Workshop | Admin / QC |
|---|---|---|---|---|---|
| `products` | Read published | Read published | Read published | Read published | Full Access |
| `orders` | Insert (with token) | Read own orders | Read if items ordered | Read/Update assigned | Full Access |
| `order_items` | None | Read own order lines | Read own design royalties | None (prevents margin leak) | Full Access |
| `order_files` | None | Read purchased files | Read own product files | Read assigned order files | Full Access |
| `quotes` | None | Read/Create/Update own | Read/Create/Update own | None | Full Access |
| `payment_transactions` | None | None | None | None | Full Access |
| `user_profiles` | None | Read/Update own | Read/Update own | Read/Update own | Full Access |
| `customer_profiles` | None | Read/Update own | None | None | Full Access |
| `designer_profiles` | Read public | Read public | Read/Update own | Read public | Full Access |
| `workshop_profiles` | Read Verified | Read Verified | Read Verified | Read/Update own | Full Access |
| `workshop_machines` | Read public | Read public | Read public | Full Access to own fleet | Full Access |
| `workshop_materials` | Read public | Read public | Read public | Full Access to own stock | Full Access |
| `workshop_accessories`| Read public | Read public | Read public | Full Access to own stock | Full Access |
| `material_inventory_logs`| None | None | None | Read/Insert own logs | Full Access |
| `workshop_commission_terms`| None | None | None | None (Bilateral secrecy) | Full Access |
| `digital_assets` | None | None | Full Access to own CAD | None | Full Access |
| `cart_items` | None | Full Access to own cart | Full Access to own cart | Full Access to own cart | Read Only |
| `reviews` | Read published | Create/Update own pending | Read own reviews | Read own reviews | Full Access |
| `custom_design_requests`| None | Read/Create/Update own | Read/Update assigned | None | Full Access |
| `warranty_claims` | None | Read/Create own claims | None | None | Full Access |
| `setting_audit` | None | None | None | None | Full Access |
| `pricing_configs` | Read active | Read active | Read active | Read active | Full Access |
| `pricing_global_settings`| Read public | Read public | Read public | Read public | Full Access |
| `cost_rules` | None | None | None | None | Full Access |
| `app_settings` | Read public | Read public | Read public | Read public | Insert/Update |
| Storage: `product-images` | Read public | Read public | Read public | Read public | Full Access |
| Storage: `cad-files` | None | Read purchased CAD | Full Access `digital/<uid>/` | Read assigned CAD | Full Access |

---

## 4. Column-Level Privilege Lockdown Triggers

RLS governs row-level access (which rows a user can see or alter). However, standard SQL `UPDATE` policies allow users to mutate any column in that row unless restricted. VCUBE deploys 3 defensive database triggers to enforce column-level boundaries:

### 4.1 Order Privilege Lockdown (`orders`)
- **Trigger**: `trg_protect_order_privileged_columns`
- **Function**: `fn_protect_order_privileged_columns()`
- **Security Invariant**: When a workshop partner updates an assigned order, they must **only** be able to update production progress indicators:
  - Allowed: `status`, `status_stage_index`, `layer_progress`, `updated_at`.
  - Blocked: `total_amount`, `shipping_fee`, `payment_status`, `payment_method`, `secure_access_token`, `customer_email`, `customer_phone`, `customer_name`, `items`, `assigned_workshop_id`.
  - Violation Result: `RAISE EXCEPTION SQLSTATE '42501' USING MESSAGE = 'VCUBE: Workshop partners may only update status, status_stage_index, layer_progress, and updated_at'`.

### 4.2 Profile Elevation Prevention (`user_profiles`)
- **Trigger**: `trg_protect_profile_privileged_columns`
- **Function**: `fn_protect_profile_privileged_columns()`
- **Security Invariant**: Non-administrators editing their profile (`user_profiles`) are blocked from escalating privileges:
  - Any user attempt to modify `role`, `kyc_status`, or `account_status` raises `SQLSTATE '42501'`.
  - Any attempt to modify `total_spent` or `total_orders` is silently overwritten with `OLD.total_spent` and `OLD.total_orders`.

### 4.3 Workshop Partner Impersonation Prevention (`workshop_profiles`)
- **Trigger**: `trg_protect_workshop_profile_privileged_columns`
- **Function**: `fn_protect_workshop_profile_privileged_columns()`
- **Security Invariant**: Because `current_workshop_partner_id()` grants access to orders based on `workshop_profiles.partner_id`, workshop owners must not be able to change their `partner_id` to intercept another facility's orders.
  - Modifying `partner_id` or `verified_status` raises `SQLSTATE '42501'`.
  - Only administrators or server-side service keys can assign partner codes and verify facilities.

---

## 5. Storage Security & File Protection

VCUBE enforces multi-tenant security across its two storage buckets:

### 5.1 Public Asset Bucket (`product-images`)
- **Public Flag**: `true`
- **Size Limit**: 10 MB
- **Allowed MIME**: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- **Policies**:
  1. `vcube_product_images_public_read`: `SELECT` allowed for `anon` and `authenticated`.
  2. `vcube_product_images_admin_write`: `ALL` allowed only for `authenticated` where `public.is_admin()`.

### 5.2 Private CAD Bucket (`cad-files`)
- **Public Flag**: `false` (Direct HTTP CDN access returns 403)
- **Size Limit**: 150 MB
- **Allowed MIME**: `application/octet-stream`, `model/stl`, `model/step`, `model/3mf`, `model/obj`, `application/zip`
- **Path Schemes**:
  - Designer Assets: `digital/<auth.uid()>/<asset_name>.<ext>`
  - Order Attachments: `orders/<order_id>/<file_name>.<ext>`
- **Policies**:
  1. `vcube_cad_files_admin_all`: Admin full control across all buckets.
  2. `vcube_cad_files_digital_owner_rw`: Designers have full read/write/delete access **only** inside their scoped folder:
     ```sql
     (storage.foldername(name))[1] = 'digital' 
     AND (storage.foldername(name))[2] = (select auth.uid())::text
     ```
  3. `vcube_cad_files_order_files_read`: Authenticated buyers can download files associated with their orders:
     ```sql
     EXISTS (
       SELECT 1 FROM public.order_files of
       JOIN public.orders o ON o.id = of.order_id
       WHERE of.storage_path = storage.objects.name
         AND (o.user_id::text = (select auth.uid())::text OR public.is_admin_or_lab())
     )
     ```
  4. `vcube_cad_files_buyer_read`: Backwards-compatible heuristic verifying if the file name is referenced in `orders.items` JSON.

---

## 6. Complete Inventory of All 90 Table RLS Policies

Below is the exhaustive catalog of all 90 table-level policies defined in `supabase/migrations/20261010_harden_rls.sql` and verified by `scripts/lint-rls-migration.mjs`.

### 6.1 Products (2 Policies)
| Policy Name | Cmd | Target Roles | Security Rule (`USING` / `WITH CHECK`) |
|---|:---:|---|---|
| `vcube_products_public_read` | `SELECT` | `anon`, `authenticated` | `USING (status in ('published','Published'))` |
| `vcube_products_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.2 Orders (5 Policies)
| Policy Name | Cmd | Target Roles | Security Rule (`USING` / `WITH CHECK`) |
|---|:---:|---|---|
| `vcube_orders_owner_read` | `SELECT` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR customer_email = (select auth.jwt() ->> 'email'))` |
| `vcube_orders_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |
| `vcube_orders_guest_insert` | `INSERT` | `anon`, `authenticated` | `WITH CHECK (secure_access_token is not null AND length(btrim(secure_access_token)) >= 12 AND coalesce(btrim(customer_email), '') <> '' AND items is not null AND (user_id is null OR user_id::text = (select auth.uid())::text))` |
| `vcube_orders_workshop_read` | `SELECT` | `authenticated` | `USING (assigned_workshop_id is not null AND assigned_workshop_id = public.current_workshop_partner_id())` |
| `vcube_orders_workshop_update_progress` | `UPDATE` | `authenticated` | `USING (assigned_workshop_id is not null AND assigned_workshop_id = public.current_workshop_partner_id()) WITH CHECK (assigned_workshop_id is not null AND assigned_workshop_id = public.current_workshop_partner_id())` |

### 6.3 User Profiles (3 Policies)
| Policy Name | Cmd | Target Roles | Security Rule (`USING` / `WITH CHECK`) |
|---|:---:|---|---|
| `vcube_profiles_self_read` | `SELECT` | `authenticated` | `USING (id::text = (select auth.uid())::text)` |
| `vcube_profiles_self_update` | `UPDATE` | `authenticated` | `USING (id::text = (select auth.uid())::text) WITH CHECK (id::text = (select auth.uid())::text)` |
| `vcube_profiles_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.4 Catalog Public Data (22 Policies: 11 Tables $\times$ 2)
Applies across: `materials`, `printer_fleet`, `accessories`, `workshop_partners`, `site_content`, `pricing_configs`, `workshop_machines`, `workshop_materials`, `designer_profiles`, `pricing_global_settings`, `workshop_accessories`.
| Policy Name Pattern | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_{table}_public_read` | `SELECT` | `anon`, `authenticated` | `USING (true)` |
| `vcube_{table}_admin_write` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.5 Workshop Profiles (5 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_workshop_profiles_public_read` | `SELECT` | `anon`, `authenticated` | `USING (verified_status = 'Verified')` |
| `vcube_workshop_profiles_owner_read` | `SELECT` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_workshop_profiles_owner_update` | `UPDATE` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin()) WITH CHECK (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_workshop_profiles_owner_insert` | `INSERT` | `authenticated` | `WITH CHECK ((user_id::text = (select auth.uid())::text OR public.is_admin()) AND partner_id is null AND (verified_status is null OR verified_status = 'Pending'))` |
| `vcube_workshop_profiles_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.6 Workshop Fleets, Materials & Accessories Ownership (3 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_workshop_machines_owner_all` | `ALL` | `authenticated` | `USING (public.is_admin() OR EXISTS (select 1 from public.workshop_profiles wp where wp.id = workshop_machines.workshop_id and wp.user_id::text = (select auth.uid())::text))` |
| `vcube_workshop_materials_owner_all` | `ALL` | `authenticated` | `USING (public.is_admin() OR EXISTS (select 1 from public.workshop_profiles wp where wp.id = workshop_materials.workshop_id and wp.user_id::text = (select auth.uid())::text))` |
| `vcube_workshop_accessories_owner_all` | `ALL` | `authenticated` | `USING (public.is_admin() OR EXISTS (select 1 from public.workshop_profiles wp where wp.id = workshop_accessories.workshop_id and wp.user_id::text = (select auth.uid())::text))` |

### 6.7 Role-Specific Profiles (4 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_designer_profiles_owner_all` | `ALL` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_designer_profiles_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin())` |
| `vcube_customer_profiles_owner_all` | `ALL` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_customer_profiles_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin())` |

### 6.8 Inventory Logs & Financial Rules (5 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_inventory_logs_owner_read` | `SELECT` | `authenticated` | `USING (public.is_admin() OR EXISTS (select 1 from public.workshop_materials wm join public.workshop_profiles wp on wp.id = wm.workshop_id where wm.id = material_inventory_logs.material_id and wp.user_id::text = (select auth.uid())::text))` |
| `vcube_inventory_logs_owner_insert` | `INSERT` | `authenticated` | `WITH CHECK (public.is_admin() OR EXISTS (select 1 from public.workshop_materials wm join public.workshop_profiles wp on wp.id = wm.workshop_id where wm.id = material_inventory_logs.material_id and wp.user_id::text = (select auth.uid())::text))` |
| `vcube_inventory_logs_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin())` |
| `vcube_payment_transactions_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin())` |
| `vcube_cost_rules_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin())` |

### 6.9 Compatibility Pricing View / Fallback Table (2 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_pricing_config_public_read` | `SELECT` | `anon`, `authenticated` | `USING (true)` |
| `vcube_pricing_config_admin_write` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.10 Application Settings & Audit (5 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_app_settings_public_read` | `SELECT` | `anon`, `authenticated` | `USING (true)` |
| `vcube_app_settings_admin_insert` | `INSERT` | `authenticated` | `WITH CHECK (public.is_admin())` |
| `vcube_app_settings_admin_update` | `UPDATE` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |
| `vcube_setting_audit_admin_read` | `SELECT` | `authenticated` | `USING (public.is_admin())` |
| `vcube_setting_audit_admin_insert` | `INSERT` | `authenticated` | `WITH CHECK (public.is_admin())` |

### 6.11 Warranty Claims & Order Files (8 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_warranty_claims_customer_read` | `SELECT` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin_or_lab())` |
| `vcube_warranty_claims_customer_insert` | `INSERT` | `authenticated` | `WITH CHECK (user_id::text = (select auth.uid())::text)` |
| `vcube_warranty_claims_staff_read` | `SELECT` | `authenticated` | `USING (public.is_admin_or_lab())` |
| `vcube_warranty_claims_staff_update` | `UPDATE` | `authenticated` | `USING (public.is_admin_or_lab()) WITH CHECK (public.is_admin_or_lab())` |
| `vcube_order_files_buyer_read` | `SELECT` | `authenticated` | `USING (public.is_admin_or_lab() OR EXISTS (select 1 from public.orders o where o.id = order_files.order_id and o.user_id::text = (select auth.uid())::text))` |
| `vcube_order_files_staff_insert` | `INSERT` | `authenticated` | `WITH CHECK (public.is_admin_or_lab() OR EXISTS (select 1 from public.orders o where o.id = order_files.order_id and o.user_id::text = (select auth.uid())::text))` |
| `vcube_order_files_staff_update` | `UPDATE` | `authenticated` | `USING (public.is_admin_or_lab()) WITH CHECK (public.is_admin_or_lab())` |
| `vcube_order_files_admin_delete` | `DELETE` | `authenticated` | `USING (public.is_admin())` |

### 6.12 Customer Reviews (6 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_reviews_public_read` | `SELECT` | `anon`, `authenticated` | `USING (status = 'published')` |
| `vcube_reviews_author_read` | `SELECT` | `authenticated` | `USING (author_id::text = (select auth.uid())::text)` |
| `vcube_reviews_author_insert` | `INSERT` | `authenticated` | `WITH CHECK (author_id::text = (select auth.uid())::text AND status = 'pending')` |
| `vcube_reviews_author_update` | `UPDATE` | `authenticated` | `USING (author_id::text = (select auth.uid())::text AND status = 'pending') WITH CHECK (author_id::text = (select auth.uid())::text AND status = 'pending')` |
| `vcube_reviews_author_delete` | `DELETE` | `authenticated` | `USING (author_id::text = (select auth.uid())::text AND status = 'pending')` |
| `vcube_reviews_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.13 Digital Assets & Shopping Cart (4 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_digital_assets_designer_all` | `ALL` | `authenticated` | `USING (designer_id::text = (select auth.uid())::text OR public.is_admin()) WITH CHECK (designer_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_digital_assets_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |
| `vcube_cart_items_owner_all` | `ALL` | `authenticated` | `USING (user_id::text = (select auth.uid())::text) WITH CHECK (user_id::text = (select auth.uid())::text)` |
| `vcube_cart_items_admin_read` | `SELECT` | `authenticated` | `USING (public.is_admin())` |

### 6.14 Instant Quotes & Order Items Accounting (6 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_quotes_owner_read` | `SELECT` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_quotes_owner_insert` | `INSERT` | `authenticated` | `WITH CHECK (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_quotes_owner_update` | `UPDATE` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin()) WITH CHECK (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_quotes_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |
| `vcube_order_items_owner_read` | `SELECT` | `authenticated` | `USING (public.is_admin() OR EXISTS (select 1 from public.orders o where o.id = order_items.order_id and o.user_id::text = (select auth.uid())::text))` |
| `vcube_order_items_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.15 Workshop Commissions & KYC Verification (4 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_workshop_commission_terms_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |
| `vcube_kyc_owner_read` | `SELECT` | `authenticated` | `USING (user_id::text = (select auth.uid())::text OR public.is_admin())` |
| `vcube_kyc_owner_insert` | `INSERT` | `authenticated` | `WITH CHECK (user_id::text = (select auth.uid())::text AND (status is null OR status = 'pending'))` |
| `vcube_kyc_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

### 6.16 Custom Design Requests Studio (6 Policies)
| Policy Name | Cmd | Target Roles | Security Rule |
|---|:---:|---|---|
| `vcube_custom_design_requests_customer_select` | `SELECT` | `authenticated` | `USING (customer_id::text = (select auth.uid())::text)` |
| `vcube_custom_design_requests_customer_insert` | `INSERT` | `authenticated` | `WITH CHECK (customer_id::text = (select auth.uid())::text)` |
| `vcube_custom_design_requests_customer_update` | `UPDATE` | `authenticated` | `USING (customer_id::text = (select auth.uid())::text) WITH CHECK (customer_id::text = (select auth.uid())::text)` |
| `vcube_custom_design_requests_designer_select` | `SELECT` | `authenticated` | `USING (designer_id::text = (select auth.uid())::text)` |
| `vcube_custom_design_requests_designer_update` | `UPDATE` | `authenticated` | `USING (designer_id::text = (select auth.uid())::text) WITH CHECK (designer_id::text = (select auth.uid())::text)` |
| `vcube_custom_design_requests_admin_all` | `ALL` | `authenticated` | `USING (public.is_admin()) WITH CHECK (public.is_admin())` |

---

## 7. RLS Automated Testing & Quality Gates

VCUBE incorporates a 4-tier automated test harness to verify security assertions prior to any production deployment:

### 1. Static Source Code Linter (`scripts/lint-rls-sources.mjs`)
Scans all migration files in `supabase/migrations/` and `supabase/legacy/` for anti-patterns:
- Flag R1: Permissive `USING (true)` or `WITH CHECK (true)` on non-catalog tables.
- Flag R2: Direct `user_metadata` references inside SQL policies.
- Flag R3: Hardcoded email addresses inside policy expressions.
- Flag R4: Missing `public.is_admin()` helper calls.

### 2. Migration Integrity Linter (`scripts/lint-rls-migration.mjs`)
Performs static analysis on `supabase/migrations/20261010_harden_rls.sql`:
- Verifies dollar-quote balancing (`$do$`, `$fn$`, `$pol$`, `$p$`).
- Resolves all loops (`foreach t in array v_catalog_read`) to guarantee 100% parity between generated policies and the `v_keep` cleanup allowlist.
- Verifies rule **R8**: Ensures dynamic `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` checks `relkind` to avoid fatal PostgreSQL error `42809` on views.
- Verifies rule **R9**: Ensures no policy expression contains references to temporary helper functions (`_vcube_*`) that are dropped at migration completion.

### 3. Dual-Key Production Verifier (`scripts/verify-rls.mjs`)
Connects to Supabase with both the anon publishable key and the secret key:
- Probes every sensitive table (`orders`, `user_profiles`, `payment_transactions`, `material_inventory_logs`, `order_items`, `cost_rules`, `workshop_commission_terms`).
- Uses the secret key to confirm the table physically exists with records, and asserts that the anon key returns exactly **0 rows**.
- Asserts that public tables (`products`, `materials`, `printer_fleet`, `pricing_configs`) return positive records.
- Tests no-op update mutations with `--writes` to ensure anonymous write attempts fail with `42501`.

### 4. Database Inspector (`scripts/inspect-db.mjs`)
Compares row counts between publishable and secret keys across all tables to catch unmigrated tables or broken postgrest schema caches.

```bash
# Execute static security gates:
node scripts/lint-rls-sources.mjs
node scripts/lint-rls-migration.mjs

# Execute live database verification:
node scripts/inspect-db.mjs
node scripts/verify-rls.mjs --writes
```
