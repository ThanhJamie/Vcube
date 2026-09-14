# VCUBE Multi-Dimensional Pricing Engine & B.O.M Cost Model

> **Target Version**: VCUBE Platform Release 3.0  
> **Classification**: Core Financial Computation & Manufacturing Economics Specification  
> **Author**: Worker M1 — Architecture & CAD Engine Specialist  
> **Date**: September 2026  
> **Status**: APPROVED / ACTIVE

---

## 1. Engine Architecture & Data Honesty Foundation

The VCUBE Pricing Engine (`src/utils/pricingEngine.ts`, re-exported via `src/frontend/utils/pricingEngine.ts` and encapsulated in `src/backend/services/pricingService.ts`) is a deterministic, multi-variable manufacturing economics calculator. It translates CAD geometry analysis and machine fleet parameters into integer VND quotations and financial splits.

```
+-----------------------------------------------------------------------------------------------+
|                                      PRICING ENGINE ARCHITECTURE                              |
+-----------------------------------------------------------------------------------------------+
                                                |
        +---------------------------------------+---------------------------------------+
        |                                       |                                       |
        v                                       v                                       v
+-----------------------+           +-----------------------+           +-----------------------+
|  ANALYZED GEOMETRY    |           |  FLEET & MATERIALS    |           | SYSTEM GLOBAL RATES   |
|  (AnalysisFile)       |           |  (Database Profiles)  |           | (pricing_global_      |
|                       |           |                       |           |  settings)            |
| - Transformed Volume  |           | - Printer Profile     |           |                       |
|   (cm³)               |           |   (kW, lifetime, bed) |           | - Electricity Rate    |
| - Triangle Count      |           | - Material Profile    |           |   (VND/kWh)           |
| - Dimensions X, Y, Z  |           |   (density, VND/g)    |           | - Labor Rate          |
| - Wall Thickness &    |           | - Formula Config      |           |   (VND/hour)          |
|   Printability Score  |           |   (pricing_configs)   |           | - Marketplace Fee     |
+-----------+-----------+           +-----------+-----------+           +-----------+-----------+
            |                                   |                                   |
            +-----------------------------------+-----------------------------------+
                                                |
                                                v
                                    +-----------------------+
                                    | MissingParams Guard   |  Fail-closed check:
                                    | (All parameters must  |  If ANY parameter is missing,
                                    |  be configured)       |  throw PricingUnavailableError
                                    +-----------+-----------+
                                                |
                                                v
                                    +-----------------------+
                                    | 7-Component B.O.M     |
                                    | Cost Breakdown        |
                                    +-----------+-----------+
                                                |
                        +-----------------------+-----------------------+
                        |                                               |
                        v                                               v
            +-----------------------+                       +-----------------------+
            | Factory Cost Price    |                       | Reverse Selling Price |
            | CostPrice = BaseCost  |                       | Formula (Markup &     |
            |           + Failure   |                       | Platform Variable     |
            |             Reserve   |                       | Fee Deductions)       |
            +-----------+-----------+                       +-----------+-----------+
                        |                                               |
                        +-----------------------+-----------------------+
                                                |
                                                v
                                    +-----------------------+
                                    | Final Output (VND):   |
                                    | - Selling Price       |
                                    | - Rounding Adjustment |
                                    | - Volume Discounts    |
                                    | - Financial Split     |
                                    +-----------------------+
```

### The Zero-Default-Number Invariant (`docs/design/data-honesty.md`)

Prior to VCUBE 3.0, the calculation engine silently defaulted unconfigured values to third-party sample data (e.g., hardcoded electricity at 2,850 VND/kWh and labor at 65,000 VND/h). Under the **Data Honesty Invariant**, this practice is completely abolished:

