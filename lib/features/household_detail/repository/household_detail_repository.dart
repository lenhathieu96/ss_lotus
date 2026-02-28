import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/family.dart';

part 'household_detail_repository.g.dart';

abstract class HouseHoldDetailRepositoryProtocol {
  Future splitFamily(HouseHold currentHouseHold, Family splitFamily);
  Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold);
  Future<HouseHold> updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      {bool isNewHousehold = false, int pendingNewFamilyCount = 0});
  Future createHouseHold(HouseHold houseHold);
  Future<HouseHold?> getHouseHoldById(int id, int? oldId);
  Future<int> getNextHouseholdId();
}

class HouseholdDetailRepository implements HouseHoldDetailRepositoryProtocol {
  final FirebaseFirestore db = FirebaseFirestore.instance;
  final CollectionReference householdRef =
      FirebaseFirestore.instance.collection("tdhp");

  Map<String, dynamic> _toJsonWithKeywords(HouseHold household) {
    final json = household.toJson();
    json['searchKeywords'] = HouseHold.buildSearchKeywords(household);
    return json;
  }

  @override
  Future<HouseHold?> getHouseHoldById(int id, int? oldId) async {
    final doc = await householdRef.doc(id.toString()).get();
    if (!doc.exists) return null;
    return HouseHold.fromJson(doc.data() as Map<String, dynamic>);
  }

  @override
  Future splitFamily(HouseHold updatedHouseHold, Family splitFamily) async {
    final WriteBatch batch = db.batch();
    final splitHousehold =
        HouseHold(id: splitFamily.id, families: [splitFamily]);

    batch.set(householdRef.doc(updatedHouseHold.id.toString()),
        _toJsonWithKeywords(updatedHouseHold), SetOptions(merge: true));
    batch.set(householdRef.doc(splitFamily.id.toString()),
        _toJsonWithKeywords(splitHousehold));

    await batch.commit();
  }

  @override
  Future<HouseHold> updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      {bool isNewHousehold = false, int pendingNewFamilyCount = 0}) async {
    final counterRef = db.collection('counters').doc(householdRef.id);

    if (isNewHousehold || pendingNewFamilyCount > 0) {
      // Atomically claim one counter slot per new family so every family gets
      // a globally-unique id regardless of concurrent writes.
      late HouseHold confirmedHousehold;

      await db.runTransaction((transaction) async {
        final counterSnap = await transaction.get(counterRef);
        final lastId =
            counterSnap.exists ? (counterSnap.data()!['lastId'] as int) : 0;

        late List<Family> confirmedFamilies;

        final int slotsToclaim;

        if (isNewHousehold) {
          // All families are new: assign sequential slots starting at lastId+1.
          // The household id takes the first slot.
          slotsToclaim = updatedHouseHold.families.length;
          confirmedFamilies = List.generate(slotsToclaim, (i) {
            return updatedHouseHold.families[i].copyWith(id: lastId + 1 + i);
          });
          confirmedHousehold = updatedHouseHold.copyWith(
            id: lastId + 1,
            families: confirmedFamilies,
          );
          transaction.set(
              householdRef.doc((lastId + 1).toString()),
              _toJsonWithKeywords(confirmedHousehold));
        } else {
          // Existing household: only the trailing pendingNewFamilyCount
          // families need fresh counter slots; existing families keep their ids.
          slotsToclaim = pendingNewFamilyCount;
          final existingCount =
              updatedHouseHold.families.length - pendingNewFamilyCount;
          confirmedFamilies = List<Family>.from(updatedHouseHold.families);
          for (int i = 0; i < pendingNewFamilyCount; i++) {
            confirmedFamilies[existingCount + i] =
                confirmedFamilies[existingCount + i]
                    .copyWith(id: lastId + 1 + i);
          }
          confirmedHousehold =
              updatedHouseHold.copyWith(families: confirmedFamilies);
          transaction.set(
              householdRef.doc(updatedHouseHold.id.toString()),
              _toJsonWithKeywords(confirmedHousehold));
        }

        transaction.set(
            counterRef,
            {'lastId': lastId + slotsToclaim},
            SetOptions(merge: true));
      });

      return confirmedHousehold;
    }

    // No new families: plain overwrite.
    final docRef = householdRef.doc(updatedHouseHold.id.toString());
    await docRef.set(_toJsonWithKeywords(updatedHouseHold));
    return updatedHouseHold;
  }

  @override
  Future combineFamily(
      HouseHold updatedHouseHold, HouseHold removedHouseHold) async {
    final WriteBatch batch = db.batch();

    batch.set(householdRef.doc(updatedHouseHold.id.toString()),
        _toJsonWithKeywords(updatedHouseHold), SetOptions(merge: true));
    batch.delete(householdRef.doc(removedHouseHold.id.toString()));

    await batch.commit();
  }

  @override
  Future createHouseHold(HouseHold houseHold) async {
    final docRef = householdRef.doc(houseHold.id.toString());
    final docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      await docRef.set(_toJsonWithKeywords(houseHold));
    }
  }

  @override
  Future<int> getNextHouseholdId() async {
    // Counter doc is keyed by the group/collection name (e.g. "tdhp")
    final counterRef = db.collection('counters').doc(householdRef.id);

    final snapshot = await counterRef.get();
    return snapshot.exists ? ((snapshot.data()!['lastId'] as int) + 1) : 1;
  }
}

@riverpod
HouseHoldDetailRepositoryProtocol houseHoldDetailRepository(Ref ref) {
  return HouseholdDetailRepository();
}
