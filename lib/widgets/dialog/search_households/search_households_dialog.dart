import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:ss_lotus/themes/colors.dart';
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
  Debouncer debouncer = Debouncer(delay: Duration(seconds: 1));

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
        width: MediaQuery.of(context).size.width * 0.8,
        child: IntrinsicHeight(
          child: Column(
            children: [
              PhysicalModel(
                color: Colors.white,
                elevation: 6.0,
                borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(COMMON_BORDER_RADIUS),
                    topRight: Radius.circular(COMMON_BORDER_RADIUS),
                    bottomLeft: Radius.circular(
                        isWaitingForInput ? COMMON_BORDER_RADIUS : 0),
                    bottomRight: Radius.circular(
                        isWaitingForInput ? COMMON_BORDER_RADIUS : 0)),
                child: Row(
                  children: [
                    Expanded(
                      child: SearchBar(
                        autoFocus: true,
                        controller: searchController,
                        overlayColor:
                            WidgetStatePropertyAll(Colors.transparent),
                        hintText: "Nhập mã số - địa chỉ - họ tên",
                        backgroundColor: WidgetStatePropertyAll(Colors.white),
                        elevation: WidgetStatePropertyAll(0),
                        onChanged: (text) {
                          debouncer(() => searchedHouseholdsNotifier
                              .searchHouseHolds(text));
                        },
                        onSubmitted:
                            searchedHouseholdsNotifier.searchHouseHolds,
                        padding: WidgetStatePropertyAll(
                            EdgeInsets.all(COMMON_SPACING)),
                        trailing: [
                          Row(
                            spacing: COMMON_SPACING,
                            children: [
                              IconButton(
                                  onPressed: () {
                                    searchController.clear();
                                    searchedHouseholdsNotifier
                                        .searchHouseHolds("");
                                  },
                                  icon: Icon(
                                    Icons.close_rounded,
                                    color: AppColors.border,
                                  )),
                              if (widget.onAddNewFamily != null)
                                Container(
                                  decoration: BoxDecoration(
                                      border: Border(
                                          left: BorderSide(
                                              width: 1,
                                              color: AppColors.border))),
                                  child: TextButton(
                                      style: TextButton.styleFrom(
                                          overlayColor: Colors.transparent,
                                          foregroundColor:
                                              AppColors.pallet.blue30),
                                      onPressed: () {
                                        Navigator.of(context).pop();
                                        widget.onAddNewFamily!();
                                      },
                                      child: Text("Tạo gia đình mới")),
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
                        PhysicalModel(
                          color: Colors.white,
                          elevation: 6.0,
                          borderRadius: BorderRadius.only(
                              bottomLeft: Radius.circular(COMMON_BORDER_RADIUS),
                              bottomRight:
                                  Radius.circular(COMMON_BORDER_RADIUS)),
                          child: Container(
                            height: MediaQuery.of(context).size.height * 0.4,
                            decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.only(
                                    bottomLeft:
                                        Radius.circular(COMMON_BORDER_RADIUS),
                                    bottomRight:
                                        Radius.circular(COMMON_BORDER_RADIUS))),
                            child: searchedHouseholds.isNotEmpty
                                ? ListView.separated(
                                    itemBuilder: (_, index) => InkWell(
                                        onTap: () {
                                          Navigator.of(context).pop();
                                          widget.onSelectHousehold(
                                              searchedHouseholds[index]);
                                        },
                                        mouseCursor: SystemMouseCursors.click,
                                        child: Container(
                                          padding: COMMON_EDGE_INSETS_PADDING,
                                          margin: COMMON_EDGE_INSETS_PADDING,
                                          decoration: BoxDecoration(
                                            color: AppColors.pallet.gray20,
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
                                                        fontFamily: "Mulish")),
                                                TextSpan(
                                                    text: searchedHouseholds[
                                                            index]
                                                        .id
                                                        .toString(),
                                                    style: TextStyle(
                                                        fontSize: 16.0,
                                                        fontFamily: "Mulish",
                                                        fontWeight:
                                                            FontWeight.w600))
                                              ])),
                                              ...searchedHouseholds[index]
                                                  .families
                                                  .asMap()
                                                  .entries
                                                  .map((entry) {
                                                UserGroup family = entry.value;

                                                return Container(
                                                  width: double.infinity,
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
                                                                        "Mulish")),
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
                                                                            .w600))
                                                          ])),
                                                      Text(
                                                        family.members[0]
                                                            .fullName,
                                                        style: TextStyle(
                                                            fontSize: 16.0,
                                                            fontWeight:
                                                                FontWeight
                                                                    .w600),
                                                      ),
                                                    ],
                                                  ),
                                                );
                                              })
                                            ],
                                          ),
                                        )),
                                    separatorBuilder: (_, __) => Divider(
                                      height: 0.5,
                                      color: AppColors.border,
                                    ),
                                    itemCount: searchedHouseholds.length,
                                  )
                                : Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.search_off,
                                          color: AppColors.border,
                                          size: 40.0,
                                        ),
                                        Text(
                                          "Không tìm thấy kết quả",
                                          style: TextStyle(fontSize: 16.0),
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
