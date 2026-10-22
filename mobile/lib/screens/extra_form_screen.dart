import 'package:flutter/material.dart';
import '../api_service.dart';
import '../models.dart';

class ExtraFormScreen extends StatefulWidget {
  final StudentProfile profile;

  const ExtraFormScreen({Key? key, required this.profile}) : super(key: key);

  @override
  State<ExtraFormScreen> createState() => _ExtraFormScreenState();
}

class _ExtraFormScreenState extends State<ExtraFormScreen> {
  late bool _isLocked;
  late bool _isCorrection;
  late Map<String, dynamic> _flags;

  // Controllers
  late TextEditingController _fnCtrl;
  late TextEditingController _lnCtrl;
  late TextEditingController _fnMlCtrl;
  late TextEditingController _lnMlCtrl;
  late TextEditingController _permAddrCtrl;
  late TextEditingController _incomeCtrl;
  late TextEditingController _prevSchoolCtrl;
  late TextEditingController _prevRegCtrl;
  late TextEditingController _prevPercentCtrl;
  late TextEditingController _bankNameCtrl;
  late TextEditingController _bankAcctCtrl;
  late TextEditingController _bankIfscCtrl;
  late TextEditingController _apaarCtrl;

  String _course = 'BCA';
  String _quota = 'Merit';
  String _gender = 'Male';
  String _religion = 'Christian';
  bool _isEws = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _isLocked = p.verificationStatus == 'SUBMITTED' || p.verificationStatus == 'VERIFIED';
    _isCorrection = p.verificationStatus == 'CORRECTION_REQUIRED';
    _flags = p.fieldFlags;

    _fnCtrl = TextEditingController(text: p.firstName);
    _lnCtrl = TextEditingController(text: p.lastName);
    _fnMlCtrl = TextEditingController(text: p.firstNameMalayalam ?? '');
    _lnMlCtrl = TextEditingController(text: p.lastNameMalayalam ?? '');
    _permAddrCtrl = TextEditingController(text: p.permanentAddress ?? p.address);
    _incomeCtrl = TextEditingController(text: p.annualIncome != null ? p.annualIncome!.toInt().toString() : '');
    _prevSchoolCtrl = TextEditingController(text: p.prevInstitutionName ?? '');
    _prevRegCtrl = TextEditingController(text: p.prevRegisterNumber ?? '');
    _prevPercentCtrl = TextEditingController(text: p.prevPercentage != null ? p.prevPercentage.toString() : '');
    _bankNameCtrl = TextEditingController(text: p.bankName ?? '');
    _bankAcctCtrl = TextEditingController(text: p.bankAccountNumber ?? '');
    _bankIfscCtrl = TextEditingController(text: p.bankIfscCode ?? '');
    _apaarCtrl = TextEditingController(text: p.apaarId ?? '');

