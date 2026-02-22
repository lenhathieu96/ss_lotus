import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/family.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/widgets/app_button.dart';
import 'package:ss_lotus/widgets/app_icon_button.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/debounce.dart';

import 'search_households_dialog_provider.dart';

class SearchHouseholdsDialog extends ConsumerStatefulWidget {
  final void Function(HouseHold household) onSelectHousehold;
  final void Function()? onAddNewFamily;
  const SearchHouseholdsDialog(
      {super.key, required this.onSelectHousehold, this.onAddNewFamily});

  @override
  ConsumerState<ConsumerStatefulWidget> createState() =>
      _SearchHouseholdsDialogState();
}

class _SearchHouseholdsDialogState
    extends ConsumerState<SearchHouseholdsDialog> {
  late TextEditingController searchController;
  Debouncer debouncer = Debouncer(delay: Duration(milliseconds: 300));

  @override
  void initState() {
    super.initState();
    searchController = TextEditingController();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchedHouseholds = ref.watch(searchHouseHoldsProvider);
    final searchedHouseholdsNotifier =
        ref.read(searchHouseHoldsProvider.notifier);
    final isWaitingForInput =
        searchedHouseholds.isEmpty && searchController.value.text.isEmpty;

    return Dialog(
      alignment: Alignment.topCenter,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
      child: SizedBox(
        width: MediaQuery.sizeOf(context).width * DIALOG_LG,
        child: IntrinsicHeight(
          child: Column(
            children: [
              Container(
                decoration: BoxDecoration(
                    color: AppColors.surfaceCard,
                    boxShadow: SHADOW_SM,
                    borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(COMMON_BORDER_RADIUS),
                        topRight: Radius.circular(COMMON_BORDER_RADIUS),
                        bottomLeft: Radius.circular(
                            isWaitingForInput ? COMMON_BORDER_RADIUS : 0),
                        bottomRight: Radius.circular(
                            isWaitingForInput ? COMMON_BORDER_RADIUS : 0))),
                child: Row(
                  children: [
                    Expanded(
                      child: SearchBar(
                        autoFocus: true,
                        controller: searchController,
                        overlayColor:
                            WidgetStatePropertyAll(Colors.transparent),
                        hintText: "Nhập mã số - địa chỉ - họ tên",
                        backgroundColor: WidgetStatePropertyAll(AppColors.surfaceCard),
                        elevation: WidgetStatePropertyAll(0),
                        onChanged: (text) {
                          debouncer(() => searchedHouseholdsNotifier
                              .searchHouseHolds(text));
                        },
                        onSubmitted:
                            searchedHouseholdsNotifier.searchHouseHolds,
                        padding: WidgetStatePropertyAll(
                            EdgeInsets.all(COMMON_SPACING)),
                        leading: Icon(Icons.search, color: AppColors.textTertiary, size: 20),
                        trailing: [
                          Row(
                            spacing: COMMON_SPACING,
                            children: [
                              AppIconButton(
                                icon: Icons.close_rounded,
                                tooltip: 'Đóng',
                                onPressed: () {
                                  searchController.clear();
                                  searchedHouseholdsNotifier
                                      .searchHouseHolds("");
                                  Navigator.of(context).pop();
                                },
                              ),
                              if (widget.onAddNewFamily != null)
                                Container(
                                  decoration: BoxDecoration(
                                      border: Border(
                                          left: BorderSide(
                                              width: 1,
                                              color: AppColors.surfaceDivider))),
                                  child: TextButton(
                                      style: TextButton.styleFrom(
                                          overlayColor: Colors.transparent,
                                          foregroundColor:
                                              AppColors.actionPrimary),
                                      onPressed: () {
                                        Navigator.of(context).pop();
                                        widget.onAddNewFamily!();
                                      },
                                      child: Text("Tạo gia đình mới", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
                                ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              isWaitingForInput
                  ? Container()
                  : Column(
                      children: [
                        Divider(
                          height: 0.5,
                          color: AppColors.border,
                        ),
                        Container(
                          decoration: BoxDecoration(
                              color: AppColors.surfaceCard,
                              boxShadow: SHADOW_SM,
                              borderRadius: BorderRadius.only(
                                  bottomLeft:
                                      Radius.circular(COMMON_BORDER_RADIUS),
                                  bottomRight:
                                      Radius.circular(COMMON_BORDER_RADIUS))),
                          child: SizedBox(
                            height: MediaQuery.sizeOf(context).height * 0.6,
                            child: searchedHouseholds.isNotEmpty
                                ? ListView.builder(
                                    itemBuilder: (_, index) => InkWell(
                                        onTap: () {
                                          Navigator.of(context).pop();
                                          widget.onSelectHousehold(
                                              searchedHouseholds[index]);
                                        },
                                        hoverColor: Colors.transparent,
                                        mouseCursor: SystemMouseCursors.click,
                                        child: Container(
                                          padding: EdgeInsets.symmetric(
                                              horizontal: COMMON_PADDING,
                                              vertical: COMMON_SPACING),
                                          child: Container(
                                            padding: EdgeInsets.all(COMMON_SPACING * 1.5),
                                            decoration: BoxDecoration(
                                              color: AppColors.surfaceCardAlt,
                                              borderRadius: BorderRadius.circular(
                                                  COMMON_BORDER_RADIUS),
                                            ),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              spacing: COMMON_SPACING,
                                              children: [
                                                RichText(
                                                    text: TextSpan(children: [
                                                  TextSpan(
                                                      text: "Mã số: ",
                                                      style: TextStyle(
                                                          fontSize: 16.0,
                                                          fontFamily: "Mulish",
                                                          color: AppColors.textPrimary)),
                                                  TextSpan(
                                                      text: searchedHouseholds[
                                                              index]
                                                          .id
                                                          .toString(),
                                                      style: TextStyle(
                                                          fontSize: 16.0,
                                                          fontFamily: "Mulish",
                                                          fontWeight:
                                                              FontWeight.w600,
                                                          color: AppColors.textPrimary)),
                                                  if (searchedHouseholds[index]
                                                          .oldId !=
                                                      null) ...[
                                                    TextSpan(
                                                        text: "  (Mã cũ: ",
                                                        style: TextStyle(
                                                            fontSize: 16.0,
                                                            fontFamily: "Mulish",
                                                            color: AppColors
                                                                .textSecondary)),
                                                    TextSpan(
                                                        text: searchedHouseholds[
                                                                index]
                                                            .oldId
                                                            .toString(),
                                                        style: TextStyle(
                                                            fontSize: 16.0,
                                                            fontFamily: "Mulish",
                                                            fontWeight:
                                                                FontWeight.w600,
                                                            color: AppColors
                                                                .textSecondary)),
                                                    TextSpan(
                                                        text: ")",
                                                        style: TextStyle(
                                                            fontSize: 16.0,
                                                            fontFamily: "Mulish",
                                                            color: AppColors
                                                                .textSecondary)),
                                                  ],
                                                ])),
                                                ...searchedHouseholds[index]
                                                    .families
                                                    .asMap()
                                                    .entries
                                                    .map((entry) {
                                                  Family family = entry.value;
                                                  final hasMembers = family.members.isNotEmpty;
                                                  final extraCount = hasMembers ? family.members.length - 1 : 0;

                                                  return Container(
                                                    decoration: BoxDecoration(
                                                        color: AppColors.white,
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                                COMMON_BORDER_RADIUS),
                                                        border: Border.all(
                                                            width: 0.5,
                                                            color: AppColors
                                                                .border)),
                                                    padding: EdgeInsets.all(
                                                        COMMON_SPACING),
                                                    child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      spacing: COMMON_SPACING,
                                                      children: [
                                                        RichText(
                                                            text: TextSpan(
                                                                children: [
                                                              TextSpan(
                                                                  text:
                                                                      "Địa chỉ: ",
                                                                  style: TextStyle(
                                                                      fontSize:
                                                                          16.0,
                                                                      fontFamily:
                                                                          "Mulish",
                                                                      color: AppColors.textPrimary)),
                                                              TextSpan(
                                                                  text: family
                                                                      .address,
                                                                  style: TextStyle(
                                                                      fontSize:
                                                                          16.0,
                                                                      fontFamily:
                                                                          "Mulish",
                                                                      fontWeight:
                                                                          FontWeight
                                                                              .w600,
                                                                      color: AppColors.textPrimary))
                                                            ])),
                                                        if (hasMembers)
                                                          Row(
                                                            spacing: COMMON_SPACING,
                                                            children: [
                                                              Text(
                                                                family.members[0].fullName,
                                                                style: TextStyle(
                                                                    fontSize: 16.0,
                                                                    fontWeight: FontWeight.w600,
                                                                    color: AppColors.textPrimary),
                                                              ),
                                                              if (extraCount > 0)
                                                                Text(
                                                                  "+ $extraCount thành viên khác",
                                                                  style: TextStyle(
                                                                      fontSize: 13.0,
                                                                      color: AppColors.textTertiary),
                                                                ),
                                                            ],
                                                          ),
                                                      ],
                                                    ),
                                                  );
                                                })
                                              ],
                                            ),
                                          ),
                                        )),
                                    itemCount: searchedHouseholds.length,
                                  )
                                : Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      spacing: COMMON_SPACING,
                                      children: [
                                        Icon(
                                          Icons.search_off,
                                          color: AppColors.border,
                                          size: 56.0,
                                        ),
                                        Text(
                                          "Không tìm thấy kết quả",
                                          style: TextStyle(
                                              fontSize: 16.0,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textPrimary),
                                        ),
                                        Text(
                                          "Thử tìm với mã số, địa chỉ hoặc họ tên khác",
                                          style: TextStyle(
                                              fontSize: 14.0,
                                              color: AppColors.textTertiary),
                                        ),
                                        if (widget.onAddNewFamily != null)
                                          AppButton(
                                            icon: Icons.add,
                                            label: 'Tạo gia đình mới',
                                            color: AppColors.actionPrimary,
                                            onPressed: () {
                                              Navigator.of(context).pop();
                                              widget.onAddNewFamily!();
                                            },
                                          ),
                                      ],
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
