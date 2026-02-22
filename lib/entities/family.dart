import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:ss_lotus/entities/user.dart';

part 'family.freezed.dart';
part 'family.g.dart';

@freezed
abstract class Family with _$Family {
  const factory Family({
    required int id,
    required String address,
    required List<User> members,
  }) = _Family;

  factory Family.fromJson(Map<String, Object?> json) =>
      _$FamilyFromJson(json);
}
