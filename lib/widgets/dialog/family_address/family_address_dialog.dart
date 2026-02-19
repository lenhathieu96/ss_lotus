import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'family_address_dialog_provider.dart';

class FamilyAddressDialog extends ConsumerWidget {
  final String? defaultAddress;
  final bool allowInitHouseHold;
  final void Function(String updatedAddress, int? houseHoldId) onAddressUpdated;

  const FamilyAddressDialog(
      {super.key,
      required this.onAddressUpdated,
      required this.allowInitHouseHold,
      this.defaultAddress});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(FamilyAddressFormProvider(defaultAddress));
    final formNotifier =
        ref.read(FamilyAddressFormProvider(defaultAddress).notifier);

    return Dialog(
      child: IntrinsicHeight(
        child: Container(
            width: MediaQuery.sizeOf(context).width * DIALOG_SM,
            padding: const EdgeInsets.all(SPACE_LG),
            child: Column(
              spacing: COMMON_SPACING * 4,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      spacing: 10,
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.pallet.forestGreen.withValues(alpha: 0.12),
                          ),
                          child: Icon(Icons.location_on, color: AppColors.actionPrimary, size: 18),
                        ),
                        Text('Thông tin địa chỉ',
                            style: TextStyle(fontSize: 18.0, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: IconButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: Icon(Icons.close, color: AppColors.textTertiary, size: 20),
                    ),
                  ],
                ),
                if (allowInitHouseHold == true)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                        onPressed: () {
                          formNotifier.toggleHasExistedId();
                        },
                        child: Text(
                          "Hộ đã tồn tại mã số trước đó?",
                          style:
                              TextStyle(color: AppColors.actionPrimary),
                        )),
                  ),
                TextFormField(
                        initialValue: formState.address.value,
                        autofocus: true,
                        decoration: InputDecoration(
                          labelText: 'Địa chỉ',
                          errorText: formState.address.isNotValid
                              ? formState.address.error
                              : null,
                        ),
                        onChanged: (value) => formNotifier.updateAddress(value),
                        textInputAction: TextInputAction.next,
                        onFieldSubmitted: (_) {
                          if (formState.address.value.isNotEmpty) {
                            onAddressUpdated(
                                formState.address.value.toUpperCase(),
                                formState.houseHoldId.value.isNotEmpty
                                    ? int.parse(formState.houseHoldId.value)
                                    : null);
                            Navigator.of(context).pop();
                          }
                        }),
                AnimatedSize(
                  duration: const Duration(milliseconds: 200),
                  child: formState.hasExistedId == true
                    ? TextFormField(
                        initialValue: formState.houseHoldId.value,
                        autofocus: true,
                        decoration: InputDecoration(
                          labelText: 'Mã số',
                          errorText: formState.houseHoldId.isNotValid
                              ? formState.houseHoldId.error
                              : null,
                        ),
                        onChanged: (value) =>
                            formNotifier.updateHouseholdId(value),
                        textInputAction: TextInputAction.next,
                        onFieldSubmitted: (_) {
                          if (formState.houseHoldId.value.isNotEmpty) {
                            onAddressUpdated(
                                formState.address.value.toUpperCase(),
                                formState.houseHoldId.value.isNotEmpty
                                    ? int.parse(formState.houseHoldId.value)
                                    : null);
                            Navigator.of(context).pop();
                          }
                        })
                    : SizedBox(),
                ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.actionPrimary),
                    label:
                        Text(defaultAddress == null ? "Thêm mới" : "Cập nhập", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    onPressed: () {
                      onAddressUpdated(
                          formState.address.value.toUpperCase(),
                          formState.houseHoldId.value.isNotEmpty
                              ? int.parse(formState.houseHoldId.value)
                              : null);
                      Navigator.of(context).pop();
                    },
                  ),
                ),
              ],
            )),
      ),
    );
  }
}
