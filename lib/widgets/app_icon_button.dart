import 'package:flutter/material.dart';
import 'package:ss_lotus/themes/colors.dart';

class AppIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? color;
  final double iconSize;
  final double size;
  final double borderRadius;
  final String? tooltip;

  const AppIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.iconSize = 16,
    this.size = 32,
    this.borderRadius = 8,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppColors.textTertiary;

    final button = IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: iconSize, color: effectiveColor),
      padding: EdgeInsets.zero,
      constraints: BoxConstraints(minWidth: size, minHeight: size),
      style: IconButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: button);
    }
    return button;
  }
}
