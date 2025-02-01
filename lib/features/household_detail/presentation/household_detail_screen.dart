import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/svg.dart';
import 'package:ss_lotus/themes/colors.dart';

import 'package:ss_lotus/utils/constants.dart';

import '../provider/household_detail_provider.dart';
import 'widgets/families_list.dart';
import 'widgets/house_hold_detail_footer.dart';
import 'widgets/house_hold_detail_header.dart';

class HouseHoldDetailScreen extends ConsumerWidget {
  const HouseHoldDetailScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final houseHoldDetail = ref.watch(houseHoldDetailProvider);
    final houseHoldNotifier = ref.read(houseHoldDetailProvider.notifier);

    return Title(
      title: "Hộ gia đình",
      color: Colors.black,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Container(
          color: Colors.white,
          width: double.infinity,
          child: Column(
            children: [
              Row(
                children: [
                  Flexible(
                    flex: 1,
                    child: Row(
                      spacing: COMMON_SPACING,
                      children: [
                        SvgPicture.asset(
                          "assets/svgs/logo.svg",
                          width: 60,
                          height: 60,
                        ),
                        Text('SSLotus')
                      ],
                    ),
                  ),
                  Expanded(
                      flex: 3,
                      child: InkWell(
                        onTap: () {
                          houseHoldNotifier.showSearchHouseholdsDialog(
                              context, false);
                        },
                        child: Container(
                          decoration: BoxDecoration(
                              border: Border.all(color: AppColors.border),
                              borderRadius:
                                  BorderRadius.circular(COMMON_BORDER_RADIUS)),
                          child: ListTile(
                            leading: Icon(
                              Icons.search,
                              color: AppColors.border,
                            ),
                            title: Text(
                              'Tìm kiếm',
                              style: TextStyle(
                                  fontSize: 16, color: AppColors.border),
                            ),
                          ),
                        ),
                      )),
                  Flexible(flex: 1, child: SizedBox())
                ],
              ),
              houseHoldDetail.household == null
                  ? Container()
                  : Expanded(
                      child: Column(
                        children: [
                          HouseHoldDetailHeader(
                            familyQuantity:
                                houseHoldDetail.household!.families.length,
                            appointment: houseHoldDetail.household!.appointment,
                            onCombineFamily:
                                houseHoldNotifier.showSearchHouseholdsDialog,
                            onRegisterAppointment: houseHoldNotifier
                                .showAppointmentRegistrationDialog,
                          ),
                          Expanded(
                            child: FamiliesList(
                              families: houseHoldDetail.household!.families,
                              onEditAddress:
                                  houseHoldNotifier.showAddNewFamilyDialog,
                              onSplitFamily: houseHoldNotifier
                                  .showSplitFamilyConfirmDialog,
                              onMoveUser: houseHoldNotifier.moveFamilyMember,
                              onUpdateUserProfile:
                                  houseHoldNotifier.showUpdateUserProfileDialog,
                              onRemoveUser:
                                  houseHoldNotifier.showRemoveUserConfirmDialog,
                            ),
                          ),
                          HouseHoldDetailFooter(
                              printable: houseHoldDetail.printable,
                              onSaveChanges: houseHoldNotifier.onSaveChanges,
                              onPrint: houseHoldNotifier.onPrint)
                        ],
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
