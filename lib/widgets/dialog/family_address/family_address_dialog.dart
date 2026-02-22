import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/widgets/app_button.dart';
import 'package:ss_lotus/widgets/app_icon_button.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'family_address_dialog_provider.dart';

class FamilyAddressDialog extends ConsumerWidget {
  final int? familyId;
  final int? defaultHouseHoldId;
  final String? defaultAddress;
  final void Function(String updatedAddress) onConfirmAddress;

  const FamilyAddressDialog({
    super.key,
    this.familyId,
    this.defaultHouseHoldId,
    this.defaultAddress,
    required this.onConfirmAddress,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState =
        ref.watch(familyAddressFormProvider(familyId, defaultAddress));
    final formNotifier =
        ref.read(familyAddressFormProvider(familyId, defaultAddress).notifier);

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
                            color: AppColors.pallet.forestGreen
                                .withValues(alpha: 0.12),
                          ),
                          child: Icon(Icons.location_on,
                              color: AppColors.actionPrimary, size: 18),
                        ),
                        Text('Thông tin địa chỉ',
                            style: TextStyle(
                                fontSize: 18.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary)),
                      ],
                    ),
                    AppIconButton(
                      icon: Icons.close,
                      iconSize: 20,
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                if (defaultHouseHoldId != null)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                        onPressed: () {
                          formNotifier.toggleHasExistedId();
                        },
                        child: Text(
                          "Hộ đã tồn tại mã số trước đó?",
                          style: TextStyle(color: AppColors.actionPrimary),
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
                        onConfirmAddress(
                          formState.address.value.toUpperCase(),
                        );
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
                              onConfirmAddress(
                                  formState.address.value.toUpperCase(),
                                  );
                              Navigator.of(context).pop();
                            }
                          })
                      : SizedBox(),
                ),
                SizedBox(
                  width: double.infinity,
                  child: AppButton(
                    variant: AppButtonVariant.elevated,
                    label: defaultAddress == null ? 'Thêm mới' : 'Cập nhật',
                    color: AppColors.actionPrimary,
                    onPressed: () {
                      onConfirmAddress(
                          formState.address.value.toUpperCase(),
                          );
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
