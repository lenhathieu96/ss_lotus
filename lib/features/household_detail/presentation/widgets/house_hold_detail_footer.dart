import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';

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
    final isDisabledForSave = printable ||
        (currentHouseHold != null &&
            currentHouseHold!.families
                .any((family) => family.members.isEmpty));
    final isDisabledForPrint = !printable ||
        (currentHouseHold != null &&
            currentHouseHold!.families
                .any((family) => family.members.isEmpty));

    return Container(
      padding: const EdgeInsets.all(COMMON_PADDING),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border(top: BorderSide(color: AppColors.surfaceDivider, width: 0.5)),
        boxShadow: SHADOW_SM,
      ),
      child: Row(
        spacing: COMMON_SPACING,
        children: [
          Expanded(
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.actionPrimary,
                padding: EdgeInsets.symmetric(horizontal: COMMON_PADDING, vertical: 12),
              ),
              icon: Icon(Icons.save_alt, size: 18),
              label: Text("Lưu thay đổi", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              onPressed: isDisabledForSave
                  ? null
                  : () {
                      onSaveChanges();
                    },
            ),
          ),
          Expanded(
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: AppColors.actionWarning,
                  width: 1.5,
                ),
                padding: EdgeInsets.symmetric(horizontal: COMMON_PADDING, vertical: 12),
              ),
              icon: Icon(Icons.print, size: 18),
              label: Text("In", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              onPressed: isDisabledForPrint
                  ? null
                  : () {
                      onPrint();
                    },
            ),
          ),
        ],
      ),
    );
  }
}
