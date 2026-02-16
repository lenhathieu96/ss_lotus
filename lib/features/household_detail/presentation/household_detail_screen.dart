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
        body: Column(
          children: [
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                boxShadow: SHADOW_SM,
              ),
              padding: const EdgeInsets.all(COMMON_PADDING),
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
                                    side: BorderSide(color: AppColors.border)),
                                onPressed: () {
                                  houseHoldNotifier.openSearchHouseholdsDialog(
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
                                      houseHoldNotifier.openAddNewFamilyDialog(
                                          context, null, null, true);
                                    },
                              // onPressed: () {
                              //   houseHoldNotifier.backfillSearchKeywords();
                              // },
                              icon: Icon(Icons.add),
                              label: Text(
                                'Tạo gia đình mới',
                                style: TextStyle(fontSize: 16),
                              )),
                        ],
                      )),
                ],
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: houseHoldDetail.household == null
                    ? Center(
                        key: const ValueKey('empty'),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          spacing: COMMON_SPACING,
                          children: [
                            Icon(
                              Icons.groups_outlined,
                              color: AppColors.textTertiary,
                              size: 80.0,
                            ),
                            Text(
                              "Chưa có hộ nào được chọn",
                              style: TextStyle(
                                fontSize: 18.0,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Tìm kiếm hoặc tạo gia đình mới để bắt đầu",
                              style: TextStyle(
                                fontSize: 14.0,
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : Container(
                        key: const ValueKey('detail'),
                        margin: const EdgeInsets.all(SPACE_MD),
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceCard,
                          borderRadius:
                              BorderRadius.circular(COMMON_BORDER_RADIUS),
                          boxShadow: SHADOW_MD,
                        ),
                        child: Column(
                          children: [
                            HouseHoldDetailHeader(
                              houseHoldId: houseHoldDetail.household!.id,
                              oldId: houseHoldDetail.household!.oldId,
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
            ),
          ],
        ),
      ),
    );
  }
}