1. **No Synthetic Fallbacks**: Every rate and threshold must be explicitly defined in `pricing_global_settings`, `pricing_configs`, `printer_fleet`, or `materials`.
2. **The `MissingParams` Collector**: When computing a quote, `calculateDetailedPricing` inspects all required inputs. If parameters are absent, it collects every missing item and throws a structured `PricingUnavailableError`:
   ```typescript
   export class PricingUnavailableError extends Error {
     readonly code: PricingUnavailableCode;
     constructor(code: PricingUnavailableCode, message: string) {
       super(message);
       this.name = 'PricingUnavailableError';
       this.code = code;
     }
   }
   ```
3. **Data Honesty on Quote Verification (History of AT-10 / E3)**:
   Earlier designs contained a client-side HMAC signature mechanism (`quoteVerifier.ts`) using a hardcoded client secret. Because client-side secrets can be extracted by any user to forge "tamper-proof" quotes, `quoteVerifier.ts` was eliminated. Quotes in VCUBE 3.0 are evaluated dynamically against authorized database configurations or verified through server-side authenticated orders.

---

## 2. Detailed Bill of Materials (B.O.M) Cost Breakdown

The manufacturing cost price ($\text{CostPrice}$) represents the total ex-factory expenditure required to fabricate one unit, consisting of baseline production costs plus a risk-adjusted failure reserve.

$$\text{BaseCost} = C_{\text{material}} + C_{\text{electricity}} + C_{\text{machine}} + C_{\text{labor}} + C_{\text{packaging}} + C_{\text{overhead}}$$

$$\text{CostPrice} = \text{BaseCost} + C_{\text{failureReserve}}$$

---

### Component Formulas

#### 1. Raw Material Cost ($C_{\text{material}}$)
Calculates the precise mass of filament or resin consumed, factoring in shell wall perimeters, internal infill density, support waste, bed adhesion structures (brim/raft), and multi-color AMS purge towers:

$$M_{\text{raw}} = \max\left(5, \text{round}\left(V_{\text{model}} \times \rho \times \left(0.22 + \frac{\text{Infill}\%}{100} \times 0.78\right)\right)\right)$$

$$M_{\text{support}} = \begin{cases} 0, & \text{if supportsMode} = \text{'none'} \\ \text{round}\left(M_{\text{raw}} \times \frac{\text{SupportVolumeRatio}\%}{100}\right), & \text{otherwise} \end{cases}$$

$$M_{\text{purge}} = (N_{\text{extruders}} - 1) \times M_{\text{purgeGramsPerColor}}$$

$$M_{\text{total}} = M_{\text{raw}} + M_{\text{support}} + M_{\text{brimRaft}} + M_{\text{purge}}$$

$$C_{\text{material}} = \text{round}\left(M_{\text{total}} \times P_{\text{materialCostPerGram}}\right)$$

Where:
- $V_{\text{model}}$ = Model volume ($\text{cm}^3$) measured by the 3D parser.
- $\rho$ = Material density ($\text{g/cm}^3$, e.g., PLA: 1.24, PETG: 1.27, ABS: 1.04, PA-CF: 1.18).
- $P_{\text{materialCostPerGram}}$ = Resolved material unit cost in VND/g.

---

#### 2. Electricity & Energy Cost ($C_{\text{electricity}}$)
Models kilowatt-hour consumption based on print duration and the active machine's thermal heating load:

$$T_{\text{baseHours}} = \max\left(0.6, \frac{V_{\text{model}} \times 3.8}{\text{LayerHeight}_{\text{mm}} \times 100}\right)$$

$$T_{\text{toolChangeHours}} = \frac{N_{\text{toolChanges}} \times T_{\text{toolChangeMinutes}}}{60}$$

$$T_{\text{printHours}} = T_{\text{baseHours}} + T_{\text{toolChangeHours}}$$

$$C_{\text{electricity}} = \text{round}\left(P_{\text{averagePowerKW}} \times T_{\text{printHours}} \times R_{\text{electricityVnd}}\right)$$

