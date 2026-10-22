import 'package:flutter/material.dart';
import '../api_service.dart';
import '../models.dart';
import '../widgets/credit_card_id.dart';
import 'extra_form_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  final StudentProfile initialProfile;

  const HomeScreen({Key? key, required this.initialProfile}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late StudentProfile _profile;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _profile = widget.initialProfile;
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    try {
      final updated = await ApiService.getProfile();
      setState(() => _profile = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Refresh failed: $e')));
      }
    } finally {
      setState(() => _refreshing = false);
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.clearToken();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final isCorrection = _profile.verificationStatus == 'CORRECTION_REQUIRED';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hello, ${_profile.firstName}!',
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'Admission No: ${_profile.admissionNumber}',
              style: const TextStyle(color: Colors.white54, fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _refreshing
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _refresh,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white70),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Digital Credit-Card ID
              CreditCardIDWidget(profile: _profile),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  '💡 Tap card above to flip and view campus QR code',
                  style: TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ),
              const SizedBox(height: 24),

              // Action Box Below ID Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isCorrection ? Colors.amber.withOpacity(0.5) : Colors.white12,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Detailed Admission Profile',
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        if (isCorrection)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.amber.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Action Needed',
                              style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isCorrection
                        ? 'The office staff flagged mistakes in your submission. Tap below to review the office comments and update the unlocked items.'
                        : 'Submit your Malayalam name, previous marks, bank details, and upload mandatory 10th/+2 certificates and APAAR ID.',
                      style: const TextStyle(color: Colors.white60, fontSize: 12, height: 1.4),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () async {
                          final updated = await Navigator.push<StudentProfile>(
                            context,
                            MaterialPageRoute(builder: (_) => ExtraFormScreen(profile: _profile)),
                          );
                          if (updated != null) {
                            setState(() => _profile = updated);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isCorrection ? Colors.amber.shade700 : Colors.blue.shade600,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Text(
                          isCorrection
                              ? 'Fix Flagged Mistakes'
                              : _profile.verificationStatus == 'SUBMITTED'
                                  ? 'View Submitted Form (Locked)'
                                  : 'Fill Extra Details & Documents',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
