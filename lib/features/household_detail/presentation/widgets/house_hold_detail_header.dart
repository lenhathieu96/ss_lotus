import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';

class HouseHoldDetailHeader extends StatelessWidget {
  final int familyQuantity;
  final Appointment? appointment;
  final void Function(BuildContext context, bool isCombineFamily)
      onCombineFamily;
  final void Function(BuildContext context, Appointment? appointment)
      onRegisterAppointment;

  const HouseHoldDetailHeader(
      {super.key,
      required this.familyQuantity,
      required this.onCombineFamily,
      required this.onRegisterAppointment,
      this.appointment});

  @override
  Widget build(BuildContext context) {
    final lunarDate = Utils.convertToLunarDate(appointment?.date);
    final period = Utils.getPeriodTitle(appointment?.period);

    return Padding(
      padding: const EdgeInsets.all(COMMON_PADDING),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            spacing: COMMON_SPACING,
            children: [
              FilledButton.icon(
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
                          "Đã đăng ký $period ${lunarDate != null ? "mồng ${lunarDate.day}" : ''}",
                          style: TextStyle(color: Colors.green)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                            color:
                                Colors.green), // Set the outline color to green
                      ),
                      onPressed: () {
                        onRegisterAppointment(context, appointment);
                      })
                  : FilledButton.icon(
                      icon: Icon(Icons.calendar_month),
                      label: Text("Đăng ký lịch"),
                      onPressed: () {
                        onRegisterAppointment(context, appointment);
                      },
                    ),
            ],
          ),
          RichText(
              text: TextSpan(children: [
            TextSpan(text: "Số hộ: ", style: TextStyle(fontSize: 16)),
            TextSpan(
                text: familyQuantity.toString(),
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))
          ]))
        ],
      ),
    );
  }
}
