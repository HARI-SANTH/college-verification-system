import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../api_service.dart';
import '../models.dart';
import '../utils/malayalam_transliterator.dart';
import '../utils/passport_photo_validator.dart';

class FormValidationError {
  final int step;
  final String fieldKey;
  final String label;
  final String message;

  const FormValidationError({
    required this.step,
    required this.fieldKey,
    required this.label,
    required this.message,
  });
}

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
  PassportPhotoValidationResult? _photoValidation;
  String? _photoValidationError;

  // Track if Malayalam names were manually edited
  bool _fnMlManuallyEdited = false;
  bool _lnMlManuallyEdited = false;

  // Validation errors map: fieldKey -> error message
  final Map<String, String> _fieldErrors = {};

  // Controllers - Step 1: Personal & Identity
  late TextEditingController _fnCtrl;
  late TextEditingController _lnCtrl;
  late TextEditingController _fnMlCtrl;
  late TextEditingController _lnMlCtrl;
  late TextEditingController _dobCtrl;
  late TextEditingController _permAddrCtrl;
  late TextEditingController _nationalityCtrl;
  late TextEditingController _aadhaarCtrl;
  late TextEditingController _apaarCtrl;

  // Controllers - Step 2: Family & Legal Guardian
  late TextEditingController _fatherNameCtrl;
  late TextEditingController _fatherOccCtrl;
  late TextEditingController _motherNameCtrl;
  late TextEditingController _motherOccCtrl;
  late TextEditingController _guardianNameCtrl;
  late TextEditingController _guardianOccCtrl;

  // Controllers - Step 3: Academics (+2 / HSE)
  late TextEditingController _prevSchoolCtrl;
  late TextEditingController _prevCourseCtrl;
  late TextEditingController _prevRegCtrl;
  late TextEditingController _prevBoardCtrl;
  late TextEditingController _prevPeriodCtrl;
  late TextEditingController _prevPercentCtrl;

  // Controllers - Step 4: Admission, Quota & Banking
  late TextEditingController _incomeCtrl;
  late TextEditingController _bankAcctNameCtrl;
  late TextEditingController _bankNameCtrl;
  late TextEditingController _bankBranchCtrl;
  late TextEditingController _bankAcctCtrl;
  late TextEditingController _bankIfscCtrl;

  // Dropdown states
  String _gender = 'Female';
  String _religion = 'Christian';
  String _caste = 'General / Open';
  String _course = 'BCA';
  String _quota = 'Merit';
  bool _isEws = true;

  // Photo URL
  String? _photoUrl;

  // Uploaded documents tracking: docType -> fileName
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
    _aadhaarCtrl = TextEditingController(text: p.aadhaarNumber ?? '');
    _apaarCtrl = TextEditingController(text: p.apaarId ?? '');

    _fatherNameCtrl = TextEditingController(text: p.fatherName ?? p.parentName ?? '');
    _fatherOccCtrl = TextEditingController(text: p.fatherOccupation ?? p.parentOccupation ?? '');
    _motherNameCtrl = TextEditingController(text: p.motherName ?? '');
    _motherOccCtrl = TextEditingController(text: p.motherOccupation ?? '');
    _guardianNameCtrl = TextEditingController(text: p.guardianName ?? '');
    _guardianOccCtrl = TextEditingController(text: p.guardianOccupation ?? '');

    _prevSchoolCtrl = TextEditingController(text: p.prevInstitutionName ?? '');
    _prevCourseCtrl = TextEditingController(text: p.prevCourse ?? 'Computer Science');
    _prevRegCtrl = TextEditingController(text: p.prevRegisterNumber ?? '');
    _prevBoardCtrl = TextEditingController(text: p.prevBoardUniversity ?? 'Kerala State Board (DHSE)');
    _prevPeriodCtrl = TextEditingController(text: p.prevPeriodOfStudy ?? '2022-2024');
    _prevPercentCtrl = TextEditingController(
      text: p.prevPercentage != null ? p.prevPercentage.toString() : '',
    );

    _incomeCtrl = TextEditingController(
      text: p.annualIncome != null ? p.annualIncome!.toInt().toString() : '',
    );
    _bankAcctNameCtrl = TextEditingController(text: p.bankAccountName ?? '${p.firstName} ${p.lastName}');
    _bankNameCtrl = TextEditingController(text: p.bankName ?? '');
    _bankBranchCtrl = TextEditingController(text: p.bankBranch ?? '');
    _bankAcctCtrl = TextEditingController(text: p.bankAccountNumber ?? '');
    _bankIfscCtrl = TextEditingController(text: p.bankIfscCode ?? '');

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

  @override
  void dispose() {
    _fnCtrl.dispose();
    _lnCtrl.dispose();
    _fnMlCtrl.dispose();
    _lnMlCtrl.dispose();
    _dobCtrl.dispose();
    _permAddrCtrl.dispose();
    _nationalityCtrl.dispose();
    _aadhaarCtrl.dispose();
    _apaarCtrl.dispose();

    _fatherNameCtrl.dispose();
    _fatherOccCtrl.dispose();
    _motherNameCtrl.dispose();
    _motherOccCtrl.dispose();
    _guardianNameCtrl.dispose();
    _guardianOccCtrl.dispose();

    _prevSchoolCtrl.dispose();
    _prevCourseCtrl.dispose();
    _prevRegCtrl.dispose();
    _prevBoardCtrl.dispose();
    _prevPeriodCtrl.dispose();
    _prevPercentCtrl.dispose();

    _incomeCtrl.dispose();
    _bankAcctNameCtrl.dispose();
    _bankNameCtrl.dispose();
    _bankBranchCtrl.dispose();
    _bankAcctCtrl.dispose();
    _bankIfscCtrl.dispose();
    super.dispose();
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
    'BANK_PASSBOOK': ['BANK_PASSBOOK_COPY', 'bankPassbook'],
    'PROFILE_PHOTO': ['photoUrl', 'photo'],
    'photoUrl': ['PROFILE_PHOTO'],
    'photo': ['PROFILE_PHOTO'],
  };

  bool _isDocUploaded(String docType) {
    if (_uploadedDocs.containsKey(docType)) return true;
    final aliases = _keyAliases[docType] ?? [];
    for (final a in aliases) {
      if (_uploadedDocs.containsKey(a)) return true;
    }
    return false;
  }

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
          'gender', 'dob', 'bloodGroup', 'nationality',
          'permanentAddress', 'aadhaarNumber', 'AADHAAR_CARD',
          'apaarId', 'APAAR_CARD', 'APAAR_DOCUMENT',
          'PROFILE_PHOTO', 'photoUrl', 'photo',
        ]);
        break;
      case 2:
        stepKeys.addAll([
          'fatherName', 'fatherOccupation',
          'motherName', 'motherOccupation',
          'guardianName', 'guardianOccupation',
        ]);
        break;
      case 3:
        stepKeys.addAll([
          'prevInstitutionName', 'prevCourse', 'prevRegisterNumber',
          'prevBoardUniversity', 'prevPeriodOfStudy', 'prevPercentage',
        ]);
        break;
      case 4:
        stepKeys.addAll([
          'courseAdmitted', 'quota', 'religion', 'caste',
          'annualIncome', 'isEws',
          'bankAccountName', 'bankName', 'bankBranch',
          'bankAccountNumber', 'bankIfscCode',
        ]);
        break;
      case 5:
        stepKeys.addAll([
          'PLUS_TWO_CERT', 'PLUS_TWO_CERTIFICATE',
          'SSLC_CERT', 'SSLC_CERTIFICATE',
          'ALLOTMENT_MEMO',
          'COMMUNITY_CERT', 'COMMUNITY_CERTIFICATE',
          'INCOME_CERT', 'INCOME_CERTIFICATE',
          'CASTE_CERT', 'CASTE_CERTIFICATE',
          'BANK_PASSBOOK', 'AADHAAR_CARD', 'APAAR_CARD',
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

  // --- Strict Comprehensive Validation Engine ---
  List<FormValidationError> _validateAllFieldsAndDocuments() {
    final List<FormValidationError> errors = [];

    // --- STEP 1: Personal & Identity ---
    // 1. Passport Photo
    final hasPhoto = _uploadedDocs.containsKey('PROFILE_PHOTO') ||
        _localPhotoBytes != null ||
        (_photoUrl != null && _photoUrl!.isNotEmpty);
    if (!hasPhoto) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'PROFILE_PHOTO',
        label: 'Passport Photo',
        message: 'A formal passport photograph is required for your College ID Card.',
      ));
    } else if (_photoValidationError != null) {
      errors.add(FormValidationError(
        step: 1,
        fieldKey: 'PROFILE_PHOTO',
        label: 'Passport Photo',
        message: _photoValidationError!,
      ));
    }

    if (_fnCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'firstName',
        label: 'English First Name',
        message: 'First name in English is required.',
      ));
    }
    if (_lnCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'lastName',
        label: 'English Last Name',
        message: 'Last name in English is required.',
      ));
    }
    if (_fnMlCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'firstNameMalayalam',
        label: 'Malayalam First Name (പേര്)',
        message: 'Malayalam first name as per SSLC record is required.',
      ));
    }
    if (_lnMlCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'lastNameMalayalam',
        label: 'Malayalam Last Name',
        message: 'Malayalam last name is required.',
      ));
    }
    if (_dobCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'dob',
        label: 'Date of Birth',
        message: 'Date of birth is required.',
      ));
    }
    if (_permAddrCtrl.text.trim().length < 8) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'permanentAddress',
        label: 'Permanent Address',
        message: 'Permanent residential address is required (minimum 8 characters).',
      ));
    }
    final cleanAadhaar = _aadhaarCtrl.text.replaceAll(' ', '').trim();
    if (cleanAadhaar.length != 12 || int.tryParse(cleanAadhaar) == null) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'aadhaarNumber',
        label: 'Aadhaar Card UID',
        message: 'Aadhaar number must be exactly 12 numeric digits.',
      ));
    }
    final cleanApaar = _apaarCtrl.text.replaceAll(' ', '').replaceAll('-', '').trim();
    if (cleanApaar.length != 12) {
      errors.add(const FormValidationError(
        step: 1,
        fieldKey: 'apaarId',
        label: 'APAAR / ABC ID',
        message: 'APAAR / ABC ID must be exactly 12 characters.',
      ));
    }

    // --- STEP 2: Family & Legal Guardian ---
    if (_fatherNameCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 2,
        fieldKey: 'fatherName',
        label: "Father's Full Name",
        message: "Father's full name as per secondary records is required.",
      ));
    }
    if (_motherNameCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 2,
        fieldKey: 'motherName',
        label: "Mother's Full Name",
        message: "Mother's full name as per secondary records is required.",
      ));
    }

    // --- STEP 3: Academic Qualifications ---
    if (_prevSchoolCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 3,
        fieldKey: 'prevInstitutionName',
        label: 'School Last Attended',
        message: 'Higher secondary school/institution last attended is required.',
      ));
    }
    if (_prevCourseCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 3,
        fieldKey: 'prevCourse',
        label: 'Stream / Specialization',
        message: 'Qualifying stream / course is required.',
      ));
    }
    if (_prevRegCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 3,
        fieldKey: 'prevRegisterNumber',
        label: 'HSE Register Number',
        message: 'HSE examination register number is required.',
      ));
    }
    if (_prevBoardCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 3,
        fieldKey: 'prevBoardUniversity',
        label: 'Examination Board',
        message: 'Examination board is required.',
      ));
    }
    final percentVal = double.tryParse(_prevPercentCtrl.text.trim());
    if (percentVal == null || percentVal <= 0 || percentVal > 100) {
      errors.add(const FormValidationError(
        step: 3,
        fieldKey: 'prevPercentage',
        label: 'Qualifying Percentage',
        message: 'Enter a valid percentage score between 1% and 100%.',
      ));
    }

    // --- STEP 4: Admission Quota & Banking ---
    final incomeVal = double.tryParse(_incomeCtrl.text.trim());
    if (incomeVal == null || incomeVal < 0) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'annualIncome',
        label: 'Annual Family Income',
        message: 'Valid annual family income in Rupees is required.',
      ));
    }
    if (_bankAcctNameCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'bankAccountName',
        label: 'Bank Account Holder Name',
        message: 'Name as printed on bank passbook is required.',
      ));
    }
    if (_bankNameCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'bankName',
        label: 'Bank Name',
        message: 'Scheduled commercial bank name is required.',
      ));
    }
    if (_bankBranchCtrl.text.trim().isEmpty) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'bankBranch',
        label: 'Branch Name',
        message: 'Bank branch name is required.',
      ));
    }
    if (_bankAcctCtrl.text.trim().length < 8) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'bankAccountNumber',
        label: 'Bank Account Number',
        message: 'Valid bank account number is required (min 8 digits).',
      ));
    }
    final ifscClean = _bankIfscCtrl.text.trim().toUpperCase();
    if (ifscClean.length != 11) {
      errors.add(const FormValidationError(
        step: 4,
        fieldKey: 'bankIfscCode',
        label: 'Bank IFSC Code',
        message: 'IFSC code must be exactly 11 characters (e.g. SBIN0001234).',
      ));
    }

    // --- STEP 5: Official Certificates Vault ---
    if (!_isDocUploaded('SSLC_CERT')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'SSLC_CERT',
        label: 'SSLC 10th Book',
        message: 'SSLC / 10th Certificate (DOB Proof) is mandatory.',
      ));
    }
    if (!_isDocUploaded('PLUS_TWO_CERT')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'PLUS_TWO_CERT',
        label: '+2 HSE Marksheet',
        message: 'Plus Two / 12th HSE Marksheet is mandatory.',
      ));
    }
    if (!_isDocUploaded('ALLOTMENT_MEMO')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'ALLOTMENT_MEMO',
        label: 'Allotment Memo Slip',
        message: 'Official College Allotment Memo is mandatory.',
      ));
    }
    if (!_isDocUploaded('AADHAAR_CARD')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'AADHAAR_CARD',
        label: 'Aadhaar Card Copy',
        message: 'Aadhaar Card scan copy is mandatory.',
      ));
    }
    if (!_isDocUploaded('BANK_PASSBOOK')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'BANK_PASSBOOK',
        label: 'Bank Passbook Copy',
        message: 'Bank Passbook first page scan is mandatory.',
      ));
    }
    if (!_isDocUploaded('APAAR_CARD')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'APAAR_CARD',
        label: 'APAAR / ABC ID Card',
        message: 'APAAR / ABC ID Card scan is mandatory.',
      ));
    }

    // Conditional mandatory certificates
    if (_quota == 'Community Quota' && !_isDocUploaded('COMMUNITY_CERT')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'COMMUNITY_CERT',
        label: 'Community Certificate',
        message: 'Community Certificate is mandatory for Community Quota.',
      ));
    }
    if (_isEws && !_isDocUploaded('INCOME_CERT')) {
      errors.add(const FormValidationError(
        step: 5,
        fieldKey: 'INCOME_CERT',
        label: 'Income Certificate',
        message: 'Revenue Income Certificate is mandatory for EWS reservation (< ₹1,00,000).',
      ));
    }
    final isReservedCaste = _caste != 'General / Open' && _caste != 'Other';
    if (isReservedCaste && !_isDocUploaded('CASTE_CERT')) {
      errors.add(FormValidationError(
        step: 5,
        fieldKey: 'CASTE_CERT',
        label: 'Caste Certificate',
        message: 'Caste certificate is required for category "$_caste".',
      ));
    }

    return errors;
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
        _fieldErrors.remove('dob');
      });
    }
  }

  // --- Profile Photo Upload with Rigorous Passport Validation ---
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
            const Text(
              'Upload Student Passport Photograph',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'Official Specifications: Portrait orientation (3.5 x 4.5 cm), light/plain background, facing camera.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.3),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFF2F3FF), child: Icon(Icons.camera_alt, color: Color(0xFF00236F))),
              title: const Text('Capture with Camera', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: const Text('Take a clear vertical passport portrait', style: TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  final XFile? image = await _imagePicker.pickImage(
                    source: ImageSource.camera,
                    maxWidth: 900,
                    maxHeight: 1200,
                    imageQuality: 82,
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
              title: const Text('Select from Gallery', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: const Text('Select existing passport portrait photo', style: TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  final XFile? image = await _imagePicker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 900,
                    maxHeight: 1200,
                    imageQuality: 82,
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
    setState(() => _saving = true);

    try {
      final bytes = await image.readAsBytes();

      // Execute rigorous passport photo validation
      final validation = await PassportPhotoValidator.validate(bytes, fileName: image.name);
      if (!validation.isValid) {
        setState(() {
          _photoValidationError = validation.errorMessage;
        });
        _showErrorSnackBar(validation.errorMessage ?? 'Invalid passport photo');
        return;
      }

      setState(() {
        _localPhotoBytes = bytes;
        _photoValidation = validation;
        _photoValidationError = null;
        _fieldErrors.remove('PROFILE_PHOTO');
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
        SnackBar(
          content: Text('✓ Passport photo validated & uploaded (${validation.dimensionsText})!'),
          backgroundColor: const Color(0xFF0D9488),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadedDocs['PROFILE_PHOTO'] = image.name;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Photo attached: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: const Color(0xFF0D9488)),
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

      final ext = pickedFile.name.split('.').last.toLowerCase();
      if (ext != 'pdf') {
        _showErrorSnackBar('Invalid file format. Documents must be in PDF format (.pdf).');
        return;
      }

      final bytes = await pickedFile.xFile.readAsBytes();

      const maxSizeBytes = 10 * 1024 * 1024;
      if (bytes.length > maxSizeBytes) {
        final sizeMb = (bytes.length / (1024 * 1024)).toStringAsFixed(1);
        _showErrorSnackBar('File size ($sizeMb MB) exceeds the maximum allowed limit of 10 MB.');
        return;
      }

      await _uploadDocBytes(docType, docTitle, pickedFile.name, bytes);
    } catch (e) {
      _showErrorSnackBar('Document selection error: $e');
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
        _fieldErrors.remove(docType);
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✓ $docTitle uploaded successfully!'), backgroundColor: const Color(0xFF0D9488)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadedDocs[docType] = fileName;
        _fieldErrors.remove(docType);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$docTitle attached!'), backgroundColor: const Color(0xFF0D9488)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // --- Show Validation Errors Bottom Sheet ---
  void _showValidationErrorsSheet(List<FormValidationError> errors) {
    // Map by step number
    final Map<int, List<FormValidationError>> byStep = {};
    for (final err in errors) {
      byStep.putIfAbsent(err.step, () => []).add(err);
    }

    final firstStepWithError = errors.first.step;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFFFDAD6), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Submission Incomplete (${errors.length} Items Pending)',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'All required fields and documents must be completed before submission.',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  children: byStep.entries.map((entry) {
                    final stepNum = entry.key;
                    final stepErrors = entry.value;
                    final stepNames = {
                      1: 'Step 1: Personal & Identification',
                      2: 'Step 2: Family & Legal Guardian',
                      3: 'Step 3: Academic Qualifications',
                      4: 'Step 4: Admission Quota & Banking',
                      5: 'Step 5: Document Verification Vault',
                    };

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECDD3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                stepNames[stepNum] ?? 'Step $stepNum',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF9F1239)),
                              ),
                              TextButton(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  setState(() => _activeStep = stepNum);
                                },
                                child: const Text('Go to Step →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF00236F))),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ...stepErrors.map((e) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('• ', style: TextStyle(color: Color(0xFFE11D48), fontWeight: FontWeight.bold)),
                                    Expanded(
                                      child: Text(
                                        '${e.label}: ${e.message}',
                                        style: const TextStyle(color: Color(0xFF881337), fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() => _activeStep = firstStepWithError);
                  },
                  icon: const Icon(Icons.arrow_forward, size: 18, color: Colors.white),
                  label: Text(
                    'Go to Step $firstStepWithError to Complete',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00236F),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Confirm Submission Dialog ---
  Future<void> _showConfirmSubmissionDialog() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: const [
            Icon(Icons.verified_outlined, color: Color(0xFF00236F), size: 24),
            SizedBox(width: 8),
            Text('Confirm Submission', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'All required fields and documents have been filled and verified.',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
            ),
            SizedBox(height: 8),
            Text(
              'Once submitted to the College Office, your application will be locked for official verification. Do you want to proceed?',
              style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00236F),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Confirm & Submit to Office', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _executeSubmit(true);
    }
  }

  Future<void> _submitForm(bool isFinal) async {
    if (isFinal) {
      // Run complete validation
      final errors = _validateAllFieldsAndDocuments();
      if (errors.isNotEmpty) {
        setState(() {
          _fieldErrors.clear();
          for (final err in errors) {
            _fieldErrors[err.fieldKey] = err.message;
          }
        });
        _showValidationErrorsSheet(errors);
        return;
      }

      await _showConfirmSubmissionDialog();
    } else {
      // Save draft without blocking
      await _executeSubmit(false);
    }
  }

  Future<void> _executeSubmit(bool isFinal) async {
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
          content: Text(isFinal ? '✓ Application successfully submitted to college office!' : '✓ Draft progress saved!'),
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

            // 3. Step Content (Cleanly categorized)
            if (_activeStep == 1) _buildStep1PersonalIdentity(),
            if (_activeStep == 2) _buildStep2FamilyDetails(),
            if (_activeStep == 3) _buildStep3Academics(),
            if (_activeStep == 4) _buildStep4QuotaAndBanking(),
            if (_activeStep == 5) _buildStep5DocumentVault(),
          ],
        ),
      ),

      // Stationary Bottom Sticky Navigation Bar
      bottomNavigationBar: _buildBottomStickyBar(),
    );
  }

  // --- Step Wizard Widget (5 Clean Steps) ---
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
          _wizardTab(1, 'Identity', Icons.person_outline),
          _wizardDivider(_activeStep > 1),
          _wizardTab(2, 'Family', Icons.family_restroom_outlined),
          _wizardDivider(_activeStep > 2),
          _wizardTab(3, 'Academics', Icons.school_outlined),
          _wizardDivider(_activeStep > 3),
          _wizardTab(4, 'Quota/Bank', Icons.account_balance_outlined),
          _wizardDivider(_activeStep > 4),
          _wizardTab(5, 'Documents', Icons.file_present_outlined),
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
      subtitle = 'Office staff flagged specific items (marked with red dots above). Update all flagged fields/documents to resubmit.';
    } else if (_isLocked) {
      bg = const Color(0xFFF2F3FF);
      border = const Color(0xFFDAE2FD);
      icon = Icons.lock_outline;
      iconColor = const Color(0xFF00236F);
      title = widget.profile.verificationStatus == 'VERIFIED'
          ? 'Profile Approved & Verified'
          : 'Application Submitted & Locked';
      subtitle = 'Your admission data is securely submitted. Editing is disabled during office verification.';
    } else {
      bg = const Color(0xFFF0FDF4);
      border = const Color(0xFFBBF7D0);
      icon = Icons.edit_note;
      iconColor = const Color(0xFF15803D);
      title = 'Admission Profile: Draft Mode';
      subtitle = 'All required fields and documents must be completed. Incomplete forms cannot be submitted.';
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

  // =========================================================================
  // STEP 1: Student Profile, Identity & Government Identification
  // =========================================================================
  Widget _buildStep1PersonalIdentity() {
    final hasPhoto = _uploadedDocs.containsKey('PROFILE_PHOTO') ||
        _localPhotoBytes != null ||
        (_photoUrl != null && _photoUrl!.isNotEmpty);

    return Column(
      children: [
        // --- 1A: Passport Size Photograph Card ---
        _cardSection(
          title: 'Official Passport Size Photograph *',
          icon: Icons.camera_front_outlined,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _photoValidationError != null
                    ? const Color(0xFFFEF2F2)
                    : hasPhoto
                        ? const Color(0xFFF0FDF4)
                        : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _photoValidationError != null
                      ? const Color(0xFFFCA5A5)
                      : hasPhoto
                          ? const Color(0xFF86EFAC)
                          : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Photo Frame (Portrait 3:4 aspect ratio)
                  GestureDetector(
                    onTap: _isFieldEditable('PROFILE_PHOTO') ? _handleProfilePhotoUpload : null,
                    child: Container(
                      width: 78,
                      height: 100,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: hasPhoto ? const Color(0xFF15803D) : const Color(0xFFCBD5E1),
                          width: hasPhoto ? 2 : 1,
                        ),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(9),
                        child: _localPhotoBytes != null
                            ? Image.memory(_localPhotoBytes!, fit: BoxFit.cover)
                            : (_photoUrl != null && _photoUrl!.isNotEmpty)
                                ? Image.network(
                                    _resolvePhotoUrl(_photoUrl!),
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 40, color: Color(0xFF64748B)),
                                  )
                                : const Icon(Icons.person, size: 40, color: Color(0xFF64748B)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Guidelines and Validation Status
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              hasPhoto ? 'Passport Photo Attached' : 'Passport Photo Required *',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: hasPhoto ? const Color(0xFF15803D) : const Color(0xFF0F172A),
                              ),
                            ),
                            if (hasPhoto) ...[
                              const SizedBox(width: 4),
                              const Icon(Icons.verified, color: Color(0xFF15803D), size: 16),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _photoValidation != null
                              ? 'Validated portrait (${_photoValidation!.dimensionsText})'
                              : 'Standard 3.5 x 4.5 cm portrait, facing front, light background.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                        ),
                        if (_photoValidationError != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            _photoValidationError!,
                            style: const TextStyle(fontSize: 10.5, color: Color(0xFFDC2626), fontWeight: FontWeight.bold),
                          ),
                        ],
                        const SizedBox(height: 10),
                        ElevatedButton.icon(
                          onPressed: _isFieldEditable('PROFILE_PHOTO') ? _handleProfilePhotoUpload : null,
                          icon: const Icon(Icons.camera_alt_outlined, size: 14, color: Colors.white),
                          label: Text(
                            hasPhoto ? 'Change Photo' : 'Upload Passport Photo',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00236F),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
          ],
        ),
        const SizedBox(height: 14),

        // --- 1B: Legal Identity & Personal Details Card ---
        _cardSection(
          title: 'Candidate Legal Identity *',
          icon: Icons.badge_outlined,
          children: [
            // English Names
            Row(
              children: [
                Expanded(
                  child: _buildFormField(
                    keyName: 'firstName',
                    label: 'FIRST NAME (ENGLISH) *',
                    controller: _fnCtrl,
                    hint: 'e.g. Jeswin',
                    onChanged: _onEnglishFirstNameChanged,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildFormField(
                    keyName: 'lastName',
                    label: 'LAST NAME (ENGLISH) *',
                    controller: _lnCtrl,
                    hint: 'e.g. Jose',
                    onChanged: _onEnglishLastNameChanged,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Malayalam Names (checked against Kerala SSLC certificate)
            Row(
              children: [
                Expanded(
                  child: _buildFormField(
                    keyName: 'firstNameMalayalam',
                    label: 'മലയാളത്തിൽ പേര് *',
                    controller: _fnMlCtrl,
                    hint: 'ഉദാ: ജസ്വിൻ',
                    isMalayalam: true,
                    onChanged: (_) => _fnMlManuallyEdited = true,
                    badgeText: 'SSLC-matched',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildFormField(
                    keyName: 'lastNameMalayalam',
                    label: 'മലയാളത്തിൽ അവസാന പേര് *',
                    controller: _lnMlCtrl,
                    hint: 'ഉദാ: ജോസ്',
                    isMalayalam: true,
                    onChanged: (_) => _lnMlManuallyEdited = true,
                    badgeText: 'SSLC-matched',
                  ),
                ),
              ],
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
                        label: 'DATE OF BIRTH (SSLC) *',
                        controller: _dobCtrl,
                        hint: 'YYYY-MM-DD',
                        suffixIcon: Icons.calendar_today,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildFormField(
                    keyName: 'nationality',
                    label: 'NATIONALITY *',
                    controller: _nationalityCtrl,
                    hint: 'Indian',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Gender Selection
            const Text('GENDER *', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold)),
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
          ],
        ),
        const SizedBox(height: 14),

        // --- 1C: Government National Identifiers Card ---
        _cardSection(
          title: 'Government National Identification *',
          icon: Icons.fingerprint,
          children: [
            _buildFormField(
              keyName: 'aadhaarNumber',
              label: 'AADHAAR CARD UID (12 DIGITS) *',
              controller: _aadhaarCtrl,
              hint: 'e.g. 9281 7401 8294',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),

            _buildFormField(
              keyName: 'apaarId',
              label: 'APAAR / ABC ID (12 DIGITS) *',
              controller: _apaarCtrl,
              hint: 'e.g. 4746 5385 6745',
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        const SizedBox(height: 14),

        // --- 1D: Residential Address Card ---
        _cardSection(
          title: 'Permanent Residential Address *',
          icon: Icons.home_outlined,
          children: [
            _buildFormField(
              keyName: 'permanentAddress',
              label: 'FULL DOMICILE RESIDENTIAL ADDRESS *',
              controller: _permAddrCtrl,
              hint: 'House Name/No, Street, Post Office, City, District, PIN Code',
              maxLines: 3,
            ),
          ],
        ),
      ],
    );
  }

  // =========================================================================
  // STEP 2: Parent & Legal Guardian Details
  // =========================================================================
  Widget _buildStep2FamilyDetails() {
    return Column(
      children: [
        _cardSection(
          title: "Father's Legal Record *",
          icon: Icons.person_outline,
          children: [
            _buildFormField(
              keyName: 'fatherName',
              label: "FATHER'S FULL NAME (AS PER SSLC) *",
              controller: _fatherNameCtrl,
              hint: "Enter father's full name",
            ),
            const SizedBox(height: 12),
            _buildFormField(
              keyName: 'fatherOccupation',
              label: "FATHER'S OCCUPATION",
              controller: _fatherOccCtrl,
              hint: "e.g. Agriculturist / Businessman / Govt Employee",
            ),
          ],
        ),
        const SizedBox(height: 14),

        _cardSection(
          title: "Mother's Legal Record *",
          icon: Icons.person_outline,
          children: [
            _buildFormField(
              keyName: 'motherName',
              label: "MOTHER'S FULL NAME (AS PER SSLC) *",
              controller: _motherNameCtrl,
              hint: "Enter mother's full name",
            ),
            const SizedBox(height: 12),
            _buildFormField(
              keyName: 'motherOccupation',
              label: "MOTHER'S OCCUPATION",
              controller: _motherOccCtrl,
              hint: "e.g. Homemaker / Teacher / Nurse",
            ),
          ],
        ),
        const SizedBox(height: 14),

        _cardSection(
          title: 'Local Guardian Record (Optional)',
          icon: Icons.security_outlined,
          children: [
            _buildFormField(
              keyName: 'guardianName',
              label: 'LOCAL GUARDIAN NAME',
              controller: _guardianNameCtrl,
              hint: "Optional if residing with parents",
            ),
            const SizedBox(height: 12),
            _buildFormField(
              keyName: 'guardianOccupation',
              label: 'GUARDIAN OCCUPATION / RELATION',
              controller: _guardianOccCtrl,
              hint: "e.g. Uncle / Banker",
            ),
          ],
        ),
      ],
    );
  }

  // =========================================================================
  // STEP 3: Qualifying Examination & Academic Scores (+2 / HSE)
  // =========================================================================
  Widget _buildStep3Academics() {
    return _cardSection(
      title: 'Qualifying Examination & Marks (+2 / HSE) *',
      icon: Icons.school_outlined,
      children: [
        _buildFormField(
          keyName: 'prevInstitutionName',
          label: 'SCHOOL / INSTITUTION LAST ATTENDED *',
          controller: _prevSchoolCtrl,
          hint: 'e.g. Govt. Model Higher Secondary School',
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'prevBoardUniversity',
                label: 'EXAMINATION BOARD *',
                controller: _prevBoardCtrl,
                hint: 'e.g. Kerala State Board (DHSE) / CBSE',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'prevCourse',
                label: 'STREAM / SPECIALIZATION *',
                controller: _prevCourseCtrl,
                hint: 'e.g. Computer Science / Science',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildFormField(
                keyName: 'prevRegisterNumber',
                label: 'HSE REGISTER NUMBER *',
                controller: _prevRegCtrl,
                hint: 'e.g. 23144722',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildFormField(
                keyName: 'prevPeriodOfStudy',
                label: 'PERIOD OF STUDY *',
                controller: _prevPeriodCtrl,
                hint: '2022-2024',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Aggregate Percentage with strict 1-100% check
        _buildFormField(
          keyName: 'prevPercentage',
          label: 'QUALIFYING AGGREGATE PERCENTAGE (%) *',
          controller: _prevPercentCtrl,
          hint: 'e.g. 91.75',
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          suffixIcon: Icons.percent,
        ),
      ],
    );
  }

  // =========================================================================
  // STEP 4: Admission Quota, Socio-Economic & Banking
  // =========================================================================
  Widget _buildStep4QuotaAndBanking() {
    return Column(
      children: [
        // --- 4A: College Seat Allocation & Quota ---
        _cardSection(
          title: 'College Seat Allocation & Quota *',
          icon: Icons.account_tree_outlined,
          children: [
            _buildDropdown(
              keyName: 'courseAdmitted',
              label: 'COURSE ADMITTED *',
              value: _course,
              options: _courseOptions,
              onChanged: (val) => setState(() => _course = val!),
            ),
            const SizedBox(height: 12),

            _buildDropdown(
              keyName: 'quota',
              label: 'ADMISSION QUOTA *',
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
                        'Community Certificate is required in Step 5 for verification under Community Quota.',
                        style: TextStyle(color: Color(0xFFB45309), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 14),

        // --- 4B: Socio-Economic & Reservation Details ---
        _cardSection(
          title: 'Socio-Economic & Reservation *',
          icon: Icons.payments_outlined,
          children: [
            Row(
              children: [
                Expanded(
                  child: _buildDropdown(
                    keyName: 'religion',
                    label: 'RELIGION *',
                    value: _religion,
                    options: _religionOptions,
                    onChanged: (val) => setState(() => _religion = val!),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDropdown(
                    keyName: 'caste',
                    label: 'CASTE / CATEGORY *',
                    value: _caste,
                    options: _casteOptions,
                    onChanged: (val) => setState(() => _caste = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Annual Income with live EWS computation
            _buildFormField(
              keyName: 'annualIncome',
              label: 'ANNUAL FAMILY INCOME (₹) *',
              controller: _incomeCtrl,
              hint: 'e.g. 85000',
              keyboardType: TextInputType.number,
              onChanged: (_) => _calculateEws(),
              prefixText: '₹ ',
            ),
            const SizedBox(height: 12),

            // Live EWS Status Indicator
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isEws ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _isEws ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isEws ? Icons.check_circle : Icons.info_outline,
                    color: _isEws ? const Color(0xFF15803D) : const Color(0xFF64748B),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isEws ? 'EWS Eligible (< ₹1,00,000)' : 'Non-EWS (≥ ₹1,00,000)',
                          style: TextStyle(
                            color: _isEws ? const Color(0xFF15803D) : const Color(0xFF0F172A),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          _isEws
                              ? 'Revenue Income Certificate will be required in Step 5 for EWS validation.'
                              : 'Standard fee category applies.',
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // --- 4C: Direct Benefit Transfer (DBT) Banking Details ---
        _cardSection(
          title: 'Direct Benefit Transfer (DBT) Bank Account *',
          icon: Icons.account_balance_outlined,
          children: [
            _buildFormField(
              keyName: 'bankAccountName',
              label: 'NAME AS IN BANK ACCOUNT *',
              controller: _bankAcctNameCtrl,
              hint: 'e.g. Jeswin Jose',
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _buildFormField(
                    keyName: 'bankName',
                    label: 'BANK NAME *',
                    controller: _bankNameCtrl,
                    hint: 'e.g. State Bank of India',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildFormField(
                    keyName: 'bankBranch',
                    label: 'BRANCH NAME *',
                    controller: _bankBranchCtrl,
                    hint: 'e.g. Piravom Branch',
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
                    label: 'ACCOUNT NUMBER *',
                    controller: _bankAcctCtrl,
                    hint: 'e.g. 0000 1234 5678',
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildFormField(
                    keyName: 'bankIfscCode',
                    label: 'IFSC CODE (11 CHARS) *',
                    controller: _bankIfscCtrl,
                    hint: 'e.g. SBIN0001234',
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  // =========================================================================
  // STEP 5: Official Certificates & Document Verification Vault
  // =========================================================================
  Widget _buildStep5DocumentVault() {
    final isCommunityQuota = _quota == 'Community Quota';
    final isReservedCaste = _caste != 'General / Open' && _caste != 'Other';

    // Calculate uploaded documents count
    int totalRequired = 6;
    if (isCommunityQuota) totalRequired++;
    if (_isEws) totalRequired++;
    if (isReservedCaste) totalRequired++;

    int uploadedCount = 0;
    if (_isDocUploaded('SSLC_CERT')) uploadedCount++;
    if (_isDocUploaded('PLUS_TWO_CERT')) uploadedCount++;
    if (_isDocUploaded('ALLOTMENT_MEMO')) uploadedCount++;
    if (_isDocUploaded('AADHAAR_CARD')) uploadedCount++;
    if (_isDocUploaded('BANK_PASSBOOK')) uploadedCount++;
    if (_isDocUploaded('APAAR_CARD')) uploadedCount++;
    if (isCommunityQuota && _isDocUploaded('COMMUNITY_CERT')) uploadedCount++;
    if (_isEws && _isDocUploaded('INCOME_CERT')) uploadedCount++;
    if (isReservedCaste && _isDocUploaded('CASTE_CERT')) uploadedCount++;

    final progressPct = (uploadedCount / totalRequired).clamp(0.0, 1.0);
    final isVaultComplete = uploadedCount >= totalRequired;

    return _cardSection(
      title: 'Official Document Verification Vault *',
      icon: Icons.fact_check_outlined,
      children: [
        // Vault Progress Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isVaultComplete ? const Color(0xFFF0FDF4) : const Color(0xFFF2F3FF),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isVaultComplete ? const Color(0xFF86EFAC) : const Color(0xFFDAE2FD),
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
                        isVaultComplete ? Icons.verified : Icons.upload_file,
                        color: isVaultComplete ? const Color(0xFF15803D) : const Color(0xFF00236F),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$uploadedCount of $totalRequired Documents Uploaded',
                        style: TextStyle(
                          color: isVaultComplete ? const Color(0xFF15803D) : const Color(0xFF00236F),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${(progressPct * 100).toInt()}%',
                    style: TextStyle(
                      color: isVaultComplete ? const Color(0xFF15803D) : const Color(0xFF00236F),
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: progressPct,
                  minHeight: 6,
                  backgroundColor: const Color(0xFFCBD5E1),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isVaultComplete ? const Color(0xFF15803D) : const Color(0xFF00236F),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                isVaultComplete
                    ? 'All required certificates attached! Application is ready for final submission.'
                    : 'All mandatory certificates must be in PDF format (.pdf) under 10 MB.',
                style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // --- Mandatory Document Tiles ---
        _documentTile(
          docType: 'SSLC_CERT',
          title: 'SSLC / 10th Standard Certificate (DOB & Name Proof)',
          subtitle: 'Authoritative Date of Birth & Parent Record (PDF, Max 10 MB)',
          isRequired: true,
        ),

        _documentTile(
          docType: 'PLUS_TWO_CERT',
          title: '+2 HSE Qualifying Examination Marksheet',
          subtitle: 'Marksheet with Register Number and aggregate score (PDF, Max 10 MB)',
          isRequired: true,
        ),

        _documentTile(
          docType: 'ALLOTMENT_MEMO',
          title: 'College Seat Allotment Memo Slip',
          subtitle: 'Official University allotment letter (PDF, Max 10 MB)',
          isRequired: true,
        ),

        _documentTile(
          docType: 'AADHAAR_CARD',
          title: 'Aadhaar Identification Card Copy',
          subtitle: 'Government UIDAI 12-digit identity proof (PDF, Max 10 MB)',
          isRequired: true,
        ),

        _documentTile(
          docType: 'BANK_PASSBOOK',
          title: 'Bank Passbook Front Page (DBT Account)',
          subtitle: 'Must show Account Number, Name, Branch and IFSC (PDF, Max 10 MB)',
          isRequired: true,
        ),

        _documentTile(
          docType: 'APAAR_CARD',
          title: 'APAAR / ABC ID Card (Academic Registry)',
          subtitle: 'Automated Permanent Academic Account Registry (PDF, Max 10 MB)',
          isRequired: true,
        ),

        // --- Conditional Document Tiles ---
        if (isCommunityQuota)
          _documentTile(
            docType: 'COMMUNITY_CERT',
            title: 'Community Quota Certificate',
            subtitle: 'Parish priest / competent authority certificate (PDF, Max 10 MB)',
            isRequired: true,
          ),

        if (_isEws)
          _documentTile(
            docType: 'INCOME_CERT',
            title: 'Revenue Village Income Certificate (EWS)',
            subtitle: 'Certifies annual family income < ₹1,00,000 for EWS (PDF, Max 10 MB)',
            isRequired: true,
          ),

        if (isReservedCaste)
          _documentTile(
            docType: 'CASTE_CERT',
            title: 'Caste Certificate ($_caste)',
            subtitle: 'Competent revenue authority caste certificate (PDF, Max 10 MB)',
            isRequired: true,
          ),
      ],
    );
  }

  // --- Reusable Document Card Tile ---
  Widget _documentTile({
    required String docType,
    required String title,
    required String subtitle,
    required bool isRequired,
  }) {
    final isUploaded = _isDocUploaded(docType);
    final fileName = _uploadedDocs[docType] ?? '';
    final canEdit = _isFieldEditable(docType);
    final flagRemark = _getFieldFlagRemark(docType);
    final hasValidationError = _fieldErrors.containsKey(docType);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: flagRemark != null
            ? const Color(0xFFFEF2F2)
            : hasValidationError
                ? const Color(0xFFFFF1F2)
                : isUploaded
                    ? const Color(0xFFF0FDF4)
                    : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: flagRemark != null
              ? const Color(0xFFFCA5A5)
              : hasValidationError
                  ? const Color(0xFFFDA4AF)
                  : isUploaded
                      ? const Color(0xFF86EFAC)
                      : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Office Flag Notice
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
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Office Re-upload Notice: $flagRemark',
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
                  color: isUploaded ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isUploaded ? Icons.picture_as_pdf : Icons.upload_file,
                  color: isUploaded ? const Color(0xFF15803D) : const Color(0xFF64748B),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: isRequired ? const Color(0xFFFFE4E6) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isRequired ? 'REQUIRED' : 'OPTIONAL',
                            style: TextStyle(
                              color: isRequired ? const Color(0xFFBE123C) : const Color(0xFF64748B),
                              fontSize: 8.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isUploaded ? '✓ Uploaded: $fileName' : subtitle,
                      style: TextStyle(
                        fontSize: 10.5,
                        color: isUploaded ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        fontWeight: isUploaded ? FontWeight.w600 : FontWeight.normal,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Upload Action Button
              ElevatedButton.icon(
                onPressed: canEdit ? () => _handleDocumentUpload(docType, title) : null,
                icon: Icon(
                  isUploaded ? Icons.refresh : Icons.file_upload_outlined,
                  size: 13,
                  color: isUploaded ? const Color(0xFF00236F) : Colors.white,
                ),
                label: Text(
                  isUploaded ? 'Replace' : 'Upload',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isUploaded ? const Color(0xFF00236F) : Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isUploaded ? const Color(0xFFF1F5F9) : const Color(0xFF00236F),
                  foregroundColor: isUploaded ? const Color(0xFF00236F) : Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: isUploaded ? 0 : 1,
                ),
              ),
            ],
          ),
        ],
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

  // --- Helper Text Form Field with Error Highlighting ---
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
    final validationError = _fieldErrors[keyName];
    final hasError = flagRemark != null || validationError != null;

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
                  color: hasError ? const Color(0xFFBA1A1A) : const Color(0xFF64748B),
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
          onChanged: (val) {
            if (_fieldErrors.containsKey(keyName)) {
              setState(() => _fieldErrors.remove(keyName));
            }
            if (onChanged != null) onChanged(val);
          },
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
                color: hasError ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
                width: hasError ? 1.5 : 1,
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
        if (validationError != null) ...[
          const SizedBox(height: 3),
          Text(
            validationError,
            style: const TextStyle(color: Color(0xFFDC2626), fontSize: 10, fontWeight: FontWeight.w600),
          ),
        ],
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

  // --- Stationary Bottom Navigation Bar ---
  Widget _buildBottomStickyBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              // Previous Button on Left
              if (_activeStep > 1) ...[
                Expanded(
                  flex: 3,
                  child: OutlinedButton(
                    onPressed: () => setState(() => _activeStep--),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Back', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
              ],

              // Next or Final Submit Button on Right
              Expanded(
                flex: 7,
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
}
