# Firestore Skill

Cloud Firestore CRUD patterns, repository protocol, batch writes, and counters for SS Lotus.

---

## Collection Structure

```
Firestore
├── tdhp/                        # Household records collection
│   └── {householdId}/           # Document ID = household.id (as string)
│       ├── id: int
│       ├── oldId: int?
│       ├── families: [...UserGroup]
│       ├── appointment: Appointment?
│       └── searchKeywords: [...string]
└── counters/
    └── tdhp/                    # Auto-increment counter for householdId
        └── lastId: int
```

---

## Repository Protocol

Always depend on the abstract protocol, not the concrete class:

```dart
abstract class HouseHoldDetailRepositoryProtocol {
  Future splitFamily(HouseHold currentHouseHold, UserGroup splitFamily);
  Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold);
  Future updateHouseHoldDetailChanged(
      HouseHold updatedHouseHold, HouseHold? unusedHouseHold, bool isInitHousehold);
  Future createHouseHold(HouseHold houseHold);
  Future<HouseHold?> getHouseHoldById(int id, int? oldId);
  Future<int> getNextHouseholdId();
  Future<void> backfillSearchKeywords();
}
```

Riverpod provider:
```dart
@riverpod
HouseHoldDetailRepositoryProtocol houseHoldDetailRepository(Ref ref) {
  return HouseholdDetailRepository();
}
```

---

## Reading a Document

```dart
Future<HouseHold?> getHouseHoldById(int id, int? oldId) async {
  int queryId = oldId ?? id;
  final doc = await householdRef.doc(queryId.toString()).get();
  if (!doc.exists) return null;
  return HouseHold.fromJson(doc.data() as Map<String, dynamic>);
}
```

---

## Writing / Updating a Document

Always include `searchKeywords` when writing, using the helper:

```dart
Map<String, dynamic> _toJsonWithKeywords(HouseHold household) {
  final json = household.toJson();
  json['searchKeywords'] = HouseHold.buildSearchKeywords(household);
  return json;
}

// Write (overwrite)
await householdRef
    .doc(household.id.toString())
    .set(_toJsonWithKeywords(household));

// Merge (partial update)
await householdRef
    .doc(household.id.toString())
    .set(_toJsonWithKeywords(household), SetOptions(merge: true));
```

---

## Batch Writes

Use `WriteBatch` for atomic multi-document operations:

```dart
// Split: update current + create new
Future splitFamily(HouseHold updatedHouseHold, UserGroup splitFamily) async {
  final WriteBatch batch = db.batch();
  final splitHousehold = HouseHold(id: splitFamily.id, families: [splitFamily]);

  batch.set(householdRef.doc(updatedHouseHold.id.toString()),
      _toJsonWithKeywords(updatedHouseHold), SetOptions(merge: true));
  batch.set(householdRef.doc(splitFamily.id.toString()),
      _toJsonWithKeywords(splitHousehold));

  await batch.commit();
}

// Combine: update current + delete other
Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold) async {
  final WriteBatch batch = db.batch();

  batch.set(householdRef.doc(updatedHouseHold.id.toString()),
      _toJsonWithKeywords(updatedHouseHold), SetOptions(merge: true));
  batch.delete(householdRef.doc(removedHouseHold.id.toString()));

  await batch.commit();
}
```

---

## Auto-Increment Counter

The counter document tracks the last used household ID. Always use a transaction to prevent race conditions:

```dart
Future<int> getNextHouseholdId() async {
  final counterRef = db.collection('counters').doc(householdRef.id);

  return await db.runTransaction<int>((transaction) async {
    final snapshot = await transaction.get(counterRef);
    final nextId =
        snapshot.exists ? ((snapshot.data()!['lastId'] as int) + 1) : 1;
    transaction.set(counterRef, {'lastId': nextId}, SetOptions(merge: true));
    return nextId;
  });
}
```

---

## Checking for Existing Document

Check existence before creating to prevent duplicates:

```dart
Future updateHouseHoldDetailChanged(
    HouseHold updatedHouseHold, HouseHold? unusedHouseHold, bool isInitHousehold) async {
  final docRef = householdRef.doc(updatedHouseHold.id.toString());

  if (isInitHousehold) {
    final docSnapshot = await docRef.get();
    if (docSnapshot.exists) {
      throw Exception("Mã số này đã tồn tại");
    }
  }
  await docRef.set(_toJsonWithKeywords(updatedHouseHold));
}
```

---

## Bulk/Backfill Operations

For large updates, paginate using `startAfterDocument`:

```dart
Future<void> backfillSearchKeywords() async {
  int batchSize = 100;
  DocumentSnapshot? lastDoc;

  while (true) {
    Query query = householdRef.orderBy('id').limit(batchSize);
    if (lastDoc != null) query = query.startAfterDocument(lastDoc);

    final snapshot = await query.get();
    if (snapshot.docs.isEmpty) break;

    final batch = db.batch();
    for (final doc in snapshot.docs) {
      final household = HouseHold.fromJson(doc.data() as Map<String, dynamic>);
      batch.update(doc.reference, {
        'searchKeywords': HouseHold.buildSearchKeywords(household),
      });
    }
    await batch.commit();
    lastDoc = snapshot.docs.last;
  }
}
```

---

## Search Keywords

`HouseHold.buildSearchKeywords` builds a flat list of normalized, lowercase tokens from the household's IDs, family addresses, and member names:

```dart
// Automatically includes:
// - household id and oldId
// - Each word in each family address (NFC-normalized, lowercase)
// - Each word in each member's fullName (NFC-normalized, lowercase)

List<String> keywords = HouseHold.buildSearchKeywords(household);
// → ["123", "15", "quang trung", "nguyen van a", ...]
```

Always regenerate these when writing:
```dart
json['searchKeywords'] = HouseHold.buildSearchKeywords(household);
```
