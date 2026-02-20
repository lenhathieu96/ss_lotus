# Printing Skill

PDF generation and print layout patterns for SS Lotus using the `pdf` and `printing` packages.

---

## Overview

Printing is triggered from the household detail footer. The flow is:
1. User clicks "In" button → calls `houseHoldDetailProvider.notifier.onPrint()`
2. Provider loads fonts and logo asset, builds a `pw.Document`
3. `buildPrintPage` (in `print_view.dart`) assembles the page layout
4. `Printing.layoutPdf` opens the browser print dialog / native print sheet

---

## Print Flow in Provider

```dart
// lib/features/household_detail/provider/household_detail_provider.dart

Future<void> onPrint() async {
  if (state.household == null) return;

  final doc = pw.Document();

  // Load Vietnamese-compatible fonts from assets
  final pageFont =
      await fontFromAssetBundle('assets/fonts/NotoSerif-Regular.ttf');
  final pageBoldFont =
      await fontFromAssetBundle('assets/fonts/NotoSerif-Bold.ttf');

  // Load logo image
  final logo = await imageFromAssetBundle('assets/images/dharmachakra.png');

  // Build the page
  doc.addPage(buildPrintPage(logo, pageFont, pageBoldFont, state.household!));

  // Trigger print dialog
  await Printing.layoutPdf(
    onLayout: (PdfPageFormat format) async => doc.save(),
  );
}
```

---

## buildPrintPage

Defined in `lib/features/household_detail/presentation/widgets/print_view.dart`.

```dart
pw.Page buildPrintPage(
  pw.ImageProvider logo,
  pw.Font pageFont,
  pw.Font pageBoldFont,
  HouseHold household,
) {
  // Returns a pw.Page with household data laid out for print
}
```

---

## Font Requirements

Vietnamese text requires **NotoSerif** — Mulish does not cover Vietnamese diacritics for PDF rendering.

```dart
// Assets declared in pubspec.yaml:
assets/fonts/NotoSerif-Regular.ttf
assets/fonts/NotoSerif-Bold.ttf
```

All `pw.TextStyle` in print views must specify the font:

```dart
pw.TextStyle(font: pageFont, fontSize: 12)
pw.TextStyle(font: pageBoldFont, fontSize: 14, fontWeight: pw.FontWeight.bold)
```

---

## PDF Widgets Reference

The `pdf` package uses `pw.*` widgets (not Flutter widgets):

```dart
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';

// Text
pw.Text('Nội dung', style: pw.TextStyle(font: pageFont, fontSize: 12))

// Column
pw.Column(
  crossAxisAlignment: pw.CrossAxisAlignment.start,
  children: [ ... ],
)

// Row
pw.Row(
  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
  children: [ ... ],
)

// Container
pw.Container(
  padding: const pw.EdgeInsets.all(8),
  decoration: pw.BoxDecoration(border: pw.Border.all()),
  child: pw.Text('...'),
)

// Image (logo)
pw.Image(logo, width: 48, height: 48)

// Divider
pw.Divider()

// SizedBox
pw.SizedBox(height: 8)

// Table
pw.Table(
  children: [
    pw.TableRow(children: [
      pw.Text('Col 1'),
      pw.Text('Col 2'),
    ]),
  ],
)
```

---

## Page Setup

```dart
return pw.Page(
  pageFormat: PdfPageFormat.a4,
  margin: const pw.EdgeInsets.all(24),
  build: (pw.Context context) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        // header, content, etc.
      ],
    );
  },
);
```

---

## Print Guard (Footer Button State)

The "In" button is only enabled after a successful save:

```dart
// In house_hold_detail_footer.dart:
AppButton(
  label: 'In',
  onPressed: (state.printable && hasMembers) ? onPrint : null,
)
```

`printable` is set to `true` by `onSaveChanges()` and reset to `false` on any edit.
