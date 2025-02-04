import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/widgets/dialog/user_profile/user_profile_dialog_provider.dart';

class UserProfileDialog extends ConsumerWidget {
  final User? user;
  final void Function(User updatedPerson) onProfileUpdated;

  const UserProfileDialog(
      {super.key, required this.onProfileUpdated, this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(userProfileFormProvider(user));
    final formNotifier = ref.read(userProfileFormProvider(user).notifier);

    return Dialog(
      child: IntrinsicHeight(
        child: Container(
            width: MediaQuery.of(context).size.width * 0.4,
            padding: COMMON_EDGE_INSETS_PADDING,
            child: Column(
              spacing: COMMON_SPACING * 4,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Thông tin phật tử',
                    style:
                        TextStyle(fontSize: 18.0, fontWeight: FontWeight.bold)),
                TextFormField(
                  initialValue: formState.name.value,
                  autofocus: true,
                  decoration: InputDecoration(
                    labelText: 'Tên',
                    errorText:
                        formState.name.isNotValid ? formState.name.error : null,
                  ),
                  onChanged: (value) => formNotifier.updateName(value),
                  textInputAction: TextInputAction.next,
                  onFieldSubmitted: (_) {
                    if (formState.name.value.isNotEmpty) {
                      onProfileUpdated(User(
                          fullName: formState.name.value.toUpperCase(),
                          christineName:
                              formState.christineName.value.toUpperCase()));
                      Navigator.of(context).pop();
                    }
                  },
                ),
                TextFormField(
                  initialValue: formState.christineName.value,
                  decoration: InputDecoration(
                    labelText: 'Pháp danh',
                    errorText: formState.christineName.isNotValid
                        ? formState.christineName.error
                        : null,
                  ),
                  onChanged: (value) => formNotifier.updateChristineName(value),
                  onFieldSubmitted: (_) {
                    if (formState.name.value.isNotEmpty) {
                      onProfileUpdated(User(
                          fullName: formState.name.value.toUpperCase(),
                          christineName:
                              formState.christineName.value.toUpperCase()));
                      Navigator.of(context).pop();
                    }
                  },
                ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: user == null
                            ? AppColors.pallet.blue30
                            : AppColors.pallet.blue50),
                    label: Text(user == null ? "Thêm mới" : "Cập nhập"),
                    onPressed: () {
                      onProfileUpdated(User(
                          fullName: formState.name.value.toUpperCase(),
                          christineName:
                              formState.christineName.value.toUpperCase()));
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
