# VCUBE icon migration map (Material Symbols -> lucide-react)

Scope: every `<span className="material-symbols-outlined">` in `src/**/*.tsx` - **213** distinct glyph names across **696** render sites in **69** files. Target: `lucide-react@0.546.0` (already a dependency).

Every lucide name below was checked against the real exports in `node_modules/lucide-react/dist/lucide-react.d.ts`. 0.546.0 has **dropped the legacy aliases**, so only these canonical names work: `CheckCircle`, `AlertTriangle`, `AlertCircle`, `XCircle`, `PlusCircle`, `Filter`, `HelpCircle`, `Home`, `UploadCloud`, `FileEdit`, `Wand2`, `BarChart3`, `KanbanSquare`, `PieChart`, `Verified`, `CheckSquare`, `Storefront` are **not** exported any more.

## How to use

Mechanical rule, applied per site:

```diff
- <span className="material-symbols-outlined text-base">check_circle</span>
+ <CircleCheck size={18} aria-hidden />
```

```ts
import { CircleCheck } from 'lucide-react';
```

1. **Import** the export named in the `lucide export` column (named import; `NO-EQUIVALENT` rows must not be imported).
2. **Delete** the `material-symbols-outlined` class and the glyph text node - the icon is no longer a string, it is a component.
3. **Keep** colour (`text-[#00687A]`, `text-emerald-600`), opacity, `shrink-0`, `absolute ...`, `animate-spin`, `group-hover:*`, `transition-*` - put them on the lucide svg.
4. **Drop** the font-size class; pass `size={n}` instead.

### size prop

| class in current code | px | lucide |
| --- | ---: | --- |
| `text-xs` | 14 | `size={14}` |
| `text-sm` | 16 | `size={16}` |
| `text-base` | 18 | `size={18}` |
| `text-lg` | 20 | `size={20}` |
| `text-xl` | 24 | `size={24}` |
| `text-2xl` | 28 | `size={28}` |
| `text-3xl` | 30 | `size={30}` |
| `text-4xl` | 36 | `size={36}` |
| `text-5xl` | 48 | `size={48}` |
| `text-[20px]` | 20 | `size={20}` |
| `text-[18px]` | 18 | `size={18}` |
| `text-[16px]` | 16 | `size={16}` |
| `text-[14px]` | 14 | `size={14}` |
| `text-[13px]` | 13 | `size={13}` |
| `text-[12px]` | 12 | `size={12}` |
| `text-[11px]` | 11 | `size={12}` |
| `text-[10px]` | 10 | `size={12}` (legibility floor: anything under 12px rounds up to 12) |
| `text-[26px]` | 26 | `size={26}` |
| `text-[28px]` | 28 | `size={28}` |
| `sm:text-xl` | 24 at >=640px | omit `size` and use `<X className="size-5 sm:size-6" />` - CSS width/height beats the svg attributes |
| (no size class) | 24 | `size={24}` (`src/index.css` set 24px on the old class) |

**Caveat - today those `text-*` sizes are inert.** `.material-symbols-outlined { font-size: 24px }` sits at top level in `src/index.css` (line 260) while Tailwind utilities live in `@layer utilities`; unlayered rules win, so every Material icon currently paints at 24px whatever `text-*` class it carries. Switching to `<Icon size={n} />` makes the sizes real, so most icons will shrink - migrate file by file and eyeball each screen.

