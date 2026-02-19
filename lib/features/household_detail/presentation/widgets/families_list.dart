import 'package:drag_and_drop_lists/drag_and_drop_lists.dart';
import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';

class FamiliesList extends StatelessWidget {
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

  const FamiliesList(
      {super.key,
      required this.families,
      required this.onEditAddress,
      required this.onSplitFamily,
      required this.onUpdateUserProfile,
      required this.onRemoveUser,
      required this.onMoveUser});

  @override
  Widget build(BuildContext context) {
    List<DragAndDropList> dragAndDropLists = families.map((family) {
      return DragAndDropList(
        contentsWhenEmpty: Text("Chưa có thành viên nào"),
        canDrag: false,
        decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius:
                BorderRadius.all(Radius.circular(COMMON_BORDER_RADIUS)),
            boxShadow: SHADOW_SM),
        header: Container(
          padding: COMMON_EDGE_INSETS_PADDING,
          decoration: BoxDecoration(
            border: Border(
                left:
                    BorderSide(color: AppColors.pallet.forestGreen, width: 4)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  spacing: 10.0,
                  children: [
                    Flexible(
                      child: Text(family.address,
                          style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                    Tooltip(
                      message: "Sửa địa chỉ",
                      child: IconButton(
                        onPressed: () {
                          onEditAddress(
                              context, family.id, family.address, false);
                        },
                        style: IconButton.styleFrom(
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: Icon(
                          Icons.edit,
                          color: AppColors.actionPrimary,
                          size: 18,
                        ),
                      ),
                    )
                  ],
                ),
              ),
              Row(
                spacing: COMMON_SPACING,
                children: [
                  Text(
                    "Thành viên: ",
                    style: TextStyle(
                      fontFamily: "Mulish",
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    family.members.length.toString(),
                    style: TextStyle(
                        fontFamily: "Mulish",
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary),
                  ),
                  if (families.length > 1)
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                            color: AppColors.actionWarning, width: 1.5),
                        padding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      icon: Icon(Icons.splitscreen, size: 16),
                      label: const Text('Tách hộ mới',
                          style: TextStyle(fontSize: 13)),
                      onPressed: onSplitFamily != null
                          ? () {
                              onSplitFamily!(context, family.id);
                            }
                          : null,
                    ),
                ],
              ),
            ],
          ),
        ),
        footer: Padding(
          padding: EdgeInsets.only(
              bottom: COMMON_PADDING,
              left: COMMON_PADDING,
              right: COMMON_PADDING,
              top: SPACE_SM),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                      color: AppColors.actionPrimary,
                      width: 1.5,
                      strokeAlign: BorderSide.strokeAlignCenter),
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                icon: Icon(Icons.person_add, size: 16),
                label: const Text('Thêm thành viên',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                onPressed: () {
                  onUpdateUserProfile(context, family.id, null, null);
                },
              ),
            ],
          ),
        ),
        children: family.members.asMap().entries.map((
          entry,
        ) {
          int userIndex = entry.key;
          User user = entry.value;

          final borderRadius = BorderRadius.only(
            topLeft: userIndex == 0
                ? Radius.circular(COMMON_BORDER_RADIUS)
                : Radius.zero,
            topRight: userIndex == 0
                ? Radius.circular(COMMON_BORDER_RADIUS)
                : Radius.zero,
            bottomLeft: userIndex == family.members.length - 1
                ? Radius.circular(COMMON_BORDER_RADIUS)
                : Radius.zero,
            bottomRight: userIndex == family.members.length - 1
                ? Radius.circular(COMMON_BORDER_RADIUS)
                : Radius.zero,
          );

          // Generate initials from user name
          final initials = user.fullName
              .split(' ')
              .take(2)
              .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
              .join();

          return DragAndDropItem(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: COMMON_PADDING),
              child: Material(
                color: AppColors.surfaceCard,
                borderRadius: borderRadius,
                child: InkWell(
                  onTap: () {
                    onUpdateUserProfile(context, family.id, user, userIndex);
                  },
                  hoverColor: AppColors.surfaceCardAlt,
                  borderRadius: borderRadius,
                  child: Container(
                    decoration: BoxDecoration(
                      border: userIndex == family.members.length - 1
                          ? null
                          : Border(
                              bottom: BorderSide(
                                color: AppColors.surfaceDivider,
                                width: 0.5,
                              ),
                            ),
                      borderRadius: borderRadius,
                    ),
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                          horizontal: COMMON_PADDING, vertical: 12),
                      child: Row(
                        children: [
                          // Name and dharma name
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: 2,
                              children: [
                                Text(
                                  user.fullName,
                                  style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (user.christineName != null &&
                                    user.christineName!.isNotEmpty)
                                  Text(
                                    'Pháp danh: ${user.christineName}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                      fontStyle: FontStyle.italic,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                          SizedBox(width: SPACE_SM),
                          // Action buttons (show on hover)
                          MouseRegion(
                            child: Opacity(
                              opacity: 0.5,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                spacing: 4,
                                children: [
                                  Tooltip(
                                    message: "Sửa",
                                    child: IconButton(
                                      onPressed: () {
                                        onUpdateUserProfile(context, family.id,
                                            user, userIndex);
                                      },
                                      style: IconButton.styleFrom(
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(8)),
                                      ),
                                      icon: Icon(
                                        Icons.edit,
                                        color: AppColors.actionPrimary,
                                        size: 18,
                                      ),
                                      padding: EdgeInsets.all(4),
                                      constraints: BoxConstraints(
                                          minWidth: 32, minHeight: 32),
                                    ),
                                  ),
                                  Tooltip(
                                    message: "Xóa",
                                    child: IconButton(
                                      onPressed: () {
                                        onRemoveUser(
                                            context, family.id, userIndex);
                                      },
                                      style: IconButton.styleFrom(
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(8)),
                                      ),
                                      icon: Icon(
                                        Icons.delete_outline,
                                        color: AppColors.actionDanger,
                                        size: 18,
                                      ),
                                      padding: EdgeInsets.all(4),
                                      constraints: BoxConstraints(
                                          minWidth: 32, minHeight: 32),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      );
    }).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: COMMON_PADDING),
      child: DragAndDropLists(
          children: dragAndDropLists,
          listPadding: EdgeInsets.symmetric(vertical: COMMON_PADDING),
          itemDecorationWhileDragging: BoxDecoration(
            color: Colors.white,
            borderRadius:
                const BorderRadius.all(Radius.circular(COMMON_BORDER_RADIUS)),
            boxShadow: [
              BoxShadow(
                color: AppColors.surfaceDivider,
                spreadRadius: 2,
                blurRadius: 3,
                offset: const Offset(0, 0), // changes position of shadow
              ),
            ],
          ),
          onItemReorder: (int oldItemIndex, int oldListIndex, int newItemIndex,
              int newListIndex) {
            onMoveUser(oldItemIndex, oldListIndex, newItemIndex, newListIndex);
          },
          onListReorder: (_, __) {}),
    );
  }
}
