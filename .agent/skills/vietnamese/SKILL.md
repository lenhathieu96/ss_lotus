# Vietnamese Skill

Vietnamese localization, lunar calendar, toast messages, and text conventions for SS Lotus.

---

## Vietnamese Text Conventions

- Member names are stored and displayed in **UPPERCASE** (`user.fullName.toUpperCase()`)
- Dharma names (`christineName`) are also stored in UPPERCASE
- All UI labels are in Vietnamese (no English UI strings)
- Search keywords use `unorm_dart` for NFC normalization before lowercasing

---

## Common Vietnamese Labels

| Context | Vietnamese |
|---|---|
| Save button | Lưu thay đổi |
| Print button | In |
| Cancel | Không |
| Confirm | Có |
| Add new | Thêm mới |
| Update | Cập nhập |
| Delete | Xoá |
| Split family | Tách gia đình |
| Combine family | Gộp gia đình |
| Full name field | Tên |
| Dharma name field | Pháp danh |
| Address field | Địa chỉ |
| Member | Phật tử |
| Family | Gia đình |
| Household | Hộ |
| Household ID | Mã số hộ |
| Appointment | Lịch hẹn |

---

## Toast Messages

All user feedback uses `Utils.showToast`:

```dart
import 'package:ss_lotus/utils/utils.dart';
import 'package:ss_lotus/entities/common.enum.dart';

// Success
Utils.showToast("Cập nhập thành công", ToastStatus.success);

// Error
Utils.showToast("Mã số này đã tồn tại", ToastStatus.error);
Utils.showToast("Hộ được chọn có nhiều hơn 1 gia đình", ToastStatus.error);
Utils.showToast("Gia đình đã tồn tại trong hộ", ToastStatus.error);

// Firestore error (strip the "Exception:" prefix)
Utils.showToast(e.toString().replaceFirst("Exception:", ""), ToastStatus.error);
```

---

## Lunar Calendar

The app uses the Vietnamese lunar calendar for appointment display via the `vnlunar` package.

### Convert solar date to lunar

```dart
import 'package:ss_lotus/utils/utils.dart';

// Returns a string like "15/01 Âm lịch"
String lunarDate = Utils.convertToLunarDate(DateTime.now());
```

### Period enum

```dart
// lib/entities/common.enum.dart
enum Period { morning, afternoon, evening }
```

```dart
// Convert Period to Vietnamese text
String periodTitle = Utils.getPeriodTitle(Period.morning);
// → "Sáng" / "Chiều" / "Tối"
```

### Appointment title

```dart
// Full formatted appointment title (lunar date + period)
String title = Utils.getAppointmentTitle(appointment);
// → e.g. "Sáng 15/01 Âm lịch"
```

---

## Unicode Normalization for Search

When building search keywords, always NFC-normalize Vietnamese text:

```dart
import 'package:unorm_dart/unorm_dart.dart' as unorm;

final normalized = unorm.nfc(text.toLowerCase());
final words = normalized.split(RegExp(r'\s+'));
```

This ensures that Vietnamese characters with combining diacritics (e.g., `Nguyễn`) are consistently indexed and searchable regardless of how the input was composed.

---

## Date Formatting

The app uses `intl` with Vietnamese locale:

```dart
import 'package:intl/intl.dart';

// Initialize in main.dart (already done)
await initializeDateFormatting();

// Format dates
DateFormat('dd/MM/yyyy').format(date);
DateFormat.yMMMMd('vi').format(date);  // Vietnamese locale
```
