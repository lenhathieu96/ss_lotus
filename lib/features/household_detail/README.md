# SS Lotus — Business Logic Reference

> **Agents: Read this file first at the start of every session.**
> It describes the complete domain model, all CRUD operations, validation rules, and business invariants for the household management system.

---

## Table of Contents

1. [Domain Model](#1-domain-model)
2. [Household CRUD](#2-household-crud)
3. [Family CRUD](#3-family-crud)
4. [Member CRUD](#4-member-crud)
5. [Appointment Rules](#5-appointment-rules)
6. [Search](#6-search)
7. [Print](#7-print)
8. [State Machine](#8-state-machine)
9. [Firestore Schema](#9-firestore-schema)
10. [Validation Rules Summary](#10-validation-rules-summary)

---

## 1. Domain Model

```
HouseHold                        — top-level unit (hộ khẩu)
  ├── id: int                    — primary key, 1–4 digits
  ├── oldId: int?                — legacy ID from a previous system
  ├── families: List<UserGroup>  — one or more families in this household
  ├── appointment: Appointment?  — optional scheduled event for the household
  └── searchKeywords: List<str>  — denormalized, NFC-normalized search tokens

UserGroup (family)               — a family residing at one address
  ├── id: int                    — equals the household id of its origin
  ├── address: String            — stored UPPERCASE
  └── members: List<User>        — ordered list of buddhist members

User (member / phật tử)
  ├── fullName: String           — stored and displayed UPPERCASE
  ├── christineName: String?     — dharma name, stored UPPERCASE
  └── yob: int?                  — year of birth (optional)

Appointment                      — scheduled event attached to a household
  ├── date: DateTime             — solar calendar date
  ├── period: Period             — morning | afternoon | night | unknown
  └── appointmentType: AppointmentType — ca | cs
```

### Entity Relationships

- A **HouseHold** always has at least **1 family** when it exists in Firestore.
- A **family** (`UserGroup`) tracks its origin via `id`, which matches the household's `id` at split time.
- A **family** can have **0 or more members** during editing, but **saving is blocked if any family has 0 members**.
- A **HouseHold** has at most **1 appointment** at a time. Updating replaces the previous one.

---

## 2. Household CRUD

### 2.1 Select / Load a Household

**Trigger:** User searches for a household and selects one from results.

**Flow:**
1. `SearchHouseholdsDialog` returns the selected `HouseHold` shell (from search index).
2. Provider calls `_repository.getHouseHoldById(id, oldId)`.
3. Firestore fetches the full document from `tdhp/{queryId}` where `queryId = oldId ?? id`.
4. If found, `state.household` is set to the full household.
5. If not found, nothing changes (no error shown).

**Rules:**
- Loading always re-fetches from Firestore (not cached).
- When `oldId` exists, the document is looked up by `oldId`, not `id`.

```dart
// Provider method
void _selectHousehold(HouseHold selectedHousehold) async {
  final household = await _repository.getHouseHoldById(
      selectedHousehold.id, selectedHousehold.oldId);
  if (household != null) {
    state = state.copyWith(household: household);
  }
}
```

### 2.2 Create a New Household

**Trigger:** User opens "Thêm gia đình" with no household loaded, enters address (and optionally a manual ID).

**Flow:**
1. `FamilyAddressDialog` opens with `allowInitHouseHold: true`.
2. User enters address. Optionally taps "Hộ đã tồn tại mã số trước đó?" to reveal an ID field and enters a manual ID.
3. Dialog calls `onAddressUpdated(address, houseHoldId?)`.
4. Provider `_addNewFamily(address, houseHoldId?)`:
   - If no manual ID → calls `_repository.getNextHouseholdId()` (**plain read** of `counters/tdhp` — returns a tentative ID for display only, does **not** write the counter).
   - Creates a new `UserGroup` with the tentative ID and the address.
   - Creates a new `HouseHold` with `id = tentativeId`, `families = [newFamily]`.
   - Sets `state.isNewAutoId = true`.
5. `state.isInitHousehold = true` when a manual ID was provided.
6. **Not yet saved to Firestore** — only local state updated. Save happens on "Lưu thay đổi".

**Rules:**
- Household ID is 1–4 digits (validated in `HouseHoldIdInput`).
- Address is required and non-empty (validated in `AddressInput`).
- When saving with `isInitHousehold = true`, the repository checks if the document already exists → throws `Exception("Mã số này đã tồn tại")` if it does.
- Auto-incremented IDs are **confirmed and committed atomically on save** (see §2.3), not at ID-fetch time. The tentative ID shown in the UI may differ from the final confirmed ID if a concurrent save advanced the counter first.

### 2.3 Save Changes (Update)

**Trigger:** User clicks "Lưu thay đổi" in the footer.

**Preconditions (button is enabled only when):**
- `state.printable == false` (there are unsaved changes)
- No family in the household has 0 members (`hasEmptyFamily == false`)

**Flow:**
1. Provider calls `onSaveChanges()`.
2. Calls `_repository.updateHouseHoldDetailChanged(household, unusedHouseHold, isInitHousehold, isNewAutoId: state.isNewAutoId)`.
3. Repository saves the household and returns the confirmed `HouseHold` (id may differ from tentative if counter advanced concurrently).
4. On success: `state.printable = true`, `state.household = confirmed`, `state.unusedHouseHold = null`, `state.isInitHousehold = false`, `state.isNewAutoId = false`.
5. Shows "Cập nhật thành công" success toast.
6. On error: shows error toast with the exception message.

**Rules:**
- Every save overwrites the full document (not a merge).
- `searchKeywords` are always regenerated on every save.
- If `isInitHousehold == true`, save first checks for document existence and refuses if it already exists.
- If `isNewAutoId == true`, save runs inside a Firestore **transaction** that atomically re-reads the counter, claims the next ID, writes the household doc, and increments the counter — preventing race conditions when multiple users create households simultaneously.

### 2.4 Clear / Close Household

**Trigger:** User clicks the × button in the header.

**Flow:**
- Sets `state.household = null`, returning the screen to empty state.
- No Firestore operation. Unsaved changes are discarded silently.

---

## 3. Family CRUD

A **family** (`UserGroup`) lives inside a household's `families` list. All family operations are local-state changes until "Lưu thay đổi" is pressed.

### 3.1 Add a New Family (to existing household)

**Trigger:** User clicks "Thêm gia đình" when a household is already loaded.

**Flow:**
1. `openAddNewFamilyDialog(context, null, null, false)` — `familyId` and `defaultAddress` are both null, `allowInitHouseHold: false`.
2. Dialog returns address.
3. `_addNewFamily(address, null)` → auto-increments a new ID for the family.
4. Appends new `UserGroup` to `currentHouseHold.families`.
5. `printable = false`.

**Rules:**
- Each family within a household has its own `id` (matching its origin household ID).
- `allowInitHouseHold: false` → no manual ID field shown.
- A new family starts with 0 members; saving will be blocked until at least 1 member is added.

### 3.2 Edit Family Address

**Trigger:** User clicks edit icon on a family card header.

**Flow:**
1. `openAddNewFamilyDialog(context, familyId, currentAddress, false)` — `familyId` and `defaultAddress` are provided.
2. Dialog pre-fills the address.
3. On submit: `_updateFamilyAddress(familyId, newAddress)` updates only that family's address in local state.
4. `printable = false`.

**Rules:**
- Only address can be edited here. Members are managed separately.
- Address is stored UPPERCASE.

### 3.3 Split a Family (into a new household)

**Trigger:** User clicks "Tách" on a family card, confirms in `ConfirmationDialog`.

**Flow:**
1. `openSplitFamilyConfirmDialog(context, familyId)` shows confirmation.
2. On confirm: `_splitFamily(familyId)`:
   - Finds the target family by `id`.
   - Removes it from `currentHouseHold.families`.
   - Calls `_repository.splitFamily(updatedHouseHold, splitFamily)` — **atomic batch write**:
     - Updates `tdhp/{currentHouseholdId}` with the family removed.
     - Creates `tdhp/{splitFamilyId}` as a brand-new household with only the split family.
   - Sets `state.household = null` (clears the view).
   - Shows "Cập nhật thành công" toast.

**Rules:**
- The split family's `id` becomes the new household's `id`.
- Both Firestore writes are in one atomic batch (WriteBatch).
- After split, the current view is cleared — the user must search again to see either household.
- This is the **only family operation that immediately persists** to Firestore (no separate "Save" step needed).

### 3.4 Combine a Family (from another household)

**Trigger:** User clicks "Gộp gia đình" in the header, searches for another household, selects it, confirms.

**Flow:**
1. `openSearchHouseholdsDialog(context, true)` opens search in "combine mode".
2. User selects a household → `openCombineFamilyConfirmDialog(context, selectedHousehold)`.
3. On confirm: `_combineFamily(selectedHousehold)`:
   - Validates: the selected household must have exactly **1 family** (error if >1).
   - Validates: that family's `id` must not already exist in `currentHouseHold.families` (error if duplicate).
   - Appends the selected family to `currentHouseHold.families` in local state.
   - Calls `_repository.combineFamily(updatedHouseHold, removedHouseHold)` — **atomic batch write**:
     - Updates `tdhp/{currentHouseholdId}` with the new family added.
     - **Deletes** `tdhp/{removedHouseholdId}`.
   - Shows "Cập nhật thành công" toast.

**Rules:**
- Source household for combine must have exactly 1 family.
- Cannot combine a family that is already in the current household.
- The source household document is **deleted** from Firestore after combine.
- This operation **immediately persists** to Firestore (no separate save step).
- After combine, `state.household` reflects the merged result (not cleared).

---

## 4. Member CRUD

All member operations are **local-state only** until "Lưu thay đổi" is pressed.

### 4.1 Add a Member

**Trigger:** User clicks "Thêm phật tử" in a family card footer.

**Flow:**
1. `openUpdateUserProfileDialog(context, familyId, null, null)` — `user` and `userIndex` are null.
2. Dialog opens empty form.
3. On submit: `_addNewUser(familyId, user)` appends the new `User` to the family's `members` list.
4. `printable = false`.

**Rules:**
- `fullName` is required and non-empty.
- `christineName` (pháp danh) is optional.
- Both fields are stored UPPERCASE.
- `yob` (year of birth) is optional; not currently exposed in the form but part of the entity.

### 4.2 Edit a Member

**Trigger:** User hovers over a member tile and clicks the edit icon.

**Flow:**
1. `openUpdateUserProfileDialog(context, familyId, existingUser, userIndex)` — both provided.
2. Dialog pre-fills name and dharma name.
3. On submit: `_updateUser(familyId, userIndex, updatedUser)` replaces the member at `userIndex`.
4. `printable = false`.

**Rules:**
- Edit is index-based (position in `family.members`).
- Submitting from either text field (Enter key) or the button triggers save.

### 4.3 Remove a Member

**Trigger:** User hovers over a member tile and clicks the delete icon, confirms in `ConfirmationDialog`.

**Flow:**
1. `openRemoveUserConfirmDialog(context, familyId, userIndex)`.
2. On confirm: `_removeUser(familyId, userIndex)` removes from `family.members` by index.
3. `printable = false`.

**Rules:**
- Removing the last member of a family leaves it empty.
- An empty family **blocks saving** (`hasEmptyFamily` check in footer).

### 4.4 Reorder Members (within a family)

**Trigger:** User drags the `⠿` handle on a member tile up or down within the same family card.

**Flow:**
- Uses Flutter's `ReorderableListView` callback.
- `moveFamilyMember(oldItemIndex, oldFamilyIndex, newItemIndex, newFamilyIndex)` where both family indices are the same.
- Splices the member out and inserts at new index.
- `printable = false`.

### 4.5 Move a Member Between Families (drag & drop)

**Trigger:** User long-presses a member tile and drags it onto a different family card.

**Flow:**
- `LongPressDraggable` carries `_UserDragData(memberIndex, familyIndex)`.
- `DragTarget` on the destination family card accepts the drop.
- `moveFamilyMember(oldItemIndex, oldFamilyIndex, newItemIndex, newFamilyIndex)` where family indices differ.
- Removes from source family, inserts at target position.
- `printable = false`.

**Rules:**
- Cross-family drag uses `LongPressDraggable` (not the reorder handle).
- Within-family reorder uses the `⠿` handle via `ReorderableListView`.
- Both flows go through the same `moveFamilyMember` method.

---

## 5. Appointment Rules

An **appointment** (cầu an) is an optional event attached to the whole household.

### 5.1 Appointment Entity

```dart
Appointment {
  date: DateTime,                   // solar calendar date selected by user
  period: Period,                   // morning | afternoon | night | unknown
  appointmentType: AppointmentType, // ca | cs  (hardcoded to 'ca' in current UI)
}

enum Period { morning, afternoon, night, unknown }
// morning   → "Sáng"
// afternoon → "Chiều"
// night     → "Tối"
// unknown   → "Chùa cúng" (temple offering, no specific time)

enum AppointmentType { ca, cs }
// ca = cầu an (prayer for well-being) — the only type used in the UI currently
```

### 5.2 Register / Update an Appointment

**Trigger:** User clicks "Đăng ký cầu an" (no appointment) or "Đã đăng ký …" (existing appointment) in the header.

**Flow:**
1. `openAppointmentRegistrationDialog(context, existingAppointment)`.
2. Dialog shows:
   - A **lunar calendar** (`TableCalendar`) — cells display **lunar day numbers** (converted from solar via `vnlunar`).
   - Date selection: tap a day. Only today and future dates are enabled.
   - Period selection: `ChoiceChip` row with Sáng / Chiều / Tối / Chùa cúng.
3. Form is valid only when a date is selected (`DateInput` validator: date must not be null).
4. On submit: creates `Appointment(date: selectedDate, period: selectedPeriod, appointmentType: AppointmentType.ca)`.
5. `_updateAppointment(appointment)` sets `state.household.appointment`.
6. `printable = false`.
7. **Not immediately saved** — requires "Lưu thay đổi".

**Rules:**
- **Only future dates (today or later) are selectable** — past days are disabled (`enabledDayPredicate: day >= today - 1`).
- **Period defaults to `Period.morning`** — always has a value (never null after dialog opens).
- **`appointmentType` is hardcoded to `AppointmentType.ca`** in the current UI.
- Updating an appointment replaces the previous one entirely.
- The calendar displays **lunar dates** in every cell (solar date is stored internally).
- The header button label reflects the current appointment: `"Đã đăng ký sáng mồng 15"`.
- `Period.unknown` displays as "Chùa cúng" — used when the household participates in a general temple ceremony with no specific time.

### 5.3 Appointment Display

```dart
// In header — short format (showSeparator: false)
Utils.getAppointmentTitle(appointment, false)
// → "sáng mồng 15"  (lowercase, used inline: "Đã đăng ký sáng mồng 15")

// With separator (showSeparator: true)
Utils.getAppointmentTitle(appointment, true)
// → "Sáng | Mồng 15"

// Period.unknown special case
// → "Chùa cúng" / "chùa cúng"
```

Lunar day conversion:
```dart
Lunar? lunar = Utils.convertToLunarDate(appointment.date);
// lunar.day = lunar day number (e.g. 15)
```

---

## 6. Search

### 6.1 Household Search (SearchHouseholdsDialog)

**Used in two modes:**
1. **Select mode** — user picks a household to view its detail.
2. **Combine mode** — user picks a household whose single family will be merged into the current one.

**Search algorithm:**
1. Input text is NFC-normalized and lowercased.
2. Split on whitespace → `words = ["nguyen", "van", "a"]`.
3. Firestore query: `where('searchKeywords', arrayContains: words[0]).limit(50)`.
4. Client-side filter: for multi-word queries, keep only results where `searchKeywords` contains all words (substring match per word).

**Search index contents (searchKeywords field):**
- Household `id` and `oldId` (as strings)
- Each word from each family address (NFC-normalized, lowercase)
- Each word from each member `fullName` (NFC-normalized, lowercase)

**Rules:**
- Search triggers on text change with debounce (via `debounce.dart`).
- Empty query → clears results immediately.
- Max 50 results returned from Firestore per query.
- Multi-word queries fetch by first word, then filter remaining words client-side.

### 6.2 Search Keywords Regeneration (Backfill)

For admin maintenance — regenerates `searchKeywords` for all documents:
```dart
provider.backfillSearchKeywords()
// Paginates in batches of 100 using startAfterDocument
// Updates each document's searchKeywords field
```

---

## 7. Print

### 7.1 Print Preconditions

The "In" button is enabled only when:
- `state.printable == true` (a successful save has occurred since last edit)
- No family has 0 members

### 7.2 Print Flow

1. Provider `onPrint()`:
   - Loads `NotoSerif-Regular.ttf` and `NotoSerif-Bold.ttf` from assets.
   - Loads `dharmachakra.png` logo from assets.
   - Builds a `pw.Document` using `buildPrintPage(logo, font, boldFont, household)`.
   - Calls `Printing.layoutPdf(...)` → opens browser/native print dialog.
2. PDF layout is defined in `print_view.dart` (`buildPrintPage`).

**Rules:**
- **NotoSerif font is required** for Vietnamese diacritics — Mulish does not render correctly in PDFs.
- Print always reflects the **last saved state**, not the current unsaved edits (since `printable` is only true after save).

---

## 8. State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│  household = null                                               │
│  EMPTY STATE                                                    │
│  • Search bar visible, "Thêm gia đình mới" visible              │
│  • Footer hidden                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │  selectHousehold() or _addNewFamily()
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  household = HouseHold(...)   printable = false                 │
│  EDITING STATE                                                  │
│  • "Lưu thay đổi" ENABLED   • "In" DISABLED                    │
│  Any edit keeps printable = false                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │  onSaveChanges() success
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  household = HouseHold(...)   printable = true                  │
│  SAVED STATE                                                    │
│  • "Lưu thay đổi" DISABLED   • "In" ENABLED (if no empty fam.) │
└───────────────────────────┬─────────────────────────────────────┘
                            │  any edit → printable = false
                            └──────────────────► back to EDITING
```

### Button Enable Logic

| Button | Enabled when |
|---|---|
| Lưu thay đổi | `!printable && !hasEmptyFamily` |
| In | `printable && !hasEmptyFamily` |

---

## 9. Firestore Schema

### Collection: `tdhp`
Document ID: `{householdId}` as string

```json
{
  "id": 123,
  "oldId": 45,
  "families": [
    {
      "id": 123,
      "address": "SỐ 10 LÊ LỢI, PHƯỜNG 1",
      "members": [
        {
          "fullName": "NGUYỄN VĂN AN",
          "christineName": "THIỆN TÂM",
          "yob": 1975
        }
      ]
    }
  ],
  "appointment": {
    "date": "2025-03-15T00:00:00.000",
    "period": "morning",
    "appointmentType": "ca"
  },
  "searchKeywords": ["123", "45", "số", "10", "lê", "lợi", "nguyễn", "văn", "an", "thiện", "tâm"]
}
```

### Collection: `counters`
Document ID: `tdhp`

```json
{ "lastId": 456 }
```

### Firestore Operations Reference

| Operation | Method | Atomicity |
|---|---|---|
| Read household | `get(doc)` | Single read |
| Create/Update household | `set(doc)` | Single write |
| Split family | `batch.set × 2` | Atomic batch |
| Combine family | `batch.set + batch.delete` | Atomic batch |
| Auto-increment ID | `runTransaction` | Atomic transaction |
| Backfill keywords | `batch.update × N` | Per-batch atomic |

---

## 10. Validation Rules Summary

| Field | Rule |
|---|---|
| Household ID (manual) | 1–4 digits only (`^\d{1,4}$`) |
| Household ID (uniqueness) | Must not exist in Firestore when `isInitHousehold = true` |
| Family address | Required, non-empty; stored UPPERCASE |
| Member fullName | Required, non-empty; stored UPPERCASE |
| Member christineName | Optional; stored UPPERCASE if provided |
| Appointment date | Required (blocks submit); today or future only |
| Appointment period | Always valid (defaults to `morning`) |
| Save blocked | `printable == true` OR any family has 0 members |
| Combine blocked | Source household has >1 family, OR family already exists in current household |
