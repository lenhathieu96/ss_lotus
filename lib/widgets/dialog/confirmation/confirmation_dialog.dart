import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      titlePadding: COMMON_EDGE_INSETS_PADDING,
      contentPadding: COMMON_EDGE_INSETS_PADDING,
      actionsPadding: COMMON_EDGE_INSETS_PADDING,
      title: Text(title),
      content: Text(desc ?? ""),
      actions: [
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop();
          },
          child: Text('Không'),
        ),
        OutlinedButton(
          onPressed: () {
            Navigator.of(context).pop();
            onConfirm();
          },
          child: Text('Có'),
        ),
      ],
    );
  }
}
