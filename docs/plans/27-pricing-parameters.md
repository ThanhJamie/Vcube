> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 27 — Thông số giá: cái gì đang cứng, và bảng anh cần điền

> Lập 2026-09-21, theo yêu cầu: *"base báo giá dựa trên các công thức trong inkiri.vn/3d-calc-cost/, có thể tham khảo, nhưng thông số cần được điều chỉnh lại cho riêng nền tảng tôi"*.
> Tôi đã đọc trang đó và đọc code thật. Kết luận ngay dưới đây.

---

## §1. Kết luận: **cấu trúc đã đúng, giá trị thì chưa phải của anh**

### Đã đúng (không cần làm lại)
Engine **đã mô phỏng đủ bộ tham số của Inkiri**, chia đúng 10 nhóm: điện năng · nhân công theo từng bước (phút) · đóng gói & vật tư · khấu hao máy · dự phòng in hỏng · biên lợi nhuận (Markup/Margin) · phí sàn & cổng thanh toán & bản quyền · chiết khấu theo số lượng · phí tuỳ biến · hằng số slicing. Có cả mô hình theo từng **máy in** (công suất kW, tuổi thọ, giá mua) và từng **vật liệu** (giá/kg, màu) và **phụ kiện/packaging** (số lượng/pack, giá/pack) — y như tab trong Inkiri.

⇒ **Base công thức giữ nguyên.** Không cần viết lại.

### 🔴 Ba vấn đề phải sửa
| # | Vấn đề | Bằng chứng |
|---|---|---|
| **P1** | **Giá trị mặc định là số của Inkiri, không phải của anh** | `src/data/mockData.ts:82` — `DEFAULT_INKIRI_FORMULA_CONFIG` hardcode: điện **2.850**, nhân công **65.000**, đóng gói **12.000**, overhead **15.000**, khấu hao **4.375/h**, markup **35%**, phí nền tảng **8%**, cổng thanh toán **2.5%**, bản quyền **5%**, 5 bậc chiết khấu, khắc **50.000**, logo **80.000**, tiết kiệm **−10%**, hoả tốc **+30%**, support **16%**, brim **6g**, thay màu **1.5 phút**, purge **28g**, fast estimator **45.000** |
| **P2** | 🔴 **~30 thông số CÒN có fallback cứng ngay trong engine** — anh xoá ô trong `/admin` thì engine **âm thầm dùng số của Inkiri**, không báo gì | `pricingEngine.ts`: `?? 1.5` (233) · `?? 28` (235) · `?? 16` (239) · `?? 6` (242) · `?? 4` (269) · `?? 5` (270) · `?? 8` (271) · `?? 6` (272) · `?? 4` (273) · `?? 3` (274) · `?? 5000` (280) · `?? 8000` (281) · `?? 8/6/5/4` (289-306) · `?? 8/2.5/5` (316-318) · `?? 10/30` (579-580) — **và** theo từng máy/vật liệu: `\|\| 850`, `\|\| 0.18`, `\|\| 8000`, `\|\| 35000000`, `\|\| 2500` (245-261), layer height `\|\| 0.2` (249) |
| **P3** | 🔴 **Luật theo `id` — sẽ im lặng không chạy trên nền tảng của anh** | `pricingEngine.ts:305` — vật liệu khó nhận diện bằng **chuỗi con trong id**: `id.includes('nylon'\|'resin'\|'pa-cf')` ⇒ +4%. Nếu id vật liệu của anh khác, luật này **không bao giờ chạy và không báo lỗi**. Và `:678-680` gắn **nhãn quảng cáo bịa theo id máy Inkiri**: `'bambu-x1c'`→"Nhanh Nhất", `'anycubic-kobra-max'`→"Rẻ Nhất", `'formlabs-form-4'`→"Lợi Nhuận Tối Đa" — vừa sai cho nền tảng anh, vừa là **tuyên bố bịa** (ta không đo gì để nói "nhanh nhất") |

