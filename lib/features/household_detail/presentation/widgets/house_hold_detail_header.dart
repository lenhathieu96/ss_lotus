import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';

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
    return Padding(
      padding: const EdgeInsets.all(COMMON_PADDING),
      child: Column(
        spacing: COMMON_PADDING,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            spacing: 10.0,
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardAlt,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 6.0,
                  children: [
                    Icon(Icons.tag, size: 16, color: AppColors.textSecondary),
                    Text("Mã số ",
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500)),
                    Text(houseHoldId.toString(),
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary)),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardAlt,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 6.0,
                  children: [
                    Icon(Icons.family_restroom,
                        size: 16, color: AppColors.textSecondary),
                    Text("Số gia đình ",
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500)),
                    Text(familyQuantity.toString(),
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary)),
                  ],
                ),
              ),
              if (oldId != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceCardAlt,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 6.0,
                    children: [
                      Icon(Icons.history,
                          size: 16, color: AppColors.textSecondary),
                      Text("Mã cũ ",
                          style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500)),
                      Text(oldId.toString(),
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                ),
              if (appointment != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.pallet.forestGreen.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: AppColors.actionSuccess.withValues(alpha: 0.3),
                        width: 0.5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 6.0,
                    children: [
                      Icon(Icons.check_circle,
                          size: 16, color: AppColors.actionSuccess),
                      Text("Đã đăng ký",
                          style: TextStyle(
                              fontSize: 13,
                              color: AppColors.actionSuccess,
                              fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              Spacer(),
              Tooltip(
                message: "Đóng",
                child: IconButton(
                  style: IconButton.styleFrom(
                    shape: const CircleBorder(),
                    side: BorderSide(
                        color: AppColors.actionDanger.withValues(alpha: 0.2),
                        width: 1.5),
                  ),
                  onPressed: () {
                    onClearHouseHold();
                  },
                  icon: Icon(
                    Icons.close,
                    color: AppColors.actionDanger,
                    size: 18.0,
                  ),
                ),
              )
            ],
          ),
          Divider(),
          Row(
            spacing: COMMON_SPACING,
            children: [
              FilledButton.icon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.actionWarning),
                icon: Icon(Icons.group_add),
                label: Text("Gộp gia đình"),
                onPressed: () {
                  onCombineFamily(context, true);
                },
              ),
              appointment != null
                  ? OutlinedButton.icon(
                      icon: Icon(
                        Icons.check,
                        color: AppColors.actionSuccess,
                      ),
                      label: Text(
                          "Đã đăng ký ${Utils.getAppointmentTitle(appointment, false)}",
                          style: TextStyle(color: AppColors.actionSuccess)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: AppColors.actionSuccess),
                      ),
                      onPressed: () {
                        onRegisterAppointment(context, appointment);
                      })
                  : FilledButton.icon(
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.actionSchedule),
                      icon: Icon(Icons.calendar_month),
                      label: Text("Đăng ký lịch"),
                      onPressed: () {
                        onRegisterAppointment(context, appointment);
                      },
                    ),
            ],
          ),
        ],
      ),
    );
  }
}
