import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/svg.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/widgets/app_button.dart';

import '../provider/household_detail_provider.dart';
import 'widgets/family_list.dart';
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
              padding: const EdgeInsets.symmetric(
                  horizontal: COMMON_PADDING, vertical: 12.0),
              child: Row(
                children: [
                  Flexible(
                    flex: 2,
                    child: Row(
                      spacing: 8.0,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: [
                                AppColors.pallet.forestGreen
                                    .withValues(alpha: 0.15),
                                AppColors.pallet.warmPurple
                                    .withValues(alpha: 0.1),
                              ],
                            ),
                          ),
                          child: SvgPicture.asset(
                            "assets/svgs/logo.svg",
                            width: 28,
                            height: 28,
                          ),
                        ),
                        ShaderMask(
                          shaderCallback: (bounds) {
                            return LinearGradient(
                              colors: [
                                AppColors.pallet.warmGray20,
                                AppColors.pallet.forestGreen,
                                AppColors.pallet.warmPurple
                              ],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ).createShader(bounds);
                          },
                          child: Text(
                            'SSLotus',
                            style: TextStyle(
                              fontFamily: "OleoScript",
                              fontSize: 28.0,
                              color: Colors.white,
                              letterSpacing: -0.5,
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  Expanded(
                      flex: 5,
                      child: Row(
                        spacing: COMMON_PADDING,
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: TOOLBAR_ELEMENT_HEIGHT,
                              child: SearchBar(
                                autoFocus: false,
                                shape: WidgetStatePropertyAll(
                                    RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(
                                            COMMON_BORDER_RADIUS))),
                                overlayColor:
                                    WidgetStatePropertyAll(Colors.transparent),
                                backgroundColor: WidgetStatePropertyAll(
                                    AppColors.surfaceCardAlt),
                                elevation: WidgetStatePropertyAll(0),
                                hintText: "Nhập mã số - địa chỉ - họ tên",
                                leading: Icon(
                                  Icons.search,
                                  color: AppColors.textTertiary,
                                ),
                                onTap: () {
                                  houseHoldNotifier.openSearchHouseholdsDialog(
                                      context, null);
                                },
                                onSubmitted: (_) {
                                  houseHoldNotifier.openSearchHouseholdsDialog(
                                      context, null);
                                },
                              ),
                            ),
                          ),
                          SizedBox(
                            height: TOOLBAR_ELEMENT_HEIGHT,
                            child: AppButton(
                              variant: AppButtonVariant.elevated,
                              icon: Icons.add,
                              label: 'Tạo gia đình mới',
                              color: AppColors.actionPrimary,
                              onPressed: houseHoldDetail.household != null
                                  ? null
                                  : () {
                                      houseHoldNotifier.openAddNewFamilyDialog(
                                          context, null, null, null);
                                    },
                            ),
                          ),
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
                          spacing: SPACE_SM,
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.pallet.forestGreen
                                        .withValues(alpha: 0.12),
                                    AppColors.pallet.warmPurple
                                        .withValues(alpha: 0.08),
                                  ],
                                ),
                              ),
                              child: Icon(
                                Icons.groups_outlined,
                                color: AppColors.pallet.forestGreen,
                                size: 56.0,
                              ),
                            ),
                            SizedBox(height: SPACE_SM),
                            Text(
                              "Chưa có hộ nào được chọn",
                              style: TextStyle(
                                fontSize: 20.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              "Tìm kiếm hoặc tạo gia đình mới để bắt đầu quản lý thông tin",
                              style: TextStyle(
                                fontSize: 14.0,
                                color: AppColors.textTertiary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            SizedBox(height: SPACE_MD),
                            AppButton(
                              icon: Icons.search,
                              label: 'Tìm kiếm hộ gia đình',
                              color: AppColors.actionPrimary,
                              onPressed: () {
                                houseHoldNotifier.openSearchHouseholdsDialog(
                                    context, null);
                              },
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
                              child: FamilyList(
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
