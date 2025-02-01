import 'package:drag_and_drop_lists/drag_and_drop_lists.dart';
import 'package:flutter/material.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:ss_lotus/utils/constants.dart';

class FamiliesList extends StatelessWidget {
  final List<UserGroup> families;
  final void Function(
    int oldItemIndex,
    int oldFamilyIndex,
    int newItemIndex,
    int newFamilyIndex,
  ) onMoveUser;
  final void Function(BuildContext context, int familyId, String defaultAddress)
      onEditAddress;
  final void Function(BuildContext context, int familyId, int userIndex)
      onRemoveUser;
  final void Function(BuildContext context, int familyId,
      User? defaultUserProfile, int? userIndex) onUpdateUserProfile;
  final void Function(BuildContext context, int familyId) onSplitFamily;

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
        canDrag: false,
        decoration: BoxDecoration(
            color: Colors.black12,
            borderRadius:
                BorderRadius.all(Radius.circular(COMMON_BORDER_RADIUS))),
        header: Padding(
          padding: COMMON_EDGE_INSETS_PADDING,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(family.address,
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () {
                      onEditAddress(context, family.id, family.address);
                    },
                    icon: Icon(
                      Icons.edit,
                      color: Colors.blueAccent,
                    ),
                  )
                ],
              ),
              Row(
                spacing: COMMON_SPACING,
                children: [
                  FilledButton.icon(
                    icon: Icon(Icons.person),
                    label: const Text('Thêm thành viên'),
                    onPressed: () {
                      onUpdateUserProfile(context, family.id, null, null);
                    },
                  ),
                  families.length == 1
                      ? Container()
                      : FilledButton.icon(
                          icon: Icon(Icons.splitscreen),
                          label: const Text('Tách hộ mới'),
                          onPressed: () {
                            onSplitFamily(context, family.id);
                          },
                        ),
                ],
              ),
            ],
          ),
        ),
        children: family.members.asMap().entries.map((
          entry,
        ) {
          int userIndex = entry.key;
          User user = entry.value;

          return DragAndDropItem(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: COMMON_PADDING),
              child: Container(
                decoration: BoxDecoration(
                    color: Colors.white,
                    border: userIndex == family.members.length - 1
                        ? null // No border for the last item
                        : Border(
                            bottom: BorderSide(
                              color: Color.fromARGB(128, 128, 128, 128),
                              width: 0.5, // Border width
                            ),
                          ),
                    borderRadius: BorderRadius.only(
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
                    )),
                child: ListTile(
                  title: Text(
                    user.fullName,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  trailing: SizedBox(
                    width: 100,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed: () {
                            onUpdateUserProfile(
                                context, family.id, user, userIndex);
                          },
                          icon: Icon(
                            Icons.edit,
                            color: Colors.blueAccent,
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            onRemoveUser(context, family.id, userIndex);
                          },
                          icon: Icon(
                            Icons.delete,
                            color: Colors.redAccent,
                          ),
                        ),
                      ],
                    ),
                  ),
                  subtitle: RichText(
                    text: TextSpan(children: [
                      TextSpan(
                          text: 'Pháp danh: ', style: TextStyle(fontSize: 16)),
                      TextSpan(
                          text: user.christineName,
                          style: TextStyle(fontSize: 16)),
                    ]),
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
                color: Color.fromARGB(128, 128, 128, 128),
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