Where:
- $P_{\text{averagePowerKW}}$ = Printer power rating (kW, e.g., Bambu X1C: 0.18 kW, SLA: 0.10 kW, Industrial Voron: 0.35 kW).
- $R_{\text{electricityVnd}}$ = Tariff from `pricing_global_settings.electricity_rate_vnd` (VND/kWh).

---

#### 3. Machine Depreciation & Consumables ($C_{\text{machine}}$)
Captures equipment wear, mechanical maintenance, replacement nozzles, build plates, and stepper motor depreciation:

$$D_{\text{hourly}} = \begin{cases} 
\text{ConfiguredDepreciation}, & \text{if } \text{cfg.defaultMachineDepreciationPerHour exists} \\ 
\frac{\text{AcquisitionCost}}{\text{ExpectedLifetimeHours}}, & \text{otherwise (computed from machine fleet record)} 
\end{cases}$$

$$C_{\text{depreciation}} = \text{round}(D_{\text{hourly}} \times T_{\text{printHours}})$$

$$C_{\text{maintenance}} = \text{round}(C_{\text{consumablesHourlyRate}} \times T_{\text{printHours}})$$

$$C_{\text{machine}} = C_{\text{depreciation}} + C_{\text{maintenance}}$$

---

#### 4. Technical Labor Cost ($C_{\text{labor}}$)
Accounts for the human engineering minutes required to inspect, prepare, post-process, and verify the physical part:

$$T_{\text{laborTotalMinutes}} = T_{\text{fileReview}} + T_{\text{setup}} + T_{\text{supportRemoval}} + T_{\text{postProcessing}} + T_{\text{qc}} + T_{\text{packaging}}$$

$$C_{\text{labor}} = \text{round}\left(\frac{T_{\text{laborTotalMinutes}}}{60} \times R_{\text{laborHourlyRate}}\right)$$

- $T_{\text{supportRemoval}}$ dynamically selects `cfg.noSupportRemovalMinutes` when `supportsMode === 'none'`.
- $R_{\text{laborHourlyRate}}$ is loaded from `pricing_global_settings.labor_hourly_rate_vnd`.

---

#### 5. Finishing, Packaging & Hardware Addons ($C_{\text{packaging}}$)

$$C_{\text{packaging}} = \text{FixedPackagingCost} + \text{MultiColorPackagingExtra} + \text{IPASolventCost} + \sum (\text{Qty}_i \times P_{\text{accessory}_i})$$

- $\text{IPASolventCost}$: Required for SLA/resin washing and UV cure baths.
- Hardware accessories: Integrated threaded heat-set brass inserts, magnets, bearings, or fasteners selected by the user.

---

#### 6. Overhead & Management ($C_{\text{overhead}}$)
Allocated operational overhead ($\text{overheadPerUnit}$) covering shop floor rent, slicing cloud servers, internet, and facility upkeep.

---

#### 7. Failure Contingency Reserve ($C_{\text{failureReserve}}$)
Protects the manufacturing workshop against warping, layer delamination, nozzle clogs, and geometry failure:

$$R_{\text{failure}} = R_{\text{baseReserve}} + R_{\text{lowPrintability}} + R_{\text{multiColor}} + R_{\text{materialExtra}}$$

Where:
- $R_{\text{baseReserve}}$: Default baseline failure risk (e.g., 8%).
- $R_{\text{lowPrintability}}$: Surcharge added only when the model has genuine measured defects and `printabilityScore < 80` (e.g., +6%).
- $R_{\text{multiColor}}$: Surcharge for complex multi-material prints (+4%).
- $R_{\text{materialExtra}}$: Material-specific risk rate read directly from `MaterialProfile.failureExtraPercent` (e.g., PEEK, Nylon-CF: +6% to +10%).

$$C_{\text{failureReserve}} = \text{round}(\text{BaseCost} \times R_{\text{failure}})$$

---

## 3. Selling Price, Markup & Reverse Fee Deduction

In digital manufacturing marketplaces, client prices cannot simply be marked up with fees tacked on afterward, because platform commissions and payment processing fees reduce the net earnings of the workshop.

