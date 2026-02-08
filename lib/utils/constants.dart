import 'package:flutter/material.dart';

const double COMMON_BORDER_RADIUS = 12.0;
const double COMMON_SPACING = 8.0;
const double COMMON_PADDING = 16.0;

const EdgeInsets COMMON_EDGE_INSETS_PADDING = EdgeInsets.all(COMMON_PADDING);

// Spacing scale
const double SPACE_XS = 4.0;
const double SPACE_SM = 8.0;
const double SPACE_MD = 16.0;
const double SPACE_LG = 24.0;
const double SPACE_XL = 32.0;

// Dialog widths (fraction of screen)
const double DIALOG_SM = 0.35;
const double DIALOG_MD = 0.5;
const double DIALOG_LG = 0.7;

// Shadow presets
const List<BoxShadow> SHADOW_SM = [BoxShadow(color: Color(0x0A000000), blurRadius: 4, offset: Offset(0, 2))];
const List<BoxShadow> SHADOW_MD = [BoxShadow(color: Color(0x12000000), blurRadius: 8, offset: Offset(0, 4))];
const List<BoxShadow> SHADOW_LG = [BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, 8))];
