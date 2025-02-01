import 'package:formz/formz.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/appointment.dart';
import 'package:ss_lotus/entities/common.enum.dart';

part 'appointment_registration_dialog_provider.g.dart';

class DateInput extends FormzInput<DateTime?, String> {
  const DateInput.pure() : super.pure(null);
  const DateInput.dirty([super.value]) : super.dirty();

  @override
  String? validator(DateTime? value) {
    return value == null ? 'Ngày không được để trống' : null;
  }
}

class PeriodInput extends FormzInput<Period, String> {
  const PeriodInput.pure() : super.pure(Period.morning);
  const PeriodInput.dirty([super.value = Period.morning]) : super.dirty();

  @override
  String? validator(Period value) {
    return null;
  }
}

class AppointmentRegistrationFormState {
  final DateInput date;
  final PeriodInput period;

  const AppointmentRegistrationFormState({
    this.date = const DateInput.pure(),
    this.period = const PeriodInput.pure(),
  });

  bool get isDirty => !date.isPure || !period.isPure;
  bool get isValid => Formz.validate([date, period]);
}

@riverpod
class AppointmentRegistrationForm extends _$AppointmentRegistrationForm {
  @override
  AppointmentRegistrationFormState build(Appointment? appointment) {
    return AppointmentRegistrationFormState(
        date: appointment != null
            ? DateInput.dirty(appointment.date)
            : DateInput.pure(),
        period: appointment != null
            ? PeriodInput.dirty(appointment.period)
            : PeriodInput.pure());
  }

  void updateDate(DateTime value) {
    state = AppointmentRegistrationFormState(
      date: DateInput.dirty(value),
      period: state.period,
    );
  }

  void updatePeriod(Period? value) {
    if (value == null) {
      return;
    }
    state = AppointmentRegistrationFormState(
      date: state.date,
      period: PeriodInput.dirty(value),
    );
  }
}
