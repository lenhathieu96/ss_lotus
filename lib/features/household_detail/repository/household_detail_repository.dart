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
  Future updateHouseHoldDetailChanged(
      HouseHold updatedHouseHold, HouseHold? unusedHouseHold);
}

class HouseholdDetailRepository implements HouseHoldDetailRepositoryProtocol {
  final FirebaseFirestore db = FirebaseFirestore.instance;
  final CollectionReference householdRef =
      FirebaseFirestore.instance.collection("tdhp");

  @override
  Future splitFamily(HouseHold updatedHouseHold, UserGroup splitFamily) async {
    final WriteBatch batch = db.batch();

    batch.set(householdRef.doc(updatedHouseHold.id.toString()),
        updatedHouseHold.toJson(), SetOptions(merge: true));
    batch.set(householdRef.doc(splitFamily.id.toString()),
        HouseHold(id: splitFamily.id, families: [splitFamily]).toJson());

    await batch.commit();
  }

  @override
  Future updateHouseHoldDetailChanged(
      HouseHold updatedHouseHold, HouseHold? unusedHouseHold) async {
    await householdRef
        .doc(updatedHouseHold.id.toString())
        .set(updatedHouseHold.toJson());
  }

  @override
  Future combineFamily(
      HouseHold updatedHouseHold, HouseHold removedHouseHold) async {
    final WriteBatch batch = db.batch();

    batch.set(householdRef.doc(updatedHouseHold.id.toString()),
        updatedHouseHold.toJson(), SetOptions(merge: true));
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
          .orderBy("id") // Choose a field to order by
          .limit(batchSize); // Set the page size

      if (lastDoc != null) {
        query = query.startAfterDocument(lastDoc);
      }

      QuerySnapshot querySnapshot = await query.get();
      List<DocumentSnapshot> documents = querySnapshot.docs;

      // Stop if no documents are left to process
      if (documents.isEmpty) break;

      // Convert to your model
      List<HouseHold> formattedData = documents
          .map((doc) {
            try {
              return HouseHold.fromDeprecatedDB(
                  doc.data() as Map<String, dynamic>);
            } catch (e) {
              debugPrint("Error parsing document ID: ${doc.id}, Error: $e");
              return null; // Return null to skip this document
            }
          })
          .whereType<HouseHold>()
          .toList();
      WriteBatch batch = db.batch();
      for (var formattedDoc in formattedData) {
        batch.set(householdRef.doc(formattedDoc.id.toString()),
            formattedDoc.toJson(), SetOptions(merge: true));
      }

      await batch.commit();
      processedCount += formattedData.length;

      // Log progress
      debugPrint("Processed $processedCount documents...");

      // Update lastDoc for the next iteration
      lastDoc = documents.last;
    }
  }
}

@riverpod
HouseHoldDetailRepositoryProtocol houseHoldDetailRepository(Ref ref) {
  return HouseholdDetailRepository();
}
