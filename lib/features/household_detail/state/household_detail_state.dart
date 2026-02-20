import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter/foundation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user_group.dart';

part 'household_detail_state.freezed.dart';

@freezed
abstract class HouseholdDetailState with _$HouseholdDetailState {
  const factory HouseholdDetailState({
    @Default(null) HouseHold? unusedHouseHold,
    @Default(null) HouseHold? household,
    @Default(true) bool printable,
    @Default(false) bool isInitHousehold,
    @Default(false) bool isNewAutoId,
    @Default([]) List<UserGroup> suggestedFamilies,
  }) = _HouseholdDetailState;
}