VCUBE implements the **Reverse Variable Fee Formula**:

```
[Ex-Factory CostPrice] ──(+TargetMarkup)──> [Pre-Fee Price] ──(Reverse Division)──> [Raw Selling Price]
                                                                                               │
  ┌───────────────────────────── Deducted at Settlement ───────────────────────────────────────┘
  │
  ├──> Platform Commission    : RawSellingPrice × MarketplaceFee%
  ├──> Payment Gateway Fee    : RawSellingPrice × PaymentGatewayFee%
  ├──> Designer Digital Royalty: RawSellingPrice × DesignerRoyalty%
  └──> Workshop Net Payout    : Remainder covering CostPrice + Workshop Profit
```

### Mathematical Formulation

1. **Pre-Fee Target Selling Price**:
   $$\text{PreFeeSellingPrice} = \text{round}\left(\text{CostPrice} \times \left(1 + \frac{\text{TargetMarkup}\%}{100}\right)\right)$$

2. **Total Variable Fee Rate**:
   $$R_{\text{variableFees}} = \frac{\text{MarketplaceFee}\% + \text{PaymentGatewayFee}\% + \text{DesignerRoyalty}\%}{100}$$

3. **Raw Selling Price**:
   $$\text{RawSellingPrice} = \text{round}\left(\frac{\text{PreFeeSellingPrice}}{1 - R_{\text{variableFees}}}\right)$$

4. **Commercial Rounding Adjustment**:
   Depending on the active configuration (`cfg.roundingRule`), the price is rounded up to clean commercial increments:
   $$\text{FinalSellingPriceRounded} = \begin{cases} 
   \lceil \text{RawSellingPrice} / 1000 \rceil \times 1000, & \text{rule} = \text{'1000'} \\
   \lceil \text{RawSellingPrice} / 5000 \rceil \times 5000, & \text{rule} = \text{'5000'} \\
   \lceil \text{RawSellingPrice} / 10000 \rceil \times 10000, & \text{rule} = \text{'10000'} \\
   \text{RawSellingPrice}, & \text{rule} = \text{'none'}
   \end{cases}$$

5. **Financial Split Settlement**:
   $$\text{PlatformCommissionVnd} = \text{round}(\text{FinalSellingPriceRounded} \times R_{\text{marketplace}})$$
   $$\text{PaymentGatewayFeeVnd} = \text{round}(\text{FinalSellingPriceRounded} \times R_{\text{payment}})$$
   $$\text{DesignerRoyaltyVnd} = \text{round}(\text{FinalSellingPriceRounded} \times R_{\text{royalty}})$$
   $$\text{WorkshopPayoutVnd} = \text{FinalSellingPriceRounded} - (\text{PlatformCommissionVnd} + \text{PaymentGatewayFeeVnd} + \text{DesignerRoyaltyVnd})$$

---

## 4. Volume Discount Schedule

To accommodate B2B batch production runs, the engine evaluates volume discount tiers defined in `pricing_configs.volumeDiscounts`:

```typescript
if (cfg.volumeDiscounts && cfg.volumeDiscounts.length > 0) {
  const matchedTier = cfg.volumeDiscounts.find(
    tier => quantity >= tier.minQty && (tier.maxQty === undefined || quantity <= tier.maxQty)
  );
  if (matchedTier && matchedTier.discountPercent > 0) {
    const discountedUnitPrice = Math.round(finalSellingPriceRounded * (1 - matchedTier.discountPercent / 100));
    const totalOriginal = finalSellingPriceRounded * quantity;
    const totalAfterDiscount = discountedUnitPrice * quantity;
    const totalSavings = totalOriginal - totalAfterDiscount;
  }
}
```

