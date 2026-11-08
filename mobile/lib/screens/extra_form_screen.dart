import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../api_service.dart';
import '../models.dart';
import '../utils/malayalam_transliterator.dart';

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
  int _activeStep = 1;
  bool _saving = false;

  final ImagePicker _imagePicker = ImagePicker();
  Uint8List? _localPhotoBytes;

  // Track if Malayalam names were manually edited
  bool _fnMlManuallyEdited = false;
  bool _lnMlManuallyEdited = false;

  // Controllers - Step 1: Personal & Family
  late TextEditingController _fnCtrl;
  late TextEditingController _lnCtrl;
  late TextEditingController _fnMlCtrl;
  late TextEditingController _lnMlCtrl;
  late TextEditingController _permAddrCtrl;
  late TextEditingController _dobCtrl;
  late TextEditingController _nationalityCtrl;

  late TextEditingController _fatherNameCtrl;
  late TextEditingController _fatherOccCtrl;
  late TextEditingController _motherNameCtrl;
  late TextEditingController _motherOccCtrl;
  late TextEditingController _guardianNameCtrl;
  late TextEditingController _guardianOccCtrl;

  // Controllers - Step 2: Course & Quota
  late TextEditingController _incomeCtrl;

  // Controllers - Step 3: Academics
  late TextEditingController _prevSchoolCtrl;
  late TextEditingController _prevCourseCtrl;
  late TextEditingController _prevRegCtrl;
  late TextEditingController _prevBoardCtrl;
  late TextEditingController _prevPeriodCtrl;
  late TextEditingController _prevPercentCtrl;

  // Controllers - Step 5: Bank & APAAR
  late TextEditingController _bankAcctNameCtrl;
  late TextEditingController _bankNameCtrl;
  late TextEditingController _bankBranchCtrl;
  late TextEditingController _bankAcctCtrl;
  late TextEditingController _bankIfscCtrl;
  late TextEditingController _apaarCtrl;
  late TextEditingController _aadhaarCtrl;

  // Dropdown states
  String _gender = 'Female';
  String _religion = 'Christian';
  String _caste = 'General / Open';
  String _course = 'BCA';
  String _quota = 'Merit';
  bool _isEws = true;

  // Photo
  String? _photoUrl;

  // Uploaded documents tracking
  final Map<String, String> _uploadedDocs = {};

  final List<String> _courseOptions = [
    'BCA',
    'B.Com Finance',
    'B.Sc Computer Science',
    'BA English Language & Literature',
    'BBA (Business Administration)',
    'B.Sc Mathematics',
  ];

  final List<String> _quotaOptions = [
    'Merit',
    'Community Quota',
    'Management Quota',
    'Sports Quota',
    'Cultural Quota',
    'NRI / Special',
  ];

  final List<String> _religionOptions = [
    'Christian',
    'Hindu',
    'Muslim',
    'Sikh',
    'Jain',
    'Other / Not Specified',
  ];

  final List<String> _casteOptions = [
    'General / Open',
    'RCSC (Roman Catholic Syrian Christian)',
    'Latin Catholic (LC)',
    'Orthodox / Jacobite',
    'Marthoma',
    'CSI',
    'Pentecostal / Protestant',
    'Nair',
    'Ezhava / Thiyya',
    'Viswakarma',
    'Dheevara',
    'SC (Scheduled Caste)',
    'ST (Scheduled Tribe)',
    'Muslim / Mappila',
    'OEC (Other Eligible Communities)',
    'OBC (Other Backward Classes)',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _isLocked = p.verificationStatus == 'SUBMITTED' || p.verificationStatus == 'VERIFIED';
    _isCorrection = p.verificationStatus == 'CORRECTION_REQUIRED';
    _flags = p.fieldFlags;
    _photoUrl = p.photoUrl;

    _fnCtrl = TextEditingController(text: p.firstName);
    _lnCtrl = TextEditingController(text: p.lastName);

    // Initial transliteration if Malayalam fields are empty
    final initialFnMl = p.firstNameMalayalam ?? MalayalamTransliterator.transliterate(p.firstName);
    final initialLnMl = p.lastNameMalayalam ?? MalayalamTransliterator.transliterate(p.lastName);
    _fnMlCtrl = TextEditingController(text: initialFnMl);
    _lnMlCtrl = TextEditingController(text: initialLnMl);

    _permAddrCtrl = TextEditingController(text: p.permanentAddress ?? p.address);
    _dobCtrl = TextEditingController(text: p.dob ?? '2006-05-14');
    _nationalityCtrl = TextEditingController(text: p.nationality ?? 'Indian');

    _fatherNameCtrl = TextEditingController(text: p.fatherName ?? p.parentName ?? '');
    _fatherOccCtrl = TextEditingController(text: p.fatherOccupation ?? p.parentOccupation ?? '');
    _motherNameCtrl = TextEditingController(text: p.motherName ?? '');
    _motherOccCtrl = TextEditingController(text: p.motherOccupation ?? '');
    _guardianNameCtrl = TextEditingController(text: p.guardianName ?? '');
    _guardianOccCtrl = TextEditingController(text: p.guardianOccupation ?? '');

    _incomeCtrl = TextEditingController(
      text: p.annualIncome != null ? p.annualIncome!.toInt().toString() : '',
    );
    _prevSchoolCtrl = TextEditingController(text: p.prevInstitutionName ?? '');
    _prevCourseCtrl = TextEditingController(text: p.prevCourse ?? 'Computer Science');
    _prevRegCtrl = TextEditingController(text: p.prevRegisterNumber ?? '');
    _prevBoardCtrl = TextEditingController(text: p.prevBoardUniversity ?? 'Kerala State Board (DHSE)');
    _prevPeriodCtrl = TextEditingController(text: p.prevPeriodOfStudy ?? '2022-2024');
    _prevPercentCtrl = TextEditingController(
      text: p.prevPercentage != null ? p.prevPercentage.toString() : '',
    );

    _bankAcctNameCtrl = TextEditingController(text: p.bankAccountName ?? '${p.firstName} ${p.lastName}');
    _bankNameCtrl = TextEditingController(text: p.bankName ?? '');
    _bankBranchCtrl = TextEditingController(text: p.bankBranch ?? '');
    _bankAcctCtrl = TextEditingController(text: p.bankAccountNumber ?? '');
    _bankIfscCtrl = TextEditingController(text: p.bankIfscCode ?? '');
    _apaarCtrl = TextEditingController(text: p.apaarId ?? '');
    _aadhaarCtrl = TextEditingController(text: p.aadhaarNumber ?? '');

    if (p.gender != null && ['Female', 'Male', 'Other'].contains(p.gender)) {
      _gender = p.gender!;
    }
    if (p.religion != null && _religionOptions.contains(p.religion)) {
      _religion = p.religion!;
    }
    if (p.caste != null && _casteOptions.contains(p.caste)) {
      _caste = p.caste!;
    }
    if (p.courseAdmitted != null && _courseOptions.contains(p.courseAdmitted)) {
      _course = p.courseAdmitted!;
    }
    if (p.quota != null && _quotaOptions.contains(p.quota)) {
      _quota = p.quota!;
    }

    _calculateEws();

    // Load existing documents
    for (var doc in p.documents) {
      _uploadedDocs[doc.type] = doc.fileName;
    }
  }

  void _onEnglishFirstNameChanged(String val) {
    if (!_fnMlManuallyEdited && val.trim().isNotEmpty) {
      final transliterated = MalayalamTransliterator.transliterate(val);
      setState(() {
        _fnMlCtrl.text = transliterated;
      });
    }
  }

  void _onEnglishLastNameChanged(String val) {
    if (!_lnMlManuallyEdited && val.trim().isNotEmpty) {
      final transliterated = MalayalamTransliterator.transliterate(val);
      setState(() {
        _lnMlCtrl.text = transliterated;
      });
    }
  }

  void _calculateEws() {
    final inc = double.tryParse(_incomeCtrl.text.trim());
    setState(() {
      _isEws = inc != null && inc > 0 && inc < 100000;
    });
  }

  static const Map<String, List<String>> _keyAliases = {
    'PLUS_TWO_CERT': ['PLUS_TWO_CERTIFICATE'],
    'PLUS_TWO_CERTIFICATE': ['PLUS_TWO_CERT'],
    'SSLC_CERT': ['SSLC_CERTIFICATE'],
    'SSLC_CERTIFICATE': ['SSLC_CERT'],
    'INCOME_CERT': ['INCOME_CERTIFICATE'],
    'INCOME_CERTIFICATE': ['INCOME_CERT'],
    'COMMUNITY_CERT': ['COMMUNITY_CERTIFICATE'],
    'COMMUNITY_CERTIFICATE': ['COMMUNITY_CERT'],
    'CASTE_CERT': ['CASTE_CERTIFICATE'],
    'CASTE_CERTIFICATE': ['CASTE_CERT'],
    'APAAR_CARD': ['APAAR_DOCUMENT'],
    'APAAR_DOCUMENT': ['APAAR_CARD'],
    'AADHAAR_CARD': ['AADHAAR_DOCUMENT', 'aadhaarNumber', 'aadhaar'],
    'AADHAAR_DOCUMENT': ['AADHAAR_CARD', 'aadhaarNumber', 'aadhaar'],
    'aadhaarNumber': ['AADHAAR_CARD', 'AADHAAR_DOCUMENT', 'aadhaar'],
    'PROFILE_PHOTO': ['photoUrl', 'photo'],
    'photoUrl': ['PROFILE_PHOTO'],
    'photo': ['PROFILE_PHOTO'],
  };

  bool _isFieldEditable(String key) {
    if (!_isLocked && !_isCorrection) {
      return true; // DRAFT mode: everything is editable
    }
    if (_isCorrection) {
      // In correction mode: only fields flagged with FLAGGED_ERROR are unlocked
      final keysToCheck = [key, ...?_keyAliases[key]];
      for (final k in keysToCheck) {
        if (_flags[k] != null && _flags[k]['status'] == 'FLAGGED_ERROR') {
          return true;
        }
      }
      return false;
    }
    return false; // SUBMITTED or VERIFIED mode
  }

  String? _getFieldFlagRemark(String key) {
    final keysToCheck = [key, ...?_keyAliases[key]];
    for (final k in keysToCheck) {
      if (_flags[k] != null && _flags[k]['status'] == 'FLAGGED_ERROR') {
        return _flags[k]['reason']?.toString();
      }
    }
    return null;
  }

  bool _stepHasFlaggedError(int stepNumber) {
    if (_flags.isEmpty) return false;

    final stepKeys = <String>[];
    switch (stepNumber) {
      case 1:
        stepKeys.addAll([
          'firstName', 'lastName', 'firstNameMalayalam', 'lastNameMalayalam',
          'gender', 'dob', 'bloodGroup', 'nationality', 'religion', 'caste',
          'address', 'permanentAddress', 'fatherName', 'fatherOccupation',
          'motherName', 'motherOccupation', 'guardianName', 'guardianOccupation',
          'PROFILE_PHOTO', 'photoUrl', 'photo'
        ]);
        break;
      case 2:
        stepKeys.addAll([
          'courseAdmitted', 'quota', 'annualIncome', 'isEws'
        ]);
        break;
      case 3:
        stepKeys.addAll([
          'prevInstitutionName', 'prevCourse', 'prevRegisterNumber',
          'prevBoardUniversity', 'prevPeriodOfStudy', 'prevPercentage'
        ]);
        break;
      case 4:
        stepKeys.addAll([
          'PLUS_TWO_CERT', 'PLUS_TWO_CERTIFICATE',
          'SSLC_CERT', 'SSLC_CERTIFICATE',
          'ALLOTMENT_MEMO',
          'COMMUNITY_CERT', 'COMMUNITY_CERTIFICATE',
          'INCOME_CERT', 'INCOME_CERTIFICATE',
          'CASTE_CERT', 'CASTE_CERTIFICATE'
        ]);
        break;
      case 5:
        stepKeys.addAll([
          'bankAccountName', 'bankName', 'bankBranch',
          'bankAccountNumber', 'bankIfscCode', 'BANK_PASSBOOK',
          'apaarId', 'APAAR_CARD', 'APAAR_DOCUMENT',
          'aadhaarNumber', 'AADHAAR_CARD', 'AADHAAR_DOCUMENT',
        ]);
        break;
    }

    for (final key in stepKeys) {
      final keysToCheck = [key, ...?_keyAliases[key]];
      for (final k in keysToCheck) {
        if (_flags[k] != null && _flags[k]['status'] == 'FLAGGED_ERROR') {
          return true;
        }
      }
    }
    return false;
  }

  Future<void> _pickDate() async {
    if (!_isFieldEditable('dob')) return;
    DateTime initial = DateTime.tryParse(_dobCtrl.text) ?? DateTime(2006, 5, 14);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1990),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF00236F),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dobCtrl.text =
            "${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  Future<void> _handleProfilePhotoUpload() async {
    if (!_isFieldEditable('PROFILE_PHOTO') && (_isLocked || _isCorrection)) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Upload Student Profile Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
            const SizedBox(height: 6),
            const Text('Choose camera capture or choose from gallery', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            const SizedBox(height: 20),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFF2F3FF), child: Icon(Icons.camera_alt, color: Color(0xFF00236F))),
              title: const Text('Capture with Camera', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: const Text('Take a clear passport photograph', style: TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  final XFile? image = await _imagePicker.pickImage(
                    source: ImageSource.camera,
                    maxWidth: 1200,
                    maxHeight: 1200,
                    imageQuality: 85,
                  );
                  if (image != null) {
                    await _processAndUploadPhoto(image);
                  }
                } catch (e) {
                  _showErrorSnackBar('Camera error: $e');
                }
              },
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFF0FDF4), child: Icon(Icons.photo_library, color: Color(0xFF15803D))),
              title: const Text('Select from Gallery / Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: const Text('Choose an existing passport photo from your phone', style: TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  final XFile? image = await _imagePicker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 1200,
                    maxHeight: 1200,
                    imageQuality: 85,
                  );
                  if (image != null) {
                    await _processAndUploadPhoto(image);
                  }
                } catch (e) {
                  _showErrorSnackBar('Gallery error: $e');
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _processAndUploadPhoto(XFile image) async {
    setState(() {
      _saving = true;
    });

    try {
      final bytes = await image.readAsBytes();
      setState(() {
        _localPhotoBytes = bytes;
      });
      final doc = await ApiService.uploadDocument(
        type: 'PROFILE_PHOTO',
        fileName: image.name.isNotEmpty ? image.name : 'profile_photo_${widget.profile.admissionNumber}.jpg',
        bytes: bytes,
      );
      setState(() {
        _photoUrl = doc.fileUrl;
        _uploadedDocs['PROFILE_PHOTO'] = doc.fileName;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile photo uploaded successfully!'), backgroundColor: Color(0xFF0D9488)),
      );
    } catch (e) {
      if (!mounted) return;
      // Even if offline/error, keep local photo displayed
      setState(() {
        _uploadedDocs['PROFILE_PHOTO'] = image.name;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Photo attached locally: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: const Color(0xFF0D9488)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _resolvePhotoUrl(String? url) => ApiService.resolveMediaUrl(url);

  Future<void> _handleDocumentUpload(String docType, String docTitle) async {
    if (!_isFieldEditable(docType) && (_isLocked || _isCorrection)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This document is verified and locked.'), backgroundColor: Color(0xFF64748B)),
      );
      return;
    }

    try {
      final pickedFile = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        dialogTitle: 'Select $docTitle (PDF Only, Max 10 MB)',
      );

      if (pickedFile == null) return;

      // Strictly validate PDF extension
      final ext = pickedFile.name.split('.').last.toLowerCase();
      if (ext != 'pdf') {
        _showErrorSnackBar('Invalid file format. Documents must be in PDF format (.pdf).');
        return;
      }

      final bytes = await pickedFile.xFile.readAsBytes();

      // Enforce 10 MB max size
      const maxSizeBytes = 10 * 1024 * 1024;
      if (bytes.length > maxSizeBytes) {
        final sizeMb = (bytes.length / (1024 * 1024)).toStringAsFixed(1);
        _showErrorSnackBar('File size ($sizeMb MB) exceeds the maximum allowed limit of 10 MB.');
        return;
      }

      await _uploadDocBytes(docType, docTitle, pickedFile.name, bytes);
    } catch (e) {
      _showErrorSnackBar('PDF document selection error: $e');
    }
  }

  Future<void> _uploadDocBytes(String docType, String docTitle, String fileName, List<int> bytes) async {
    setState(() => _saving = true);
    try {
      final doc = await ApiService.uploadDocument(
        type: docType,
        fileName: fileName,
        bytes: bytes,
      );
      setState(() {
        _uploadedDocs[docType] = doc.fileName;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$docTitle uploaded successfully!'), backgroundColor: const Color(0xFF0D9488)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadedDocs[docType] = fileName;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$docTitle attached!'), backgroundColor: const Color(0xFF0D9488)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submitForm(bool isFinal) async {
    if (isFinal) {
      if (_fnCtrl.text.trim().isEmpty || _lnCtrl.text.trim().isEmpty) {
        _showErrorSnackBar('Please provide English First and Last Name.');
        setState(() => _activeStep = 1);
        return;
      }
      if (_incomeCtrl.text.trim().isEmpty) {
        _showErrorSnackBar('Please enter Annual Family Income.');
        setState(() => _activeStep = 2);
        return;
      }
    }

    setState(() => _saving = true);
    try {
      final updated = await ApiService.updateProfile({
        'firstName': _fnCtrl.text.trim(),
        'lastName': _lnCtrl.text.trim(),
        'firstNameMalayalam': _fnMlCtrl.text.trim(),
        'lastNameMalayalam': _lnMlCtrl.text.trim(),
        'permanentAddress': _permAddrCtrl.text.trim(),
        'dob': _dobCtrl.text.trim(),
        'nationality': _nationalityCtrl.text.trim(),
        'gender': _gender,
        'religion': _religion,
        'caste': _caste,
        'fatherName': _fatherNameCtrl.text.trim(),
        'fatherOccupation': _fatherOccCtrl.text.trim(),
        'motherName': _motherNameCtrl.text.trim(),
        'motherOccupation': _motherOccCtrl.text.trim(),
        'parentName': _fatherNameCtrl.text.trim().isNotEmpty ? _fatherNameCtrl.text.trim() : _motherNameCtrl.text.trim(),
        'parentOccupation': _fatherOccCtrl.text.trim().isNotEmpty ? _fatherOccCtrl.text.trim() : _motherOccCtrl.text.trim(),
        'guardianName': _guardianNameCtrl.text.trim(),
        'guardianOccupation': _guardianOccCtrl.text.trim(),
        'courseAdmitted': _course,
        'quota': _quota,
        'annualIncome': double.tryParse(_incomeCtrl.text.trim()),
        'prevInstitutionName': _prevSchoolCtrl.text.trim(),
        'prevCourse': _prevCourseCtrl.text.trim(),
        'prevRegisterNumber': _prevRegCtrl.text.trim(),
        'prevBoardUniversity': _prevBoardCtrl.text.trim(),
        'prevPeriodOfStudy': _prevPeriodCtrl.text.trim(),
        'prevPercentage': double.tryParse(_prevPercentCtrl.text.trim()),
        'bankAccountName': _bankAcctNameCtrl.text.trim(),
        'bankName': _bankNameCtrl.text.trim(),
        'bankBranch': _bankBranchCtrl.text.trim(),
        'bankAccountNumber': _bankAcctCtrl.text.trim(),
        'bankIfscCode': _bankIfscCtrl.text.trim(),
        'apaarId': _apaarCtrl.text.trim(),
        'aadhaarNumber': _aadhaarCtrl.text.trim(),
        'isFinalSubmission': isFinal,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isFinal ? 'Admission form submitted to office for verification!' : 'Draft progress saved!'),
          backgroundColor: const Color(0xFF0D9488),
        ),
      );
      Navigator.pop(context, updated);
    } catch (e) {
      if (!mounted) return;
      _showErrorSnackBar(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: const Color(0xFFBA1A1A)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Admission Data Form',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.w800),
            ),
            Text(
              'BASELIOS POULOSE II CATHOLICOSE COLLEGE • AY 2024–28',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.3),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          if (!_isLocked)
            TextButton.icon(
              onPressed: _saving ? null : () => _submitForm(false),
              icon: const Icon(Icons.save_outlined, size: 16, color: Color(0xFF00236F)),
              label: const Text('Save Draft', style: TextStyle(color: Color(0xFF00236F), fontWeight: FontWeight.bold, fontSize: 12)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Horizontal Step Wizard Tabs (5 Steps)
            _buildStepWizard(),
            const SizedBox(height: 14),

            // 2. Status Banner
            _buildStatusBanner(),
            const SizedBox(height: 14),

            // 3. Step Content
            if (_activeStep == 1) _buildStep1Personal(),
            if (_activeStep == 2) _buildStep2QuotaIncome(),
            if (_activeStep == 3) _buildStep3Academics(),
            if (_activeStep == 4) _buildStep4Documents(),
            if (_activeStep == 5) _buildStep5BankId(),
          ],
        ),
      ),

      // Stationary Bottom Navigation Bar
      bottomNavigationBar: _buildBottomStickyBar(),
    );
  }

  // --- Step Wizard Widget (5 Steps) ---
  Widget _buildStepWizard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _wizardTab(1, 'Personal', Icons.person_outline),
          _wizardDivider(_activeStep > 1),
          _wizardTab(2, 'Quota', Icons.account_balance_outlined),
          _wizardDivider(_activeStep > 2),
          _wizardTab(3, 'Academics', Icons.school_outlined),
          _wizardDivider(_activeStep > 3),
          _wizardTab(4, 'Documents', Icons.file_present_outlined),
          _wizardDivider(_activeStep > 4),
          _wizardTab(5, 'Bank & ID', Icons.credit_card_outlined),
        ],
      ),
    );
  }

  Widget _wizardTab(int stepNumber, String title, IconData icon) {
    final isActive = _activeStep == stepNumber;
    final isDone = _activeStep > stepNumber;
    final hasFlag = _stepHasFlaggedError(stepNumber);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _activeStep = stepNumber),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isActive
                        ? const Color(0xFF00236F)
                        : (isDone && !hasFlag)
                            ? const Color(0xFF0D9488)
                            : const Color(0xFFF1F5F9),
                    border: hasFlag
                        ? Border.all(color: const Color(0xFFEF4444), width: 1.5)
                        : null,
                  ),
                  child: Center(
                    child: (isDone && !hasFlag)
                        ? const Icon(Icons.check, color: Colors.white, size: 16)
                        : Text(
                            '$stepNumber',
                            style: TextStyle(
                              color: isActive
                                  ? Colors.white
                                  : hasFlag
                                      ? const Color(0xFFDC2626)
                                      : const Color(0xFF64748B),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                  ),
                ),
                // Small Red Dot Badge for Flagged Fields
                if (hasFlag)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                            blurRadius: 3,
                            spreadRadius: 0.5,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                color: hasFlag
                    ? const Color(0xFFDC2626)
                    : isActive
                        ? const Color(0xFF00236F)
                        : const Color(0xFF64748B),
                fontSize: 9.5,
                fontWeight: (isActive || hasFlag) ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _wizardDivider(bool completed) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 12),
        color: completed ? const Color(0xFF0D9488) : const Color(0xFFE2E8F0),
      ),
    );
  }

  // --- Status Banner ---
  Widget _buildStatusBanner() {
    Color bg;
    Color border;
    IconData icon;
    Color iconColor;
    String title;
    String subtitle;

    if (_isCorrection) {
      bg = const Color(0xFFFFFBEB);
      border = const Color(0xFFFDE68A);
      icon = Icons.warning_amber_rounded;
      iconColor = const Color(0xFFB45309);
      title = 'Office Review: Corrections Required';
      subtitle = 'Office staff flagged specific items (marked with red dots on the steps above). Only highlighted fields are unlocked for you to correct.';
    } else if (_isLocked) {
      bg = const Color(0xFFF2F3FF);
      border = const Color(0xFFDAE2FD);
      icon = Icons.lock_outline;
      iconColor = const Color(0xFF00236F);
      title = widget.profile.verificationStatus == 'VERIFIED'
          ? 'Profile Approved & Verified'
          : 'Application Submitted & Locked';
      subtitle = 'Your admission data is officially secured. Editing is disabled during office verification.';
    } else {
      bg = const Color(0xFFF0FDF4);
      border = const Color(0xFFBBF7D0);
      icon = Icons.edit_note;
      iconColor = const Color(0xFF15803D);
      title = 'Admission Profile: Draft Mode';
      subtitle = 'Please fill out all 5 steps, check Malayalam names, upload required certificates, and submit.';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: iconColor, fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 3),
                Text(subtitle, style: const TextStyle(color: Color(0xFF475569), fontSize: 11, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- STEP 1: Personal Details & Identity (with Photo & Auto-Malayalam) ---
  Widget _buildStep1Personal() {
    return _cardSection(
      title: 'Step 1: Personal & Family Details',
      icon: Icons.badge_outlined,
      children: [
        // Profile Photo Upload Box
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: _isFieldEditable('PROFILE_PHOTO') ? _handleProfilePhotoUpload : null,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: _localPhotoBytes != null
                        ? Image.memory(_localPhotoBytes!, fit: BoxFit.cover)
                        : (_photoUrl != null && _photoUrl!.isNotEmpty)
                            ? Image.network(_resolvePhotoUrl(_photoUrl!), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 36, color: Color(0xFF64748B)))
                            : const Icon(Icons.person, size: 36, color: Color(0xFF64748B)),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Student Profile Photograph', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text(
                      _uploadedDocs.containsKey('PROFILE_PHOTO') || _localPhotoBytes != null
                          ? 'Photo attached successfully'
                          : 'Passport photograph for College ID Card',
                      style: TextStyle(
                        fontSize: 11,
                        color: _uploadedDocs.containsKey('PROFILE_PHOTO') || _localPhotoBytes != null ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        fontWeight: _uploadedDocs.containsKey('PROFILE_PHOTO') || _localPhotoBytes != null ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ElevatedButton.icon(
                      onPressed: _isFieldEditable('PROFILE_PHOTO') ? _handleProfilePhotoUpload : null,
                      icon: const Icon(Icons.camera_alt_outlined, size: 14, color: Colors.white),
                      label: Text(
                        _uploadedDocs.containsKey('PROFILE_PHOTO') || _localPhotoBytes != null ? 'Change Photo' : 'Upload Photo',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00236F),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // English Names (Triggers auto Malayalam conversion)
        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'firstName',
                label: 'FIRST NAME (ENGLISH)',
                controller: _fnCtrl,
                hint: 'e.g. Harisanth',
                onChanged: _onEnglishFirstNameChanged,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'lastName',
                label: 'LAST NAME (ENGLISH)',
                controller: _lnCtrl,
                hint: 'e.g. S',
                onChanged: _onEnglishLastNameChanged,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Auto Malayalam Names (with manual editing & re-convert button)
        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'firstNameMalayalam',
                label: 'മലയാളത്തിൽ പേര്',
                controller: _fnMlCtrl,
                hint: 'ഉദാ: ഹരിശാന്ത്',
                isMalayalam: true,
                onChanged: (_) => _fnMlManuallyEdited = true,
                badgeText: 'Auto-converted',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'lastNameMalayalam',
                label: 'മലയാളത്തിൽ അവസാന പേര്',
                controller: _lnMlCtrl,
                hint: 'ഉദാ: എസ്',
                isMalayalam: true,
                onChanged: (_) => _lnMlManuallyEdited = true,
                badgeText: 'Auto-converted',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Father's Name & Occupation
        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'fatherName',
                label: "FATHER'S NAME",
                controller: _fatherNameCtrl,
                hint: "Father's Full Name",
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'fatherOccupation',
                label: "FATHER'S OCCUPATION",
                controller: _fatherOccCtrl,
                hint: "Father's Occupation",
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Mother's Name & Occupation
        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'motherName',
                label: "MOTHER'S NAME",
                controller: _motherNameCtrl,
                hint: "Mother's Full Name",
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'motherOccupation',
                label: "MOTHER'S OCCUPATION",
                controller: _motherOccCtrl,
                hint: "Mother's Occupation",
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Permanent Address
        _buildFormField(
          keyName: 'permanentAddress',
          label: 'PERMANENT RESIDENTIAL ADDRESS',
          controller: _permAddrCtrl,
          hint: 'House Name/No, Street, City, District, PIN',
          maxLines: 2,
        ),
        const SizedBox(height: 12),

        // DOB & Nationality
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: _pickDate,
                child: AbsorbPointer(
                  child: _buildFormField(
                    keyName: 'dob',
                    label: 'DATE OF BIRTH (YYYY-MM-DD)',
                    controller: _dobCtrl,
                    hint: '2006-05-14',
                    suffixIcon: Icons.calendar_today,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'nationality',
                label: 'NATIONALITY',
                controller: _nationalityCtrl,
                hint: 'Indian',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Gender Choice
        const Text('GENDER', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Row(
          children: ['Female', 'Male', 'Other'].map((g) {
            final isSel = _gender == g;
            final canEdit = _isFieldEditable('gender');
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(g),
                selected: isSel,
                onSelected: canEdit ? (_) => setState(() => _gender = g) : null,
                selectedColor: const Color(0xFF00236F),
                labelStyle: TextStyle(
                  color: isSel ? Colors.white : const Color(0xFF0F172A),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                backgroundColor: const Color(0xFFF1F5F9),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),

        // Religion & Caste (Caste is now a Dropdown!)
        _buildDropdown(
          keyName: 'religion',
          label: 'RELIGION',
          value: _religion,
          options: _religionOptions,
          onChanged: (val) => setState(() => _religion = val!),
        ),
        const SizedBox(height: 12),

        _buildDropdown(
          keyName: 'caste',
          label: 'CASTE / RESERVATION CATEGORY',
          value: _caste,
          options: _casteOptions,
          onChanged: (val) => setState(() => _caste = val!),
        ),
        const SizedBox(height: 12),

        // Guardian (Optional)
        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'guardianName',
                label: 'GUARDIAN NAME (OPTIONAL)',
                controller: _guardianNameCtrl,
                hint: "Guardian's Full Name",
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'guardianOccupation',
                label: 'GUARDIAN OCCUPATION',
                controller: _guardianOccCtrl,
                hint: "Guardian's Occupation",
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- STEP 2: Quota & Income (with Live EWS) ---
  Widget _buildStep2QuotaIncome() {
    return _cardSection(
      title: 'Step 2: Admission Quota & Income',
      icon: Icons.account_balance_outlined,
      children: [
        _buildDropdown(
          keyName: 'courseAdmitted',
          label: 'COURSE ADMITTED',
          value: _course,
          options: _courseOptions,
          onChanged: (val) => setState(() => _course = val!),
        ),
        const SizedBox(height: 12),

        _buildDropdown(
          keyName: 'quota',
          label: 'ADMISSION QUOTA',
          value: _quota,
          options: _quotaOptions,
          onChanged: (val) => setState(() => _quota = val!),
        ),
        if (_quota == 'Community Quota' || _quota == 'Management Quota') ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: const [
                Icon(Icons.info_outline, color: Color(0xFFB45309), size: 14),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Community Certificate will be required in Step 4 for verification under this quota.',
                    style: TextStyle(color: Color(0xFFB45309), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),

        // Annual Income with real-time EWS computation
        _buildFormField(
          keyName: 'annualIncome',
          label: 'ANNUAL FAMILY INCOME (₹)',
          controller: _incomeCtrl,
          hint: 'e.g. 85000',
          keyboardType: TextInputType.number,
          onChanged: (_) => _calculateEws(),
          prefixText: '₹ ',
        ),
        const SizedBox(height: 12),

        // Real-Time EWS Evaluation Container
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _isEws ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isEws ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        _isEws ? Icons.check_circle : Icons.info_outline,
                        color: _isEws ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isEws ? 'EWS: ELIGIBLE (< ₹1,00,000)' : 'NON-EWS (≥ ₹1,00,000)',
                        style: TextStyle(
                          color: _isEws ? const Color(0xFF15803D) : const Color(0xFF0F172A),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _isEws ? const Color(0xFFDCFCE7) : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _isEws ? 'AUTO-QUALIFIED' : 'GENERAL',
                      style: TextStyle(
                        color: _isEws ? const Color(0xFF166534) : const Color(0xFF475569),
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _isEws
                    ? 'Income is strictly below the ₹1,00,000 threshold. The system will automatically tag your application under EWS reservation.'
                    : 'Income is ₹1,00,000 or above. Economically Weaker Section reservation does not apply.',
                style: const TextStyle(color: Color(0xFF475569), fontSize: 11, height: 1.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- STEP 3: Prior Academics Only (Documents separated to Step 4) ---
  Widget _buildStep3Academics() {
    return _cardSection(
      title: 'Step 3: Prior Academic Records (10th / 12th)',
      icon: Icons.school_outlined,
      children: [
        _buildFormField(
          keyName: 'prevInstitutionName',
          label: 'PREVIOUS INSTITUTION / 12TH SCHOOL',
          controller: _prevSchoolCtrl,
          hint: 'e.g. St. Teresa Higher Secondary School',
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'prevCourse',
                label: 'PREVIOUS STREAM / COURSE',
                controller: _prevCourseCtrl,
                hint: 'e.g. Computer Science / Commerce',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'prevRegisterNumber',
                label: 'REGISTER NUMBER',
                controller: _prevRegCtrl,
                hint: 'e.g. PLUS2-2024-8901',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'prevBoardUniversity',
                label: 'BOARD / UNIVERSITY',
                controller: _prevBoardCtrl,
                hint: 'e.g. DHSE Kerala / CBSE',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'prevPeriodOfStudy',
                label: 'PERIOD OF STUDY',
                controller: _prevPeriodCtrl,
                hint: '2022-2024',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        _buildFormField(
          keyName: 'prevPercentage',
          label: 'PERCENTAGE / MARKS (%)',
          controller: _prevPercentCtrl,
          hint: 'e.g. 92.5',
          keyboardType: TextInputType.number,
        ),
      ],
    );
  }

  // --- STEP 4: Dedicated Certificates & Documents Upload Step ---
  Widget _buildStep4Documents() {
    final isCommunityQuota = _quota == 'Community Quota';
    final hasIncomeEntered = _incomeCtrl.text.trim().isNotEmpty && ((double.tryParse(_incomeCtrl.text.trim()) ?? 0) > 0);

    return _cardSection(
      title: 'Step 4: Official Certificates & Document Uploads',
      icon: Icons.file_present_outlined,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFF2F3FF),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFDAE2FD)),
          ),
          child: Row(
            children: const [
              Icon(Icons.picture_as_pdf, color: Color(0xFF00236F), size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'All documents must be in PDF format (.pdf) with a maximum file size of 10 MB each.',
                  style: TextStyle(color: Color(0xFF00236F), fontSize: 11, height: 1.3, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        _documentTile(
          docType: 'PLUS_TWO_CERT',
          title: 'Plus Two / 12th Marklist Certificate',
          subtitle: 'Mandatory qualifying exam proof (PDF, Max 10 MB)',
          isRequired: true,
        ),
        _documentTile(
          docType: 'SSLC_CERT',
          title: 'SSLC / 10th Certificate (DOB Proof)',
          subtitle: 'Date of birth & identity proof (PDF, Max 10 MB)',
          isRequired: true,
        ),
        _documentTile(
          docType: 'ALLOTMENT_MEMO',
          title: 'College Allotment Memo',
          subtitle: 'Official University allotment memo slip (PDF, Max 10 MB)',
          isRequired: true,
        ),

        // Community Certificate: ONLY visible and mandatory when quota is Community Quota
        if (isCommunityQuota)
          _documentTile(
            docType: 'COMMUNITY_CERT',
            title: 'Community Certificate (Mandatory for Community Quota)',
            subtitle: 'Issued by Parish Priest / Competent Authority (PDF, Max 10 MB)',
            isRequired: true,
          ),

        // Income Certificate (Mandatory for EWS < ₹1,00,000, or optional if income is declared)
        if (_isEws || hasIncomeEntered)
          _documentTile(
            docType: 'INCOME_CERT',
            title: _isEws ? 'Revenue Village Income Certificate (Mandatory for EWS)' : 'Annual Income Certificate (Optional)',
            subtitle: _isEws ? 'Certifies income < ₹1,00,000 for EWS (PDF, Max 10 MB)' : 'Income proof for fee concession / scholarships (PDF, Max 10 MB)',
            isRequired: _isEws,
          ),

        // Caste Certificate (For Reserved Categories - Optional / as applicable)
        _documentTile(
          docType: 'CASTE_CERT',
          title: 'Caste Certificate (For Reserved Categories)',
          subtitle: 'Reservation validation certificate (PDF, Max 10 MB)',
          isRequired: false,
        ),
      ],
    );
  }

  // --- STEP 5: Bank Details & National Identification ---
  Widget _buildStep5BankId() {
    return _cardSection(
      title: 'Step 5: Bank Details & APAAR Identification',
      icon: Icons.credit_card_outlined,
      children: [
        _buildFormField(
          keyName: 'bankAccountName',
          label: 'NAME AS IN BANK ACCOUNT',
          controller: _bankAcctNameCtrl,
          hint: 'e.g. Harisanth S',
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'bankName',
                label: 'BANK NAME',
                controller: _bankNameCtrl,
                hint: 'e.g. State Bank of India',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'bankBranch',
                label: 'BRANCH NAME',
                controller: _bankBranchCtrl,
                hint: 'e.g. MG Road, Kochi',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'bankAccountNumber',
                label: 'ACCOUNT NUMBER',
                controller: _bankAcctCtrl,
                hint: 'e.g. 38192039102',
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'bankIfscCode',
                label: 'IFSC CODE',
                controller: _bankIfscCtrl,
                hint: 'e.g. SBIN0001234',
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        _documentTile(
          docType: 'BANK_PASSBOOK',
          title: 'Bank Passbook Front Page',
          subtitle: 'Account No & IFSC proof (PDF, Max 10 MB)',
          isRequired: false,
        ),
        const SizedBox(height: 14),

        const Divider(color: Color(0xFFE2E8F0)),
        const SizedBox(height: 8),

        // Aadhaar Details
        _buildFormField(
          keyName: 'aadhaarNumber',
          label: 'AADHAAR NUMBER (UIDAI)',
          controller: _aadhaarCtrl,
          hint: '12-digit Aadhaar Number (e.g. 7482 9102 4821)',
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 12),

        _documentTile(
          docType: 'AADHAAR_CARD',
          title: 'Aadhaar Card / e-Aadhaar Letter',
          subtitle: 'Official UIDAI 12-digit identity proof (PDF, Max 10 MB)',
          isRequired: false,
        ),
        const SizedBox(height: 14),

        const Divider(color: Color(0xFFE2E8F0)),
        const SizedBox(height: 8),

        // APAAR ID
        _buildFormField(
          keyName: 'apaarId',
          label: 'APAAR / ABC ID (AUTOMATED PERMANENT ACADEMIC REGISTRY)',
          controller: _apaarCtrl,
          hint: '12-digit APAAR ID (e.g. 7482-9102-4821)',
        ),
        const SizedBox(height: 12),

        _documentTile(
          docType: 'APAAR_CARD',
          title: 'APAAR Card / DigiLocker Verification Slip',
          subtitle: 'Official card from digilocker.gov.in (PDF, Max 10 MB)',
          isRequired: false,
        ),
      ],
    );
  }

  // --- Document Tile with Upload Action ---
  Widget _documentTile({
    required String docType,
    required String title,
    required String subtitle,
    required bool isRequired,
  }) {
    final isUploaded = _uploadedDocs.containsKey(docType);
    final fileName = _uploadedDocs[docType] ?? '';
    final canEdit = _isFieldEditable(docType);
    final flagRemark = _getFieldFlagRemark(docType);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: flagRemark != null ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: flagRemark != null
              ? const Color(0xFFFCA5A5)
              : isUploaded
                  ? const Color(0xFFBBF7D0)
                  : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (flagRemark != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFDAD6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 16),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Office Remark: $flagRemark',
                      style: const TextStyle(color: Color(0xFFBA1A1A), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isUploaded ? const Color(0xFFDCFCE7) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Icon(
                  isUploaded ? Icons.picture_as_pdf : Icons.cloud_upload_outlined,
                  color: isUploaded ? const Color(0xFF15803D) : const Color(0xFF00236F),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      isUploaded ? 'Attached: $fileName' : subtitle,
                      style: TextStyle(
                        fontSize: 10,
                        color: isUploaded ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        fontWeight: isUploaded ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: canEdit ? () => _handleDocumentUpload(docType, title) : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isUploaded ? const Color(0xFF0D9488) : const Color(0xFF00236F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text(
                  isUploaded ? 'Replace' : 'Upload',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Stationary Bottom Navigation Bar (Fixed 40% Back, 60% Next Layout) ---
  Widget _buildBottomStickyBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 26),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 14,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: true,
        child: SizedBox(
          height: 48,
          child: Row(
            children: [
              // Stationary Back Button on Left (flex: 4)
              Expanded(
                flex: 4,
                child: SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _activeStep > 1
                        ? () => setState(() => _activeStep--)
                        : () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, size: 16),
                    label: Text(
                      _activeStep > 1 ? 'Back' : 'Cancel',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00236F),
                      side: const BorderSide(color: Color(0xFF00236F), width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Stationary Next / Submit Button on Right (flex: 6)
              Expanded(
                flex: 6,
                child: SizedBox(
                  height: 48,
                  child: _activeStep < 5
                      ? ElevatedButton.icon(
                          onPressed: () => setState(() => _activeStep++),
                          icon: const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
                          label: Text(
                            'Next (Step ${_activeStep + 1})',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00236F),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 2,
                          ),
                        )
                      : ElevatedButton.icon(
                          onPressed: (_isLocked && !_isCorrection) || _saving ? null : () => _submitForm(true),
                          icon: _saving
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.check_circle_outline, size: 18, color: Colors.white),
                          label: Text(
                            _isCorrection
                                ? 'Submit Corrections'
                                : _isLocked
                                    ? 'Application Locked'
                                    : 'Submit to College Office',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isCorrection ? const Color(0xFFB45309) : const Color(0xFF00236F),
                            disabledBackgroundColor: const Color(0xFF94A3B8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 2,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Helper Card Section Container ---
  Widget _cardSection({required String title, required IconData icon, required List<Widget> children}) {
    return Container(
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
            children: [
              Icon(icon, color: const Color(0xFF00236F), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  // --- Helper Text Form Field ---
  Widget _buildFormField({
    required String keyName,
    required String label,
    required TextEditingController controller,
    String? hint,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    bool isMalayalam = false,
    IconData? suffixIcon,
    String? prefixText,
    String? badgeText,
    void Function(String)? onChanged,
  }) {
    final canEdit = _isFieldEditable(keyName);
    final flagRemark = _getFieldFlagRemark(keyName);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (flagRemark != null) ...[
          Container(
            padding: const EdgeInsets.all(6),
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFFDAD6),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 14),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Office Remark: $flagRemark',
                    style: const TextStyle(color: Color(0xFFBA1A1A), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: flagRemark != null ? const Color(0xFFBA1A1A) : const Color(0xFF64748B),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (badgeText != null)
                  Container(
                    margin: const EdgeInsets.only(right: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F3FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(badgeText, style: const TextStyle(color: Color(0xFF00236F), fontSize: 8, fontWeight: FontWeight.bold)),
                  ),
                if (!canEdit) const Icon(Icons.lock, size: 11, color: Color(0xFF94A3B8)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          enabled: canEdit,
          maxLines: maxLines,
          keyboardType: keyboardType,
          onChanged: onChanged,
          style: TextStyle(
            color: canEdit ? const Color(0xFF0F172A) : const Color(0xFF64748B),
            fontSize: 13,
            fontWeight: isMalayalam ? FontWeight.w600 : FontWeight.normal,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            prefixText: prefixText,
            suffixIcon: suffixIcon != null ? Icon(suffixIcon, size: 16, color: const Color(0xFF64748B)) : null,
            filled: true,
            fillColor: canEdit ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: flagRemark != null ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
      ],
    );
  }

  // --- Helper Dropdown Field ---
  Widget _buildDropdown({
    required String keyName,
    required String label,
    required String value,
    required List<String> options,
    required void Function(String?) onChanged,
  }) {
    final canEdit = _isFieldEditable(keyName);
    final flagRemark = _getFieldFlagRemark(keyName);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (flagRemark != null) ...[
          Container(
            padding: const EdgeInsets.all(6),
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFFDAD6),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 14),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Office Remark: $flagRemark',
                    style: const TextStyle(color: Color(0xFFBA1A1A), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: flagRemark != null ? const Color(0xFFBA1A1A) : const Color(0xFF64748B),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            if (!canEdit) const Icon(Icons.lock, size: 11, color: Color(0xFF94A3B8)),
          ],
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: canEdit ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: flagRemark != null ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: options.contains(value) ? value : options.first,
              isExpanded: true,
              icon: Icon(Icons.keyboard_arrow_down, color: canEdit ? const Color(0xFF00236F) : const Color(0xFF94A3B8)),
              style: TextStyle(
                color: canEdit ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              items: options.map((opt) => DropdownMenuItem(value: opt, child: Text(opt))).toList(),
              onChanged: canEdit ? onChanged : null,
            ),
          ),
        ),
      ],
    );
  }
}
