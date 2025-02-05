import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';

class HouseHoldDetailHeader extends StatelessWidget {
  final int houseHoldId;
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
              RichText(
                  text: TextSpan(children: [
                TextSpan(
                    text: "Mã số: ",
                    style: TextStyle(fontSize: 16, fontFamily: "Mulish")),
                TextSpan(
                    text: houseHoldId.toString(),
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        fontFamily: "Mulish"))
              ])),
              RichText(
                  text: TextSpan(children: [
                TextSpan(
                    text: "Số gia đình: ",
                    style: TextStyle(fontSize: 16, fontFamily: "Mulish")),
                TextSpan(
                    text: familyQuantity.toString(),
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        fontFamily: "Mulish"))
              ])),
              IconButton(
                style: IconButton.styleFrom(
                    backgroundColor: Colors.red,
                    shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(COMMON_BORDER_RADIUS))),
                onPressed: () {
                  onClearHouseHold();
                },
                icon: Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 20.0,
                ),
              )
            ],
          ),
          Row(
            spacing: COMMON_SPACING,
            children: [
              FilledButton.icon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.pallet.yellow50),
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
                        color: Colors.green,
                      ),
                      label: Text(
                          "Đã đăng ký ${Utils.getAppointmentTitle(appointment, false)}",
                          style: TextStyle(color: Colors.green)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.green),
                      ),
                      onPressed: () {
                        onRegisterAppointment(context, appointment);
                      })
                  : FilledButton.icon(
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.pallet.purple30),
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
