import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../api_service.dart';
import '../models.dart';

class CreditCardIDWidget extends StatefulWidget {
  final StudentProfile profile;
  final VoidCallback? onOpenForm;

  const CreditCardIDWidget({Key? key, required this.profile, this.onOpenForm}) : super(key: key);

  @override
  State<CreditCardIDWidget> createState() => _CreditCardIDWidgetState();
}

class _CreditCardIDWidgetState extends State<CreditCardIDWidget> {
  bool _isQrExpanded = false;

  String _resolvePhotoUrl(String url) => ApiService.resolveMediaUrl(url);

  Widget _buildInitialAvatar(StudentProfile p) {
    return Container(
      color: const Color(0xFF1E293B),
      child: Center(
        child: Text(
          p.firstName.isNotEmpty ? p.firstName[0].toUpperCase() : 'S',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    final isVerified = p.verificationStatus == 'VERIFIED';
    final isCorrection = p.verificationStatus == 'CORRECTION_REQUIRED';

    final qrData = jsonEncode({
      'rollNo': p.admissionNumber,
      'name': '${p.firstName} ${p.lastName}',
      'course': p.courseAdmitted ?? 'BCA',
      'batch': p.timePeriodOfStudy,
      'status': p.verificationStatus,
    });

    return Column(
      children: [
        // Main Collegiate Fintech Digital ID Card
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E3A8A).withValues(alpha: 0.25),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
          ),
          child: Stack(
            children: [
              // Subtle Geometric Background Lines
              Positioned(
                right: -20,
                top: -20,
                child: Container(
                  width: 150,
                  height: 150,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.05), width: 1.5),
                  ),
                ),
              ),
              Positioned(
                right: 30,
                bottom: -30,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF86F2E4).withValues(alpha: 0.06), width: 1.5),
                  ),
                ),
              ),

              // Card Content
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Header Row: College Crest + Digital Status
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                width: 34,
                                height: 34,
                                padding: const EdgeInsets.all(2.5),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                ),
                                child: Image.asset(
                                  'assets/images/college_logo.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Text(
                                      'BPC COLLEGE PIRAVOM',
                                      style: TextStyle(
                                        color: Color(0xFF86F2E4),
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.8,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    SizedBox(height: 1),
                                    Text(
                                      'Baselios Poulose II Catholicose College',
                                      style: TextStyle(color: Colors.white70, fontSize: 7.5, fontWeight: FontWeight.w500),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Status Pill with Live Indicator
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: isVerified
                                ? const Color(0xFF86F2E4).withValues(alpha: 0.18)
                                : isCorrection
                                    ? Colors.amber.withValues(alpha: 0.2)
                                    : Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isVerified
                                  ? const Color(0xFF86F2E4).withValues(alpha: 0.5)
                                  : isCorrection
                                      ? Colors.amber.withValues(alpha: 0.6)
                                      : Colors.white24,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5.5,
                                height: 5.5,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isVerified
                                      ? const Color(0xFF86F2E4)
                                      : isCorrection
                                          ? Colors.amberAccent
                                          : Colors.lightBlueAccent,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                isVerified
                                    ? 'VERIFIED'
                                    : isCorrection
                                        ? 'ACTION NEEDED'
                                        : 'SUBMITTED',
                                style: TextStyle(
                                  color: isVerified
                                      ? const Color(0xFF86F2E4)
                                      : isCorrection
                                          ? Colors.amberAccent
                                          : Colors.white,
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // Middle Row: Framed Student Portrait + Student Identity
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Passport Photo with Blood Group Tag
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 66,
                              height: 80,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.25),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: (p.photoUrl != null && p.photoUrl!.trim().isNotEmpty)
                                    ? Image.network(
                                        _resolvePhotoUrl(p.photoUrl!),
                                        fit: BoxFit.cover,
                                        width: 66,
                                        height: 80,
                                        errorBuilder: (_, __, ___) => _buildInitialAvatar(p),
                                      )
                                    : _buildInitialAvatar(p),
                              ),
                            ),
                            // Blood Group Pill attached to photo base
                            Positioned(
                              bottom: 0,
                              left: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A).withValues(alpha: 0.85),
                                  borderRadius: const BorderRadius.only(
                                    bottomLeft: Radius.circular(10),
                                    bottomRight: Radius.circular(10),
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '${p.bloodGroup} VE',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(width: 16),

                        // Name, Malayalam Name, Course & Roll
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${p.firstName} ${p.lastName}'.toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (p.firstNameMalayalam != null && p.firstNameMalayalam!.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 1.0),
                                  child: Text(
                                    '${p.firstNameMalayalam} ${p.lastNameMalayalam ?? ''}',
                                    style: const TextStyle(
                                      color: Color(0xFF86F2E4),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Text(
                                p.courseAdmitted != null && p.courseAdmitted!.isNotEmpty
                                    ? p.courseAdmitted!
                                    : 'Bachelor of Computer Applications',
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'ROLL NO',
                                        style: TextStyle(color: Colors.white38, fontSize: 8, fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        p.admissionNumber,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 16),
                                  Container(width: 1, height: 20, color: Colors.white12),
                                  const SizedBox(width: 16),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'VALID THRU',
                                        style: TextStyle(color: Colors.white38, fontSize: 8, fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        p.timePeriodOfStudy.isNotEmpty ? p.timePeriodOfStudy : '2024–28',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // Card Footer: RFID & Campus Gate Pass Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.sensors, color: Color(0xFF86F2E4), size: 14),
                            const SizedBox(width: 4),
                            const Text(
                              'RFID Active',
                              style: TextStyle(
                                color: Color(0xFF86F2E4),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text('•', style: TextStyle(color: Colors.white30, fontSize: 10)),
                            const SizedBox(width: 8),
                            Text(
                              'BPC-${p.admissionNumber}',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 9,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),

                        // Campus Gate Pass QR Button
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _isQrExpanded = !_isQrExpanded;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.qr_code_2, color: Colors.white, size: 16),
                                const SizedBox(width: 5),
                                Text(
                                  _isQrExpanded ? 'Hide Gate QR' : 'Campus Gate',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Expandable Dynamic Campus Gate Access Token (Stitch Style)
        if (_isQrExpanded)
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.shield_outlined, color: Color(0xFF1E3A8A), size: 18),
                        SizedBox(width: 6),
                        Text(
                          'Dynamic Gate Access Token',
                          style: TextStyle(
                            color: Color(0xFF131B2E),
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF86F2E4).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Auto-Refreshes in 42s',
                        style: TextStyle(
                          color: Color(0xFF006F66),
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: QrImageView(
                    data: qrData,
                    version: QrVersions.auto,
                    size: 140.0,
                    eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF131B2E)),
                    dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Color(0xFF131B2E)),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Scan at Campus Gates, Library, & Department Entry',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
