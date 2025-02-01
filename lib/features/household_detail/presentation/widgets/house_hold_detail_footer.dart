import 'package:flutter/material.dart';
import 'package:ss_lotus/utils/constants.dart';

class HouseHoldDetailFooter extends StatelessWidget {
  final bool printable;
  final void Function() onSaveChanges;
  final void Function() onPrint;

  const HouseHoldDetailFooter({
    super.key,
    required this.printable,
    required this.onSaveChanges,
    required this.onPrint,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(COMMON_PADDING),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
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
            icon: Icon(Icons.save_alt),
            label: Text("Lưu thay đổi"),
            onPressed: printable
                ? null
                : () {
                    onSaveChanges();
                  },
          ),
          FilledButton.icon(
            icon: Icon(Icons.print),
            label: Text("In"),
            onPressed: !printable
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
