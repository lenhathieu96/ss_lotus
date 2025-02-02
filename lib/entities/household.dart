import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:ss_lotus/entities/user_group.dart';

import 'appointment.dart';
import 'user.dart';

part 'household.freezed.dart';
part 'household.g.dart';

@freezed
class HouseHold with _$HouseHold {
  const factory HouseHold(
      {required int id,
      required List<UserGroup> families,
      Appointment? appointment}) = _HouseHold;

  factory HouseHold.fromJson(Map<String, Object?> json) =>
      _$HouseHoldFromJson(json);

  static HouseHold fromHit(Map<String, dynamic> hitJson) {
    return HouseHold(
        id: hitJson['id'] as int,
        appointment: hitJson['appointment'] != null
            ? Appointment.fromJson(
                hitJson['appointment'] as Map<String, dynamic>)
            : null,
        families: (hitJson['families'] as List<dynamic>)
            .map((familyJson) => UserGroup(
                  id: familyJson['id'],
                  address: familyJson['address'] as String,
                  members: (familyJson['members'] as List<dynamic>)
                      .map((memberJson) => User(
                            fullName: memberJson['fullName'] as String,
                            christineName:
                                memberJson['christineName'] as String?,
                          ))
                      .toList(),
                ))
            .toList());
  }

  static HouseHold fromDeprecatedDB(Map<String, dynamic> deprecatedJson) {
    return HouseHold(id: deprecatedJson['id'] as int, families: [
      UserGroup(
          id: deprecatedJson['id'] as int,
          address: deprecatedJson['address'] as String,
          members: (deprecatedJson['members'] as List<dynamic>)
              .map((memberJson) => User(
                    fullName: memberJson['fullName'] as String,
                    christineName: memberJson['christineName']?.toString(),
                  ))
              .toList())
    ]);
  }
}
