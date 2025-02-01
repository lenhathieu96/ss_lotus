import 'package:formz/formz.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/user.dart';

part 'user_profile_dialog_provider.g.dart';

class NameInput extends FormzInput<String, String> {
  const NameInput.pure() : super.pure('');
  const NameInput.dirty([super.value = '']) : super.dirty();

  @override
  String? validator(String value) {
    return value.isEmpty ? 'Tên không được để trống' : null;
  }
}

class ChristineNameInput extends FormzInput<String, String> {
  const ChristineNameInput.pure() : super.pure('');
  const ChristineNameInput.dirty([super.value = '']) : super.dirty();

  @override
  String? validator(String value) {
    return null;
  }
}

class UserProfileFormState {
  final NameInput name;
  final ChristineNameInput christineName;

  const UserProfileFormState({
    this.name = const NameInput.pure(),
    this.christineName = const ChristineNameInput.pure(),
  });

  bool get isDirty => !name.isPure || !christineName.isPure;
  bool get isValid => Formz.validate([name, christineName]);
}

@riverpod
class UserProfileForm extends _$UserProfileForm {
  @override
  UserProfileFormState build(User? user) {
    return UserProfileFormState(
        name: user != null ? NameInput.dirty(user.fullName) : NameInput.pure(),
        christineName: user != null && user.christineName != null
            ? ChristineNameInput.dirty(user.christineName!)
            : const ChristineNameInput.pure());
  }

  void updateName(String value) {
    state = UserProfileFormState(
      name: NameInput.dirty(value),
      christineName: state.christineName,
    );
  }

  void updateChristineName(String value) {
    state = UserProfileFormState(
      name: state.name,
      christineName: ChristineNameInput.dirty(value),
    );
  }
}
