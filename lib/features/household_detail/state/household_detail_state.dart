import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter/foundation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/family.dart';

part 'household_detail_state.freezed.dart';

@freezed
abstract class HouseholdDetailState with _$HouseholdDetailState {
  const factory HouseholdDetailState({
    @Default(null) HouseHold? household,
    @Default(true) bool printable,
    @Default(false) bool isNewHousehold,
    @Default([]) List<Family> suggestedFamilies,
  }) = _HouseholdDetailState;
}
