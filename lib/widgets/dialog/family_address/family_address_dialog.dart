import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'family_address_dialog_provider.dart';

class FamilyAddressDialog extends ConsumerWidget {
  final String? defaultAddress;
  final void Function(String updatedAddress) onAddressUpdated;

  const FamilyAddressDialog(
      {super.key, required this.onAddressUpdated, this.defaultAddress});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(FamilyAddressFormProvider(defaultAddress));
    final formNotifier =
        ref.read(FamilyAddressFormProvider(defaultAddress).notifier);

    return Dialog(
      child: Container(
          width: MediaQuery.of(context).size.width * 0.4,
          height: MediaQuery.of(context).size.height * 0.4,
          padding: COMMON_EDGE_INSETS_PADDING,
          child: Column(
            spacing: COMMON_SPACING * 4,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Thông tin địa chỉ'),
              TextFormField(
                initialValue: formState.address.value,
                decoration: InputDecoration(
                  labelText: 'Địa chỉ',
                  errorText: formState.address.isNotValid
                      ? formState.address.error
                      : null,
                ),
                onChanged: (value) => formNotifier.updateAddress(value),
              ),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  label: Text(defaultAddress == null ? "Thêm mới" : "Cập nhập"),
                  onPressed: () {
                    onAddressUpdated(formState.address.value.toUpperCase());
                    Navigator.of(context).pop();
                  },
                ),
              ),
            ],
          )),
    );
  }
}
