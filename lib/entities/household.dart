import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:ss_lotus/entities/user_group.dart';
import 'package:unorm_dart/unorm_dart.dart' as unorm;

import 'appointment.dart';

part 'household.freezed.dart';
part 'household.g.dart';

@freezed
abstract class HouseHold with _$HouseHold {
  const factory HouseHold(
      {required int id,
      int? oldId,
      required List<UserGroup> families,
      Appointment? appointment,
      @Default([]) List<String> searchKeywords}) = _HouseHold;

  factory HouseHold.fromJson(Map<String, Object?> json) =>
      _$HouseHoldFromJson(json);

  static List<String> buildSearchKeywords(HouseHold household) {
    final keywords = <String>{};
    keywords.add(household.id.toString());
    if (household.oldId != null) {
      keywords.add(household.oldId!.toString());
    }
    for (final family in household.families) {
      for (final word
          in unorm.nfc(family.address.toLowerCase()).split(RegExp(r'\s+'))) {
        if (word.isNotEmpty) keywords.add(word);
      }
      for (final member in family.members) {
        for (final word
            in unorm.nfc(member.fullName.toLowerCase()).split(RegExp(r'\s+'))) {
          if (word.isNotEmpty) keywords.add(word);
        }
      }
    }
    return keywords.toList();
  }
}
