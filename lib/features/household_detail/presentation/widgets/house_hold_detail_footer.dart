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
    return Container(
      padding: const EdgeInsets.all(COMMON_PADDING),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            // ignore: deprecated_member_use
            color: Colors.black.withOpacity(0.2), // Shadow color
            offset: Offset(0, -4), // Top shadow (negative y-axis value)
            blurRadius: 6, // Blur effect
          ),
        ],
      ),
      child: Row(
        spacing: COMMON_SPACING,
        children: [
          FilledButton.icon(
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.pallet.blue50),
            icon: Icon(Icons.save_alt),
            label: Text("Lưu thay đổi"),
            onPressed: printable ||
                    (currentHouseHold != null &&
                        currentHouseHold!.families
                            .any((family) => family.members.isEmpty))
                ? null
                : () {
                    onSaveChanges();
                  },
          ),
          FilledButton.icon(
            icon: Icon(Icons.print),
            label: Text("In"),
            onPressed: !printable ||
                    (currentHouseHold != null &&
                        currentHouseHold!.families
                            .any((family) => family.members.isEmpty))
                ? null
                : () {
                    onPrint();
                  },
          ),
        ],
      ),
    );
  }
}
