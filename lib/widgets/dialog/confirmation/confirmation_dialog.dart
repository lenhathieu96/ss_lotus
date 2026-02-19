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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
      backgroundColor: AppColors.surfaceCard,
      contentPadding: const EdgeInsets.all(SPACE_LG),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.pallet.deepGold.withValues(alpha: 0.12),
            ),
            child: Icon(Icons.warning_amber_rounded, color: AppColors.actionWarning, size: 32),
          ),
          SizedBox(height: SPACE_MD),
          Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary), textAlign: TextAlign.center),
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
                  child: Text('Không', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
              SizedBox(width: SPACE_SM),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.actionDanger,
                    padding: EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                    onConfirm();
                  },
                  child: Text('Có', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
