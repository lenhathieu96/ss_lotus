import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:unorm_dart/unorm_dart.dart' as unorm;

class HouseholdSearcher {
  final CollectionReference _householdRef =
      FirebaseFirestore.instance.collection("tdhp");

  Future<List<HouseHold>> search(String query) async {
    if (query.trim().isEmpty) return [];

    final words = unorm.nfc(query.toLowerCase().trim()).split(RegExp(r'\s+'));
    final firstWord = words.first;

    // Firestore array-contains query on first keyword
    final snapshot = await _householdRef
        .where('searchKeywords', arrayContains: firstWord)
        .limit(50)
        .get();

    List<HouseHold> results = snapshot.docs
        .map((doc) =>
            HouseHold.fromJson(doc.data() as Map<String, dynamic>))
        .toList();

    // Client-side filter for additional words (if multi-word query)
    if (words.length > 1) {
      results = results.where((household) {
        final houseKeywords = household.searchKeywords;
        return words.every(
            (word) => houseKeywords.any((kw) => kw.contains(word)));
      }).toList();
    }

    return results;
  }

  Future<HouseHold?> getById(int id) async {
    final doc = await _householdRef.doc(id.toString()).get();
    if (!doc.exists) return null;
    return HouseHold.fromJson(doc.data() as Map<String, dynamic>);
  }
}
