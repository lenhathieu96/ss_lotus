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
    final lunarDate = Utils.convertToLunarDate(appointment?.date);
    final period = Utils.getPeriodTitle(appointment?.period);

    return Padding(
      padding: const EdgeInsets.all(COMMON_PADDING),
      child: Column(
        spacing: COMMON_PADDING,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            spacing: COMMON_PADDING,
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardAlt,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("Mã số ",
                        style: TextStyle(
                            fontSize: 14, color: AppColors.textSecondary)),
                    Text(houseHoldId.toString(),
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary)),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardAlt,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("Số gia đình ",
                        style: TextStyle(
                            fontSize: 14, color: AppColors.textSecondary)),
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
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceCardAlt,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text("Mã cũ ",
                          style: TextStyle(
                              fontSize: 14, color: AppColors.textSecondary)),
                      Text(oldId.toString(),
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                ),
              Tooltip(
                message: "Đóng",
                child: IconButton(
                  style: IconButton.styleFrom(
                    shape: const CircleBorder(),
                    side: BorderSide(
                        color: AppColors.actionDanger.withValues(alpha: 0.3)),
                  ),
                  onPressed: () {
                    onClearHouseHold();
                  },
                  icon: Icon(
                    Icons.close,
                    color: AppColors.actionDanger,
                    size: 20.0,
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
