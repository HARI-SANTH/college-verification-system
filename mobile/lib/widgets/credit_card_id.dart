import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models.dart';

class CreditCardIDWidget extends StatefulWidget {
  final StudentProfile profile;

  const CreditCardIDWidget({Key? key, required this.profile}) : super(key: key);

  @override
  State<CreditCardIDWidget> createState() => _CreditCardIDWidgetState();
}

class _CreditCardIDWidgetState extends State<CreditCardIDWidget> {
  bool _isBack = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;

    return GestureDetector(
      onTap: () {
        setState(() {
          _isBack = !_isBack;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 400),
        width: double.infinity,
        height: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF1E3A8A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
          border: Border.all(color: Colors.white.withOpacity(0.2)),
        ),
        padding: const EdgeInsets.all(16),
        child: _isBack ? _buildBackSide(p) : _buildFrontSide(p),
      ),
    );
  }

  Widget _buildFrontSide(StudentProfile p) {
    final statusColor = p.verificationStatus == 'VERIFIED'
        ? Colors.greenAccent
        : p.verificationStatus == 'CORRECTION_REQUIRED'
            ? Colors.amberAccent
            : Colors.lightBlueAccent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Top row: College Crest + Status
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.amber,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text('🎓', style: TextStyle(fontSize: 16)),
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'APEX COLLEGE',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      'DIGITAL STUDENT CARD',
                      style: TextStyle(
                        color: Colors.white60,
                        fontSize: 8,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: statusColor.withOpacity(0.6)),
              ),
              child: Text(
                p.verificationStatus.replaceAll('_', ' '),
                style: TextStyle(
                  color: statusColor,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),

        // Middle row: Photo + Chip + Names
        Row(
          children: [
            // Photo Container
            Container(
              width: 55,
              height: 68,
              decoration: BoxDecoration(
                color: Colors.white12,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.withOpacity(0.6), width: 1.5),
              ),
              child: p.photoUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(p.photoUrl!, fit: BoxFit.cover),
                    )
                  : const Center(
                      child: Icon(Icons.person, color: Colors.white54, size: 28),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Gold Chip graphic
                  Container(
                    width: 32,
                    height: 22,
                    decoration: BoxDecoration(
                      color: Colors.amber.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${p.firstName} ${p.lastName}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (p.firstNameMalayalam != null)
                    Text(
                      '${p.firstNameMalayalam} ${p.lastNameMalayalam ?? ''}',
                      style: const TextStyle(
                        color: Colors.amberAccent,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  Text(
                    'NO: ${p.admissionNumber}',
                    style: const TextStyle(
                      color: Colors.lightBlueAccent,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        // Bottom row: Course, Batch, Blood Group
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'COURSE & BATCH',
                  style: TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${p.courseAdmitted ?? 'Admitted Course'} • ${p.timePeriodOfStudy}',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Row(
              children: [
                if (p.isEws)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'EWS',
                      style: TextStyle(color: Colors.amber, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    p.bloodGroup,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBackSide(StudentProfile p) {
    final qrData = jsonEncode({
      'rollNo': p.admissionNumber,
      'name': '${p.firstName} ${p.lastName}',
      'course': p.courseAdmitted ?? '',
      'status': p.verificationStatus,
    });

    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Container(
          width: double.infinity,
          height: 30,
          color: Colors.black45,
          child: const Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 8.0),
              child: Text(
                'CAMPUS VERIFICATION STRIPE',
                style: TextStyle(color: Colors.white30, fontSize: 8, letterSpacing: 2),
              ),
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Campus QR Access',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Scan for library access, exam halls, and attendance.',
                    style: TextStyle(color: Colors.white54, fontSize: 9),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Address: ${p.address}',
                    style: const TextStyle(color: Colors.white70, fontSize: 9),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: QrImageView(
                data: qrData,
                version: QrVersions.auto,
                size: 70.0,
              ),
            ),
          ],
        ),
        const Text(
          'Tap card to flip back',
          style: TextStyle(color: Colors.white38, fontSize: 9),
        ),
      ],
    );
  }
}
