import 'package:flutter/material.dart';

enum AppButtonVariant { outlined, elevated }

class AppButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final Color color;
  final AppButtonVariant variant;

  /// Shrink padding/tap-target for compact contexts (e.g. inline split button).
  final bool compact;

  const AppButton({
    super.key,
    required this.label,
    required this.color,
    required this.onPressed,
    this.icon,
    this.variant = AppButtonVariant.outlined,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return switch (variant) {
      AppButtonVariant.outlined => _buildOutlined(),
      AppButtonVariant.elevated => _buildElevated(),
    };
  }

  Widget _buildOutlined() {
    final style = OutlinedButton.styleFrom(
      side: BorderSide(color: color, width: 1.5),
      padding: compact
          ? const EdgeInsets.symmetric(horizontal: 10, vertical: 6)
          : const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      foregroundColor: color,
      minimumSize: compact ? Size.zero : null,
      tapTargetSize: compact ? MaterialTapTargetSize.shrinkWrap : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
    final labelWidget = Text(
      label,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
    );

    if (icon != null) {
      return OutlinedButton.icon(
        style: style,
        // foregroundColor drives both icon and text color automatically
        icon: Icon(
          icon,
          size: 16,
          color: color,
        ),
        label: labelWidget,
        onPressed: onPressed,
      );
    }
    return OutlinedButton(
        style: style, onPressed: onPressed, child: labelWidget);
  }

  Widget _buildElevated() {
    const defaultForegroundColor = Colors.white;
    final style = ElevatedButton.styleFrom(
      backgroundColor: color,
      foregroundColor: defaultForegroundColor,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      elevation: onPressed != null ? 2 : 0,
      disabledBackgroundColor: color.withValues(alpha: 0.5),
    );
    final labelWidget = Text(
      label,
      style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: defaultForegroundColor),
    );

    if (icon != null) {
      return ElevatedButton.icon(
        style: style,
        icon: Icon(icon, size: 16, color: defaultForegroundColor),
        label: labelWidget,
        onPressed: onPressed,
      );
    }
    return ElevatedButton(
        style: style, onPressed: onPressed, child: labelWidget);
  }
}
