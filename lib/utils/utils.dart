import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:toastification/toastification.dart';
import 'package:vnlunar/vnlunar.dart';

class Utils {
  static String getPeriodTitle(Period? period) {
    switch (period) {
      case Period.morning:
        return "Sáng";
      case Period.afternoon:
        return "Chiều";
      case Period.night:
        return "Tối";
      default:
        return "Chùa cúng";
    }
  }

  static Lunar? convertToLunarDate(DateTime? solarDate) {
    if (solarDate == null) {
      return null;
    }

    return Lunar(createdFromSolar: true, date: solarDate);
  }

  static String getAppointmentTitle(
      Appointment? appointment, bool? showSeparator) {
    final date = convertToLunarDate(appointment?.date);
    if (date == null || appointment?.period == Period.unknown) {
      return showSeparator == true ? "Chùa cúng" : "chùa cúng";
    }
    final periodTitle = getPeriodTitle(appointment?.period);
    final dateTitle = date.day < 10 ? "Mồng" : "Ngày";
    return showSeparator == true
        ? "$periodTitle | $dateTitle ${date.day}"
        : "${periodTitle.toLowerCase()} ${dateTitle.toLowerCase()} ${date.day}";
  }

  static showToast(String title, ToastStatus status) {
    toastification.show(
      title: Text(title),
      type: status == ToastStatus.success
          ? ToastificationType.success
          : ToastificationType.error,
      style: ToastificationStyle.flatColored,
      icon: Icon(
        status == ToastStatus.success ? Icons.check : Icons.error,
        color: status == ToastStatus.success ? Colors.green : Colors.red,
      ),
      showIcon: true,
      showProgressBar: false,
      padding: COMMON_EDGE_INSETS_PADDING,
      borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS),
      closeButtonShowType: CloseButtonShowType.none,
      autoCloseDuration: const Duration(seconds: 2),
    );
  }
}
