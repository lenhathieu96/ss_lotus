import 'package:formz/formz.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'family_address_dialog_provider.g.dart';

class AddressInput extends FormzInput<String, String> {
  const AddressInput.pure() : super.pure('');
  const AddressInput.dirty([super.value = '']) : super.dirty();

  @override
  String? validator(String value) {
    return value.isEmpty ? ' Địa chỉ không được để trống' : null;
  }
}

class FamilyAddressFormState {
  final AddressInput address;

  const FamilyAddressFormState({
    this.address = const AddressInput.pure(),
  });

  bool get isDirty => !address.isPure;
  bool get isValid => Formz.validate([address]);
}

@riverpod
class FamilyAddressForm extends _$FamilyAddressForm {
  @override
  FamilyAddressFormState build(String? defaultAddress) {
    return FamilyAddressFormState(
        address: defaultAddress != null
            ? AddressInput.dirty(defaultAddress)
            : AddressInput.pure());
  }

  void updateAddress(String value) {
    state = FamilyAddressFormState(
      address: AddressInput.dirty(value),
    );
  }
}
