import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';

class ConfirmationDialog extends ConsumerWidget {
  final String title;
  final String? desc;
  final void Function() onConfirm;
  const ConfirmationDialog(
      {super.key, required this.title, required this.onConfirm, this.desc});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SPACE_MD)),
      contentPadding: const EdgeInsets.all(SPACE_LG),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.actionWarning, size: 48),
          SizedBox(height: SPACE_MD),
          Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          if (desc != null && desc!.isNotEmpty) ...[
            SizedBox(height: SPACE_SM),
            Text(desc!, style: TextStyle(fontSize: 14, color: AppColors.textSecondary), textAlign: TextAlign.center),
          ],
          SizedBox(height: SPACE_LG),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('Không'),
                ),
              ),
              SizedBox(width: SPACE_SM),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.actionDanger),
                  onPressed: () {
                    Navigator.of(context).pop();
                    onConfirm();
                  },
                  child: Text('Có'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