Standard industrial tiers:
- **Tier 1 (1–4 units)**: Standard unit price ($0\%$ discount)
- **Tier 2 (5–19 units)**: Small batch discount ($5\%$ to $10\%$)
- **Tier 3 (20–49 units)**: Production batch discount ($15\%$ to $20\%$)
- **Tier 4 ($\ge 50$ units)**: Industrial volume threshold triggering manual workshop scheduling.

---

## 5. Technology Pricing Profiles

The pricing engine adapts its cost structure across five primary additive manufacturing technologies:

| Parameter | FDM / FFF | SLA / MSLA (Resin) | SLS (Powder Bed) | SLM / DMLS (Metal) | MJF (Multi Jet Fusion) |
|---|---|---|---|---|---|
| **Primary Material Form** | Spooled filament ($1.75\text{ mm}$) | Photopolymer liquid resin | Polyamide powder (PA12) | Reactive metal powder (316L, Ti64) | Polyamide powder + agents |
| **Material Cost Range** | $250\text{k} - 1.8\text{M}$ VND/kg | $700\text{k} - 3.5\text{M}$ VND/kg | $2.5\text{M} - 6.0\text{M}$ VND/kg | $8.0\text{M} - 35.0\text{M}$ VND/kg | $3.5\text{M} - 7.5\text{M}$ VND/kg |
| **Average Machine Power** | $0.15 - 0.35\text{ kW}$ | $0.08 - 0.20\text{ kW}$ | $1.50 - 4.50\text{ kW}$ | $3.50 - 9.00\text{ kW}$ | $2.50 - 6.00\text{ kW}$ |
| **Support Structure Removal**| Mechanical pliers / breakaway | Chisel + UV cure + support snips | Self-supporting powder (0 min) | Wire EDM / bandsaw / CNC milling | Self-supporting powder bead-blasting |
| **Solvent / Wash Finishing** | None (or water-soluble PVA) | IPA alcohol bath ($8\text{k} - 25\text{k}$ VND) | Bead-blasting & air blasting | Inert argon purge + stress relief heat| Automated unpacking station |
| **Consumables Hourly Rate** | $2\text{k} - 5\text{k}$ VND/h (nozzle, PEI) | $8\text{k} - 18\text{k}$ VND/h (FEP vat, LCD) | $25\text{k} - 60\text{k}$ VND/h (nitrogen, IR) | $80\text{k} - 250\text{k}$ VND/h (recoater, Ar) | $35\text{k} - 80\text{k}$ VND/h (printheads) |
| **Typical Failure Reserve** | $8\% - 14\%$ | $10\% - 18\%$ | $6\% - 12\%$ | $15\% - 30\%$ | $5\% - 10\%$ |

---

## 6. Critical Semantics: `unit_price_multiplier` vs Markup Multiplier

> **MANDATORY SYSTEM RULE**:  
> `unit_price_multiplier` is the **unit price derivation coefficient (VND/g)**.  
> It is **STRICTLY PROHIBITED** to use `unit_price_multiplier` as a markup multiplier on the selling price.

This invariant is programmatically audited by the quality gate script:
```bash
node scripts/check-unitprice-multiplier.mjs
```

### Purpose & Mathematical Derivation

When creating or importing material profiles from external catalogs, suppliers often quote materials in **bulk kilogram costs** (`costPerKg`, e.g., 450,000 VND/kg for PETG). However, printing costs are calculated on a **per-gram** basis, incorporating raw inventory carrying costs and localized spool handling.

If `material.pricePerGram` is not directly specified in the database, the engine resolves it using `unitPriceMultiplier`:

```typescript
function resolveMaterialCostPerGram(
  material: MaterialProfile,
  need: MissingParams,
  materialRef: string
): number {
  // 1. Direct price per gram takes highest precedence
  if (typeof material.pricePerGram === 'number' && Number.isFinite(material.pricePerGram)) {
    return material.pricePerGram;
  }
  
  // 2. Derive unit price per gram from costPerKg and unitPriceMultiplier
  if (
    typeof material.costPerKg === 'number' && Number.isFinite(material.costPerKg) &&
    typeof material.unitPriceMultiplier === 'number' && Number.isFinite(material.unitPriceMultiplier)
  ) {
    return Math.round((material.costPerKg / 1000) * material.unitPriceMultiplier);
  }
  
  // 3. Fail-closed: missing both sources stops the calculation
  need.miss(`pricePerGram — Đơn giá nhựa (đ/g) của vật liệu ${materialRef} (hoặc điền costPerKg + unitPriceMultiplier)`);
  return 0;
}
```

