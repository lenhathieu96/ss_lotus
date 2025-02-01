import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:ss_lotus/entities/common.enum.dart';

part 'appointment.freezed.dart';
part 'appointment.g.dart';

@freezed
class Appointment with _$Appointment {
  const factory Appointment({
    required Period period,
    required DateTime date,
    required AppointmentType appointmentType,
  }) = _Appointment;

  factory Appointment.fromJson(Map<String, Object?> json) =>
      _$AppointmentFromJson(json);
}