Thêm 4 thứ cứng ngoài config: `FIXED_PACKAGING_BASE = 12000` và `FIXED_OVERHEAD_PER_UNIT = 15000` là **hằng số export trong mã** (`:17-18`, không nằm trong config nào) · ngưỡng miễn phí ship tính theo `subtotalPhysical` (`database.ts:32-39`) · ngưỡng cảnh báo `quantity >= 50 \|\| total >= 15.000.000` (`:448`) · `supportsMode==='none' ? 2` phút (`:271`).

---

## §2. Bảng thông số anh cần điền (cột cuối để trống — điền số của anh)

Đây là **6 nhóm, 34 thông số**. Cột "Inkiri" là giá trị đang chạy ngầm hôm nay; **số của anh** là cái tôi sẽ đưa vào `/admin` để anh sửa được.

### Nhóm 1 — Điện & nhân công
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `electricityRatePerKWh` | Giá điện (đ/kWh) | 2.850 | |
| `laborHourlyRate` | Lương giờ (đ) | 65.000 | |

### Nhóm 2 — Thời gian công mỗi đơn (phút)
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `fileReviewLaborMinutes` | Kiểm tra slicing & mesh | 4 | |
| `setupLaborMinutes` | Chuẩn bị máy, xịt keo | 5 | |
| `supportRemovalMinutes` | Bóc support | 8 | |
| `postProcessingLaborMinutes` | Mài nhẵn / deburring | 6 | |
| `qcLaborMinutes` | Đo kiểm kích thước | 4 | |
| `packagingLaborMinutes` | Đóng gói | 3 | |
| *(mới)* | Bóc support khi **không** có support | 2 (cứng) | |

### Nhóm 3 — Đóng gói & vật tư phụ
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `fixedPackagingCost` | Hộp, xốp, túi hút ẩm | 12.000 | |
| `multiColorPackagingExtra` | Phụ phí bảo vệ chi tiết màu | 5.000 | |
| `ipaSolventCost` | Cồn IPA / sấy UV | 8.000 | |
| `overheadPerUnit` | Mặt bằng, phần mềm, internet | 15.000 | |

### Nhóm 4 — Máy in (mặc định + theo từng máy)
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `defaultMachineDepreciationPerHour` | Khấu hao máy mặc định (đ/h) | 4.375 | |
| `powerKW` *(theo máy)* | Công suất trung bình khi in | 0.18 (cứng) | |
| `expectedLifetimeHours` *(theo máy)* | Tuổi thọ (giờ) | 8.000 (cứng) | |
| `acquisitionCost` *(theo máy)* | Giá mua (đ) | 35.000.000 (cứng) | |
| `consumablesHourlyRate` *(theo máy)* | Vật tư tiêu hao (đ/h) | 2.500 (cứng) | |

### Nhóm 5 — Biên lợi nhuận & phí
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `defaultMarkupPercent` | Tỷ lệ lợi nhuận (%) | 35 | |
| `profitMode` | Markup (lãi trên vốn) hay Margin (lãi trên giá bán) | Markup | |
| `baseFailureReservePercent` | Dự phòng in hỏng cơ bản (%) | 8 | |
| `lowPrintabilityExtraPercent` | Cộng thêm nếu điểm khả in thấp (%) | 6 | |
| `multiColorExtraPercent` | Cộng thêm khi in nhiều màu (%) | 5 | |
| `difficultMaterialExtraPercent` | Cộng thêm cho vật liệu khó (%) | 4 | |
| `platformCommissionPercent` | Phí nền tảng (%) | 8 | |
| `paymentGatewayFeePercent` | Phí cổng thanh toán (%) | 2.5 | |
| `designerRoyaltyPercent` | Bản quyền designer (%) | 5 | |
| `roundingRule` | Làm tròn giá bán | lên 1.000đ | |
| `freeShippingThreshold` | Miễn phí ship từ (đ) | chưa cấu hình | |
| *(mới)* | Ngưỡng cảnh báo đơn lớn (số lượng / số tiền) | 50 chiếc / 15.000.000 | |