- **Example**: If `costPerKg` is $500,000\text{ VND}$ and `unitPriceMultiplier` is $1.20$, the derived cost per gram is:
  $$\text{pricePerGram} = \text{round}\left(\frac{500000}{1000} \times 1.20\right) = 600\text{ VND/g}$$
- **Anti-Pattern Guard**: Multiplying the final selling price or order subtotal by `unit_price_multiplier` would artificially inflate customer invoices and corrupt accounting reconciliation.

---

## 7. Shipping Fees, Value-Added Tax (VAT) & Promotional Discounts

### 1. Shipping Fee Engine (`src/backend/supabase/database.ts: computeShippingFee`)

Shipping charges are computed from a single canonical source across cart, drawer, checkout, and invoices:

```typescript
export const DEFAULT_SALES_RULES = {
  standardShippingFee: 30000,     // 30,000 VND standard rate
  freeShippingThreshold: 300000,  // Free shipping above 300,000 VND
} as const;

export function computeShippingFee(
  subtotalPhysical: number,
  hasPhysicalItems: boolean,
  rules: { standardShippingFee?: number; freeShippingThreshold?: number } = {}
): number {
  // Pure digital CAD assets incur 0 VND shipping fee
  if (!hasPhysicalItems) return 0;
  
  const fee = rules.standardShippingFee ?? DEFAULT_SALES_RULES.standardShippingFee;
  const threshold = rules.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;
  return subtotalPhysical >= threshold ? 0 : fee;
}
```

---

### 2. Value-Added Tax (VAT) Calculation (`src/frontend/lib/vat.ts`)

In accordance with Vietnamese commercial regulations and VCUBE Data Honesty principles:
- **Separation of Tax**: Catalog and quoting prices are listed **exclusive of VAT**. VAT is rendered as a distinct line item on quotations and invoices.
- **Configurable Legal Rate**: Default standard rate is $8\%$ (statutory industrial reduction from $10\%$). The rate is configurable between $0\%$ and $20\%$ in `pricing_global_settings.vat_percent`.
- **Taxable Base**:
  $$\text{TaxableAmount} = \max\left(0, \text{Subtotal} + \text{ShippingFee} - \text{AppliedDiscount}\right)$$
  $$\text{VatAmount} = \text{round}\left(\text{TaxableAmount} \times \frac{\text{VatPercent}}{100}\right)$$
  $$\text{TotalOrderAmount} = \text{TaxableAmount} + \text{VatAmount}$$
- **Unconfigured State Handling**: If `vat_percent` is `null` in `pricing_global_settings`, the application **hides the VAT line entirely** and renders an informative message (*"VAT chưa được cấu hình — đơn chưa được cộng thuế"*). Under no circumstances does the system fabricate a $0\%$ or $8\%$ tax line when unconfigured.

---

### 3. Promotional Codes & Data Honesty

- **Unified Single Source of Truth**: All discounts applied to a session are stored centrally in `useCartStore` (`appliedDiscount`, `appliedPromoCode`), ensuring that discounts applied in the cart drawer remain consistent across checkout and invoice rendering.
- **Strict Voucher Authentication**: Because the production database does not currently host an authenticated public vouchers table, the checkout interface **honestly refuses** arbitrary coupon codes (such as legacy demo strings `TECH3D` or `VCUBE10`). Rather than silently applying fake client-side discounts, the system alerts the user that promotional codes require database verification, preserving 100% financial and audit integrity.