Also set `strokeWidth={1.5}` (closest to the old `'wght' 300`, avoids lucide's default 2 looking heavier) - ideally in one local `Icon` wrapper that also fixes `aria-hidden`.

### aria rules

- **Icon-only control** (button or link whose only child is the icon): the control carries the accessible name - `aria-label` (reuse the existing `t(...)` / `isVi` string, otherwise the tooltip string) - and the icon is `aria-hidden`. Sites: `close` (51), `delete` (11), `edit`, `search`, `visibility` / `visibility_off`, `fullscreen` / `fullscreen_exit`, `chevron_left` / `chevron_right`, `arrow_drop_up` / `arrow_drop_down`, `menu`, `add`, `download`, `refresh`, `drag_pan`, `horizontal_distribute`, `open_in_full`, `fit_screen`.
- **Decorative icon next to a text label**: `aria-hidden`. lucide 0.546 sets neither `role` nor `aria-hidden`, so pass it every time.
- **Icon that is the only carrier of meaning** (status badges, validation rows, toasts): never leave it silent - add `aria-label` on the svg or keep adjacent text. Applies to `error`, `warning`, `check_circle`, `info`, `verified`, `progress_activity`.
- Do not add `role="img"` unless you also give it an accessible name.

## Summary

- **213** distinct Material Symbols names, **696** render sites, **69** `.tsx` files.
- **208 / 213 (97.7 %)** have a direct single-icon lucide equivalent.
- **A2e (Stage B) đối chiếu lại `src/frontend/ui/iconMap.ts` với bảng dưới đây**: 4 glyph
  (`cleaning_services`, `folder_off`, `link_off`, `thermostat`) có trong `iconMap.ts` nhưng **thiếu** trong
  bảng gốc — đã bổ sung. `help` map sang `CircleQuestionMark` (lucide 0.546 **không** export `CircleHelp`).
- **5** are `NO-EQUIVALENT` and need a composed or inline-SVG solution (last section).
- Every icon value is covered: sites with nested ternaries fan out to 2-4 branches each, and 12 sites resolve through data-driven `.icon` lists (3-16 candidates each).
- Dead code: 2 of the 69 files - `src/app/auth/login/page.tsx` and `src/app/auth/register/page.tsx` - are in the `src/app/**` Next tree already excluded by `tsconfig.json` (line 46); 17 sites. Delete the tree or migrate it last.
- Delete in the same change: `index.html` line 11 (the `Material+Symbols+Outlined` `<link>`) and `src/index.css` lines 260-279 (`.material-symbols-outlined` and `.material-symbols-outlined.fill`).

## Mapping table

| Material Symbols | usages | lucide export | size in current code | notes |
| --- | ---: | --- | --- | --- |
| `close` | 51 | `X` | text-xl x17, text-xs x10 | lucide `X`; 51 sites, mostly icon-only dismiss buttons - every one needs `aria-label`. |
| `precision_manufacturing` | 39 | `Factory` | text-sm x13, text-lg x7 | `Factory`; also the value inside `CATEGORIES[1]` and the admin "production" nav entry, so keep one shared constant. |
| `verified` | 25 | `BadgeCheck` | text-sm x9, text-base x5 | `BadgeCheck`; 0.546 has no `Verified` export and no `CheckCircle` alias. |
| `view_in_ar` | 19 | `Box` | text-xs x5, text-lg x3 | `Box`; identical meaning to `deployed_code` - merge both onto one component. |
| `check_circle` | 18 | `CircleCheck` | text-base x8, text-sm x5 | `CircleCheck` (the `CheckCircle` alias is gone in 0.546). |
| `layers` | 18 | `Layers` | text-sm x7, text-xs x4 | - |
| `search` | 18 | `Search` | text-sm x11, text-base x6 | - |
| `tune` | 18 | `SlidersHorizontal` | text-base x5, text-lg x5 | `SlidersHorizontal` (the Material glyph is a horizontal equaliser, not vertical sliders). |
| `arrow_forward` | 16 | `ArrowRight` | text-sm x7, text-base x4 | - |
| `print` | 14 | `Printer` | text-lg x5, text-sm x4 | - |
| `receipt_long` | 14 | `ReceiptText` | text-base x4, text-sm x4 | `ReceiptText`; there is no `ReceiptLong` export. |
| `warning` | 13 | `TriangleAlert` | text-sm x3, text-lg x2 | `TriangleAlert` (`AlertTriangle` alias removed in 0.546). |
| `delete` | 11 | `Trash2` | text-sm x5, text-xs x3 | `Trash2`; icon-only row actions - `aria-label`. |
| `inventory_2` | 11 | `Package` | text-lg x3, text-base x3 | `Package`; same target as `inventory` - use one component for both. |
| `lock` | 11 | `Lock` | text-[20px] x3, text-lg x3 | `Lock`; also the password-field adornment, sized `text-[20px]`. |
| `check` | 10 | `Check` | text-xs x4, text-sm x4 | - |
| `sync` | 10 | `RefreshCw` | text-sm x9, text-2xl x1 | `RefreshCw`; one site adds `animate-spin` - keep the class on the svg. |
| `download` | 9 | `Download` | text-sm x7, text-xs x1 | - |
| `edit` | 9 | `Pencil` | text-sm x4, text-xs x3 | `Pencil`; keep distinct from `edit_note` (document + pencil). |
| `local_shipping` | 9 | `Truck` | text-sm x4, text-base x3 | - |
| `palette` | 9 | `Palette` | text-sm x3, text-base x2 | - |
| `calculate` | 8 | `Calculator` | text-base x2, text-lg x2 | - |
| `extension` | 8 | `Puzzle` | text-sm x3, text-lg x2 | - |
| `info` | 8 | `Info` | text-base x5, text-lg x2 | - |
| `person` | 8 | `User` | text-lg x4, text-base x2 | - |
| `storefront` | 8 | `Store` | text-sm x4, text-lg x2 | - |
| `upload_file` | 8 | `FileUp` | text-base x3, text-3xl x1 | - |
| `draw` | 7 | `PenTool` | text-lg x4, sm:text-xl x1 | `PenTool`; same as `design_services`. |
| `factory` | 7 | `Factory` | text-lg x3, text-sm x2 | - |
| `mail` | 7 | `Mail` | text-lg x4, text-[20px] x2 | - |
| `payments` | 7 | `Banknote` | text-xl x2, text-base x2 | - |
| `shelves` | 7 | `Warehouse` | text-lg x3, text-sm x2 | no shelving glyph in lucide; `Warehouse` is the nearest (racking). |
| `straighten` | 7 | `Ruler` | text-sm x3, text-base x2 | - |
| `verified_user` | 7 | `ShieldCheck` | text-xl x1, text-[20px] x1 | `ShieldCheck` (shield + check). |
| `visibility` | 7 | `Eye` | text-[20px] x2, text-lg x2 | `Eye`; password reveal, icon-only - `aria-label` required. |
| `add` | 6 | `Plus` | text-sm x6 | `Plus`; 6 sites, all icon-only buttons - `aria-label`. |
| `add_circle` | 6 | `CirclePlus` | text-sm x3, text-base x2 | `CirclePlus`. |
| `error` | 6 | `CircleAlert` | text-base x4, text-lg x2 | `CircleAlert`; pairs with `warning` in toast/validation rows, keep the two colours. |
| `logout` | 6 | `LogOut` | text-sm x5, text-base x1 | `LogOut`. |
| `visibility_off` | 6 | `EyeOff` | text-lg x2, text-[20px] x2 | `EyeOff`; password hide, icon-only - `aria-label` required. |
| `3d_rotation` | 5 | `Rotate3d` | text-sm x3, text-xl x2 | - |
| `arrow_back` | 5 | `ArrowLeft` | text-sm x3, text-base x1 | - |
| `badge` | 5 | `IdCard` | text-sm x3, text-[20px] x1 | `IdCard`. |
| `category` | 5 | `Shapes` | text-xs x2, text-sm x2 | `Shapes` (circle + square + triangle). |
| `dashboard` | 5 | `LayoutDashboard` | text-lg x3, sm:text-xl x1 | - |
| `design_services` | 5 | `PenTool` | text-base x2, text-sm x1 | `PenTool`; same as `draw` - both are the "designer" role glyph. |
| `person_add` | 5 | `UserPlus` | text-sm x1, text-[26px] x1 | - |
| `save` | 5 | `Save` | text-sm x3, text-base x2 | - |
| `travel_explore` | 5 | `Globe` | text-lg x2, text-xl x1 | `Globe`; the magnifier of the original glyph is dropped. |
| `admin_panel_settings` | 4 | `ShieldUser` | text-base x2, text-sm x1 | `ShieldUser`; admin vs designer is distinguished by colour, not glyph. |
| `domain` | 4 | `Building2` | text-base x1, text-sm x1 | - |
| `explore` | 4 | `Compass` | text-base x2, text-sm x2 | - |
| `login` | 4 | `LogIn` | text-sm x2, text-base x1 | - |
| `request_quote` | 4 | `FileText` | text-sm x3, text-base x1 | `FileText`; lucide has no quote-document glyph - overlay `DollarSign` only if the `$` carries meaning. |
| `restart_alt` | 4 | `RotateCcw` | text-sm x3, text-xs x1 | `RotateCcw`; same as `replay`. |
| `settings` | 4 | `Settings` | text-lg x2, sm:text-xl x1 | - |
| `share` | 4 | `Share2` | text-base x3 | - |
| `shopping_cart` | 4 | `ShoppingCart` | text-xl x1, text-2xl x1 | - |
| `trending_up` | 4 | `TrendingUp` | text-base x2, text-sm x1 | - |
| `360` | 3 | `LoaderCircle` | text-base x2, text-sm x1 | `LoaderCircle`; every usage already carries `animate-spin`, so this is a spinner, not a rotation glyph. |
| `account_balance_wallet` | 3 | `Wallet` | text-xl x1, text-2xl x1 | `Wallet`. |
| `add_shopping_cart` | 3 | **NO-EQUIVALENT** | text-base x3 | NO-EQUIVALENT - see "Icons needing a decision". |
| `apartment` | 3 | `Building` | text-sm x1, text-2xl x1 | `Building`. |
| `bolt` | 3 | `Zap` | text-base x2, text-xl x1 | - |
| `bookmark` | 3 | `Bookmark` | text-base x3 | state pair with `bookmark_border`: one `Bookmark`, `fill="currentColor"` when active. |
| `bookmark_border` | 3 | `Bookmark` | text-base x3 | state pair with `bookmark`: plain outline `Bookmark`. The old code passed the class `fill-1`, defined nowhere, so the filled state never rendered. |
| `chat` | 3 | `MessageCircle` | text-base x1 | - |
| `cloud_upload` | 3 | `CloudUpload` | text-base x1, text-2xl x1 | `CloudUpload` (`UploadCloud` alias removed in 0.546). |
| `construction` | 3 | `Construction` | text-sm x1, text-xs x1 | `Construction`. |
| `description` | 3 | `FileText` | text-sm x3 | - |
| `developer_board` | 3 | `CircuitBoard` | text-sm x1, text-2xl x1 | `CircuitBoard`. |
| `edit_note` | 3 | `FilePen` | text-sm x2, text-base x1 | `FilePen` (`FileEdit` alias removed in 0.546). |
| `engineering` | 3 | `HardHat` | text-base x2, text-xs x1 | `HardHat` (person in hard hat + wrench). |
| `folder_zip` | 3 | `FolderArchive` | text-base x1, text-xl x1 | - |
| `fullscreen` | 3 | `Maximize` | text-base x3 | `Maximize`; icon-only toolbar button - `aria-label`. |
| `fullscreen_exit` | 3 | `Minimize` | text-base x3 | `Minimize`; icon-only toolbar button - `aria-label`. |
| `grid_view` | 3 | `LayoutGrid` | text-xs x1, text-base x1 | - |
| `hub` | 3 | `Waypoints` | text-sm x2 | `Waypoints` (centre node with spokes). |
| `manage_accounts` | 3 | `UserCog` | text-lg x3, sm:text-xl x1 | - |
| `refresh` | 3 | `RefreshCw` | text-sm x3 | - |
| `schedule` | 3 | `Clock` | text-sm x2, text-xs x1 | - |
| `account_balance` | 2 | `Landmark` | text-sm x1, text-2xl x1 | `Landmark`. |
| `account_circle` | 2 | `CircleUser` | text-base x1, text-[20px] x1 | `CircleUser`. |
| `account_tree` | 2 | `Network` | text-sm x1, text-base x1 | `Network`. |
| `add_business` | 2 | `Store` | text-sm x1, text-lg x1 | `Store`; the `+` is dropped (acceptable, the button label says "add"). |
| `auto_awesome` | 2 | `Sparkles` | text-base x1, text-sm x1 | - |
| `build` | 2 | `Wrench` | text-[14px] x1, text-sm x1 | - |
| `campaign` | 2 | `Megaphone` | text-base x1 | - |
| `center_focus_strong` | 2 | `Focus` | text-base x2 | `Focus`. |
| `check_box` | 2 | `SquareCheck` | text-sm x2 | state pair with `check_box_outline_blank`; keep the two-component toggle, or render `Square` + conditional `Check`. |
| `check_box_outline_blank` | 2 | `Square` | text-sm x2 | state pair with `check_box` -> `Square`. |
| `chevron_left` | 2 | `ChevronLeft` | text-lg x2 | - |
| `chevron_right` | 2 | `ChevronRight` | text-lg x2 | - |
| `content_copy` | 2 | `Copy` | text-xs x1, text-sm x1 | - |
| `corporate_fare` | 2 | `Building` | text-sm x1, text-base x1 | `Building`. |
| `deployed_code` | 2 | `Box` | text-base x1, text-xl x1 | `Box`; merge with `view_in_ar`. |
| `fact_check` | 2 | `ClipboardCheck` | text-lg x1, text-base x1 | - |
| `folder_open` | 2 | `FolderOpen` | text-base x1, text-sm x1 | - |
| `grid_4x4` | 2 | `Grid3x3` | text-base x2 | `Grid3x3` - lucide has no 4x4 grid, this is the nearest. |
| `home` | 2 | `House` | text-base x1, text-sm x1 | `House` (the `Home` alias is gone in 0.546). |
| `inventory` | 2 | `Package` | text-sm x1, text-xs x1 | - |
| `link` | 2 | `Link` | text-base x1, text-sm x1 | - |
| `lock_reset` | 2 | **NO-EQUIVALENT** | text-lg x2 | NO-EQUIVALENT - see "Icons needing a decision". |
| `menu` | 2 | `Menu` | text-2xl x1, text-xl x1 | - |
| `open_in_new` | 2 | `ExternalLink` | text-sm x1, text-xs x1 | - |
| `replay` | 2 | `RotateCcw` | text-sm x2 | `RotateCcw`; same as `restart_alt`. |
| `route` | 2 | `Route` | text-xs x2 | - |
| `science` | 2 | `FlaskConical` | text-xs x1, text-sm x1 | - |
| `search_off` | 2 | `SearchX` | text-xl x1, text-3xl x1 | - |
| `select_all` | 2 | `SquareDashedMousePointer` | text-sm x1, text-xs x1 | `SquareDashedMousePointer` (`BoxSelect` and `MousePointerSquareDashed` are not exported in 0.546). |
| `sell` | 2 | `Tag` | text-sm x1, text-xs x1 | `Tag`; same as `tag`. |
| `send` | 2 | `Send` | text-sm x1, text-base x1 | - |
| `sensors` | 2 | `Radio` | text-base x1, text-sm x1 | - |
| `share_location` | 2 | `MapPin` | text-xl x1, text-lg x1 | `MapPin`; the share arrow is dropped, and `MapPin` already covers `location_on` and `pin_drop`. |
| `shield` | 2 | `Shield` | text-sm x2 | - |
| `shopping_bag` | 2 | `ShoppingBag` | text-base x2 | - |
| `smart_toy` | 2 | `Bot` | text-xs x1 | - |
| `support_agent` | 2 | `Headset` | text-lg x1, text-sm x1 | `Headset`. |
| `swap_horiz` | 2 | `ArrowLeftRight` | text-sm x2 | `ArrowLeftRight`; same as `compare_arrows`. |
| `vertical_align_top` | 2 | `ArrowUpToLine` | text-sm x2 | `ArrowUpToLine`; pair with `vertical_align_bottom` -> `ArrowDownToLine`. |
| `view_carousel` | 2 | `GalleryHorizontal` | text-base x1 | `GalleryHorizontal`. |
| `wb_incandescent` | 2 | `Lightbulb` | text-sm x1, text-xs x1 | `Lightbulb`. |
| `ads_click` | 1 | `MousePointerClick` | text-base x1 | - |
| `analytics` | 1 | `ChartLine` | text-xs x1 | `ChartLine`; same as `query_stats`. |
| `arrow_downward` | 1 | `ArrowDown` | text-sm x1 | - |
| `arrow_drop_down` | 1 | `ChevronDown` | text-xs x1 | `ChevronDown`; same target as `expand_more`. |
| `arrow_drop_up` | 1 | `ChevronUp` | text-xs x1 | `ChevronUp`. |
| `arrow_upward` | 1 | `ArrowUp` | text-xs x1 | - |
| `attachment` | 1 | `Paperclip` | text-lg x1 | - |
| `auto_fix_high` | 1 | `WandSparkles` | text-sm x1 | `WandSparkles` (`Wand2` alias removed in 0.546). |
| `bar_chart` | 1 | `ChartColumn` | text-base x1 | `ChartColumn` (`BarChart3` alias removed in 0.546). |
| `call` | 1 | `Phone` | text-[14px] x1 | - |
| `call_split` | 1 | `Split` | text-xs x1 | - |
| `cancel` | 1 | `CircleX` | text-lg x1 | - |
| `celebration` | 1 | `PartyPopper` | text-xs x1 | `PartyPopper`. |
| `cleaning_services` | 1 | `SprayCan` | - (chi trong `iconMap`/du lieu) | A2e bo sung: thieu trong bang goc. |
| `cloud_sync` | 1 | **NO-EQUIVALENT** | text-xs x1 | NO-EQUIVALENT - see "Icons needing a decision". |
| `code` | 1 | `Code` | 24px default | - |
| `colorize` | 1 | `Pipette` | text-xs x1 | - |
| `compare_arrows` | 1 | `ArrowLeftRight` | text-sm x1 | `ArrowLeftRight`; same as `swap_horiz`. |
| `confirmation_number` | 1 | `Ticket` | text-base x1 | `Ticket`. |
| `crop_square` | 1 | `Square` | text-base x1 | `Square`; this is a camera-mode indicator, not a checkbox. |
| `desktop_windows` | 1 | `Monitor` | text-sm x1 | - |
| `done` | 1 | `Check` | text-xs x1 | - |
| `drag_pan` | 1 | `Hand` | text-xs x1 | `Hand`. |
| `event` | 1 | `Calendar` | text-sm x1 | - |
| `expand_more` | 1 | `ChevronDown` | text-base x1 | `ChevronDown`; same target as `arrow_drop_down`. |
| `filter_alt` | 1 | `Funnel` | text-sm x1 | `Funnel` (`Filter` is no longer exported in 0.546). |
| `filter_center_focus` | 1 | `Scan` | text-sm x1 | `Scan`. |
| `fit_screen` | 1 | `Scaling` | text-sm x1 | - |
| `flare` | 1 | `Sparkle` | text-base x1 | `Sparkle` (single 4-point star), vs `Sparkles` for `auto_awesome`. |
| `folder_off` | 1 | `FolderX` | - (chi trong `iconMap`/du lieu) | A2e bo sung: thieu trong bang goc. |
| `format_color_fill` | 1 | `PaintBucket` | text-sm x1 | `PaintBucket`. |
| `format_list_bulleted` | 1 | `List` | text-lg x1 | - |
| `format_paint` | 1 | `PaintRoller` | text-xs x1 | `PaintRoller`. |
| `functions` | 1 | `Sigma` | text-sm x1 | - |
| `group` | 1 | `Users` | text-sm x1 | `Users`. |
| `handshake` | 1 | `Handshake` | text-xl x1 | - |
| `handyman` | 1 | `Wrench` | text-sm x1 | - |
| `help` | 1 | `CircleQuestionMark` | text-sm x1 | - |
| `hexagon` | 1 | `Hexagon` | text-xl x1 | - |
| `home_pin` | 1 | `MapPinHouse` | text-[14px] x1 | `MapPinHouse`. |
| `home_repair_service` | 1 | `Hammer` | text-sm x1 | `Hammer`. |
| `home_work` | 1 | `Building2` | text-base x1 | `Building2`. |
| `horizontal_distribute` | 1 | `AlignHorizontalSpaceAround` | text-sm x1 | `AlignHorizontalSpaceAround`; 3D-toolbar distribute action, icon-only - `aria-label`. |
| `hourglass_empty` | 1 | `Hourglass` | text-sm x1 | state pair with `hourglass_top`: one `Hourglass`, differentiate by colour/animation, not glyph. |
| `hourglass_top` | 1 | `Hourglass` | text-base x1 | state pair with `hourglass_empty`; this is the in-progress state. |
| `image` | 1 | `Image` | text-sm x1 | - |
| `inbox` | 1 | `Inbox` | text-xl x1 | - |
| `join_inner` | 1 | `Blend` | text-xs x1 | `Blend` (two overlapping circles). |
| `key` | 1 | `Key` | text-sm x1 | - |
| `lens_blur` | 1 | `Aperture` | text-xs x1 | `Aperture`. |
| `license` | 1 | `FileBadge` | text-xs x1 | `FileBadge`. |
| `linear_scale` | 1 | `SlidersHorizontal` | text-lg x1 | `SlidersHorizontal`; used as a slider/range control. |
| `link_off` | 1 | `Unlink` | - (chi trong `iconMap`/du lieu) | A2e bo sung: thieu trong bang goc. |
| `local_fire_department` | 1 | `Flame` | text-xs x1 | - |
| `location_on` | 1 | `MapPin` | text-xs x1 | `MapPin`. |
| `memory` | 1 | `Cpu` | text-xs x1 | `Cpu`. |
| `navigate_next` | 1 | `ChevronRight` | text-[16px] x1 | - |
| `notifications_active` | 1 | `BellRing` | 24px default | `BellRing`. |
| `open_in_full` | 1 | `Expand` | text-xs x1 | `Expand`. |
| `pending_actions` | 1 | `ClipboardList` | text-[12px] x1 | `ClipboardList`. |
| `percent` | 1 | `Percent` | text-base x1 | - |
| `photo_camera` | 1 | `Camera` | text-base x1 | - |
| `photo_library` | 1 | `Images` | text-sm x1 | `Images`. |
| `pie_chart` | 1 | `ChartPie` | 24px default | `ChartPie` (`PieChart` alias removed in 0.546). |
| `pin_drop` | 1 | `MapPin` | text-[14px] x1 | `MapPin`. |
| `policy` | 1 | `ScrollText` | text-base x1 | `ScrollText`. |
| `preview` | 1 | `Eye` | 24px default | `Eye`; same target as `visibility`. |
| `price_check` | 1 | `BadgeDollarSign` | text-sm x1 | `BadgeDollarSign`. |
| `production_quantity_limits` | 1 | `PackageX` | text-sm x1 | `PackageX`. |
| `progress_activity` | 1 | `LoaderCircle` | text-3xl x1 | `LoaderCircle`; pair with `animate-spin` (this is a spinner). |
| `qr_code_2` | 1 | `QrCode` | text-xl x1 | - |
| `query_stats` | 1 | `ChartLine` | text-base x1 | `ChartLine`; same as `analytics`. |
| `remove_shopping_cart` | 1 | **NO-EQUIVALENT** | text-3xl x1 | NO-EQUIVALENT - see "Icons needing a decision". |
| `rocket_launch` | 1 | `Rocket` | text-base x1 | - |
| `rotate_right` | 1 | `RotateCw` | text-xs x1 | - |
| `schema` | 1 | `Workflow` | text-base x1 | `Workflow`; `account_tree` already takes `Network`. |
| `security` | 1 | `ShieldCheck` | text-base x1 | `ShieldCheck`; same as `verified_user`. |
| `shield_person` | 1 | `ShieldUser` | text-sm x1 | `ShieldUser`; same as `admin_panel_settings`. |
| `smartphone` | 1 | `Smartphone` | text-sm x1 | - |
| `speed` | 1 | `Gauge` | text-xs x1 | - |
| `square_foot` | 1 | **NO-EQUIVALENT** | text-base x1 | NO-EQUIVALENT - see "Icons needing a decision". |
| `store` | 1 | `Store` | text-xs x1 | - |
| `table_rows` | 1 | `Table` | text-sm x1 | `Table`. |
| `tag` | 1 | `Tag` | text-sm x1 | `Tag`; same as `sell`. |
| `thermostat` | 1 | `Thermometer` | - (chi trong `iconMap`/du lieu) | A2e bo sung: thieu trong bang goc. |
| `timer` | 1 | `Timer` | text-xs x1 | - |
| `title` | 1 | `Type` | text-base x1 | `Type`. |
| `token` | 1 | `Coins` | text-xs x1 | `Coins`. |
| `touch_app` | 1 | `Pointer` | text-sm x1 | `Pointer`. |
| `transform` | 1 | `Move3d` | text-base x1 | `Move3d`. |
| `vertical_align_bottom` | 1 | `ArrowDownToLine` | text-base x1 | `ArrowDownToLine`. |
| `view_kanban` | 1 | `SquareKanban` | text-sm x1 | `SquareKanban` (`KanbanSquare` alias removed in 0.546). |
| `view_list` | 1 | `List` | text-base x1 | - |
| `view_timeline` | 1 | `ChartGantt` | text-sm x1 | `ChartGantt`. |
| `warehouse` | 1 | `Warehouse` | text-[13px] x1 | `Warehouse`; same as `shelves` - consider one shared glyph. |

## Files by usage

Top 25 by render-site count - migrate in this order.

| # | file | icon usages |
| ---: | --- | ---: |
| 1 | `src/frontend/components/AuthModal.tsx` | 35 |
| 2 | `src/frontend/views/HomeView.tsx` | 35 |
| 3 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx` | 34 |
| 4 | `src/frontend/components/admin/PricingConfigPanel.tsx` | 29 |
| 5 | `src/frontend/views/ExploreView.tsx` | 29 |
| 6 | `src/frontend/views/DesignerDashboardView.tsx` | 25 |
| 7 | `src/frontend/views/PersonalizeView.tsx` | 21 |
| 8 | `src/frontend/components/admin/groups/Group3CustomersPanel.tsx` | 20 |
| 9 | `src/frontend/components/admin/AdminOverviewPanel.tsx` | 18 |
| 10 | `src/frontend/components/admin/AdminSeoPanel.tsx` | 18 |
| 11 | `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` | 17 |
| 12 | `src/frontend/components/auth/UserAvatarMenu.tsx` | 17 |
| 13 | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx` | 16 |
| 14 | `src/frontend/components/tool3d/ModelViewer3D.tsx` | 15 |
| 15 | `src/frontend/views/ProductDetailView.tsx` | 15 |
| 16 | `src/frontend/views/CartView.tsx` | 14 |
| 17 | `src/frontend/components/admin/AdminPartnersPanel.tsx` | 13 |
| 18 | `src/frontend/components/admin/AdminStorefrontPanel.tsx` | 13 |
| 19 | `src/frontend/views/RegisterView.tsx` | 13 |
| 20 | `src/frontend/views/Tool3DView.tsx` | 13 |
| 21 | `src/frontend/views/MyOrdersView.tsx` | 12 |
| 22 | `src/frontend/components/admin/AccessoriesManager.tsx` | 11 |
| 23 | `src/frontend/components/Header.tsx` | 11 |
| 24 | `src/frontend/components/tool3d/InstantQuoteWidget.tsx` | 11 |
| 25 | `src/app/auth/register/page.tsx` | 11 |

Files that look light by site count but carry **data-driven icon lists** - these `.icon` string fields must become component references (`icon: Factory`), not names, and be rendered as `<item.icon size={18} aria-hidden />`:

| file | icon values |
| --- | ---: |
| `src/data/mockData.ts` (`CATEGORIES`, `POPULAR_TAGS`) | 16 |
| `src/frontend/components/admin/AdminSidebar.tsx` | 16 |
| `src/frontend/views/AdminDashboardView.tsx` (`currentMeta`) | 16 |
| `src/frontend/components/OrderProgress.tsx` | 8 |
| `src/stores/useProductionStore.ts` (stage list) | 8 |
| `src/frontend/components/Header.tsx` (`navItems`) | 5 |
| `src/frontend/components/admin/AdminUsersPanel.tsx` | 5 |
| `src/frontend/views/DesignerDashboardView.tsx` | 5 |
| `src/frontend/views/PersonalizeView.tsx` (`modes`) | 3 |

## Icons needing a decision

lucide has no equivalent for these 5; each needs a small local component (compose two lucide icons, or one inline SVG).

| Material Symbols | usages | what it draws | recommendation |
| --- | ---: | --- | --- |
| `add_shopping_cart` | 3 | Cart outline with a `+` at the top-right | Compose: `<ShoppingCart/>` plus a `size={10}` `<Plus/>` at the top-right inside a relative wrapper. Keeps stroke weight consistent, cleaner than hand-rolled SVG. |
| `remove_shopping_cart` | 1 | Cart outline with an `x` at the top-right (empty-cart state, `text-3xl`) | Compose: `<ShoppingCart/>` + `<X size={10}/>` in the same wrapper. If the empty state already carries "your cart is empty" copy, plain `<ShoppingCart className="opacity-40"/>` is enough. |
| `cloud_sync` | 1 | Cloud with a circular sync arrow | Compose: `<Cloud/>` + `<RefreshCw size={10}/>` overlay. If the cloud is only decoration next to "sync" copy, plain `<RefreshCw/>` is acceptable. |
| `lock_reset` | 2 | Padlock with a counter-clockwise reset arrow (reset-password, `text-lg`) | Compose: `<Lock/>` + `<RotateCcw size={10}/>` overlay, or use `<KeyRound/>` if a key reads better for "reset password". Inline SVG alternative, described: shackle path `M7 11V8a5 5 0 0 1 10 0v3`, a lock-body `rect`, and a reset arc `M3 13a3 3 0 0 0 3 3h` with a small arrowhead. |
| `square_foot` | 1 | Square with a diagonal and two dimension arrowheads (an area / footprint spec glyph) | Inline SVG, described: square `M4 4h16v16H4z`, diagonal `M4 20 20 4`, plus two small solid arrowheads at the ends of the diagonal pointing outward along it. Fallback: reuse `<Ruler/>` (the `straighten` target) and accept that area and length then look identical. |

### State pairs that need no new glyph

These are two Material names for one control; in lucide use **one component plus a fill/colour/child change** instead of two glyphs.

| pair | lucide | how to express the state |
| --- | --- | --- |
| `bookmark` / `bookmark_border` | `Bookmark` | `fill={isBookmarked ? 'currentColor' : 'none'}`. The old code passed the class `fill-1`, which is defined nowhere (`src/index.css` defines `.material-symbols-outlined.fill`), so the bookmarked fill never rendered - the migration is the fix. |
| `check_box` / `check_box_outline_blank` | `SquareCheck` / `Square` | Keep the two-component toggle, or render `Square` and nest a conditional `<Check/>`. |
| `visibility` / `visibility_off` | `Eye` / `EyeOff` | Two components, as today. |
| `fullscreen` / `fullscreen_exit` | `Maximize` / `Minimize` | Two components, as today. |
| `arrow_drop_down` / `arrow_drop_up` | `ChevronDown` / `ChevronUp` | Two components; or collapse into one `ChevronDown` with `className="rotate-180"`. |
| `hourglass_top` / `hourglass_empty` | `Hourglass` | One glyph; mark the running state with colour plus `animate-pulse`, not a second icon. |
| `progress_activity` / `360` | `LoaderCircle` | One glyph plus `animate-spin` - both are spinners in the current code. |
| `chevron_left` / `chevron_right` | `ChevronLeft` / `ChevronRight` | Two components; collapse to one with `rotate-180` for the sidebar collapse toggle. |