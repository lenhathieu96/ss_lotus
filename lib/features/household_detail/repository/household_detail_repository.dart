import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';

part 'household_detail_repository.g.dart';

abstract class HouseHoldDetailRepositoryProtocol {
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
    householdRef
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
}

@riverpod
HouseHoldDetailRepositoryProtocol houseHoldDetailRepository(Ref ref) {
  return HouseholdDetailRepository();
}
