import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/entities/user.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/utils.dart';

pw.Page buildPrintPage(pw.ImageProvider logo, pw.Font pageFont,
    pw.Font pageBoldFont, HouseHold houseHold) {
  return pw.MultiPage(
      pageFormat: PdfPageFormat.a5,
      margin: pw.EdgeInsets.only(
          top: COMMON_PADDING,
          right: 1.5 * COMMON_PADDING,
          left: 1.5 * COMMON_PADDING,
          bottom: 2 * COMMON_PADDING),
      header: (context) {
        if (context.pageNumber > 1) {
          return pw.Container();
        }
        return pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Image(logo, width: 50, height: 50),
              pw.Spacer(flex: 1),
              pw.Center(
                  child: pw.Text("CẦU AN",
                      style: pw.TextStyle(
                        font: pageBoldFont,
                        fontSize: 18,
                      ))),
              pw.Spacer(flex: 1),
              pw.Column(
                children: [
                  pw.Text(
                      Utils.getAppointmentTitle(houseHold.appointment, true),
                      style: pw.TextStyle(font: pageBoldFont, fontSize: 10)),
                  pw.SizedBox(height: COMMON_SPACING / 2),
                  pw.Container(
                      padding: pw.EdgeInsets.symmetric(
                          horizontal: COMMON_SPACING, vertical: COMMON_SPACING),
                      decoration: pw.BoxDecoration(border: pw.Border.all()),
                      child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          children: [
                            pw.Text("Mã số",
                                style:
                                    pw.TextStyle(font: pageFont, fontSize: 10)),
                            pw.Text(houseHold.id.toString(),
                                style: pw.TextStyle(
                                  font: pageBoldFont,
                                  fontSize: 10,
                                ))
                          ]))
                ],
              )
            ]);
      },
      footer: (context) {
        if (context.pagesCount > 1 && context.pageNumber < context.pagesCount) {
          return pw.Row(children: [
            pw.Spacer(),
            pw.Text("Trang tiếp theo",
                style: pw.TextStyle(
                  font: pageBoldFont,
                  fontSize: 10,
                ))
          ]);
        }
        return pw.Container();
      },
      build: (pw.Context context) {
        return [
          ...houseHold.families.map((family) {
            return pw.Column(children: [
              pw.SizedBox(height: COMMON_SPACING),
              pw.Container(
                padding: pw.EdgeInsets.all(COMMON_SPACING),
                decoration: pw.BoxDecoration(border: pw.Border.all()),
                width: double.infinity,
                child: pw.Text(family.address,
                    style: pw.TextStyle(
                      font: pageBoldFont,
                      fontSize: 12,
                    ),
                    textAlign: pw.TextAlign.center),
              ),
              pw.Row(children: [
                pw.Flexible(
                    flex: 1,
                    child: pw.Container(
                      decoration: pw.BoxDecoration(border: pw.Border.all()),
                      alignment: pw.Alignment.center,
                      padding: const pw.EdgeInsets.all(COMMON_SPACING),
                      child: pw.Text(
                        'STT',
                        style: pw.TextStyle(font: pageFont, fontSize: 12),
                      ),
                    )),
                pw.Flexible(
                    flex: 3,
                    child: pw.Container(
                      decoration: pw.BoxDecoration(border: pw.Border.all()),
                      alignment: pw.Alignment.centerLeft,
                      padding: const pw.EdgeInsets.all(COMMON_SPACING),
                      child: pw.Text(
                        'Họ và tên',
                        style: pw.TextStyle(font: pageFont, fontSize: 12),
                      ),
                    )),
                pw.Flexible(
                    flex: 2,
                    child: pw.Container(
                      decoration: pw.BoxDecoration(border: pw.Border.all()),
                      alignment: pw.Alignment.centerLeft,
                      padding: const pw.EdgeInsets.all(COMMON_SPACING),
                      child: pw.Text(
                        'Pháp danh',
                        style: pw.TextStyle(font: pageFont, fontSize: 12),
                      ),
                    )),
              ]),
              ...family.members.asMap().entries.map((entry) {
                int index = entry.key;
                User member = entry.value;
                return pw.Row(children: [
                  pw.Flexible(
                      flex: 1,
                      child: pw.Container(
                        height: 44,
                        decoration: pw.BoxDecoration(border: pw.Border.all()),
                        alignment: pw.Alignment.center,
                        padding: const pw.EdgeInsets.all(COMMON_SPACING),
                        child: pw.Text(
                          "${index + 1}",
                          style: pw.TextStyle(font: pageBoldFont, fontSize: 12),
                        ),
                      )),
                  pw.Flexible(
                      flex: 3,
                      child: pw.Container(
                        height: 44,
                        decoration: pw.BoxDecoration(border: pw.Border.all()),
                        alignment: pw.Alignment.centerLeft,
                        padding: const pw.EdgeInsets.all(COMMON_SPACING),
                        child: pw.Text(
                          member.fullName,
                          style: pw.TextStyle(font: pageBoldFont, fontSize: 12),
                        ),
                      )),
                  pw.Flexible(
                    flex: 2,
                    child: pw.Container(
                      height: 44,
                      decoration: pw.BoxDecoration(border: pw.Border.all()),
                      alignment: pw.Alignment.centerLeft,
                      padding: const pw.EdgeInsets.all(COMMON_SPACING),
                      child: pw.Text(
                        member.christineName ?? "",
                        style: pw.TextStyle(font: pageBoldFont, fontSize: 12),
                      ),
                    ),
                  )
                ]);
              }),
            ]);
          }),
        ]; // Center
      });
}
