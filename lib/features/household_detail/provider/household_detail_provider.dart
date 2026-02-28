import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/entities/family.dart';
import 'package:ss_lotus/utils/utils.dart';
import 'package:ss_lotus/widgets/dialog/appointment_registration/appointment_registration_dialog.dart';
import 'package:ss_lotus/widgets/dialog/confirmation/confirmation_dialog.dart';
import 'package:ss_lotus/widgets/dialog/family_address/family_address_dialog.dart';
import 'package:ss_lotus/widgets/dialog/search_households/search_households_dialog.dart';
import 'package:ss_lotus/widgets/dialog/user_profile/user_profile_dialog.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../repository/household_detail_repository.dart';
import '../state/household_detail_state.dart';
import '../presentation/widgets/print_view.dart';

part 'household_detail_provider.g.dart';

@riverpod
class HouseHoldDetail extends _$HouseHoldDetail {
  late final HouseHoldDetailRepositoryProtocol _repository;
  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  HouseholdDetailState build() {
    _repository = ref.read(houseHoldDetailRepositoryProvider);
    return HouseholdDetailState();
  }

  void _addNewFamily(String address, int? defaultHouseHoldId) async {
    final currentHouseHold = state.household;

    // Always derive the draft ID from the counter so it stays counter-based
    // and globally unique. The offset (pendingNewFamilyCount) ensures each
    // family added in the same unsaved session gets a distinct local ID.
    final baseId = await _repository.getNextHouseholdId();
    final familyId = baseId + state.pendingNewFamilyCount;
    final houseHoldId = currentHouseHold?.id ?? familyId;

    final draftFamily = Family(id: familyId, address: address, members: []);

    final updatedHousehold = currentHouseHold == null
        ? HouseHold(id: houseHoldId, families: [draftFamily])
        : currentHouseHold
            .copyWith(families: [...currentHouseHold.families, draftFamily]);

    state = state.copyWith(
        printable: false,
        household: updatedHousehold,
        isNewHousehold: defaultHouseHoldId == null,
        pendingNewFamilyCount: state.pendingNewFamilyCount + 1);
  }

  void _splitFamily(int familyId) async {
    final currentHouseHold = state.household;
    if (currentHouseHold == null) {
      return;
    }
    try {
      //1: find the splitFamily
      final splitFamily = currentHouseHold.families
          .firstWhere((family) => family.id == familyId);

      //2: remove the splitFamily from the current families
      final List<Family> updatedFamilies = List.from(currentHouseHold.families);
      updatedFamilies.removeWhere((family) => family.id == familyId);

      //3: update house hold families with the updated families
      final updatedHouseHold =
          currentHouseHold.copyWith(families: updatedFamilies);

      //4: update firestore
      await _repository.splitFamily(updatedHouseHold, splitFamily);

      //5: update local state and show toast message
      state = state.copyWith(printable: false, household: null);
      Utils.showToast("Cập nhật thành công", ToastStatus.success);
    } catch (error) {
      debugPrint("Error on split family: ${error.toString()}");
    }
  }

  void _combineFamily(HouseHold selectedHouseHold) async {
    final currentHouseHold = state.household;
    if (currentHouseHold == null) {
      return;
    }

    final preCombineFamilies = selectedHouseHold.families;

    if (preCombineFamilies.length > 1) {
      Utils.showToast(
          "Hộ được chọn có nhiều hơn 1 gia đình", ToastStatus.error);
      return;
    }

    if (currentHouseHold.families
        .any((family) => family.id == preCombineFamilies[0].id)) {
      Utils.showToast("Gia đình đã tồn tại trong hộ", ToastStatus.error);
      return;
    }

    final List<Family> updatedFamilies = [
      ...currentHouseHold.families,
      preCombineFamilies[0]
    ];

    final updatedHouseHold =
        currentHouseHold.copyWith(families: updatedFamilies);

    state = state.copyWith(household: updatedHouseHold);
    await _repository.combineFamily(updatedHouseHold, selectedHouseHold);
    Utils.showToast("Cập nhật thành công", ToastStatus.success);
  }

  void _selectHousehold(HouseHold selectedHousehold) async {
    final household = await _repository.getHouseHoldById(
        selectedHousehold.id, selectedHousehold.oldId);
    if (household != null) {
      state = state.copyWith(household: household, pendingNewFamilyCount: 0);
    }
  }

