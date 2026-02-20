import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';

part 'household_detail_repository.g.dart';

abstract class HouseHoldDetailRepositoryProtocol {
  Future splitFamily(HouseHold currentHouseHold, UserGroup splitFamily);
  Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold);
  Future updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      HouseHold? unusedHouseHold, bool isInitHousehold);
  Future createHouseHold(HouseHold houseHold);
  Future<HouseHold?> getHouseHoldById(int id, int? oldId);
  Future<int> getNextHouseholdId();
  Future<void> backfillSearchKeywords();
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
    int queryId = oldId ?? id;
    final doc = await householdRef.doc(queryId.toString()).get();
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
  Future updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      HouseHold? unusedHouseHold, bool isInitHousehold) async {
    final docRef = householdRef.doc(updatedHouseHold.id.toString());

    if (isInitHousehold) {
      final docSnapshot = await docRef.get();
      if (docSnapshot.exists) {
        throw Exception("Mã số này đã tồn tại");
      }
    }
    await householdRef
        .doc(updatedHouseHold.id.toString())
        .set(_toJsonWithKeywords(updatedHouseHold));
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

    return await db.runTransaction<int>((transaction) async {
      final snapshot = await transaction.get(counterRef);
      final nextId =
          snapshot.exists ? ((snapshot.data()!['lastId'] as int) + 1) : 1;
      transaction.set(counterRef, {'lastId': nextId}, SetOptions(merge: true));
      return nextId;
    });
  }

  @override
  Future<void> backfillSearchKeywords() async {
    int batchSize = 100;
    DocumentSnapshot? lastDoc;
    int processedCount = 0;

    while (true) {
      Query query = householdRef.orderBy('id').limit(batchSize);
      if (lastDoc != null) query = query.startAfterDocument(lastDoc);

      final snapshot = await query.get();
      if (snapshot.docs.isEmpty) break;

      final batch = db.batch();
      for (final doc in snapshot.docs) {
        final household =
            HouseHold.fromJson(doc.data() as Map<String, dynamic>);
        batch.update(doc.reference, {
          'searchKeywords': HouseHold.buildSearchKeywords(household),
        });
      }
      await batch.commit();
      processedCount += snapshot.docs.length;
      lastDoc = snapshot.docs.last;
      debugPrint("Backfilled $processedCount documents...");
    }
  }
}

@riverpod
HouseHoldDetailRepositoryProtocol houseHoldDetailRepository(Ref ref) {
  return HouseholdDetailRepository();
}
