import 'package:formz/formz.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'family_address_dialog_provider.g.dart';

class AddressInput extends FormzInput<String, String> {
  const AddressInput.pure() : super.pure('');
  const AddressInput.dirty([super.value = '']) : super.dirty();

  @override
  String? validator(String value) {
    return value.isEmpty ? 'Địa chỉ không được để trống' : null;
  }
}

class HouseHoldIdInput extends FormzInput<String, String> {
  const HouseHoldIdInput.pure() : super.pure('');
  const HouseHoldIdInput.dirty([super.value = '']) : super.dirty();

  @override
  String? validator(String value) {
    if (value.isEmpty) {
      return null;
    }

    final isValid = RegExp(r'^\d{1,4}$').hasMatch(value);
    return isValid ? null : 'Mã số chỉ từ 1 đến 4 số';
  }
}

class FamilyAddressFormState {
  final AddressInput address;
  final HouseHoldIdInput houseHoldId;
  final bool hasExistedId;

  const FamilyAddressFormState(
      {this.address = const AddressInput.pure(),
      this.houseHoldId = const HouseHoldIdInput.pure(),
      this.hasExistedId = false});

  bool get isDirty => !address.isPure || houseHoldId.isPure;
  bool get isValid => Formz.validate([address]);
}

@riverpod
class FamilyAddressForm extends _$FamilyAddressForm {
  @override
  FamilyAddressFormState build(String? defaultAddress) {
    return FamilyAddressFormState(
        address: defaultAddress != null
            ? AddressInput.dirty(defaultAddress)
            : AddressInput.pure(),
        houseHoldId: HouseHoldIdInput.pure());
  }

  void updateAddress(String value) {
    state = FamilyAddressFormState(
        address: AddressInput.dirty(value),
        hasExistedId: state.hasExistedId,
        houseHoldId: state.houseHoldId);
  }

  void updateHouseholdId(String value) {
    state = FamilyAddressFormState(
        address: state.address,
        hasExistedId: state.hasExistedId,
        houseHoldId: HouseHoldIdInput.dirty(value));
  }

  void toggleHasExistedId() {
    state = FamilyAddressFormState(
        address: state.address,
        hasExistedId: true,
        houseHoldId: state.houseHoldId);
  }
}
