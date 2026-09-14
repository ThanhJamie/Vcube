# VCUBE Database Seeds, Migrations & Bootstrap Guide

> **Target Platform**: Supabase PostgreSQL 15+  
> **Active Migration Chain**: 3 Sequenced Files (`supabase/migrations/`)  
> **Consolidated Executable**: `supabase/scripts/apply_all_manual.sql`  
> **Admin Provisioning**: `supabase/scripts/bootstrap_admin.sql`  
> **Catalog Testing & Sync**: `scripts/test-catalog-sync.ts` & Admin Storefront DB Sync

---

## 1. Ordered Migration Sequence

To ensure transactional atomicity and prevent circular dependency locks between schema tables and security policies, migrations must run in the exact sequential order defined below. Each file is an independent transaction wrapped in `BEGIN; ... COMMIT;`.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. supabase/migrations/20260900_rls_helpers.sql             │
│    Creates public.current_app_role() & public.is_admin()    │
│    Fail-closed: Returns 'anon' when tables do not exist     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. supabase/migrations/20260901_baseline_schema.sql         │
│    31 Relational Tables + 1 View (pricing_config)           │
│    48 Indexes (including 1 partial unique, 1 GIN index)     │
│    7 Functions, 6 Triggers, 2 Storage Buckets, Realtime     │
│    Minimal production baseline seeds                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. supabase/migrations/20261010_harden_rls.sql              │
│    Purges 73+ legacy / rogue policies                       │
│    Enables RLS on all 31 tables                             │
│    Establishes 90 Table Policies + 6 Storage Policies       │
│    Attaches 3 Column Privilege Lockdown Triggers            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. supabase/scripts/bootstrap_admin.sql                     │
│    Promotes authenticated user to role='admin' in           │
│    public.user_profiles.role                                │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 1: RLS Security Helpers (`20260900_rls_helpers.sql`)
- **Execution Priority**: First (`20260900`)
- **Role**: Establishes `public.current_app_role()` and `public.is_admin()` prior to table creation.
- **Fail-Closed Resilience**: Written in PL/pgSQL catching `undefined_table`. Because `public.user_profiles` does not exist yet when this file runs, the function catches the exception and returns `'anon'`. This guarantees that no user is accidentally treated as admin until the entire database schema and profile rows are created.
- **Grants**:
  ```sql
  grant execute on function public.current_app_role() to anon, authenticated;
  grant execute on function public.is_admin() to anon, authenticated;
  ```

---

### Phase 2: Baseline Database Schema & Seeds (`20260901_baseline_schema.sql`)
- **Execution Priority**: Second (`20260901`)
- **Key Deliverables**:
  1. **31 Core Tables**: Creates tables across Catalog, Orders, Profiles, Workshops, Custom Requests, and Audit systems.
  2. **Compatibility View**: Creates `public.pricing_config` with `(security_invoker = true)` to maintain backward compatibility with older UI client builds.
  3. **48 High-Performance Indexes**:
     - Status and timestamp ordering composites: `idx_products_status_created`, `idx_orders_created`, `idx_reviews_target`.
     - JSONB search: `idx_products_tags` using GIN.
     - Single-pending KYC guarantee: `uq_kyc_records_one_pending` (partial unique index).
  4. **Database Automation Triggers**:
     - `trg_create_profile_for_new_user`: Auto-creates a `customer` profile whenever a user signs up via `auth.users`.
     - `trg_protect_profile_privileged_columns`: Blocks self-escalation of roles.
     - `trg_sync_material_on_inventory_log`: Automatically updates filament stock upon ledger insertions.
     - `trg_sync_product_review_stats`: Automatically recalculates rating averages and counts when reviews are published.
     - `trg_touch_updated_at`: Recursively binds to all 21 tables bearing `updated_at`.
  5. **Storage Bucket Provisioning**:
     - `product-images`: Public bucket (10 MB limit) for UI images.
     - `cad-files`: Private bucket (150 MB limit) for STL, STEP, 3MF, and OBJ assets.
  6. **Supabase Realtime**: Registers `products`, `materials`, `printer_fleet`, `site_content`, `pricing_configs`, `orders`, `accessories`, `app_settings`, `pricing_global_settings`, `order_files`, and `custom_design_requests` into `supabase_realtime`.
  7. **Production Seed Catalog**: Populates initial standard materials, base FDM printer fleet, and default pricing formulas.

