import 'package:algolia_helper_flutter/algolia_helper_flutter.dart' as algolia;
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:ss_lotus/utils/searcher.dart';
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

  final _houseHoldPaths = algolia.FilterGroupID('houseHoldPath');
  final algolia.FilterState _filterState = algolia.FilterState();
  final _householdSearcher = HouseholdSearcher.instance.householdSearcher;

  @override
  HouseholdDetailState build() {
    _repository = ref.read(houseHoldDetailRepositoryProvider);
    _householdSearcher.connectFilterState(_filterState);
    return HouseholdDetailState();
  }

  void _addNewFamily(String address, int? defaultHouseHoldId) {
    final currentHouseHold = state.household;
    int timestamp = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final houseHoldId = defaultHouseHoldId ?? timestamp;

    final UserGroup draftFamily =
        UserGroup(id: houseHoldId, address: address, members: []);
    late final HouseHold updatedHousehold;

    if (currentHouseHold == null) {
      updatedHousehold = HouseHold(
        id: houseHoldId,
        families: [draftFamily],
      );
    } else {
      final List<UserGroup> updatedFamilies = [
        ...currentHouseHold.families,
        draftFamily
      ];
      updatedHousehold = currentHouseHold.copyWith(families: updatedFamilies);
    }

    state = state.copyWith(
        printable: false,
        household: updatedHousehold,
        isInitHousehold: defaultHouseHoldId != null);
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
      final List<UserGroup> updatedFamilies =
          List.from(currentHouseHold.families);
      updatedFamilies.removeWhere((family) => family.id == familyId);

      //3: update house hold families with the updated families
      final updatedHouseHold =
          currentHouseHold.copyWith(families: updatedFamilies);

      //4: update firestore
      await _repository.splitFamily(updatedHouseHold, splitFamily);

      //5: update local state and show toast message
      state = state.copyWith(printable: false, household: null);
      Utils.showToast("Cập nhập thành công", ToastStatus.success);
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

    final List<UserGroup> updatedFamilies = [
      ...currentHouseHold.families,
      preCombineFamilies[0]
    ];

    final updatedHouseHold =
        currentHouseHold.copyWith(families: updatedFamilies);

    state = state.copyWith(household: updatedHouseHold);
    await _repository.combineFamily(updatedHouseHold, selectedHouseHold);
    Utils.showToast("Cập nhập thành công", ToastStatus.success);
  }

  void _selectHousehold(HouseHold selectedHousehold) async {
    _filterState.add(
        _houseHoldPaths, [algolia.Filter.facet("id", selectedHousehold.id)]);
    _householdSearcher.query(selectedHousehold.id.toString());
    final response = await _householdSearcher.responses.first;

    final households = response.hits.map(HouseHold.fromHit).toList();
    if (households.isNotEmpty) {
      state = state.copyWith(household: households.first);
    }

    _filterState.clear();
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

    final updatedFamilies = List<UserGroup>.from(currentHouseHold.families);

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
      await _repository.updateHouseHoldDetailChanged(
          houseHold, state.unusedHouseHold, state.isInitHousehold);
      Utils.showToast("Cập nhập thành công", ToastStatus.success);
      state = state.copyWith(
          printable: true, unusedHouseHold: null, isInitHousehold: false);
    } catch (e) {
      Utils.showToast(
          e.toString().replaceFirst("Exception:", ""), ToastStatus.error);
    }
  }

  void onClearHousehold() {
    state = state.copyWith(household: null);
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
      String? defaultAddress, bool allowInitHouseHold) {
    showDialog(
        context: context,
        builder: (context) => FamilyAddressDialog(
              allowInitHouseHold: allowInitHouseHold,
              defaultAddress: defaultAddress,
              onAddressUpdated: (address, houseHoldId) {
                familyId != null && defaultAddress != null
                    ? _updateFamilyAddress(familyId, address)
                    : _addNewFamily(address, houseHoldId);
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

  void openSearchHouseholdsDialog(BuildContext context, bool isCombineFamily) {
    showDialog(
      context: context,
      builder: (context) => SearchHouseholdsDialog(
        onAddNewFamily: isCombineFamily == true
            ? () {
                openAddNewFamilyDialog(context, null, null, false);
              }
            : null,
        onSelectHousehold: isCombineFamily == true
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
