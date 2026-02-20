// ignore_for_file: library_private_types_in_public_api

import 'package:flutter/material.dart';

@immutable
class AppColors {
  const AppColors._(); // Private constructor to prevent instantiation

  static final _Pallet pallet = _Pallet();
  static final Color primary = pallet.forestGreen;
  static final Color white = pallet.white10;
  static final Color border = pallet.warmGray30;
  static final Color transparent = Colors.transparent;

  // Semantic - Actions
  static final Color actionPrimary = pallet.sageGreen;
  static final Color actionSecondary = pallet.blue50;
  static final Color actionDanger = pallet.warmRed;
  static final Color actionWarning = pallet.deepGold;
  static final Color actionSuccess = pallet.sageGreen;
  static final Color actionSchedule = pallet.warmPurple;
  static final Color actionInfo = const Color(0xFF0EA5E9);    // sky-500
  static final Color actionAdd = const Color(0xFF10B981);     // emerald-500

  // Semantic - Surfaces
  static final Color surfaceBackground = pallet.warmCream;
  static final Color surfaceCard = pallet.white10;
  static final Color surfaceCardAlt = pallet.warmGray20;
  static final Color surfaceDivider = pallet.warmGray30;

  // Semantic - Text
  static final Color textPrimary = pallet.warmDark;
  static final Color textSecondary = pallet.warmMedium;
  static final Color textTertiary = pallet.warmLight;
}

@immutable
class _Pallet {
  const _Pallet(); // Constructor to prevent instantiation

  // Greens — derived from logo start color #53B175
  final Color green10 = const Color(0xFFE8F8EF);
  final Color green20 = const Color(0xFFA8DEBB);
  final Color green30 = const Color(0xFF53B175); // logo brand green
  final Color green40 = const Color(0xFF3A8A58);
  final Color green50 = const Color(0xFF235C39);

  // Purples — derived from logo end color #694285
  final Color purple10 = const Color(0xFFF2EAF7);
  final Color purple20 = const Color(0xFFCDB3E3);
  final Color purple30 = const Color(0xFF8A5BB5);
  final Color purple40 = const Color(0xFF694285); // logo brand purple
  final Color purple50 = const Color(0xFF432960);

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
  final Color blue50 = const Color(0xFF2563EB);

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

  // Brand Palette — extracted directly from logo gradient
  final Color forestGreen = const Color(0xFF53B175); // logo gradient start
  final Color sageGreen = const Color(0xFF45A065);   // slightly darker CTA variant
  final Color logoTeal = const Color(0xFF5B897D);    // logo gradient midpoint
  final Color logoPurple = const Color(0xFF694285);  // logo gradient end

  // Surfaces — tinted with logo teal for cohesion
  final Color warmCream = const Color(0xFFF5FAF7);   // green-tinted white
  final Color warmGray20 = const Color(0xFFECF4EF);  // soft green-tinted card bg
  final Color warmGray30 = const Color(0xFFCEDDD4);  // teal-tinted divider

  // Text — neutral with slight teal undertone
  final Color warmLight = const Color(0xFF6E8278);
  final Color warmMedium = const Color(0xFF475C52);
  final Color warmDark = const Color(0xFF1A2820);

  // Accent colors
  final Color warmRed = const Color(0xFFE84848);
  final Color deepGold = const Color(0xFFE09600);
  final Color warmPurple = const Color(0xFF8A5BB5);  // derived from logo purple30
}