---

### Phase 3: RLS Hardening & Privilege Lockdown (`20261010_harden_rls.sql`)
- **Execution Priority**: Third (`20261010`)
- **Key Deliverables**:
  1. **Legacy Policy Sweep**: Identifies and drops over 73 historically recorded policy names to avoid permissive policy remnants.
  2. **RLS Activation**: Enables Row Level Security on all 31 tables while safely skipping views (`relkind IN ('r', 'p')`).
  3. **Establishment of 90 Table Policies**: Exhaustive role-based policies for `anon`, `authenticated`, `customer`, `designer`, `workshop`, and `admin`.
  4. **Establishment of 6 Storage Policies**: Locks down `storage.objects` for both public images and scoped designer/buyer private CAD files.
  5. **Column Lockdown Triggers**:
     - `trg_protect_order_privileged_columns`: Restricts workshop partners from modifying monetary/customer order fields.
     - `trg_protect_workshop_profile_privileged_columns`: Restricts workshop owners from modifying their `partner_id` or `verified_status`.
  6. **Rogue Policy Janitor**: Scans `pg_policies` and drops any policy not present in the strict `v_keep` allowlist.

---

## 2. Deprecated Migrations Notice (`supabase/legacy/`)

The 6 SQL files archived under `supabase/legacy/` represent the original development sequence:
- `20260904_complete_vcube_schema_and_seeds.sql`
- `20260904_create_products_and_storage.sql`
- `20260904_secure_rls_and_pricing.sql`
- `20260904_sync_complete_schema.sql`
- `20260905_master_production_schema.sql`
- `20260905_role_profiles_and_pricing_schema.sql`

> **⚠️ MANDATORY NOTICE: DO NOT EXECUTE LEGACY MIGRATIONS.**  
> These files are retained purely for historical reference (e.g. comparing legacy mock data). Running them on a fresh database will abort the transaction due to 4 fatal structural conflicts.

### Why Legacy Migrations Were Superseded

| # | Fatal Defect | Evidence & Error Code | Architectural Consequence |
|---|---|---|---|
| **1** | Missing Foreign Key Column in `orders` | `20260904_complete_...sql:55-72` vs `20260904_secure_rls_and_pricing.sql:36` (PostgreSQL Error `42703`: `column "user_id" does not exist`) | `orders` was initially defined without `user_id`, causing subsequent index and policy statements to crash immediately. |
| **2** | Unfulfillable NOT NULL Constraints | `20260904_secure_rls_and_pricing.sql:14,15,17,19,29` | Scripts required non-existent columns to be `NOT NULL` before backfill operations occurred. |
| **3** | Primary Key Data Type Mismatch | `20260904_complete_...sql:86` (`id TEXT`) vs `20260905_master_...sql:394` (`id UUID`) (PostgreSQL Error `42883`) | `user_profiles.id` conflicted with `auth.users(id)` foreign keys due to incompatible casting. |
| **4** | Entity Relkind Collision | `20260904_complete_...sql:157` (`CREATE TABLE pricing_config`) vs `20260905_master_...sql:473` (`CREATE VIEW pricing_config`) (PostgreSQL Error `42809`) | `pricing_config` was defined both as a table and as a view, crashing the schema cache. |

In addition to structural crashes, the legacy files contained severe security anti-patterns: `FOR ALL USING (true)`, `auth.jwt() -> 'user_metadata'`, and 43 instances of hardcoded admin email addresses. All of these have been resolved in the current 3-file migration sequence.

---

## 3. Administrator Bootstrap Procedure

After executing `20261010_harden_rls.sql`, **no one has administrative access by default**. Administrative privileges can no longer be obtained by writing to `user_metadata` or using a specific email. Admin privileges must be explicitly granted in the database.

### Bootstrap Execution Steps

