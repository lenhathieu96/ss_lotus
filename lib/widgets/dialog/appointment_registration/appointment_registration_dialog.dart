import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';
import 'package:table_calendar/table_calendar.dart';

import 'appointment_registration_dialog_provider.dart';

const List<Period> PERIOD_TYPES = [
  Period.morning,
  Period.afternoon,
  Period.night,
  Period.unknown
];
const double DATE_PICKER_SIZE = 40.0;

class AppointmentRegistrationDialog extends ConsumerWidget {
  final Appointment? defaultAppointment;
  final void Function(Appointment updatedPerson) onAppointmentUpdated;

  const AppointmentRegistrationDialog(
      {super.key,
      required this.defaultAppointment,
      required this.onAppointmentUpdated});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState =
        ref.watch(appointmentRegistrationFormProvider(defaultAppointment));
    final formNotifier = ref
        .read(appointmentRegistrationFormProvider(defaultAppointment).notifier);

    return Dialog(
      child: IntrinsicHeight(
        child: Container(
            width: MediaQuery.of(context).size.width * 0.6,
            padding: COMMON_EDGE_INSETS_PADDING,
            child: Column(
              spacing: COMMON_SPACING * 4,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.5,
                  child: TableCalendar(
                    locale: "vi-VN",
                    focusedDay: DateTime.now(),
                    firstDay: DateTime(2000, 1, 1),
                    lastDay: DateTime(2100, 12, 31),
                    onDaySelected: (selectedDate, _) {
                      formNotifier.updateDate(selectedDate);
                    },
                    startingDayOfWeek: StartingDayOfWeek.monday,
                    enabledDayPredicate: (day) => !day
                        .isBefore(DateTime.now().subtract(Duration(days: 1))),
                    selectedDayPredicate: (day) =>
                        isSameDay(day, formState.date.value),
                    headerStyle: HeaderStyle(formatButtonVisible: false),
                    calendarBuilders: CalendarBuilders(
                      headerTitleBuilder: (context, date) {
                        return SizedBox();
                      },
                      outsideBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return SizedBox(
                            width: DATE_PICKER_SIZE,
                            height: DATE_PICKER_SIZE,
                            child: Center(
                              child: Text('${lunar?.day}',
                                  style: TextStyle(fontSize: 14)),
                            ));
                      },
                      defaultBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return SizedBox(
                            width: DATE_PICKER_SIZE,
                            height: DATE_PICKER_SIZE,
                            child: Center(
                              child: Text('${lunar?.day}',
                                  style: TextStyle(fontSize: 14)),
                            ));
                      },
                      selectedBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return Container(
                          width: DATE_PICKER_SIZE,
                          height: DATE_PICKER_SIZE,
                          decoration: BoxDecoration(
                              color: Colors.green, shape: BoxShape.circle),
                          child: Center(
                            child: Text('${lunar?.day}',
                                style: TextStyle(
                                    fontSize: 14, color: Colors.white)),
                          ),
                        );
                      },
                      todayBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return Container(
                          width: DATE_PICKER_SIZE,
                          height: DATE_PICKER_SIZE,
                          decoration: BoxDecoration(
                              color: Colors.blueAccent, shape: BoxShape.circle),
                          child: Center(
                            child: Text('${lunar?.day}',
                                style: TextStyle(
                                    fontSize: 14, color: Colors.white)),
                          ),
                        );
                      },
                      disabledBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return SizedBox(
                          width: DATE_PICKER_SIZE,
                          height: DATE_PICKER_SIZE,
                          child: Center(
                            child: Text('${lunar?.day}',
                                style: TextStyle(
                                    fontSize: 14, color: Colors.blueGrey)),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: PERIOD_TYPES.map((period) {
                    return Row(
                      children: [
                        Radio<Period>(
                          value: period,
                          groupValue: formState.period.value,
                          onChanged: formNotifier.updatePeriod,
                        ),
                        Text(
                          Utils.getPeriodTitle(period),
                        )
                      ],
                    );
                  }).toList(),
                ),
                // SizedBox(
                //   height: DATE_PICKER_SIZE,
                //   child: ListView.separated(
                //     shrinkWrap: true,
                //     scrollDirection: Axis.horizontal,
                //     itemCount: PERIOD_TYPES.length,
                //     separatorBuilder: (_, __) => SizedBox(width: ),
                //     itemBuilder: (context, i) => Row(
                //       crossAxisAlignment: CrossAxisAlignment.center,
                //       mainAxisAlignment: MainAxisAlignment.center,
                //       mainAxisSize: MainAxisSize.min,
                //       children: [
                //         Radio<Period>(
                //           value: PERIOD_TYPES[i],
                //           groupValue: formState.period.value,
                //           onChanged: formNotifier.updatePeriod,
                //         ),
                //         Text(
                //           Utils.getPeriodTitle(PERIOD_TYPES[i]),
                //         )
                //       ],
                //     ),
                //   ),
                // ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: defaultAppointment == null
                            ? AppColors.pallet.blue30
                            : AppColors.pallet.blue50),
                    label: Text(
                        defaultAppointment == null ? "Đăng ký" : "Cập nhập"),
                    onPressed: !formState.isValid
                        ? null
                        : () {
                            onAppointmentUpdated(Appointment(
                                date: formState.date.value!,
                                period: formState.period.value,
                                appointmentType: AppointmentType.ca));
                            Navigator.of(context).pop();
                          },
                  ),
                ),
              ],
            )),
      ),
    );
  }
}
