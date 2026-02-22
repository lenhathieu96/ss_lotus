import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/widgets/app_button.dart';
import 'package:ss_lotus/widgets/app_icon_button.dart';
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
const double DATE_PICKER_SIZE = 32.0;

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
            width: MediaQuery.sizeOf(context).width * DIALOG_MD,
            padding: const EdgeInsets.all(SPACE_LG * 0.8),
            child: Column(
              spacing: COMMON_SPACING * 3.2,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      spacing: 10,
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.pallet.warmPurple
                                .withValues(alpha: 0.12),
                          ),
                          child: Icon(Icons.calendar_month,
                              color: AppColors.actionSchedule, size: 14),
                        ),
                        Text(
                          defaultAppointment == null
                              ? 'Đăng ký lịch'
                              : 'Cập nhật lịch',
                          style: TextStyle(
                              fontSize: 14.0,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                    AppIconButton(
                      icon: Icons.close,
                      iconSize: 16,
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.4,
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
                                  style: TextStyle(fontSize: 11)),
                            ));
                      },
                      defaultBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return SizedBox(
                            width: DATE_PICKER_SIZE,
                            height: DATE_PICKER_SIZE,
                            child: Center(
                              child: Text('${lunar?.day}',
                                  style: TextStyle(fontSize: 11)),
                            ));
                      },
                      selectedBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return Container(
                          width: DATE_PICKER_SIZE,
                          height: DATE_PICKER_SIZE,
                          decoration: BoxDecoration(
                              color: AppColors.actionPrimary,
                              shape: BoxShape.circle),
                          child: Center(
                            child: Text('${lunar?.day}',
                                style: TextStyle(
                                    fontSize: 11, color: Colors.white)),
                          ),
                        );
                      },
                      todayBuilder: (context, date, focusedDay) {
                        final lunar = Utils.convertToLunarDate(date);
                        return Container(
                          width: DATE_PICKER_SIZE,
                          height: DATE_PICKER_SIZE,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: AppColors.actionPrimary, width: 1.5),
                          ),
                          child: Center(
                            child: Text('${lunar?.day}',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.actionPrimary,
                                    fontWeight: FontWeight.w600)),
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
                                    fontSize: 11,
                                    color: AppColors.pallet.gray40)),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                Divider(),
                Wrap(
                  spacing: SPACE_SM,
                  children: PERIOD_TYPES.map((period) {
                    final isSelected = formState.period.value == period;
                    return ChoiceChip(
                      label: Text(Utils.getPeriodTitle(period)),
                      selected: isSelected,
                      selectedColor: AppColors.actionSchedule,
                      backgroundColor: AppColors.surfaceBackground,
                      side: BorderSide(
                          color: isSelected
                              ? Colors.transparent
                              : AppColors.surfaceDivider),
                      labelStyle: TextStyle(
                        color:
                            isSelected ? Colors.white : AppColors.textPrimary,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                      onSelected: (_) => formNotifier.updatePeriod(period),
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
                  child: AppButton(
                    variant: AppButtonVariant.elevated,
                    label: defaultAppointment == null ? 'Đăng ký' : 'Cập nhật',
                    color: defaultAppointment == null
                        ? AppColors.actionPrimary
                        : AppColors.actionSchedule,
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
