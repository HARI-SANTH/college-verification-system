import 'package:flutter_test/flutter_test.dart';
import 'package:college_app/main.dart';

void main() {
  testWidgets('CollegeApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CollegeApp());

    // Verify CollegeApp initializes
    expect(find.byType(CollegeApp), findsOneWidget);
  });
}