    _course = p.courseAdmitted ?? 'BCA';
    _quota = p.quota ?? 'Merit';
    _gender = p.gender ?? 'Male';
    _religion = p.religion ?? 'Christian';
    _isEws = p.isEws;
  }

  void _onIncomeChanged(String val) {
    final num = double.tryParse(val);
    setState(() {
      _isEws = num != null && num > 0 && num < 100000;
    });
  }

  bool _isFieldDisabled(String key) {
    if (_isLocked) return true;
    if (_isCorrection) {
      return _flags[key] == null || _flags[key]['status'] != 'FLAGGED_ERROR';
    }
    return false;
  }

  Future<void> _submitForm(bool isFinal) async {
    setState(() => _saving = true);
    try {
      final updated = await ApiService.updateProfile({
        'firstName': _fnCtrl.text.trim(),
        'lastName': _lnCtrl.text.trim(),
        'firstNameMalayalam': _fnMlCtrl.text.trim(),
        'lastNameMalayalam': _lnMlCtrl.text.trim(),
        'permanentAddress': _permAddrCtrl.text.trim(),
        'courseAdmitted': _course,
        'quota': _quota,
        'gender': _gender,
        'religion': _religion,
        'annualIncome': double.tryParse(_incomeCtrl.text.trim()),
        'prevInstitutionName': _prevSchoolCtrl.text.trim(),
        'prevRegisterNumber': _prevRegCtrl.text.trim(),
        'prevPercentage': double.tryParse(_prevPercentCtrl.text.trim()),
        'bankName': _bankNameCtrl.text.trim(),
        'bankAccountNumber': _bankAcctCtrl.text.trim(),
        'bankIfscCode': _bankIfscCtrl.text.trim(),
        'apaarId': _apaarCtrl.text.trim(),
        'isFinalSubmission': isFinal,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isFinal ? 'Submitted to office for verification!' : 'Saved successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context, updated);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Detailed Admission Form', style: TextStyle(color: Colors.white, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_isCorrection)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withOpacity(0.5)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Office has requested corrections. Only flagged fields are unlocked.',
                        style: TextStyle(color: Colors.amberAccent, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

            // Bilingual Section
            _sectionHeader('Bilingual & Personal Details'),
            _buildField('First Name (English)', _fnCtrl, 'firstName'),
            _buildField('First Name in Malayalam (ആദ്യ പേര്)', _fnMlCtrl, 'firstNameMalayalam'),
            _buildField('Last Name (English)', _lnCtrl, 'lastName'),
            _buildField('Last Name in Malayalam (അവസാന പേര്)', _lnMlCtrl, 'lastNameMalayalam'),
            _buildField('Permanent Address', _permAddrCtrl, 'permanentAddress', maxLines: 2),

            const SizedBox(height: 16),
            _sectionHeader('Financial & Auto-EWS Classification'),
            _buildField('Annual Family Income (₹)', _incomeCtrl, 'annualIncome',
                keyboardType: TextInputType.number, onChanged: _onIncomeChanged),

            // EWS Indicator
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: _isEws ? Colors.amber.withOpacity(0.2) : Colors.white10,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _isEws ? Colors.amber : Colors.white24),
              ),
              child: Row(
                children: [
                  Icon(
                    _isEws ? Icons.check_circle : Icons.info_outline,
                    color: _isEws ? Colors.amber : Colors.white54,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isEws ? 'EWS Category: YES (Income < ₹1 Lakh)' : 'EWS Category: NO (Income ≥ ₹1 Lakh)',
                    style: TextStyle(
                      color: _isEws ? Colors.amberAccent : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
            _sectionHeader('12th / Qualifying Credentials'),
            _buildField('School Name', _prevSchoolCtrl, 'prevInstitutionName'),
            _buildField('Register Number', _prevRegCtrl, 'prevRegisterNumber'),
            _buildField('Percentage (%)', _prevPercentCtrl, 'prevPercentage', keyboardType: TextInputType.number),

            const SizedBox(height: 16),
            _sectionHeader('Bank Account & APAAR ID'),
            _buildField('Bank Name', _bankNameCtrl, 'bankName'),
            _buildField('Account Number', _bankAcctCtrl, 'bankAccountNumber'),
            _buildField('IFSC Code', _bankIfscCtrl, 'bankIfscCode'),
            _buildField('APAAR ID', _apaarCtrl, 'apaarId'),

            const SizedBox(height: 24),
            if (!_isLocked)
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : () => _submitForm(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isCorrection ? Colors.amber.shade700 : Colors.blue.shade600,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _saving
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          _isCorrection ? 'Resubmit Flagged Corrections' : 'Submit Application to Office',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                ),
              ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController ctrl,
    String key, {
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    void Function(String)? onChanged,
  }) {
    final disabled = _isFieldDisabled(key);
    final isFlagged = _flags[key] != null && _flags[key]['status'] == 'FLAGGED_ERROR';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          TextField(
            controller: ctrl,
            enabled: !disabled,
            maxLines: maxLines,
            keyboardType: keyboardType,
            onChanged: onChanged,
            style: TextStyle(color: disabled ? Colors.white38 : Colors.white, fontSize: 12),
            decoration: InputDecoration(
              filled: true,
              fillColor: isFlagged
                  ? Colors.red.withOpacity(0.15)
                  : disabled
                      ? const Color(0xFF131D31)
                      : const Color(0xFF1E293B),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: isFlagged ? const BorderSide(color: Colors.redAccent, width: 1.5) : BorderSide.none,
              ),
            ),
          ),
          if (isFlagged)
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(
                'Note from Office: ${_flags[key]['reason']}',
                style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }
}
