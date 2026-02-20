import 'package:flutter/material.dart';
import 'package:ss_lotus/themes/colors.dart';

enum InfoBadgeVariant { green, purple, gray }

class InfoBadge extends StatelessWidget {
  final String label;
  final String? value;
  final IconData? icon;
  final InfoBadgeVariant variant;

  const InfoBadge({
    super.key,
    required this.label,
    this.value,
    this.icon,
    this.variant = InfoBadgeVariant.gray,
  });

  @override
  Widget build(BuildContext context) {
    final (bgColor, fgColor) = switch (variant) {
      InfoBadgeVariant.green => (
          AppColors.actionPrimary.withValues(alpha: 0.12),
          AppColors.actionPrimary
        ),
      InfoBadgeVariant.purple => (
          AppColors.actionSchedule.withValues(alpha: 0.12),
          AppColors.actionSchedule
        ),
      InfoBadgeVariant.gray => (
          AppColors.surfaceCardAlt,
          AppColors.textSecondary
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 6,
        children: [
          if (icon != null) Icon(icon, size: 14, color: fgColor),
          Text.rich(
            TextSpan(
              style: TextStyle(fontSize: 14, color: fgColor),
              children: [
                TextSpan(text: value != null ? '$label: ' : label),
                if (value != null)
                  TextSpan(
                    text: value,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
