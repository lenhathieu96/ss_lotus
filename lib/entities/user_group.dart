import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:ss_lotus/entities/user.dart';

part 'user_group.freezed.dart';
part 'user_group.g.dart';

@freezed
class UserGroup with _$UserGroup {
  const factory UserGroup({
    required int id,
    required String address,
    required List<User> members,
  }) = _UserGroup;

  factory UserGroup.fromJson(Map<String, Object?> json) =>
      _$UserGroupFromJson(json);
}
