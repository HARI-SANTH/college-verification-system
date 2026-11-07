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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refresh();
    });
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
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.clearToken();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  String _calculateSemesterText(String timePeriod) {
    if (timePeriod.trim().isEmpty) return 'SEMESTER 1';

    // Extract start year (4 digits)
    final startMatch = RegExp(r'(\d{4})').firstMatch(timePeriod);
    final startYear = startMatch != null ? int.tryParse(startMatch.group(1)!) ?? 2024 : 2024;

    final now = DateTime.now();
    final currentYear = now.year;
    final currentMonth = now.month;

    // Academic year runs approximately June to May in Indian colleges:
    // Months 6..11 (June - November) = Odd Semester (Sem 1, 3, 5, 7)
    // Months 12, 1..5 (December - May) = Even Semester (Sem 2, 4, 6, 8)
    int academicYearIndex;
    if (currentMonth >= 6) {
      academicYearIndex = currentYear - startYear;
    } else {
      academicYearIndex = (currentYear - 1) - startYear;
    }
    if (academicYearIndex < 0) academicYearIndex = 0;

    // First 6 months (June-Nov) -> Semester 1 of that year
    // Second 6 months (Dec-May) -> Semester 2 of that year
    final isFirstHalf = (currentMonth >= 6 && currentMonth <= 11);
    final semInYear = isFirstHalf ? 1 : 2;

    final calculatedSem = (academicYearIndex * 2) + semInYear;

    // Determine max semesters based on end year (e.g. 2024-2028 = 4 years = 8 semesters)
    int maxSem = 8;
    final endMatch = RegExp(r'(\d{4})[^\d]+(\d{2,4})').firstMatch(timePeriod);
    if (endMatch != null) {
      var rawEnd = int.tryParse(endMatch.group(2)!) ?? (startYear + 4);
      if (rawEnd < 100) rawEnd += 2000;
      final totalYears = rawEnd - startYear;
      if (totalYears > 0) maxSem = totalYears * 2;
    }

    final finalSem = calculatedSem.clamp(1, maxSem);
    return 'SEMESTER $finalSem';
  }

  void _navigateToForm() async {
    final updated = await Navigator.push<StudentProfile>(
      context,
      MaterialPageRoute(builder: (_) => ExtraFormScreen(profile: _profile)),
    );
    if (updated != null) {
      setState(() => _profile = updated);
    }
    // Always fetch latest profile so updated photo and details reflect immediately
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final isCorrection = _profile.verificationStatus == 'CORRECTION_REQUIRED';
    final isVerified = _profile.verificationStatus == 'VERIFIED';
    final isSubmitted = _profile.verificationStatus == 'SUBMITTED';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleSpacing: 16,
        title: Row(
          children: [
            Image.asset(
              'assets/images/college_logo.png',
              width: 34,
              height: 34,
              fit: BoxFit.contain,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Text(
                    'BASELIOS POULOSE II CATHOLICOSE COLLEGE',
                    style: TextStyle(
                      color: Color(0xFF1E3A8A),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                      height: 1.15,
                    ),
                    maxLines: 2,
                    softWrap: true,
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Piravom • Student Digital Portal',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _refreshing
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E3A8A)))
                : const Icon(Icons.refresh, color: Color(0xFF64748B)),
            onPressed: _refresh,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF64748B)),
            onPressed: _handleLogout,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Greeting & Key Metadata
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF86F2E4).withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _calculateSemesterText(_profile.timePeriodOfStudy),
                          style: const TextStyle(
                            color: Color(0xFF006F66),
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _profile.timePeriodOfStudy.isNotEmpty ? 'AY ${_profile.timePeriodOfStudy}' : 'AY 2024–28',
                          style: const TextStyle(
                            color: Color(0xFF475569),
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF0D9488),
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'PORTAL ACTIVE',
                        style: TextStyle(
                          color: Color(0xFF0D9488),
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Text(
                'Welcome back, ${_profile.firstName}',
                style: const TextStyle(
                  color: Color(0xFF131B2E),
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),

              Row(
                children: [
                  const Text('Reg ID: ', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAEDFF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _profile.admissionNumber,
                      style: const TextStyle(
                        color: Color(0xFF1E3A8A),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Digital Credit Card ID
              CreditCardIDWidget(profile: _profile, onOpenForm: _navigateToForm),
              const SizedBox(height: 16),

              // Action Alert Banner (If Office Flagged Corrections - Stitch Exact Replica)
              if (isCorrection)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.amber.withValues(alpha: 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(Icons.warning_amber_rounded, color: Color(0xFFB45309), size: 20),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const Expanded(
                                  child: Text(
                                    'Action Needed: Correction Required',
                                    style: TextStyle(
                                      color: Color(0xFF92400E),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'HIGH PRIORITY',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 7.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'The Academic cell noted errors or blurred documents in your profile. Please review the office comments and re-upload the requested items.',
                              style: TextStyle(color: Color(0xFF92400E), fontSize: 11, height: 1.3),
                            ),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: _navigateToForm,
                              child: Row(
                                children: const [
                                  Text(
                                    'Resolve Clarification',
                                    style: TextStyle(
                                      color: Color(0xFF1E3A8A),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  SizedBox(width: 4),
                                  Icon(Icons.arrow_forward, color: Color(0xFF1E3A8A), size: 14),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              if (isCorrection) const SizedBox(height: 16),

              // Admission Pipeline Stepper Card (Stitch Exact Replica)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.fact_check_outlined, color: Color(0xFF1E3A8A), size: 18),
                            SizedBox(width: 8),
                            Text(
                              'Admission Pipeline',
                              style: TextStyle(
                                color: Color(0xFF131B2E),
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isVerified
                                ? const Color(0xFF86F2E4).withValues(alpha: 0.3)
                                : const Color(0xFFEAEDFF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isVerified
                                ? 'Enrolled & Verified'
                                : isSubmitted
                                    ? 'Step 3 of 4 Active'
                                    : 'Step 2 Active',
                            style: TextStyle(
                              color: isVerified ? const Color(0xFF006F66) : const Color(0xFF1E3A8A),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Timeline Step 1: Account Initialized (Completed)
                    _timelineItem(
                      stepNum: '1',
                      isCompleted: true,
                      title: 'Account Initialized',
                      desc: 'Student account authenticated & registered on ERP.',
                      trailingDate: 'Verified',
                    ),

                    // Timeline Step 2: Data Submitted (Completed if submitted or verified)
                    _timelineItem(
                      stepNum: '2',
                      isCompleted: isSubmitted || isVerified || isCorrection,
                      title: 'Admission Data Submitted',
                      desc: 'Bilingual Malayalam, bank, and qualifying details recorded.',
                      trailingDate: isSubmitted || isVerified || isCorrection ? 'Completed' : 'Draft',
                    ),

                    // Timeline Step 3: Office Document Check
                    _timelineItem(
                      stepNum: '3',
                      isCompleted: isVerified,
                      isActive: isSubmitted || isCorrection,
                      title: 'Office Document Verification',
                      desc: isCorrection
                          ? 'Mistake flagged by office staff. Correction pending.'
                          : isVerified
                              ? 'All certificates and marks verified by office clerk.'
                              : 'Under active examination by Registrar Academic Desk.',
                      trailingDate: isVerified
                          ? 'Approved'
                          : isCorrection
                              ? 'Attention'
                              : 'In Review',
                      showProgress: isSubmitted,
                    ),

                    // Timeline Step 4: Final Dean Approval
                    _timelineItem(
                      stepNum: '4',
                      isCompleted: isVerified,
                      isLast: true,
                      title: 'Principal Institutional Approval',
                      desc: 'Permanent roll generated in official college registry.',
                      trailingDate: isVerified ? 'Verified' : 'Pending',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Primary Action Buttons Suite
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _navigateToForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isCorrection ? const Color(0xFFD97706) : const Color(0xFF1E3A8A),
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(isCorrection ? Icons.edit_note : Icons.assignment_outlined, color: Colors.white, size: 20),
                          const SizedBox(width: 10),
                          Text(
                            isCorrection
                                ? 'Review & Fix Flagged Mistakes'
                                : isVerified
                                    ? 'View Verified Admission Form'
                                    : 'View / Edit Admission Data Form',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                      const Icon(Icons.arrow_forward, color: Colors.white70, size: 18),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Secondary Button: Verification Slip
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Downloading Official Verification Slip...')),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.download, color: Color(0xFF0D9488), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Download Official Verification Slip (PDF)',
                        style: TextStyle(color: Color(0xFF131B2E), fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Campus Services Bento Grid (2x2)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'Campus Services',
                    style: TextStyle(
                      color: Color(0xFF131B2E),
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'AY 2024–25',
                    style: TextStyle(color: Color(0xFF1E3A8A), fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.55,
                children: [
                  _bentoTile(
                    icon: Icons.receipt_long,
                    iconColor: const Color(0xFF1E3A8A),
                    badgeText: 'Installment 1',
                    badgeColor: const Color(0xFF86F2E4),
                    title: 'Fee Receipts',
                    subtitle: 'Paid • No dues',
                  ),
                  _bentoTile(
                    icon: Icons.workspace_premium,
                    iconColor: const Color(0xFF0D9488),
                    badgeText: 'Vaults',
                    badgeColor: const Color(0xFF86F2E4),
                    title: 'Certificates',
                    subtitle: '10th, +2, Memo',
                  ),
                  _bentoTile(
                    icon: Icons.fingerprint,
                    iconColor: const Color(0xFF1E3A8A),
                    badgeText: 'Linked',
                    badgeColor: const Color(0xFF86F2E4),
                    title: 'APAAR ID',
                    subtitle: 'DigiLocker Synced',
                  ),
                  _bentoTile(
                    icon: Icons.directions_bus,
                    iconColor: const Color(0xFFB45309),
                    badgeText: 'Applied',
                    badgeColor: const Color(0xFFFEF3C7),
                    title: 'Hostel & Bus',
                    subtitle: 'Route 14 reserved',
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _timelineItem({
    required String stepNum,
    required bool isCompleted,
    bool isActive = false,
    bool isLast = false,
    required String title,
    required String desc,
    required String trailingDate,
    bool showProgress = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted
                    ? const Color(0xFF0D9488)
                    : isActive
                        ? const Color(0xFF1E3A8A)
                        : const Color(0xFFE2E8F0),
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                    : Text(
                        stepNum,
                        style: TextStyle(
                          color: isActive ? Colors.white : const Color(0xFF64748B),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 42,
                color: isCompleted ? const Color(0xFF0D9488) : const Color(0xFFE2E8F0),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: isActive
                            ? const Color(0xFF1E3A8A)
                            : isCompleted
                                ? const Color(0xFF131B2E)
                                : const Color(0xFF64748B),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      trailingDate,
                      style: TextStyle(
                        color: isCompleted
                            ? const Color(0xFF0D9488)
                            : isActive
                                ? const Color(0xFF1E3A8A)
                                : const Color(0xFF94A3B8),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, height: 1.3),
                ),
                if (showProgress)
                  Padding(
                    padding: const EdgeInsets.only(top: 6.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: const LinearProgressIndicator(
                        value: 0.75,
                        backgroundColor: Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1E3A8A)),
                        minHeight: 4,
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _bentoTile({
    required IconData icon,
    required Color iconColor,
    required String badgeText,
    required Color badgeColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  badgeText,
                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 8, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Color(0xFF131B2E), fontSize: 11, fontWeight: FontWeight.bold),
              ),
              Text(
                subtitle,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 9),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
