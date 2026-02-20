import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';

part 'household_detail_repository.g.dart';

abstract class HouseHoldDetailRepositoryProtocol {
  Future splitFamily(HouseHold currentHouseHold, UserGroup splitFamily);
  Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold);
  Future<HouseHold> updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      HouseHold? unusedHouseHold, bool isInitHousehold,
      {bool isNewAutoId = false});
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
  Future splitFamily(HouseHold updatedHouseHold, UserGroup splitFamily) async {
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
      HouseHold? unusedHouseHold, bool isInitHousehold,
      {bool isNewAutoId = false}) async {
    final counterRef = db.collection('counters').doc(householdRef.id);

    if (isNewAutoId) {
      late HouseHold confirmedHousehold;
      await db.runTransaction((transaction) async {
        final counterSnap = await transaction.get(counterRef);
        final confirmedId = counterSnap.exists
            ? ((counterSnap.data()!['lastId'] as int) + 1)
            : 1;

        confirmedHousehold = updatedHouseHold.id == confirmedId
            ? updatedHouseHold
            : updatedHouseHold.copyWith(
                families: updatedHouseHold.families
                    .map((f) => f.copyWith(id: confirmedId))
                    .toList(),
                id: confirmedId,
              );

        final docRef = householdRef.doc(confirmedId.toString());
        transaction.set(docRef, _toJsonWithKeywords(confirmedHousehold));
        transaction.set(
            counterRef, {'lastId': confirmedId}, SetOptions(merge: true));
      });
      return confirmedHousehold;
    }

    final docRef = householdRef.doc(updatedHouseHold.id.toString());
    if (isInitHousehold) {
      final docSnapshot = await docRef.get();
      if (docSnapshot.exists) {
        throw Exception("Mã số này đã tồn tại");
      }
    }
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
