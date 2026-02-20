part of 'family_list.dart';

// ── Drag data payload carried between families ────────────────────────────────
class _UserDragData {
  final int familyIndex;
  final int memberIndex;
  final User user;

  const _UserDragData({
    required this.familyIndex,
    required this.memberIndex,
    required this.user,
  });
}

// ── Name + dharma-name column (shared by tile content and drag feedback) ──────
class _MemberNameColumn extends StatelessWidget {
  final User user;

  const _MemberNameColumn({required this.user});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      spacing: 1,
      children: [
        Text(
          user.fullName,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (user.christineName != null && user.christineName!.isNotEmpty)
          Text(
            'Pháp danh: ${user.christineName}',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textTertiary,
              fontStyle: FontStyle.italic,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
      ],
    );
  }
}

// ── Member tile: hover + drag handle + cross-family LongPressDraggable ────────
class _MemberTile extends StatefulWidget {
  final User user;
  final int familyId;
  final int familyIndex;
  final int memberIndex;
  final bool showReorderHandle;
  final bool enableCrossFamilyDrag;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTap;
  final void Function(_UserDragData) onCrossFamilyDragStart;
  final void Function() onCrossFamilyDragEnd;

  const _MemberTile({
    super.key,
    required this.user,
    required this.familyId,
    required this.familyIndex,
    required this.memberIndex,
    required this.showReorderHandle,
    required this.enableCrossFamilyDrag,
    required this.onEdit,
    required this.onDelete,
    required this.onTap,
    required this.onCrossFamilyDragStart,
    required this.onCrossFamilyDragEnd,
  });

  @override
  State<_MemberTile> createState() => _MemberTileState();
}

class _MemberTileState extends State<_MemberTile> {
  bool _hovered = false;

  Widget _buildTileContent({bool isDragging = false}) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        color: _hovered && !isDragging
            ? AppColors.surfaceCardAlt
            : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        child: Row(
          children: [
            // Drag handle (within-family reorder)
            if (widget.showReorderHandle)
              ReorderableDragStartListener(
                index: widget.memberIndex,
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: AnimatedOpacity(
                    opacity: _hovered ? 0.6 : 0.2,
                    duration: const Duration(milliseconds: 150),
                    child: Icon(
                      Icons.drag_handle,
                      size: 16,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            // Name + dharma name
            Expanded(child: _MemberNameColumn(user: widget.user)),
            // Action buttons (visible on hover)
            AnimatedOpacity(
              opacity: _hovered ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 150),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 2,
                children: [
                  AppIconButton(
                    icon: Icons.edit,
                    color: AppColors.actionPrimary,
                    iconSize: 14,
                    size: 26,
                    borderRadius: 6,
                    tooltip: 'Sửa',
                    onPressed: widget.onEdit,
                  ),
                  AppIconButton(
                    icon: Icons.delete_outline,
                    color: AppColors.actionDanger,
                    iconSize: 14,
                    size: 26,
                    borderRadius: 6,
                    tooltip: 'Xóa',
                    onPressed: widget.onDelete,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDragFeedback() {
    return Material(
      elevation: 6,
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 240,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.pallet.forestGreen, width: 1.5),
          boxShadow: SHADOW_MD,
        ),
        child: Row(
          children: [
            Expanded(child: _MemberNameColumn(user: widget.user)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tileContent = GestureDetector(
      onTap: widget.onTap,
      child: _buildTileContent(),
    );

    if (!widget.enableCrossFamilyDrag) {
      return tileContent;
    }

    final dragData = _UserDragData(
      familyIndex: widget.familyIndex,
      memberIndex: widget.memberIndex,
      user: widget.user,
    );

    return LongPressDraggable<_UserDragData>(
      data: dragData,
      delay: const Duration(milliseconds: 400),
      dragAnchorStrategy: pointerDragAnchorStrategy,
      feedback: _buildDragFeedback(),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: _buildTileContent(isDragging: true),
      ),
      onDragStarted: () => widget.onCrossFamilyDragStart(dragData),
      onDragEnd: (_) => widget.onCrossFamilyDragEnd(),
      onDraggableCanceled: (_, __) => widget.onCrossFamilyDragEnd(),
      child: tileContent,
    );
  }
}
