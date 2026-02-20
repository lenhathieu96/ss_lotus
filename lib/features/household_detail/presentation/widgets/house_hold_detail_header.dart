import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';
import 'package:ss_lotus/widgets/info_badge.dart';
import 'package:ss_lotus/widgets/app_button.dart';
import 'package:ss_lotus/widgets/app_icon_button.dart';

class HouseHoldDetailHeader extends StatelessWidget {
  final int houseHoldId;
  final int? oldId;
  final int familyQuantity;
  final Appointment? appointment;
  final void Function() onClearHouseHold;
  final void Function(BuildContext context, bool isCombineFamily)
      onCombineFamily;
  final void Function(BuildContext context, Appointment? appointment)
      onRegisterAppointment;

  const HouseHoldDetailHeader(
      {super.key,
      required this.houseHoldId,
      this.oldId,
      required this.familyQuantity,
      required this.onCombineFamily,
      required this.onRegisterAppointment,
      required this.onClearHouseHold,
      this.appointment});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: COMMON_PADDING, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border(
            bottom: BorderSide(color: AppColors.surfaceDivider, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 10,
        children: [
          // ── Row 1: badges + close ─────────────────────────────────────────
          Row(
            spacing: 10,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              InfoBadge(
                icon: Icons.home_outlined,
                label: 'Mã số',
                value: houseHoldId.toString(),
                variant: InfoBadgeVariant.green,
              ),
              InfoBadge(
                icon: Icons.people_outline,
                label: 'Số gia đình',
                value: familyQuantity.toString(),
                variant: InfoBadgeVariant.purple,
              ),
              if (oldId != null)
                InfoBadge(
                  label: 'Mã cũ',
                  value: oldId.toString(),
                  variant: InfoBadgeVariant.gray,
                ),
              const Spacer(),
              // ── Close button ───────────────────────────────────────────
              AppIconButton(
                icon: Icons.close,
                iconSize: 18,
                size: 36,
                tooltip: 'Đóng',
                onPressed: onClearHouseHold,
              ),
            ],
          ),

          // ── Row 2: action buttons ─────────────────────────────────────────
          Row(
            spacing: 10,
            children: [
              AppButton(
                color: AppColors.actionSchedule,
                icon: Icons.merge_outlined,
                label: 'Gộp gia đình',
                onPressed: () => onCombineFamily(context, true),
              ),
              appointment != null
                  ? AppButton(
                      color: AppColors.actionInfo,
                      icon: Icons.check,
                      label:
                          'Đã đăng ký ${Utils.getAppointmentTitle(appointment, false)}',
                      onPressed: () =>
                          onRegisterAppointment(context, appointment),
                    )
                  : AppButton(
                      color: AppColors.actionInfo,
                      icon: Icons.calendar_month_outlined,
                      label: 'Đăng ký cầu an',
                      onPressed: () =>
                          onRegisterAppointment(context, appointment),
                    ),
            ],
          ),
        ],
      ),
    );
  }
}
