import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';

part 'household_detail_repository.g.dart';

abstract class HouseHoldDetailRepositoryProtocol {
  Future migrateDB();
  Future splitFamily(HouseHold currentHouseHold, UserGroup splitFamily);
  Future combineFamily(HouseHold updatedHouseHold, HouseHold removedHouseHold);
  Future updateHouseHoldDetailChanged(HouseHold updatedHouseHold,
      HouseHold? unusedHouseHold, bool isInitHousehold);
  Future createHouseHold(HouseHold houseHold);
  Future<HouseHold?> getHouseHoldById(int id);
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
  Future<HouseHold?> getHouseHoldById(int id) async {
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
  Future migrateDB() async {
    int batchSize = 100;
    DocumentSnapshot? lastDoc;
    int processedCount = 0;

    while (true) {
      Query query = FirebaseFirestore.instance
          .collection("pagoda/TDHP/families")
          .orderBy("id")
          .limit(batchSize);

      if (lastDoc != null) {
        query = query.startAfterDocument(lastDoc);
      }

      QuerySnapshot querySnapshot = await query.get();
      List<DocumentSnapshot> documents = querySnapshot.docs;

      if (documents.isEmpty) break;

      List<HouseHold> formattedData = documents
          .map((doc) {
            try {
              return HouseHold.fromJson(doc.data() as Map<String, dynamic>);
            } catch (e) {
              debugPrint("Error parsing document ID: ${doc.id}, Error: $e");
              return null;
            }
          })
          .whereType<HouseHold>()
          .toList();
      WriteBatch batch = db.batch();
      for (var formattedDoc in formattedData) {
        batch.set(householdRef.doc(formattedDoc.id.toString()),
            _toJsonWithKeywords(formattedDoc), SetOptions(merge: true));
      }

      await batch.commit();
      processedCount += formattedData.length;

      debugPrint("Processed $processedCount documents...");

      lastDoc = documents.last;
    }
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
