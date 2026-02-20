import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/widgets/app_button.dart';

class HouseHoldDetailFooter extends StatelessWidget {
  final bool printable;
  final HouseHold? currentHouseHold;
  final void Function() onSaveChanges;
  final void Function() onPrint;

  const HouseHoldDetailFooter(
      {super.key,
      required this.printable,
      required this.onSaveChanges,
      required this.onPrint,
      this.currentHouseHold});

  @override
  Widget build(BuildContext context) {
    final hasEmptyFamily = currentHouseHold != null &&
        currentHouseHold!.families.any((f) => f.members.isEmpty);
    final isDisabledForSave = printable || hasEmptyFamily;
    final isDisabledForPrint = !printable || hasEmptyFamily;

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: COMMON_PADDING, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border(
            top: BorderSide(color: AppColors.surfaceDivider, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        spacing: 12,
        children: [
          Expanded(
            child: AppButton(
              variant: AppButtonVariant.elevated,
              icon: Icons.save_alt,
              label: 'Lưu thay đổi',
              color: AppColors.actionPrimary,
              onPressed: isDisabledForSave ? null : onSaveChanges,
            ),
          ),
          Expanded(
            child: AppButton(
              icon: Icons.print,
              label: 'In',
              color: AppColors.actionWarning,
              onPressed: isDisabledForPrint ? null : onPrint,
            ),
          ),
        ],
      ),
    );
  }
}
