part of 'family_list.dart';

// ── Shared reorder proxy decorator ────────────────────────────────────────────
Widget _reorderProxyDecorator(
    Widget child, int index, Animation<double> animation) {
  return Material(
    elevation: 4,
    color: Colors.transparent,
    borderRadius: BorderRadius.circular(8),
    child: child,
  );
}

// ── Empty-members placeholder ─────────────────────────────────────────────────
class _EmptyMembersPlaceholder extends StatelessWidget {
  const _EmptyMembersPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(COMMON_PADDING),
      child: Text(
        "Chưa có thành viên nào",
        style: TextStyle(
          fontSize: 13,
          color: AppColors.textTertiary,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }
}

// ── Drop position indicator ───────────────────────────────────────────────────
class _DropIndicator extends StatelessWidget {
  const _DropIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Container(
        height: 2,
        decoration: BoxDecoration(
          color: AppColors.pallet.forestGreen,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

// ── Shared card header ────────────────────────────────────────────────────────
class _CardHeader extends StatelessWidget {
  final UserGroup family;
  final bool showSplitButton;
  final void Function(BuildContext, int, String, bool) onEditAddress;
  final void Function(BuildContext, int)? onSplitFamily;

  const _CardHeader({
    required this.family,
    required this.showSplitButton,
    required this.onEditAddress,
    required this.onSplitFamily,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(0, 14, 14, 14),
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: AppColors.pallet.forestGreen, width: 4),
          bottom: BorderSide(color: AppColors.surfaceDivider, width: 0.5),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(width: 12),
          // Address + edit button
          Expanded(
            child: Row(
              spacing: 10,
              children: [
                Flexible(
                  child: Text(
                    family.address,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Tooltip(
                    message: "Sửa địa chỉ",
                    child: AppIconButton(
                      color: AppColors.actionPrimary,
                      icon: Icons.edit_outlined,
                      onPressed: () => onEditAddress(
                          context, family.id, family.address, false),
                    )),
              ],
            ),
          ),
          // Member count
          Text(
            "Thành viên: ",
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          Text(
            family.members.length.toString(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          // Split button
          if (showSplitButton) ...[
            const SizedBox(width: 10),
            AppButton(
              variant: AppButtonVariant.elevated,
              icon: Icons.splitscreen,
              label: 'Tách hộ mới',
              color: AppColors.actionWarning,
              compact: true,
              onPressed: onSplitFamily != null
                  ? () => onSplitFamily!(context, family.id)
                  : null,
            ),
          ],
        ],
      ),
    );
  }
}

// ── Shared card footer ────────────────────────────────────────────────────────
class _CardFooter extends StatelessWidget {
  final int familyId;
  final void Function(BuildContext, int, User?, int?) onUpdateUserProfile;

  const _CardFooter({
    required this.familyId,
    required this.onUpdateUserProfile,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: Border(
            top: BorderSide(color: AppColors.surfaceDivider, width: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          AppButton(
            icon: Icons.person_add_outlined,
            label: "Thêm thành viên",
            onPressed: () => onUpdateUserProfile(context, familyId, null, null),
            color: AppColors.actionAdd,
          ),
        ],
      ),
    );
  }
}

// ── Grid card: DragTarget + ReorderableListView ───────────────────────────────
class _FamilyGridCard extends StatefulWidget {
  final UserGroup family;
  final int familyIndex;
  final bool showSplitButton;
  final bool enableCrossFamilyDrag;
  final _UserDragData? activeDrag;
  final void Function(BuildContext, int, String, bool) onEditAddress;
  final void Function(BuildContext, int, int) onRemoveUser;
  final void Function(BuildContext, int, User?, int?) onUpdateUserProfile;
  final void Function(BuildContext, int)? onSplitFamily;
  final void Function(int, int, int, int) onMoveUser;
  final void Function(_UserDragData) onCrossFamilyDragStart;
  final void Function() onCrossFamilyDragEnd;

  const _FamilyGridCard({
    required this.family,
    required this.familyIndex,
    required this.showSplitButton,
    required this.enableCrossFamilyDrag,
    required this.activeDrag,
    required this.onEditAddress,
    required this.onRemoveUser,
    required this.onUpdateUserProfile,
    required this.onSplitFamily,
    required this.onMoveUser,
    required this.onCrossFamilyDragStart,
    required this.onCrossFamilyDragEnd,
  });

  @override
  State<_FamilyGridCard> createState() => _FamilyGridCardState();
}

class _FamilyGridCardState extends State<_FamilyGridCard> {
  bool _isDragOver = false;
  int? _dropInsertIndex;
  final List<GlobalKey> _memberKeys = [];

  @override
  void didUpdateWidget(_FamilyGridCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.family.members.length != widget.family.members.length) {
      _syncMemberKeys();
    }
  }

  void _syncMemberKeys() {
    final needed = widget.family.members.length;
    while (_memberKeys.length < needed) {
      _memberKeys.add(GlobalKey());
    }
    while (_memberKeys.length > needed) {
      _memberKeys.removeLast();
    }
  }

  void _updateDropIndex(Offset globalPos) {
    int insert = _memberKeys.length;
    for (int i = 0; i < _memberKeys.length; i++) {
      final ctx = _memberKeys[i].currentContext;
      if (ctx == null) continue;
      final box = ctx.findRenderObject() as RenderBox?;
      if (box == null) continue;
      final center = box.localToGlobal(Offset.zero).dy + box.size.height / 2;
      if (globalPos.dy < center) {
        insert = i;
        break;
      }
    }
    if (_dropInsertIndex != insert) {
      setState(() => _dropInsertIndex = insert);
    }
  }

  @override
  Widget build(BuildContext context) {
    _syncMemberKeys();

    final isSourceCard = widget.activeDrag?.familyIndex == widget.familyIndex;
    final isValidDropTarget = widget.activeDrag != null && !isSourceCard;

    return DragTarget<_UserDragData>(
      onWillAcceptWithDetails: (details) =>
          details.data.familyIndex != widget.familyIndex,
      onMove: (details) {
        if (!_isDragOver) setState(() => _isDragOver = true);
        _updateDropIndex(details.offset);
      },
      onLeave: (_) => setState(() {
        _isDragOver = false;
        _dropInsertIndex = null;
      }),
      onAcceptWithDetails: (details) {
        final data = details.data;
        final insertAt = _dropInsertIndex ?? widget.family.members.length;
        widget.onMoveUser(
            data.memberIndex, data.familyIndex, insertAt, widget.familyIndex);
        setState(() {
          _isDragOver = false;
          _dropInsertIndex = null;
        });
      },
      builder: (context, candidateData, rejectedData) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS),
            boxShadow: SHADOW_SM,
            border: Border.all(
              color: _isDragOver
                  ? AppColors.pallet.forestGreen
                  : isValidDropTarget
                      ? AppColors.pallet.forestGreen.withValues(alpha: 0.35)
                      : AppColors.surfaceDivider,
              width: _isDragOver ? 2.0 : 0.5,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _CardHeader(
                family: widget.family,
                showSplitButton: widget.showSplitButton,
                onEditAddress: widget.onEditAddress,
                onSplitFamily: widget.onSplitFamily,
              ),
              _buildMemberList(context),
              _CardFooter(
                familyId: widget.family.id,
                onUpdateUserProfile: widget.onUpdateUserProfile,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMemberList(BuildContext context) {
    if (widget.family.members.isEmpty) {
      return Column(
        children: [
          if (_isDragOver) const _DropIndicator(),
          const _EmptyMembersPlaceholder(),
        ],
      );
    }

    final memberWidgets = List.generate(widget.family.members.length, (i) {
      final user = widget.family.members[i];
      return _MemberTile(
        key: _memberKeys[i],
        user: user,
        familyId: widget.family.id,
        familyIndex: widget.familyIndex,
        memberIndex: i,
        showReorderHandle: true,
        enableCrossFamilyDrag: widget.enableCrossFamilyDrag,
        onEdit: () =>
            widget.onUpdateUserProfile(context, widget.family.id, user, i),
        onDelete: () => widget.onRemoveUser(context, widget.family.id, i),
        onTap: () =>
            widget.onUpdateUserProfile(context, widget.family.id, user, i),
        onCrossFamilyDragStart: widget.onCrossFamilyDragStart,
        onCrossFamilyDragEnd: widget.onCrossFamilyDragEnd,
      );
    });

    // When dragging over this card, splice in the drop indicator at the right slot
    if (_isDragOver && _dropInsertIndex != null) {
      final idx = _dropInsertIndex!.clamp(0, widget.family.members.length);
      final slots = <Widget>[];
      for (int i = 0; i <= widget.family.members.length; i++) {
        if (i == idx) slots.add(const _DropIndicator());
        if (i < widget.family.members.length) slots.add(memberWidgets[i]);
      }
      return Column(mainAxisSize: MainAxisSize.min, children: slots);
    }

    return ReorderableListView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      buildDefaultDragHandles: false,
      proxyDecorator: _reorderProxyDecorator,
      onReorder: (oldIndex, newIndex) {
        if (newIndex > oldIndex) newIndex -= 1;
        widget.onMoveUser(
            oldIndex, widget.familyIndex, newIndex, widget.familyIndex);
      },
      children: memberWidgets,
    );
  }
}