  void _updateFamilyAddress(int familyId, String familyAddress) {
    final currentHouseHold = state.household;
    if (currentHouseHold == null) {
      return;
    }

    final updatedFamilies = currentHouseHold.families.map((family) {
      if (family.id == familyId) {
        return family.copyWith(address: familyAddress);
      }
      return family;
    }).toList();

    state = state.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(families: updatedFamilies));
  }

  void _updateUser(
    int familyId,
    int userIndex,
    User user,
  ) {
    final currentState = state;
    final currentHouseHold = state.household;

    if (currentHouseHold == null) {
      return;
    }

    final updatedFamilies = currentHouseHold.families.map((family) {
      if (family.id == familyId) {
        final updatedMembers = List<User>.from(family.members);
        updatedMembers[userIndex] = user;
        return family.copyWith(members: updatedMembers);
      }
      return family;
    }).toList();

    state = currentState.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(families: updatedFamilies));
  }

  void _addNewUser(
    int familyId,
    User user,
  ) {
    final currentState = state;
    final currentHouseHold = state.household;

    if (currentHouseHold == null) {
      return;
    }

    final updatedFamilies = currentHouseHold.families.map((family) {
      if (family.id == familyId) {
        final updatedMembers = [...family.members, user];
        return family.copyWith(members: updatedMembers);
      }
      return family;
    }).toList();

    state = currentState.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(families: updatedFamilies));
  }

  void _removeUser(int familyId, int userIndex) {
    final currentState = state;
    final currentHouseHold = state.household;

    if (currentHouseHold == null) {
      return;
    }

    final updatedFamilies = currentHouseHold.families.map((family) {
      if (family.id == familyId) {
        final List<User> updatedMembers = List.from((family.members))
          ..removeAt(userIndex);
        return family.copyWith(members: updatedMembers);
      }
      return family;
    }).toList();

    state = currentState.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(families: updatedFamilies));
  }

  void _updateAppointment(Appointment updatedAppointment) {
    final currentHouseHold = state.household;
    if (currentHouseHold == null) {
      return;
    }

    state = state.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(appointment: updatedAppointment));
  }

  void moveFamilyMember(int oldItemIndex, int oldFamilyIndex, int newItemIndex,
      int newFamilyIndex) {
    final currentState = state;
    final currentHouseHold = state.household;

    if (currentHouseHold == null) {
      return;
    }

    final updatedFamilies = List<Family>.from(currentHouseHold.families);

    if (oldFamilyIndex == newFamilyIndex) {
      // Moving within the same family
      final family = updatedFamilies[oldFamilyIndex];
      final updatedMembers = List<User>.from(family.members);

      // Move the user within the same family
      final movedPerson = updatedMembers.removeAt(oldItemIndex);
      updatedMembers.insert(newItemIndex, movedPerson);

      // Replace the updated family in the list
      updatedFamilies[oldFamilyIndex] =
          family.copyWith(members: updatedMembers);
    } else {
      // Moving between different families
      final oldFamily = updatedFamilies[oldFamilyIndex];
      final newFamily = updatedFamilies[newFamilyIndex];

      // Create mutable copies of members
      final oldMembers = List<User>.from(oldFamily.members);
      final newMembers = List<User>.from(newFamily.members);

      // Remove the user from the old family
      final movedPerson = oldMembers.removeAt(oldItemIndex);

      // Add the user to the new family
      newMembers.insert(newItemIndex, movedPerson);

      // Replace the updated families in the list
      updatedFamilies[oldFamilyIndex] = oldFamily.copyWith(members: oldMembers);
      updatedFamilies[newFamilyIndex] = newFamily.copyWith(members: newMembers);
    }

    state = currentState.copyWith(
        printable: false,
        household: currentHouseHold.copyWith(families: updatedFamilies));
  }

  void onSaveChanges() async {
    final houseHold = state.household;
    if (houseHold == null) return;
    try {
      final filteredFamilies = houseHold.families
          .map((f) => f.copyWith(
              members: f.members
                  .where((m) => m.fullName.trim().isNotEmpty)
                  .toList()))
          .toList();
      final confirmed = await _repository.updateHouseHoldDetailChanged(
          houseHold.copyWith(families: filteredFamilies),
          isNewHousehold: state.isNewHousehold,
          pendingNewFamilyCount: state.pendingNewFamilyCount);
      Utils.showToast("Cập nhật thành công", ToastStatus.success);
      state = state.copyWith(
          printable: true,
          household: confirmed,
          isNewHousehold: false,
          pendingNewFamilyCount: 0);
    } catch (e) {
      Utils.showToast(
          e.toString().replaceFirst("Exception:", ""), ToastStatus.error);
    }
  }

  void onClearHousehold() {
    state = state.copyWith(household: null, pendingNewFamilyCount: 0);
  }

  void openUpdateUserProfileDialog(
      BuildContext context, int familyId, User? defaultUser, int? userIndex) {
    showDialog(
        context: context,
        builder: (context) => UserProfileDialog(
            user: defaultUser,
            onProfileUpdated: (updatedProfile) {
              defaultUser != null && userIndex != null && userIndex > -1
                  ? _updateUser(familyId, userIndex, updatedProfile)
                  : _addNewUser(familyId, updatedProfile);
            }));
  }

  void openRemoveUserConfirmDialog(
      BuildContext context, int familyId, int userIndex) {
    showDialog(
        context: context,
        builder: (context) => ConfirmationDialog(
              title: "Xoá người này",
              desc: "Bạn có chắc chắn muốn xoá?",
              onConfirm: () => _removeUser(familyId, userIndex),
            ));
  }

  void openSplitFamilyConfirmDialog(BuildContext context, int familyId) {
    showDialog(
        context: context,
        builder: (context) => ConfirmationDialog(
              title: "Tách gia đình",
              desc: "Bạn có chắc chắn muốn tách gia đình này thành một hộ mới?",
              onConfirm: () => _splitFamily(familyId),
            ));
  }

  void openAddNewFamilyDialog(BuildContext context, int? familyId,
      String? defaultAddress, int? defaultHouseHoldId) {
    showDialog(
        context: context,
        builder: (context) => FamilyAddressDialog(
              familyId: familyId,
              defaultAddress: defaultAddress,
              defaultHouseHoldId: defaultHouseHoldId,
              onConfirmAddress: (address) {
                familyId != null && defaultAddress != null
                    ? _updateFamilyAddress(familyId, address)
                    : _addNewFamily(address, defaultHouseHoldId);
              },
            ));
  }

  void openAppointmentRegistrationDialog(
      BuildContext context, Appointment? defaultAppointment) {
    showDialog(
        context: context,
        builder: (context) => AppointmentRegistrationDialog(
            defaultAppointment: defaultAppointment,
            onAppointmentUpdated: (updatedAppointment) =>
                _updateAppointment(updatedAppointment)));
  }

  void openCombineFamilyConfirmDialog(
      BuildContext context, HouseHold selectedHousehold) {
    showDialog(
        context: context,
        builder: (context) => ConfirmationDialog(
              title: "Gộp gia đình",
              desc: "Bạn có chắc chắn gộp gia đình này vào trong hộ hiện tại?",
              onConfirm: () => _combineFamily(selectedHousehold),
            ));
  }

  void openSearchHouseholdsDialog(
      BuildContext context, int? defaultHouseHoldId) {
    showDialog(
      context: context,
      builder: (context) => SearchHouseholdsDialog(
        onAddNewFamily: defaultHouseHoldId != null
            ? () {
                openAddNewFamilyDialog(context, null, null, defaultHouseHoldId);
              }
            : null,
        onSelectHousehold: defaultHouseHoldId != null
            ? (selectedHousehold) {
                openCombineFamilyConfirmDialog(context, selectedHousehold);
              }
            : _selectHousehold,
      ),
    );
  }

  //Print
  Future<void> onPrint() async {
    if (state.household == null) {
      return;
    }

    final doc = pw.Document();
    final pageFont =
        await fontFromAssetBundle('assets/fonts/NotoSerif-Regular.ttf');
    final pageBoldFont =
        await fontFromAssetBundle('assets/fonts/NotoSerif-Bold.ttf');
    final logo = await imageFromAssetBundle('assets/images/dharmachakra.png');

    doc.addPage(buildPrintPage(logo, pageFont, pageBoldFont, state.household!));

    await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => doc.save());
  }
}