### Nhóm 6 — Chiết khấu số lượng, gói giao, phí tuỳ biến, hằng số slicing
| Thông số | Ý nghĩa | Inkiri | **Số của anh** |
|---|---|---|---|
| `volumeDiscounts` | 5 bậc: 1-4 → 0% · 5-9 → 8% · 10-24 → 15% · 25-49 → 22% · 50+ → 30% | như bên | |
| `economyDiscountPercent` | Giảm cho gói Tiết kiệm (%) | 10 | |
| `expressRushSurchargePercent` | Phụ thu gói Hoả tốc (%) | 30 | |
| `customEngravingFee` | Phí khắc chữ (đ) | 50.000 | |
| `customLogoUploadFee` | Phí up logo (đ) | 80.000 | |
| `supportVolumeRatioPercent` | Tỷ lệ khối lượng support (%) | 16 | |
| `brimRaftGrams` | Gram brim/raft | 6 | |
| `multiColorToolChangeMins` | Phút mỗi lần thay màu | 1.5 | |
| `multiColorPurgeWasteGrams` | Gram purge mỗi màu thêm | 28 | |
| `fastEstimatorBaseOverhead` | Overhead cơ bản cho ước lượng nhanh (đ) | 45.000 | |

> **Anh không cần điền hết ngay.** Điền 6 số quan trọng nhất trước cũng đủ chạy đúng: **giá điện · lương giờ · markup% · phí nền tảng% · bản quyền% · dự phòng hỏng%**. Còn lại tôi để trống và hệ thống **sẽ chặn tính giá** thay vì âm thầm dùng số Inkiri.

---

## §3. Nguyên tắc tôi sẽ áp (thay cho việc đoán hộ)

1. **Bỏ mọi fallback cứng trong engine.** Thông số chưa có giá trị ⇒ **chặn tính giá** (`PricingUnavailableError`, nêu tên thông số thiếu) — **không** rơi về số của Inkiri. Đây là cùng nguyên tắc đã áp cho `electricity_rate_vnd`/`labor_hourly_rate_vnd`.
2. **Đưa 2 hằng số export vào config**: `FIXED_PACKAGING_BASE`, `FIXED_OVERHEAD_PER_UNIT`.
3. **Bỏ luật theo `id`**: vật liệu khó chuyển thành **trường trên từng vật liệu** (ví dụ `failure_extra_percent`), để anh bật/tắt theo vật liệu thật của mình. Nhãn quảng cáo máy (`"Nhanh Nhất"`/`"Rẻ Nhất"`/`"Lợi Nhuận Tối Đa"`) **xoá** — ta không đo gì để nói câu đó.
4. **`DEFAULT_INKIRI_FORMULA_CONFIG` không được là nguồn giá trị.** Nó chỉ còn là *mẫu tham khảo* để admin nhìn thấy "cấu trúc gồm những gì"; giá trị thật đọc từ DB.
5. **Một nguồn sự thật**: `pricing_configs` (đang là nơi lưu live, và `/admin` đã có trạng thái "CHƯA CẤU HÌNH" trung thực). Xoá nhóm hàm ghi legacy sai cột trong `workshopService.ts` (đã kiểm: **0 caller**, code chết).
6. **Mọi ô đều hiện trong `/admin`** kèm đơn vị và giải thích ngắn, và **cảnh báo khi bật ô này làm ô khác mất tác dụng**.

---

## §4. Việc đang làm
Đã giao một agent chuyên trách: bỏ fallback cứng (P2) · đưa 2 hằng số vào config · bỏ luật theo `id` (P3) · nối toàn bộ thông số vào `/admin` · xoá nhóm ghi legacy. **Không đổi cấu trúc công thức** — chỉ đổi **nguồn thông số**, đúng như anh yêu cầu.

**Chưa cần anh làm gì.** Khi agent xong, tôi sẽ đưa lại đúng bảng §2 ở dạng có thể điền trực tiếp trong `/admin`.
