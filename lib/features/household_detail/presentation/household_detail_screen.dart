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
    final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

    return Title(
      title: "Hộ gia đình",
      color: Colors.black,
      child: Scaffold(
        key: scaffoldKey,
        backgroundColor: Colors.transparent,
        body: Container(
          color: Colors.white,
          width: double.infinity,
          child: Column(
            children: [
              Padding(
                padding: COMMON_EDGE_INSETS_PADDING,
                child: Row(
                  children: [
                    Flexible(
                      flex: 2,
                      child: Row(
                        spacing: COMMON_SPACING,
                        children: [
                          SvgPicture.asset(
                            "assets/svgs/logo.svg",
                            width: 60,
                            height: 60,
                          ),
                          ShaderMask(
                            shaderCallback: (bounds) {
                              return LinearGradient(
                                colors: [
                                  AppColors.pallet.green20,
                                  AppColors.pallet.green40,
                                  AppColors.pallet.purple40
                                ],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ).createShader(bounds);
                            },
                            child: Text(
                              'SSLotus',
                              style: TextStyle(
                                fontFamily: "OleoScript",
                                fontSize: 32.0,
                                color: Colors.white,
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    Expanded(
                        flex: 4,
                        child: Row(
                          spacing: COMMON_PADDING,
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                      overlayColor: AppColors.white,
                                      alignment: Alignment.centerLeft,
                                      side:
                                          BorderSide(color: AppColors.border)),
                                  onPressed: () {
                                    houseHoldNotifier
                                        .openSearchHouseholdsDialog(
                                            context, false);
                                  },
                                  icon: Icon(
                                    Icons.search,
                                    color: AppColors.border,
                                  ),
                                  label: Text(
                                    'Tìm kiếm',
                                    style: TextStyle(
                                        fontSize: 16, color: AppColors.border),
                                  )),
                            ),
                            FilledButton.icon(
                                style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.pallet.blue30),
                                onPressed: houseHoldDetail.household != null
                                    ? null
                                    : () {
                                        houseHoldNotifier
                                            .openAddNewFamilyDialog(
                                                context, null, null);
                                      },
                                icon: Icon(Icons.add),
                                label: Text(
                                  'Tạo gia đình mới',
                                  style: TextStyle(fontSize: 16),
                                )),
                          ],
                        )),
                    Flexible(flex: 1, child: SizedBox())
                  ],
                ),
              ),
              Expanded(
                child: houseHoldDetail.household == null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          spacing: COMMON_SPACING,
                          children: [
                            Icon(
                              Icons.group_off,
                              color: AppColors.border,
                              size: 60.0,
                            ),
                            Text(
                              "Chưa có hộ nào được chọn",
                              style: TextStyle(
                                  fontSize: 16.0, color: AppColors.border),
                            ),
                          ],
                        ),
                      )
                    : Container(
                        decoration: BoxDecoration(
                            borderRadius:
                                BorderRadius.circular(COMMON_BORDER_RADIUS),
                            border: Border.all(color: AppColors.border)),
                        child: Column(
                          children: [
                            HouseHoldDetailHeader(
                              houseHoldId: houseHoldDetail.household!.id,
                              familyQuantity:
                                  houseHoldDetail.household!.families.length,
                              appointment:
                                  houseHoldDetail.household!.appointment,
                              onCombineFamily:
                                  houseHoldNotifier.openSearchHouseholdsDialog,
                              onRegisterAppointment: houseHoldNotifier
                                  .openAppointmentRegistrationDialog,
                              onClearHouseHold:
                                  houseHoldNotifier.onClearHousehold,
                            ),
                            Expanded(
                              child: FamiliesList(
                                families: houseHoldDetail.household!.families,
                                onEditAddress:
                                    houseHoldNotifier.openAddNewFamilyDialog,
                                onSplitFamily: houseHoldDetail.printable
                                    ? houseHoldNotifier
                                        .openSplitFamilyConfirmDialog
                                    : null,
                                onMoveUser: houseHoldNotifier.moveFamilyMember,
                                onUpdateUserProfile: houseHoldNotifier
                                    .openUpdateUserProfileDialog,
                                onRemoveUser: houseHoldNotifier
                                    .openRemoveUserConfirmDialog,
                              ),
                            ),
                            HouseHoldDetailFooter(
                                printable: houseHoldDetail.printable,
                                currentHouseHold: houseHoldDetail.household,
                                onSaveChanges: houseHoldNotifier.onSaveChanges,
                                onPrint: houseHoldNotifier.onPrint)
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
