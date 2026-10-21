<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# VCUBE Developer & Deployment Runbook

> **Platform:** VCUBE 3.0 — Precision 3D Printing & Digital Industrial CAD Marketplace  
> **Target Audience:** Core Developers, DevOps Engineers, QA Engineers, Contributors  
> **Supported Environments:** WSL2 (Ubuntu 24.04 LTS), Linux (Ubuntu/Debian/Fedora/Arch), macOS (Darwin ARM64/x64), Windows 10/11 (via WSL2)  
> **Last Verified:** 2026-09-23  

---

## Table of Contents

1. [System Prerequisites](#1-system-prerequisites)
   - [1.1 Operating System Recommendations & Architecture](#11-operating-system-recommendations--architecture)
   - [1.2 Node.js & Runtime Environment](#12-nodejs--runtime-environment)
   - [1.3 Git & Text Encoding Configuration](#13-git--text-encoding-configuration)
2. [Repository Setup & Environment Configuration](#2-repository-setup--environment-configuration)
   - [2.1 Cloning the Repository](#21-cloning-the-repository)
   - [2.2 Installing Dependencies](#22-installing-dependencies)
   - [2.3 Environment Variables (.env) Specification](#23-environment-variables-env-specification)
   - [2.4 Critical Security Rules & Secret Isolation](#24-critical-security-rules--secret-isolation)
3. [Development Workflow](#3-development-workflow)
   - [3.1 Starting the Vite Development Server](#31-starting-the-vite-development-server)
   - [3.2 Running the Dev Server Detached in WSL2](#32-running-the-dev-server-detached-in-wsl2)
   - [3.3 Process Management & Port Auditing](#33-process-management--port-auditing)
4. [Build & Typecheck Operations](#4-build--typecheck-operations)
   - [4.1 TypeScript Static Typechecking](#41-typescript-static-typechecking)
   - [4.2 Production Bundle Compilation](#42-production-bundle-compilation)
   - [4.3 Production Preview Simulation](#43-production-preview-simulation)
   - [4.4 Build Cache Cleanup](#44-build-cache-cleanup)
5. [Automated Quality Gates Suite](#5-automated-quality-gates-suite)
   - [5.1 Quality Gate Architecture & Overview](#51-quality-gate-architecture--overview)
   - [5.2 Quality Gates Matrix](#52-quality-gates-matrix)
   - [5.3 Deep Dive into Each Verification Script](#53-deep-dive-into-each-verification-script)
   - [5.4 Continuous Integration (CI) Recommended Order](#54-continuous-integration-ci-recommended-order)
6. [Supabase Local & Cloud Setup](#6-supabase-local--cloud-setup)
   - [6.1 Database Schema & Migration Architecture](#61-database-schema--migration-architecture)
   - [6.2 Migration Execution Sequence](#62-migration-execution-sequence)
   - [6.3 Admin User Bootstrapping](#63-admin-user-bootstrapping)
   - [6.4 Catalog Sync & Integration Verification](#64-catalog-sync--integration-verification)
7. [Comprehensive Troubleshooting Guide](#7-comprehensive-troubleshooting-guide)
   - [7.1 Port 3000 Collision](#71-port-3000-collision)
   - [7.2 Windows PowerShell UTF-8 & Mojibake Prevention](#72-windows-powershell-utf-8--mojibake-prevention)
   - [7.3 UNC Path Write Limitations (`\\wsl.localhost\...` ENOTSUP)](#73-unc-path-write-limitations-wsllocalhost-enotsup)
   - [7.4 OpenCASCADE WebAssembly (WASM) MIME Type & Web Worker Loading](#74-opencascade-webassembly-wasm-mime-type--web-worker-loading)
   - [7.5 Supabase RLS Permission Denied (`42501`)](#75-supabase-rls-permission-denied-42501)
   - [7.6 Hydration & Client-Only Routing in Vite SPA](#76-hydration--client-only-routing-in-vite-spa)

---

## 1. System Prerequisites

### 1.1 Operating System Recommendations & Architecture

VCUBE is built on high-performance web standards including React 19, Three.js 0.185 (WebGL 2.0), OpenCASCADE WebAssembly (OCCT ~7.6 MB WASM binary at `public/wasm/occt-import-js.wasm`), and Tailwind CSS 4. The project requires a POSIX-compliant development environment.

| Operating System | Tier | Recommendation / Instructions |
|---|---|---|
| **WSL2 (Ubuntu 24.04 LTS)** | **Primary (Recommended)** | **Strongly recommended for Windows users.** Run all build, lint, and dev processes directly inside the Linux VM (`/home/<user>/projects/Vcube`). Do not use Windows-native Node.js to build. |
| **Native Linux (Ubuntu/Debian/Arch/Fedora)** | **Tier 1** | Native support. Ensure Node.js 20+ and standard build tools (`build-essential`) are present. |
| **macOS (Darwin ARM64 / x64)** | **Tier 1** | Supported natively on Apple Silicon (M1/M2/M3/M4) and Intel Macs via Homebrew or Node Version Managers (`nvm`, `fnm`). |
| **Windows Native (CMD / PowerShell 5.1)** | **Prohibited for Builds** | **Never build using the native Windows toolchain.** Windows handles path separators, symlinks, and UTF-8 encoding inconsistently, leading to file corruption (mojibake) and build failures. Use WSL2. |

#### WSL2 Ubuntu 24.04 Setup (For Windows Developers)
If setting up on Windows, open an Administrator PowerShell prompt and verify WSL2:
```powershell
# Install WSL with Ubuntu 24.04
wsl --install -d Ubuntu-24.04

# Verify installed distribution
wsl -l -v
```
All commands in this runbook should be executed inside your WSL2 bash prompt:
```bash
wsl -d Ubuntu-24.04
```

### 1.2 Node.js & Runtime Environment

VCUBE requires **Node.js v20.x or v22.x LTS** and **npm v10+**.

#### Version Verification
```bash
node -v   # Must be >= v20.0.0 (e.g. v20.18.0 or v22.14.0)
npm -v    # Must be >= v10.0.0
```

#### Installing via Node Version Manager (Recommended)
Using `nvm` (Node Version Manager) or `fnm` (Fast Node Manager):
```bash
# Install nvm if not already present
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Install and activate Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

### 1.3 Git & Text Encoding Configuration

To prevent accidental conversion of line endings (`CRLF` vs `LF`) and protect multi-language strings (Vietnamese diacritics and technical specifications):

```bash
# Enforce LF line endings on commit (POSIX standard)
git config --global core.autocrlf input

# Treat filenames with non-ASCII characters correctly
git config --global core.quotepath false

# Ensure UTF-8 log output
git config --global i18n.logOutputEncoding utf-8
git config --global i18n.commitEncoding utf-8
```

---

## 2. Repository Setup & Environment Configuration

### 2.1 Cloning the Repository

> **WSL2 Warning:** Clone the repository into the **native Linux filesystem** (e.g. `/home/<user>/projects/Vcube` or `/home/<user>/project/Vcube`), **NOT** onto the Windows mount (`/mnt/c/...`). Accessing `/mnt/c/` across the Plan9 9P file server bridge slows I/O by 500–1000% and breaks Vite hot module replacement (HMR).

```bash
# Navigate to your Linux workspace
mkdir -p ~/projects
cd ~/projects

# Clone the repository
git clone https://github.com/ThanhJamie/Vcube.git
cd Vcube
```

### 2.2 Installing Dependencies

Install clean dependencies matching `package-lock.json`:

```bash
# Clean install of all runtime and dev dependencies
npm install
```

VCUBE relies on key production libraries:
- `@tailwindcss/vite` (Tailwind CSS 4 Vite engine)
- `three` & `@types/three` (WebGL 3D engine)
- `occt-import-js` (OpenCASCADE WebAssembly STEP/IGES parser)
- `@supabase/supabase-js` (Supabase database, auth, and storage client)
- `react-router-dom` (v7 client-side SPA routing)
- `zustand` (Lightweight reactive state stores)
- `lucide-react` (icon set, surfaced through `src/frontend/ui/iconMap.ts`)
- `jszip` (ZIP handling in the CAD/asset pipeline)

### 2.3 Environment Variables (.env) Specification

The application requires an active `.env` file at the root of the repository. The checked-in `.env.example` is the authoritative template (current `VITE_*` names; the legacy `NEXT_PUBLIC_*` / `SUPABASE_SERVICE_ROLE_KEY` names are commented out). The equivalent specification is reproduced below. Copy it into `.env`:

```bash
cp .env.example .env   # then replace its legacy names with the template below
```

#### Complete `.env` Specification Template

```dotenv
# ==============================================================================
# VCUBE 3.0 — ENVIRONMENT VARIABLES SPECIFICATION
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. SUPABASE CLIENT CONFIGURATION (Safe for Client Browser / Public)
# ------------------------------------------------------------------------------
# Project URL for Supabase API gateway
VITE_SUPABASE_URL=https://<project-ref>.supabase.co

# Public Publishable Key (sb_publishable_... or standard anon JWT)
# Safe to expose in client bundle; Row Level Security (RLS) is the security perimeter.
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Application Base URL (Used for Supabase Auth redirect URLs & verification emails)
VITE_SITE_URL=http://localhost:3000

# ------------------------------------------------------------------------------
# 2. SUPABASE SERVER / CI CONFIGURATION (SERVER ONLY — CRITICAL SECURITY)
# ------------------------------------------------------------------------------
# Secret Service Role Key (sb_secret_... or service_role JWT)
# Bypasses ALL Row Level Security. NEVER expose to Vite define or client bundle!
# Used strictly by backend scripts (inspect-db.mjs, verify-rls.mjs) and serverless webhooks.
SUPABASE_SECRET_KEY=<service-role-key>

# ------------------------------------------------------------------------------
# 3. OPTIONAL / LEGACY
# ------------------------------------------------------------------------------
# GEMINI_API_KEY is still plumbed through `define` in vite.config.ts but has NO
# consumer in `src/` and `@google/genai` is not a dependency. Treat as unused.
GEMINI_API_KEY=AIzaSyExampleGeminiKeyHere

# APP_URL is a legacy AI Studio variable; the app no longer reads it (see .env.example).
# Kept only for old checkouts. Example value only.
APP_URL="MY_APP_URL"

# ------------------------------------------------------------------------------
# 4. BACKWARD-COMPATIBILITY ALIASES (legacy fallbacks only)
# ------------------------------------------------------------------------------
# vite.config.ts and the CLI scripts read these ONLY when the VITE_* names above
# are absent. Prefer the VITE_* keys; keep these solely for old checkouts.
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# ------------------------------------------------------------------------------
# 5. DEV SERVER OPTIMIZATIONS
# ------------------------------------------------------------------------------
# Set to 'true' in automated test runners or AI Studio to disable HMR & file watching
DISABLE_HMR=false
```

#### Detailed Variable Reference

| Environment Variable | Scope | Description & Rules |
|---|---|---|
| `VITE_SUPABASE_URL` | Client / Browser | The HTTPS endpoint of your Supabase project (e.g. `https://<ref>.supabase.co`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client / Browser | The public key used for all frontend queries. Must be guarded by Row Level Security (RLS) policies. Begins with `sb_publishable_` or `eyJ...` (anon role). |
| `VITE_SITE_URL` | Client / Browser | The root domain of the frontend. In local dev: `http://localhost:3000`. In production: your canonical domain (example domains: `https://vcube.vn` or `https://vcube-red.vercel.app`). |
| `SUPABASE_SECRET_KEY` | **SERVER ONLY** | High-privilege key that **bypasses all RLS policies**. Used strictly by administrative CLI scripts (`inspect-db.mjs`, `seed-sample-data.mjs`). **Never expose to the client.** |
| `GEMINI_API_KEY` | Client (bundled) | **Legacy/unused.** `vite.config.ts` injects it via `define`, but no `src/` module reads it and `@google/genai` is not a dependency. |
| `APP_URL` | Client (bundled) | **Legacy/unused AI Studio variable.** The app no longer reads it; kept only for old checkouts. Example value only. |
| `NEXT_PUBLIC_*` | Client / Compatibility | Legacy aliases, read only as fallbacks by `vite.config.ts` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) and by CLI scripts when the `VITE_*` names are absent. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SERVER ONLY** | Legacy alias for `SUPABASE_SECRET_KEY`, read as a fallback by the CLI scripts only. |
| `DISABLE_HMR` | Dev Server | When set to `true`, disables Vite file watchers and WebSocket HMR to save CPU during automated edits. |

### 2.4 Critical Security Rules & Secret Isolation

1. **Publishable vs Secret Isolation:**
   `vite.config.ts` enforces an active runtime guard:
   ```typescript
   if (supabaseKey.startsWith('sb_secret_')) {
     throw new Error(
       '[vcube] Cấu hình sai: khoá secret (sb_secret_…) không được dùng cho client. Dùng sb_publishable_…'
     );
   }
   ```
   Under no circumstance should `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` be added to `vite.config.ts`'s `define` block. Doing so packages the administrative master key into production `.js` bundles, exposing all customer PII and database control.

2. **Git Hygiene:**
   `.env` is strictly ignored in `.gitignore`. Never commit `.env` or any file containing `sb_secret_...` or service role JWTs.

3. **Fallback Mode:**
   `vite.config.ts` injects the resolved `VITE_*` values into the `process.env.NEXT_PUBLIC_*` globals that `src/backend/supabase/client.ts` reads. If the URL/key are missing or contain the placeholder substrings `your-project-id` / `your-anon-key`, `isSupabaseConfigured` becomes `false` and the client falls back to a dummy endpoint. The UI then renders without crashing; the catalogs in `src/data/mockData.ts` are intentionally empty (`= []`, data-honesty), so screens show empty states rather than fabricated fixtures.

---

## 3. Development Workflow

### 3.1 Starting the Vite Development Server

VCUBE runs a Vite 6 SPA on port 3000 bound to `0.0.0.0`:

```bash
npm run dev
```

Output:
```text
  VITE v6.2.3  ready in 482 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://172.x.x.x:3000/
  ➜  press h + enter to show help
```

Open `http://localhost:3000` in your web browser.

### 3.2 Running the Dev Server Detached in WSL2

When developing in WSL2 or over SSH, closing the terminal or stepping away can terminate the dev server. To run the server permanently in the background:

```bash
# Launch Vite detached from the current shell session
setsid nohup npm run dev >/tmp/vcube-dev.log 2>&1 </dev/null &
```

#### Inspecting Dev Server Logs
```bash
# View realtime output
tail -f /tmp/vcube-dev.log

# Check recent log entries
tail -n 50 /tmp/vcube-dev.log
```

### 3.3 Process Management & Port Auditing

#### Checking if Port 3000 is Active
```bash
# Check port 3000 status
lsof -i :3000
# or
ss -tulpn | grep 3000
```

#### Gracefully Stopping the Detached Dev Server
```bash
# Terminate by port binding
fuser -k 3000/tcp

# Or kill all vite processes
pkill -f "vite --port=3000"
```

---

## 4. Build & Typecheck Operations

VCUBE enforces zero-tolerance for TypeScript and packaging errors. Both linting and production bundling must pass before committing or deploying.

### 4.1 TypeScript Static Typechecking

Typechecking runs TypeScript compiler in `--noEmit` mode:

```bash
npm run lint
```
*Script alias:* `tsc --noEmit`  
*Success Criteria:* Exits with code `0` and **zero errors**. All TypeScript types across `src/` must be completely valid.

### 4.2 Production Bundle Compilation

To produce a minified, tree-shaken, production-ready distribution:

```bash
npm run build
```
*Script alias:* `vite build`  
*Output Directory:* `dist/`  

#### Key Build Artifacts:
- `dist/index.html`: Entry HTML with preloaded fonts and viewport configurations.
- `dist/assets/index-*.js`: Core application bundle.
- `dist/assets/three-vendor-*.js`: Isolated Three.js 0.185 runtime chunk.
- `dist/assets/react-vendor-*.js`: React 19 and React Router DOM v7 chunk.
- `dist/assets/supabase-vendor-*.js`: Supabase JS SDK chunk.
- `dist/assets/cadParser.worker-*.js`: Compiled Web Worker for background CAD parsing.
- `dist/assets/index-*.css`: Compiled Tailwind CSS 4 utility bundle.

### 4.3 Production Preview Simulation

To test the compiled `dist/` bundle locally with simulated production headers and compression:

```bash
npm run preview
```
*URL:* `http://localhost:4173`

### 4.4 Build Cache Cleanup

To purge `dist/` and any stray server files:

```bash
npm run clean
```
*Script alias:* `rm -rf dist server.js`

---

## 5. Automated Quality Gates Suite

### 5.1 Quality Gate Architecture & Overview

VCUBE utilizes an automated suite of standalone Node.js and TypeScript quality gates located in `scripts/`. These gates prevent:
1. **RLS Anti-Patterns:** Client privilege escalation, unauthorized writes, and PII leaks.
2. **Data Dishonesty:** Fabricated certifications, fake engineering SLAs, or unverified tolerances.
3. **Financial Calculation Errors:** Accidental multiplication of base customer pricing.
4. **Accessibility Regressions:** WCAG 2.x AA contrast violations across the light token set and the fixed dark chrome tier (the app is light-only).
5. **Database Drift:** Missing tables, broken triggers, or SQL syntax regressions.

### 5.2 Quality Gates Matrix

> **Canonical gate list:** run `npm run check` (driven by `scripts/gate-manifest.json`). The matrix below is a descriptive snapshot, not an authoritative count; do not rely on hand-listed file counts.

| Script Command | Purpose & Domain | Target Scope | Pass Criteria |
|---|---|---|---|
| `npm run lint` | TypeScript Type Safety | All `.ts`, `.tsx` files in `src/` | Exit `0`, 0 compiler errors |
| `npm run build` | Vite Packaging & Tree-shaking | Complete SPA bundle | Exit `0`, `dist/` created cleanly |
| `node scripts/lint-rls-sources.mjs` | Migration Security Linter | `supabase/migrations/*.sql` (+ `supabase/legacy/*.sql` for reference) | Exit `0`, 0 R1–R7 anti-patterns |
| `node scripts/lint-rls-migration.mjs` | Hardening Policy Consistency | `supabase/migrations/20261010_harden_rls.sql` | Exit `0`, 0 unmatched policies, balanced quotes |
| `node scripts/check-contrast.mjs` | WCAG 2.x Contrast Validator | Light tokens + fixed dark chrome tier | Exit `0`, 0 unexpected failures |
| `node scripts/check-contrast-combos.mjs` | Class-Combination Contrast Gate | Class strings in `src/**/*.tsx` + `src/index.css` token bookkeeping | Exit `0`, 0 failing (fg, bg) class combinations, 0 token/ratio drift |
| `node scripts/check-fabricated.mjs` | Data Honesty Scanner | String literals & JSX text in `src/` | Exit `0`, 0 fabricated claims |
| `node scripts/check-unitprice-multiplier.mjs` | Pricing Engine Integrity Gate | Math operators in `src/` | Exit `0`, no pricing multiplication |
| `node scripts/check-icon-names.mjs` | Icon Glyph Registry Gate | `<Icon name>` + `icon:`/`iconName:`/`glyph:` fields in `src/**` | Exit `0`, every glyph exists in `src/frontend/ui/iconMap.ts` |
| `node scripts/check-ui-rules.mjs` | Design-System Regression Gate | `src/**/*.ts(x)` | Exit `0`, no violations beyond the (currently empty) allowlist budget |
| `node scripts/check-error-handling.mjs` | Error-Swallowing Gate | `catch` blocks in `src/**/*.ts(x)` | Exit `0`, 0 empty-catch, 0 false-success, warn-in-catch ≤ budget |
| `node scripts/a8-sql-syntax-check.mjs` | Static SQL Syntax Validator | Default SQL file set resolved by the script (run via `npm run check`) | Exit `0`, balanced tags, no syntax errors |
| `npx tsx scripts/test-catalog-sync.ts` | Catalog & RLS Integration Test | Mock DB, state store & RLS logic | Exit `0`, 5/5 test suites passing (100%) |
| `node scripts/inspect-db.mjs` | DB Schema State Comparison | **32 tables** (31 baseline + `designer_payout_info`) + 2 views in Supabase | Exit `0`, all declared tables verified, 0 exposed |
| `node scripts/verify-rls.mjs` | Empirical Anon Key Security Probe | Live Supabase endpoint | Exit `0`, 0 sensitive tables readable by anon |

### 5.3 Deep Dive into Each Verification Script

#### 1. `node scripts/lint-rls-sources.mjs`
- **Objective:** Scans migration files to ensure no insecure RLS patterns exist.
- **Checks Enforced (R1–R7):**
  - `R1`: Policy checking `user_metadata` (client-writable JWT property).
  - `R2`: Hardcoded administrator email addresses in SQL statements.
  - `R3`: Blanket `FOR ALL ... USING (true)` policies permitting public write access.
  - `R4`: Any `USING (true)` policy on the PII tables (`orders`, `user_profiles`), plus `SELECT ... USING (true)` on `products` when the policy does not constrain `status` (leaks drafts/archived).
  - `R5`: Insecure `WITH CHECK (true)` on public write tables (`orders`, `kyc_records`, `payment_transactions`, `material_inventory_logs`).
  - `R6`: Unbalanced Postgres dollar-quoting tags (e.g. `$do$`, `$fn$`) that silently truncate scripts.
  - `R7`: Uses of `public.is_admin()` when the `*_rls_helpers.sql` file is missing, or when a migration that calls the helper runs before it.

#### 2. `node scripts/lint-rls-migration.mjs`
- **Objective:** Validates `supabase/migrations/20261010_harden_rls.sql` before execution.
- **Checks Enforced:**
  - Matches every created policy against the Step-9 policy allowlist.
  - Ensures no declared policies are inadvertently dropped by the cleanup sweep.
  - Detects orphan allowlist entries (policies listed but never created).
  - Resolves array variables/loops (`v_tables`, `v_catalog_read`) to test generated policy names, and enforces `R8` (no `ALTER TABLE`/RLS-enable loop without a `relkind` check, which would hit the `pricing_config` view) and `R9` (no `$p$…$p$` policy body referencing the temporary `_vcube_*` helpers dropped at the end).

#### 3. `node scripts/check-contrast.mjs`
- **Objective:** Validates design token color pairs against WCAG 2.x AA accessibility ratios (Text $\ge 4.5:1$, Large Text & UI components $\ge 3.0:1$).
- **Expected Non-Pass Handling:**
  - 11 pairs are marked `expectedFail` and documented in `docs/design/tokens.md`. Only 3 of them are decorative (`LIGHT decorative border`, `LIGHT hairline on card`, `LIGHT separator on card`), exempt under WCAG 1.4.11; the rest are `graphics` (rating glyphs ≥ 18px) or `remove` (colors retired from text roles).
  - The script passes (Exit `0`) when there are **0 unexpected failures**.
  - `check-contrast-combos.mjs` complements this by scanning actual `className` strings in `.tsx` files, so a regression back to a failing (text, background) combination is caught even though this script only declares the token table.

#### 4. `node scripts/check-fabricated.mjs`
- **Objective:** Enforces the VCUBE Data Honesty Charter (`docs/design/data-honesty.md`).
- **Checks Enforced:**
  - Scans string literals and JSX text for unverified claims (e.g. `"100% Watertight"`, `"Đạt chuẩn ISO 9001"`, fake 24/7 engineer hotlines, fabricated tax IDs, unbacked tolerance promises).
  - Permits neutral technical labels (e.g. `Lưới (watertight): —` or measurement states).

#### 5. `node scripts/check-unitprice-multiplier.mjs`
- **Objective:** Prevents catastrophic financial calculation regressions.
- **Background:** `unit_price_multiplier` is a **cost-per-gram derivation factor** (đ/g) used in `src/utils/pricingEngine.ts:70-88` (`resolveMaterialCostPerGram`, `costPerKg / 1000 * unitPriceMultiplier`). It must **never** be multiplied directly against base retail selling prices.
- **Allowlist:** Only `src/utils/pricingEngine.ts` and admin forms under `src/frontend/components/admin/` may reference this property. (Shim `src/frontend/utils/pricingEngine.ts` đã bị xoá ở Phase 6c — import canonical qua alias `@/utils/pricingEngine`.)

#### 6. `node scripts/a8-sql-syntax-check.mjs`
- **Objective:** Performs static parsing on the default SQL file set resolved by the script (`supabase/migrations/`, `supabase/scripts/`, `supabase/diagnostics/`) without requiring a running Postgres server. The authoritative gate entry point is `npm run check`.
- **Checks Enforced:**
  - Catches Postgres error `42601` caused by trailing commas before square brackets (`array['a', 'b',]`).
  - Catches Postgres error `42725` from concatenating a `"char"` catalog column (e.g. `tgenabled`, `relkind`, `polcmd`) with `||` without a `::text` cast.
  - Audits unclosed dollar-quotes, unescaped single quotes, unclosed block comments, unbalanced parentheses, and `begin;` without a matching `commit;` (a statement not ending in `;` is a warning only).

#### 7. `npx tsx scripts/test-catalog-sync.ts`
- **Objective:** Verifies catalog synchronization, state transitions, and RLS behavior in TypeScript.
- **Test Suites Covered:**
  - Test 1: Public visibility simulation (drafts & archived models hidden).
  - Test 2: Admin full visibility simulation (drafts & archived models visible).
  - Test 3: Instant live sync upon status change.
  - Test 4: Optimistic UI rollback upon database rejection.
  - Test 5: CAD metadata & dimensional specifications validation.

#### 8. `node scripts/inspect-db.mjs` & `node scripts/verify-rls.mjs`
- **Objective:** Audits the live Supabase instance by comparing row visibility under the publishable key vs. secret service role key.
- **Options:**
  - `node scripts/verify-rls.mjs`: Read-only probe with anon key.
  - `node scripts/verify-rls.mjs --writes`: Safely tests no-op write rejections.
  - `node scripts/verify-rls.mjs --json`: Formats results for automated pipelines.

#### 9. `node scripts/check-contrast-combos.mjs`
- **Objective:** Reads `src/**/*.tsx`, extracts class strings (string literals and the static text of template literals), and fails when a single class list contains a measured failing (text, background) token pair.
- **Checks Enforced:**
  - Six rules over token pairs (`fg-subtle` on `line-subtle` / `primary/5` / `warning-tint` / `positive-tint`, etc.); modifiers (`hover:`, `focus:`) and alpha variants are honored.
  - Cross-checks the `TOKENS`/`RULES` bookkeeping against `src/index.css` and fails on `token-drift` / `rule-ratio-drift`.
- **Exit codes:** `0` clean, `1` violation or bookkeeping drift, `2` tool error.

#### 10. `node scripts/check-icon-names.mjs`
- **Objective:** Prevents silent `FALLBACK_ICON` rendering when a glyph is missing from `iconMap`.
- **Checks Enforced:** Reads keys from `export const iconMap` in `src/frontend/ui/iconMap.ts`, then scans `<Icon name=...>` tags (static strings and ternary branches) plus `icon:` / `iconName:` / `glyph:` string fields across `src/**`. Any unknown name fails with `file:line`.

#### 11. `node scripts/check-ui-rules.mjs`
- **Objective:** Blocks design-system regressions across `src/**`.
- **Checks Enforced (4 rules):**
  - `control-border-line`: `border-line` on `<input>`/`<select>`/`<textarea>` (should be `border-line-control`).
  - `unguarded-tolocale`: `toLocaleString(` without a nearby NaN/validity guard.
  - `focus-no-ring`: `focus:outline-none` without a ring in the same class list.
  - `infinite-animation`: `animate-spin|ping|pulse|bounce` without `motion-reduce:animate-none`.
- **Allowlist:** Per-`file::rule` budgets for known debt; currently empty, so any new violation fails.

#### 12. `node scripts/check-error-handling.mjs`
- **Objective:** Blocks swallowed errors in `catch` blocks across `src/**`.
- **Checks Enforced (3 rules):**
  - `empty-catch` (hard, limit 0): empty/comment-only catch body without an `ignore:` annotation.
  - `false-success-in-catch` (hard, limit 0): `return true` / `return { success: true }` inside a catch.
  - `warn-in-catch` (budget): `console.warn/error` inside catch bodies, capped by `WARN_IN_CATCH_BUDGET` and only allowed to decrease.

### 5.4 Continuous Integration (CI) Recommended Order

The complete, authoritative gate list is `npm run check` (manifest: `scripts/gate-manifest.json`). The hand-written order below is a convenience snapshot; prefer `npm run check` so a newly added gate is never missed.

Run all static gates locally before submitting pull requests:

```bash
# 1. Typecheck and bundle
npm run lint
npm run build

# 2. Security and data integrity gates
node scripts/lint-rls-sources.mjs
node scripts/lint-rls-migration.mjs
node scripts/check-contrast.mjs
node scripts/check-contrast-combos.mjs
node scripts/check-fabricated.mjs
node scripts/check-unitprice-multiplier.mjs
node scripts/check-icon-names.mjs
node scripts/check-ui-rules.mjs
node scripts/check-error-handling.mjs
node scripts/a8-sql-syntax-check.mjs

# 3. Integration suite
npx tsx scripts/test-catalog-sync.ts
```

---

## 6. Supabase Local & Cloud Setup

### 6.1 Database Schema & Migration Architecture

VCUBE utilizes a hardened schema (chuỗi **12 migration**, `20260900`–`20261013`) comprising **32 relational tables + 2 views** (`pricing_config` — compatibility view `security_invoker=true`; `open_design_requests` — designer/admin market view `security_invoker=false`), 49 explicit indexes (48 from the `idx_*` loop + the partial unique `uq_kyc_records_one_pending`; 2 are GIN), **19 permanent functions** (9 helper/RPC — `current_app_role`, `is_admin`, `is_admin_or_lab`, `current_workshop_partner_id`, `get_order_by_guest_token`, `claim_design_request`, `get_my_payout_info`, `admin_get_designer_payout`, `upsert_my_payout_info` — plus **10 trigger functions**), **9 trigger definitions** (≈**29 instances**: 21 `trg_touch_updated_at` + 8 single-attach triggers), **92 effective table policies + 7 storage policies** (+1 `realtime.messages`), and 2 storage buckets (`cad-files` 150 MB, `product-images` 10 MB). The hardening migration creates and then drops 2 temporary helpers (`_vcube_make_policy`, `_vcube_has_columns`).

> **Rule:** Never execute files inside `supabase/legacy/`. Those represent obsolete iterations. All database management is restricted to `supabase/migrations/` and `supabase/scripts/`.

### 6.2 Migration Execution Sequence

When setting up a fresh Supabase project, execute the migration files sequentially in the **Supabase SQL Editor**:

```
supabase/migrations/            # 12 file, chạy theo thứ tự tên
├── 20260900_rls_helpers.sql       # 1. Helper functions: current_app_role() & is_admin()
├── 20260901_baseline_schema.sql   # 2. 31 tables + 1 view (pricing_config), 49 indexes, 5 trigger definitions (25 instances), buckets & seeds
├── 20261010_harden_rls.sql        # 3. 88 effective table policies (allowlist 90, 2 view skipped) + 7 storage policies & guards
├── 20261011*–20261013*.sql        # 4. 9 file W2: SEC-01 payout hotfix/table, signup designer, column guard,
│                                  #    SEC-02 open-requests view/RPC, CHECK constraints, orders broadcast,
│                                  #    drop bank columns (H-gated), storage scheme cad/<uid>/…
└── (tổng chuỗi: 32 tables + 2 views, 19 functions, 9 trigger definitions, 92 table + 7 storage policies)
```

#### Step-by-Step Migration Guide:

1. **Step 1: RLS Helpers (`20260900_rls_helpers.sql`)**
   - Creates `public.current_app_role()` (extracts role from `public.user_profiles.role`).
   - Creates `public.is_admin()` (evaluates if current user has `role = 'admin'`).
   - Safe to run when tables do not yet exist (fails closed, returning `'anon'`).

2. **Step 2: Baseline Schema (`20260901_baseline_schema.sql`)**
   - Generates all core business tables: `products`, `materials`, `orders`, `order_items`, `user_profiles`, `workshop_profiles`, `designer_profiles`, `pricing_configs`, `custom_design_requests`, and audit logs.
   - Configures Supabase Realtime publication for 11 tables: `products`, `materials`, `printer_fleet`, `site_content`, `pricing_configs`, `orders`, `accessories`, `app_settings`, `pricing_global_settings`, `order_files`, `custom_design_requests`.
   - Seeds **only 3 singleton config rows**: `site_content('default')`, `pricing_global_settings('global')`, and `app_settings('settings')`. There are **no** product/material/printer/pricing fixtures — sample data comes from `scripts/seed-sample-data.mjs`.

3. **Step 3: RLS Hardening (`20261010_harden_rls.sql`)**
   - Applies strict Row Level Security to all tables.
   - Cleans up any unmanaged legacy policies.
   - (Re)creates 4 triggers:
     - `trg_protect_profile_privileged_columns`: Prevents non-admin users from escalating their own role or modifying KYC verification status.
     - `trg_create_profile_for_new_user`: Re-creates the `auth.users` → `user_profiles` provisioning trigger.
     - `trg_protect_order_privileged_columns`: Prevents workshops from tampering with order payment statuses.
     - `trg_protect_workshop_profile_privileged_columns`: Prevents a workshop owner from changing `partner_id` / `verified_status`.

#### Alternative: Consolidated Single-File Application
For convenience, you can apply the entire migration stack in one step using the auto-generated bundle:
```bash
# Regenerate bundle if migrations were edited
node scripts/gen-apply-all.mjs
```
Copy and execute `supabase/scripts/apply_all_manual.sql` directly into the Supabase SQL Editor.

### 6.3 Admin User Bootstrapping

In VCUBE 3.0, **user roles are strictly managed in the database** (`public.user_profiles.role`). The system does not trust JWT `user_metadata` for administrative authorization.

To promote your account to `admin`:

1. Sign up a user account through the web UI (`/register`) or Supabase Auth dashboard.
2. Open `supabase/scripts/bootstrap_admin.sql`.
3. Update line 21 with your registered email:
   ```sql
   v_email text := 'your_registered_email@example.com';
   ```
4. Run the script in the Supabase SQL Editor.
5. Log out and log back in to the VCUBE application. You can now access `/admin` and manage catalog items, pricing rules, and workshop verifications.

### 6.4 Catalog Sync & Integration Verification

To verify that the catalog status transitions, RLS filters, and pricing specifications function accurately:

```bash
npx tsx scripts/test-catalog-sync.ts
```

All 5 suites must pass cleanly.

---

## 7. Comprehensive Troubleshooting Guide

### 7.1 Port 3000 Collision

**Symptom:**
```text
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

**Cause:**
A previous Vite dev server or Node.js background process is still bound to port 3000.

**Resolution (Linux / WSL2):**
```bash
# Method 1: Find and kill process by port
fuser -k 3000/tcp

# Method 2: Identify PID and kill with SIGKILL
lsof -ti :3000 | xargs kill -9

# Method 3: Terminate orphaned Vite instances
pkill -f "vite"
```

**Resolution (Windows Host):**
```powershell
# In PowerShell (Run as Administrator)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

---

### 7.2 Windows PowerShell UTF-8 & Mojibake Prevention

**Symptom:**
Vietnamese diacritics become corrupted into garbled characters (e.g. `Đặt In 3D` becomes `Äáº·t In 3D` or `???`).

**Cause:**
Windows PowerShell 5.1 reads and writes files without a Byte Order Mark (BOM) using the system ANSI codepage (Windows-1252 or Windows-1258).

**Resolution:**
Do not use `Get-Content` or `Set-Content` in PowerShell 5.1 for non-ASCII source files. Always use explicit .NET UTF-8 I/O without BOM:

```powershell
# Safe read using .NET UTF-8 Encoding (no BOM)
$p = "src/frontend/views/ExploreView.tsx"
$content = [System.IO.File]::ReadAllText($p, (New-Object System.Text.UTF8Encoding($false)))

# Safe write using .NET UTF-8 Encoding (no BOM)
[System.IO.File]::WriteAllText($p, $content, (New-Object System.Text.UTF8Encoding($false)))
```

Alternatively, perform all file edits inside your WSL2 Ubuntu bash environment using standard Linux tools (`sed`, `awk`, VS Code / Cursor WSL Remote).

---

### 7.3 UNC Path Write Limitations (`\\wsl.localhost\...` ENOTSUP)

**Symptom:**
```text
Error: ENOTSUP: operation not supported on socket / file
```
or file modifications fail silently when saving across Windows UNC paths (`\\wsl.localhost\Ubuntu-24.04\...`).

**Cause:**
Certain Windows text editors and automated tools cannot perform atomic file renames or lock operations over the Windows UNC network provider.

**Resolution:**
1. Keep all project files inside the Linux filesystem path (`/home/<user>/projects/Vcube`).
2. Open VS Code or Cursor directly inside WSL:
   ```bash
   cd ~/projects/Vcube
   code .
   ```
3. Never use native Windows CLI tools to write to UNC paths.

---

### 7.4 OpenCASCADE WebAssembly (WASM) MIME Type & Web Worker Loading

**Symptom:**
- Browser console error: `TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type. Expected 'application/wasm'.`
- Or: `Error: Không thể nạp thư viện WebAssembly CAD Kernel (occt-import-js).`

**Architecture & Implementation:**
VCUBE parses complex mechanical STEP/IGES files off the main thread inside `src/workers/cadParser.worker.ts` using `occt-import-js`:
- The ~7.6 MB WASM binary is stored at `public/wasm/occt-import-js.wasm`.
- The Web Worker is instantiated in `src/utils/meshParser.ts` as an ES Module:
  ```typescript
  const worker = new Worker(
    new URL('../workers/cadParser.worker.ts', import.meta.url),
    { type: 'module' }
  );
  ```

**Resolutions:**

1. **Local Vite Development:**
   Vite automatically serves `.wasm` files from `public/` with the correct `application/wasm` header. Ensure `public/wasm/occt-import-js.wasm` exists and is ~7.6 MB in size.

2. **Production Web Server Configuration (Nginx):**
   Ensure `mime.types` includes WASM:
   ```nginx
   types {
       application/wasm wasm;
   }
   ```

3. **Vercel / Cloud Deployment (`vercel.json`):**
   Add headers to guarantee caching and MIME compliance:
   ```json
   {
     "headers": [
       {
         "source": "/wasm/(.*)",
         "headers": [
           {
             "key": "Content-Type",
             "value": "application/wasm"
           },
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       }
     ]
   }
   ```

---

### 7.5 Supabase RLS Permission Denied (`42501`)

**Symptom:**
API queries return HTTP 403 or Postgres error code `42501`:
```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "permission denied for table order_items"
}
```

**Diagnosing the Cause:**
1. **Unauthenticated Public Request:** The table is protected by RLS and does not allow public anon reads. This is **by design** for sensitive tables (`order_items`, `payment_transactions`, `kyc_records`, `cart_items`).
2. **Missing User Profile:** If an authenticated user receives `42501`, their corresponding record in `public.user_profiles` is missing. The trigger `on_auth_user_created` may have failed.
   *Fix:* Check if `public.user_profiles` has an entry with `id = auth.uid()`.
3. **Privilege Escalation Blocked:** Non-admin users attempting to update `orders.status` or `user_profiles.role` will be rejected by defensive triggers (`trg_protect_profile_privileged_columns`).
4. **Un-bootstrapped Admin:** The user account has not been promoted via `supabase/scripts/bootstrap_admin.sql`.

---

### 7.6 Hydration & Client-Only Routing in Vite SPA

**Symptom:**
Navigating to a deep link (e.g. `http://localhost:3000/quote` or `https://<your-domain>/admin/orders`; `vcube.vn` is an example domain) and pressing F5 returns `404 Not Found`.

**Architecture:**
VCUBE is a single-page application (SPA) powered by Vite and `react-router-dom` v7. It has no SSR runtime (Next.js was completely removed). All routing is resolved in the browser.

**Resolutions:**

1. **Development Server:**
   Vite's built-in dev server automatically rewrites requests to `index.html`. If this fails, ensure `vite.config.ts` does not contain broken server rewrite rules.

2. **Vercel Deployment:**
   `vercel.json` must include a catch-all rewrite:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. **Nginx Production Deployment:**
   Direct all missing static requests to `index.html`:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

---

## 8. Summary of Commands Cheatsheet

```bash
# --- Daily Development ---
npm run dev                                      # Start local dev server (port 3000)
setsid nohup npm run dev >/tmp/vcube-dev.log 2>&1 </dev/null &  # Start detached
tail -f /tmp/vcube-dev.log                       # View detached server logs
fuser -k 3000/tcp                                # Stop dev server

# --- Code Verification ---
npm run lint                                     # TypeScript typecheck
npm run build                                    # Production compilation
npm run preview                                  # Preview production bundle (port 4173)

# --- Quality Gates ---
node scripts/lint-rls-sources.mjs                # Check migration RLS anti-patterns
node scripts/lint-rls-migration.mjs              # Validate hardening migration consistency
node scripts/check-contrast.mjs                  # Check WCAG 2.x AA color contrast
node scripts/check-contrast-combos.mjs           # Catch failing (text, bg) class combos
node scripts/check-fabricated.mjs                # Ensure data honesty in UI text
node scripts/check-unitprice-multiplier.mjs      # Audit pricing calculation math
node scripts/check-icon-names.mjs                # Verify every <Icon name> exists in iconMap
node scripts/check-ui-rules.mjs                  # Design-system regression gate
node scripts/check-error-handling.mjs            # Catch swallowed errors in catch blocks
node scripts/a8-sql-syntax-check.mjs             # Static SQL syntax audit
npx tsx scripts/test-catalog-sync.ts             # Integration & catalog sync test
node scripts/inspect-db.mjs                      # Audit Supabase table schema
node scripts/verify-rls.mjs                      # Empirical RLS probe with anon key
```