1. Open `supabase/scripts/bootstrap_admin.sql`.
2. Update the `v_email` variable to match your authenticated user email:
   ```sql
   do $do$
   declare
     v_email text := 'admin@yourdomain.com'; -- Replace with your registered email
     v_uid   uuid;
   ...
   ```
3. Execute the script inside the **Supabase SQL Editor**.
4. The script performs the following safe operations:
   - Validates that `v_email` is not set to the sentinel string `'__CHANGE_ME__'`.
   - Locates the corresponding user record in `auth.users` where `lower(email) = lower(v_email)`.
   - Upserts a record into `public.user_profiles` setting `role = 'admin'`:
     ```sql
     insert into public.user_profiles (id, email, role, display_name)
     values (v_uid, lower(v_email), 'admin', split_part(v_email, '@', 1))
     on conflict (id) do update set role = 'admin';
     ```
5. **Verification**:
   ```sql
   select id, email, role, kyc_status, created_at 
     from public.user_profiles 
    where role = 'admin';
   ```

---

## 4. Single-Script Execution (`apply_all_manual.sql`)

For setting up a fresh Supabase environment from scratch, run the consolidated script:
`supabase/scripts/apply_all_manual.sql`

This file is automatically compiled by running:
```bash
node scripts/gen-apply-all.mjs
```
It bundles `20260900_rls_helpers.sql`, `20260901_baseline_schema.sql`, `20261010_harden_rls.sql`, and `bootstrap_admin.sql` into a single, idempotent file with safety checks for schema cache reloading.

---

## 5. Seed Catalog & Data Synchronization

### 5.1 Baseline Seeds in `20260901_baseline_schema.sql`
The baseline migration injects standard manufacturing constants:
- **Materials**: Standard PLA, PETG, TPU 95A, ABS, Carbon Fiber Nylon (`PA12-CF`), and High-Temp Resin with density, thermal resistance, and base procurement costs.
- **Printer Fleet**: Industrial and desktop FDM hardware profiles (Bambu Lab X1-Carbon, Creality K1 Max, Prusa MK4) with speed, envelope, and hourly depreciation rates.
- **Pricing Formulas**: Base configuration for the multidimensional pricing engine ($V \cdot \rho \cdot \text{rate} + T \cdot \text{machine} + \text{labor} + \text{overhead}$).
- **Storefront Defaults**: Hero banners, physical workshop addresses across Hanoi, Da Nang, and Ho Chi Minh City.

### 5.2 Automated Catalog Synchronization Tests (`scripts/test-catalog-sync.ts`)
Run the integration test suite to verify that catalog state transitions and RLS policies behave correctly:
```bash
npx tsx scripts/test-catalog-sync.ts
```

The test verifies 5 core behaviors:
1. **Public Visibility & RLS Filtering**: Confirms that non-admin clients only receive products where `status = 'published'` (draft and archived items are omitted).
2. **Admin Full Visibility**: Confirms that administrative users can view draft, published, and archived items.
3. **Status Transitions & Live Sync**: Simulates state changes (`draft` $\to$ `published` $\to$ `archived`) and asserts immediate UI catalog response.
4. **Optimistic UI Rollback**: Simulates a network failure or RLS policy rejection during a write operation, asserting that client-side state correctly rolls back to the previous snapshot.
5. **CAD Specification Integrity**: Confirms that mechanical and IoT CAD products possess watertight dimensional specifications and non-zero digital file pricing.

### 5.3 Live Admin Database Synchronization
Administrators can synchronize mock catalog data and local adjustments into live Supabase tables directly from the administrative portal:
1. Navigate to `/admin` in the browser.
2. Under the administrative toolbar, click **"Đồng Bộ DB"** (Database Sync).
3. The platform invokes `adminStorefrontService.syncToDatabase()`:
   - Performs upserts to `public.products`, `public.materials`, `public.printer_fleet`, `public.site_content`, and `public.app_settings`.
   - Records an entry in `public.setting_audit` documenting the synchronization event.
   - Refreshes local Zustand stores (`useAuthStore`, `useCartStore`) with live database records.
