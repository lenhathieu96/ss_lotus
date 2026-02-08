// ignore_for_file: library_private_types_in_public_api

import 'package:flutter/material.dart';

@immutable
class AppColors {
  const AppColors._(); // Private constructor to prevent instantiation

  static final _Pallet pallet = _Pallet();
  static final Color primary = pallet.green30;
  static final Color white = pallet.white10;
  static final Color border = pallet.gray30;
  static final Color transparent = Colors.transparent;

  // Semantic - Actions
  static final Color actionPrimary = pallet.blue30;
  static final Color actionSecondary = pallet.blue50;
  static final Color actionDanger = pallet.red30;
  static final Color actionWarning = pallet.yellow50;
  static final Color actionSuccess = pallet.green30;
  static final Color actionSchedule = pallet.purple30;

  // Semantic - Surfaces
  static final Color surfaceBackground = pallet.gray10;
  static final Color surfaceCard = pallet.white10;
  static final Color surfaceCardAlt = pallet.gray20;
  static final Color surfaceDivider = pallet.gray30;

  // Semantic - Text
  static final Color textPrimary = pallet.black40;
  static final Color textSecondary = pallet.gray50;
  static final Color textTertiary = pallet.gray40;
}

@immutable
class _Pallet {
  const _Pallet(); // Constructor to prevent instantiation

  // Greens
  final Color green10 = const Color(0xFFE7F9E7);
  final Color green20 = const Color(0xFFBDEDBD);
  final Color green30 = const Color(0xFF53B175);
  final Color green40 = const Color(0xFF3C8B5C);
  final Color green50 = const Color(0xFF2A603F);

  // Purples
  final Color purple10 = const Color(0xFFF4EBF8);
  final Color purple20 = const Color(0xFFD4C4E4);
  final Color purple30 = const Color(0xFF7B5EA7);
  final Color purple40 = const Color(0xFF5C4580);
  final Color purple50 = const Color(0xFF3D2F59);

  // Blacks
  final Color black10 = const Color(0xFFE6E6E6);
  final Color black20 = const Color(0xFFA1A1A1);
  final Color black30 = const Color(0xFF4C4F4D);
  final Color black40 = const Color(0xFF2B2B2B);
  final Color black50 = const Color(0xFF000000);

  // Grays
  final Color gray10 = const Color(0xFFFAFAFA);
  final Color gray20 = const Color(0xFFEAEAEA);
  final Color gray30 = const Color(0xFFBFBFBF);
  final Color gray40 = const Color(0xFF8F8F8F);
  final Color gray50 = const Color(0xFF606060);

  // Whites
  final Color white10 = const Color(0xFFFFFFFF);
  final Color white20 = const Color(0xFFFEFEFE);
  final Color white30 = const Color(0xFFFFF9FF);
  final Color white40 = const Color(0xFFF8F8F8);
  final Color white50 = const Color(0xFFF1F1F1);

  // Blues
  final Color blue10 = const Color(0xFFE4F0FF);
  final Color blue20 = const Color(0xFFB2D4FF);
  final Color blue30 = const Color(0xFF5383EC);
  final Color blue40 = const Color(0xFF3B6CC2);
  final Color blue50 = const Color(0xFF1F4E8B);

  // Reds
  final Color red10 = const Color(0xFFFFF3F3);
  final Color red20 = const Color(0xFFFFA8A8);
  final Color red30 = const Color(0xFFFF6F6F);
  final Color red40 = const Color(0xFFC84D4D);
  final Color red50 = const Color(0xFF8B3232);

  // Yellows
  final Color yellow10 = const Color(0xFFFFF8E1);
  final Color yellow20 = const Color(0xFFFFECB3);
  final Color yellow30 = const Color(0xFFFFD54F);
  final Color yellow40 = const Color(0xFFFFC107);
  final Color yellow50 = const Color(0xFFFFA000);
}
