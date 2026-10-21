<!-- doc-meta: status=active; verified=2026-10-21; owner=thanh -->
# VCUBE Database Seeds, Migrations & Bootstrap Guide

> **Target Platform**: Supabase PostgreSQL 15+  
> **Active Migration Chain**: **12 files** = 3 core (`20260900`, `20260901`, `20261010`) + 9 forward (`20261011*`–`20261013*`; 8 file nằm trong bundle apply + 1 file **H-gated** `20261013100000_drop_designer_bank_columns.sql`)  
> **Consolidated Executable**: `supabase/scripts/apply_all_manual.sql`  
> **Admin Provisioning**: `supabase/scripts/bootstrap_admin.sql`  
> **Catalog Testing**: `scripts/test-catalog-sync.ts` (offline mock)  
> **Demo/Sample Rows**: `scripts/seed-sample-data.mjs` (dry-run · `--apply` · `--remove`)

---

## 1. Ordered Migration Sequence

To ensure transactional atomicity and prevent circular dependency locks between schema tables and security policies, migrations must run in the exact sequential order defined below. The baseline and hardening files are each wrapped in `BEGIN; ... COMMIT;`; `20260900_rls_helpers.sql` is a plain function-definition script and `bootstrap_admin.sql` is a `DO` block (neither opens an explicit transaction). Steps 1–3 are the **core chain**; step 4 covers the **W2 forward migrations** and step 5 is the admin bootstrap.

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
│    49 Indexes (48 + 1 partial unique; 2 GIN indexes)        │
│    7 Functions, 5 Triggers (25 instances), 2 Buckets        │
│    Minimal production baseline seeds                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. supabase/migrations/20261010_harden_rls.sql              │
│    Purges 73+ legacy / rogue policies                       │
│    Bật RLS trên 32 target (31 bảng baseline + view         │
│    pricing_config bị skip); bảng thứ 32 designer_payout_info│
│    tạo ở migration #10                                      │
│    88 policy bảng hiệu lực từ allowlist 90 tên (2 policy    │
│    pricing_config bị skip vì là VIEW)                       │
│    + 7 Storage Policies                                     │
│    Refreshes 4 privilege/automation triggers (re-creates    │
│    profile triggers; adds order + workshop lockdowns)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. supabase/migrations/20261011* + 20261012* + 20261013*    │
│    W2 forward migrations (apply in filename order):         │
│    SEC-01 payout hotfix, designer self-signup + column      │
│    guard, SEC-02 open-requests view/RPC, CHECK constraints, │
│    orders realtime broadcast, designer_payout_info table,   │
│    cad-files storage scheme.                                │
│    ⚠ 20261013100000 (drop bank columns) is H-GATED: apply   │
│    only after phase 1 + client deploy + verification.       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. supabase/scripts/bootstrap_admin.sql                     │
│    Promotes authenticated user to role='admin' in           │
│    public.user_profiles.role                                │
└─────────────────────────────────────────────────────────────┘
```

### W2 Forward Migrations (apply after the core chain)

| Order | File (`supabase/migrations/`) | Role | Rollback (`supabase/rollback/`) |
|---|---|---|---|
| 4 | `20261011090000_sec01_designer_payout_hotfix.sql` | SEC-01 / T0A-3: revoke table `SELECT` on `designer_profiles`, grant safe columns + 2 payout RPCs | `20261011090000_down.sql` |
| 5 | `20261011100000_signup_role_designer.sql` | T58: designer self-signup through a closed guard (never grants `admin`) | `20261011100000_down.sql` |
| 6 | `20261011110000_designer_profile_column_guard.sql` | SEC-02: trigger blocking designers from editing privileged columns | `20261011110000_down.sql` |
| 7 | `20261012090000_sec02_open_requests.sql` | SEC-02 / T21: `open_design_requests` view + atomic `claim_design_request` RPC | `20261012090000_down.sql` |
| 8 | `20261012100000_check_constraints.sql` | T22b: enum-like `CHECK`s (`NOT VALID` → audit → `VALIDATE`) | `20261012100000_down.sql` |
| 9 | `20261012130000_orders_broadcast.sql` | T35-mig: private `orders:admin` realtime broadcast (`realtime.send`, payload `{id,status}`) | `20261012130000_down.sql` |
| 10 | `20261013090000_sec01_payout_table.sql` | SEC-01 / T20 phase 1: `designer_payout_info` table + `upsert_my_payout_info` RPC | `20261013090000_down.sql` |
| 11 | `20261013100000_drop_designer_bank_columns.sql` | SEC-01 / T20 phase 2 — **H-GATED, not in the bundle**: apply only after phase 1 + client deploy + verification | `20261013100000_down.sql` |
| 12 | `20261013110000_storage_scheme.sql` | T25 / D3: owner-scoped `cad/<uid>/<uuid>/<file>` policy for the `cad-files` bucket | `20261013110000_down.sql` |

The consolidated `supabase/scripts/apply_all_manual.sql` is regenerated with `node scripts/gen-apply-all.mjs`; it currently bundles the 3 core files + **8** forward migrations (`20261011*`–`20261013*`, trừ file H-gated) + `bootstrap_admin.sql`. The only migration **not** bundled is the H-gated `20261013100000_drop_designer_bank_columns.sql` — apply it separately under the §1.4 protocol of `docs/tasks/DRIFT-TASKS.md`, and log each apply in `docs/security/rls-runbook.md` §11. Ready-to-paste bundles live in `docs/runbooks/hotfix-2026-09-24.sql` and `docs/runbooks/w2b-2026-09-24.sql`.

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
  1. **31 Core Tables** (baseline; cộng `designer_payout_info` ở migration #10 ⇒ **32 bảng** toàn chuỗi): Creates tables across Catalog, Orders, Profiles, Workshops, Custom Requests, and Audit systems.
  2. **Compatibility View**: Creates `public.pricing_config` with `(security_invoker = true)` to maintain backward compatibility with older UI client builds.
  3. **49 High-Performance Indexes**:
     - Status and timestamp ordering composites: `idx_products_status_created`, `idx_orders_created`, `idx_reviews_target`.
     - JSONB search (2 GIN): `idx_products_tags` on `(tags)` and `idx_products_fts` on the full-text vector.
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
  7. **Minimal Baseline Rows (not a product seed)**: Inserts exactly one singleton row into `site_content` (`id = 'default'`), `pricing_global_settings` (`id = 'global'`), and `app_settings` (`id = 'settings'`, `tax_code` NULL). **No** products, materials, printer fleet, or pricing formulas are seeded here; disposable demo rows come from `scripts/seed-sample-data.mjs`.

---

### Phase 3: RLS Hardening & Privilege Lockdown (`20261010_harden_rls.sql`)
- **Execution Priority**: Third (`20261010`)
- **Key Deliverables**:
  1. **Legacy Policy Sweep**: Identifies and drops over 73 historically recorded policy names to avoid permissive policy remnants.
  2. **RLS Activation**: Enables Row Level Security on every target **table** (32 relations trong allowlist: 31 bảng baseline + view `pricing_config` bị skip; `designer_payout_info` bật RLS trong migration #10) while safely skipping views (`relkind IN ('r', 'p')`).
  3. **Establishment of 88 effective table policies**: `v_keep` allowlist names **90** policies, but the 2 `pricing_config` policies are only created when `pricing_config` is a table; because it is a view here, they are skipped. Sau các migration sau (`20261011*`–`20261013*`) có thêm **4** policy cho `designer_payout_info` ⇒ toàn chuỗi 12 file có **92 policy bảng hiệu lực** (xem `AGENTS.md` + `docs/security/rls-policies.md`).
  4. **Establishment of 7 Storage Policies** (allowlist `v_ok` 7 tên; `vcube_cad_files_cad_owner_rw` được tái tạo với guard path ở migration #12): locks down `storage.objects` for both public images and scoped designer/buyer private CAD files.
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
| **1** | Missing Foreign Key Column in `orders` | `orders` declaration in `20260904_complete_vcube_schema_and_seeds.sql` vs the `CREATE INDEX … ON public.orders(user_id)` statement in `20260904_secure_rls_and_pricing.sql` (PostgreSQL Error `42703`: `column "user_id" does not exist`) | `orders` was initially defined without `user_id`, causing subsequent index and policy statements to crash immediately. |
| **2** | Unfulfillable NOT NULL Constraints | `ALTER COLUMN … SET NOT NULL` statements for `user_id`, `customer_email`, `customer_name`, `total_amount`, `secure_access_token` in `20260904_secure_rls_and_pricing.sql` | Scripts required non-existent columns to be `NOT NULL` before backfill operations occurred. |
| **3** | Primary Key Data Type Mismatch | `id TEXT PRIMARY KEY` in `20260904_complete_vcube_schema_and_seeds.sql` vs `id UUID …` in `20260905_master_production_schema.sql` (PostgreSQL Error `42883`) | `user_profiles.id` conflicted with `auth.users(id)` foreign keys due to incompatible casting. |
| **4** | Entity Relkind Collision | `CREATE TABLE pricing_config` in `20260904_complete_vcube_schema_and_seeds.sql` vs `CREATE OR REPLACE VIEW public.pricing_config` in `20260905_master_production_schema.sql` (PostgreSQL Error `42809`) | `pricing_config` was defined both as a table and as a view, crashing the schema cache. |

In addition to structural crashes, the legacy files contained severe security anti-patterns: `FOR ALL USING (true)`, `auth.jwt() -> 'user_metadata'`, and 43 instances of hardcoded admin email addresses. All of these have been resolved in the current core migration sequence plus the W2 forward migrations (§1).

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
It bundles the 3 core files (`20260900_rls_helpers.sql`, `20260901_baseline_schema.sql`, `20261010_harden_rls.sql`), the **8 non-gated** forward migrations (`20261011*`–`20261013*`; tổng 12 file SQL, trừ `20261013100000` H-gated), and `bootstrap_admin.sql` into a single, idempotent file with safety checks for schema cache reloading. The H-gated `20261013100000_drop_designer_bank_columns.sql` is deliberately **not** bundled — apply it separately (see §1).

---

## 5. Seed Catalog & Data Synchronization

### 5.1 Baseline Rows in `20260901_baseline_schema.sql`
The baseline seeds only three singleton rows and nothing else:
- **`site_content`** (`id = 'default'`) — created with DDL defaults (empty strings / `false`); no hero copy or workshop addresses are populated.
- **`pricing_global_settings`** (`id = 'global'`) — created with `currency = 'VND'`; `electricity_rate_vnd`, `labor_hourly_rate_vnd`, `vat_percent`, `marketplace_fee_percent`, `marketplace_fixed_fee_vnd`, and `default_workshop_commission_percent` are left `NULL` ("not configured"). The migration additionally normalises any legacy `2850`/`65000`/`8` defaults back to `NULL`.
- **`app_settings`** (`id = 'settings'`, `tax_code = NULL`, `settings = '{}'`) — deliberately empty until an admin configures it.

There are **no** seeded products, materials, printer fleet, pricing formulas, reviews, or workshop partners. Demo/UI-testing rows are produced separately by `scripts/seed-sample-data.mjs` (dry-run by default; `--apply` to write, `--remove` to undo).

### 5.2 Automated Catalog Synchronization Tests (`scripts/test-catalog-sync.ts`)
Run the integration test suite to verify the catalog visibility/transition logic:
```bash
npx tsx scripts/test-catalog-sync.ts
```

This suite runs entirely in memory against `src/data/mockData.ts` and **simulates** the RLS/visibility rules — it does not connect to Supabase, so it does not exercise the real policies (use `scripts/verify-rls.mjs` or `scripts/inspect-db.mjs` for that). It verifies 5 core behaviors:
1. **Public Visibility & RLS Filtering**: Confirms that non-admin clients only receive products where `status = 'published'` (draft and archived items are omitted).
2. **Admin Full Visibility**: Confirms that administrative users can view draft, published, and archived items.
3. **Status Transitions & Live Sync**: Simulates state changes (`draft` $\to$ `published` $\to$ `archived`) and asserts immediate UI catalog response.
4. **Optimistic UI Rollback**: Simulates a network failure or RLS policy rejection during a write operation, asserting that client-side state correctly rolls back to the previous snapshot.
5. **CAD Specification Integrity**: Confirms that mechanical and IoT CAD products possess watertight dimensional specifications and non-zero digital file pricing.

### 5.3 Reading Live Data (no admin "Đồng Bộ DB" button)
The old `/admin` **"Đồng Bộ DB"** (Database Sync) button and its `adminStorefrontService.syncToDatabase()` no longer exist — `seedService.ts` records that the button in `AdminDashboardView.tsx` was removed (Đợt 7), and there is no `syncToDatabase`/`adminStorefrontService` anywhere in the repo. Current data paths:

- **Read path — unwired (0 call site)**: `seedService.syncFromSupabase()` selects every row from `public.products`, `public.orders`, `public.materials`, `public.printer_fleet`, `public.user_profiles`, `public.accessories`, and `public.workshop_partners`, mapping rows through the single shared `mappers.ts`. It has **no caller** anywhere in `src/` or `scripts/` (dead code until wired). Query errors are thrown, not swallowed.
- **Fixture seeding is disabled**: `dbService.seedInitialProductsIfEmpty()` returns `false` and writes nothing (data-honesty CI-01); an empty table stays empty and the caller renders an empty state.
- **Real imports**: admins write each group from `/admin` (products, pricing, materials, …), or via SQL.
- **Disposable demo data**: `scripts/seed-sample-data.mjs` (dry-run default; `--apply` to write; `--remove` to undo) writes and cleans `[MẪU]`-tagged rows across the catalog, workshop, and order tables.
