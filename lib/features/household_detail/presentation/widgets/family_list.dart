import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/widgets/app_button.dart';
import 'package:ss_lotus/widgets/app_icon_button.dart';

part 'member_tile.dart';
part 'family_card.dart';

// ── Root widget ───────────────────────────────────────────────────────────────
class FamilyList extends StatefulWidget {
  final List<UserGroup> families;
  final void Function(
    int oldItemIndex,
    int oldFamilyIndex,
    int newItemIndex,
    int newFamilyIndex,
  ) onMoveUser;
  final void Function(BuildContext context, int familyId, String defaultAddress,
      bool allowInitHousehold) onEditAddress;
  final void Function(BuildContext context, int familyId, int userIndex)
      onRemoveUser;
  final void Function(BuildContext context, int familyId,
      User? defaultUserProfile, int? userIndex) onUpdateUserProfile;
  final void Function(BuildContext context, int familyId)? onSplitFamily;

  const FamilyList({
    super.key,
    required this.families,
    required this.onEditAddress,
    required this.onSplitFamily,
    required this.onUpdateUserProfile,
    required this.onRemoveUser,
    required this.onMoveUser,
  });

  @override
  State<FamilyList> createState() => _FamilyListState();
}

class _FamilyListState extends State<FamilyList> {
  _UserDragData? _activeDrag;

  void _onDragStart(_UserDragData data) => setState(() => _activeDrag = data);
  void _onDragEnd() => setState(() => _activeDrag = null);

  // ── Responsive grid: 1 column for single family, 2-3 columns for multi ──────
  Widget _buildGridFamilyList(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final int columns = widget.families.length.clamp(1, 3);
        final width = constraints.maxWidth;
        const double gap = 14;
        final double cardWidth =
            (width - COMMON_PADDING * 2 - gap * (columns - 1)) / columns;

        final List<Widget> rows = [];
        for (int i = 0; i < widget.families.length; i += columns) {
          final rowChildren = <Widget>[];
          for (int j = 0; j < columns; j++) {
            final idx = i + j;
            if (idx < widget.families.length) {
              rowChildren.add(
                SizedBox(
                  width: cardWidth,
                  child: _FamilyGridCard(
                    family: widget.families[idx],
                    familyIndex: idx,
                    showSplitButton: widget.families.length > 1,
                    enableCrossFamilyDrag: widget.families.length > 1,
                    activeDrag: _activeDrag,
                    onEditAddress: widget.onEditAddress,
                    onSplitFamily: widget.onSplitFamily,
                    onUpdateUserProfile: widget.onUpdateUserProfile,
                    onRemoveUser: widget.onRemoveUser,
                    onMoveUser: widget.onMoveUser,
                    onCrossFamilyDragStart: _onDragStart,
                    onCrossFamilyDragEnd: _onDragEnd,
                  ),
                ),
              );
            } else {
              rowChildren.add(SizedBox(width: cardWidth));
            }
            if (j < columns - 1) rowChildren.add(const SizedBox(width: gap));
          }
          rows.add(
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: rowChildren,
            ),
          );
          if (i + columns < widget.families.length) {
            rows.add(const SizedBox(height: gap));
          }
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(COMMON_PADDING),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: rows,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) => _buildGridFamilyList(context);
}
