import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:ss_lotus/entities/common.enum.dart';
import 'package:ss_lotus/entities/household.dart';
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
