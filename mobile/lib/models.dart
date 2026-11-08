import 'dart:convert';

class StudentDocument {
  final String id;
  final String type;
  final String fileName;
  final String fileUrl;
  final String verificationStatus;
  final String? rejectionReason;

  StudentDocument({
    required this.id,
    required this.type,
    required this.fileName,
    required this.fileUrl,
    required this.verificationStatus,
    this.rejectionReason,
  });

  factory StudentDocument.fromJson(Map<String, dynamic> json) {
    return StudentDocument(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      fileName: json['fileName'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      verificationStatus: json['verificationStatus'] ?? 'PENDING',
      rejectionReason: json['rejectionReason'],
    );
  }
}

class StudentProfile {
  final String id;
  final String firstName;
  final String lastName;
  final String? firstNameMalayalam;
  final String? lastNameMalayalam;
  final String admissionNumber;
  final String address;
  final String? permanentAddress;
  final String bloodGroup;
  final String timePeriodOfStudy;
  final String? courseAdmitted;
  final String? quota;
  final String? gender;
  final String? dob;
  final String? nationality;
  final String? religion;
  final String? caste;
  final double? annualIncome;
  final bool isEws;
  final String? parentName;
  final String? parentOccupation;
  final String? fatherName;
  final String? fatherOccupation;
  final String? motherName;
  final String? motherOccupation;
  final String? guardianName;
  final String? guardianOccupation;
  final String? prevInstitutionName;
  final String? prevCourse;
  final String? prevRegisterNumber;
  final String? prevBoardUniversity;
  final String? prevPeriodOfStudy;
  final double? prevPercentage;
  final String? bankAccountName;
  final String? bankName;
  final String? bankBranch;
  final String? bankAccountNumber;
  final String? bankIfscCode;
  final String? apaarId;
  final String? aadhaarNumber;
  final String verificationStatus;
  final Map<String, dynamic> fieldFlags;
  final String? photoUrl;
  final List<StudentDocument> documents;

  StudentProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.firstNameMalayalam,
    this.lastNameMalayalam,
    required this.admissionNumber,
    required this.address,
    this.permanentAddress,
    required this.bloodGroup,
    required this.timePeriodOfStudy,
    this.courseAdmitted,
    this.quota,
    this.gender,
    this.dob,
    this.nationality,
    this.religion,
    this.caste,
    this.annualIncome,
    required this.isEws,
    this.parentName,
    this.parentOccupation,
    this.fatherName,
    this.fatherOccupation,
    this.motherName,
    this.motherOccupation,
    this.guardianName,
    this.guardianOccupation,
    this.prevInstitutionName,
    this.prevCourse,
    this.prevRegisterNumber,
    this.prevBoardUniversity,
    this.prevPeriodOfStudy,
    this.prevPercentage,
    this.bankAccountName,
    this.bankName,
    this.bankBranch,
    this.bankAccountNumber,
    this.bankIfscCode,
    this.apaarId,
    this.aadhaarNumber,
    required this.verificationStatus,
    required this.fieldFlags,
    this.photoUrl,
    this.documents = const [],
  });

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    String? photo;
    final List<StudentDocument> docList = [];
    if (json['documents'] != null && json['documents'] is List) {
      final docs = json['documents'] as List;
      for (var d in docs) {
        final doc = StudentDocument.fromJson(d);
        docList.add(doc);
        if (doc.type == 'PROFILE_PHOTO' || doc.type == 'photo') {
          photo = doc.fileUrl;
        }
      }
    }

    Map<String, dynamic> parsedFlags = {};
    if (json['fieldFlags'] is Map) {
      parsedFlags = Map<String, dynamic>.from(json['fieldFlags']);
    } else if (json['fieldFlags'] is String && (json['fieldFlags'] as String).trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(json['fieldFlags']);
        if (decoded is Map) {
          parsedFlags = Map<String, dynamic>.from(decoded);
        }
      } catch (_) {}
    }

    return StudentProfile(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      firstNameMalayalam: json['firstNameMalayalam'],
      lastNameMalayalam: json['lastNameMalayalam'],
      admissionNumber: json['admissionNumber'] ?? '',
      address: json['address'] ?? '',
      permanentAddress: json['permanentAddress'],
      bloodGroup: json['bloodGroup'] ?? 'O+',
      timePeriodOfStudy: json['timePeriodOfStudy'] ?? '2024-2028',
      courseAdmitted: json['courseAdmitted'],
      quota: json['quota'],
      gender: json['gender'],
      dob: json['dob'],
      nationality: json['nationality'] ?? 'Indian',
      religion: json['religion'],
      caste: json['caste'],
      annualIncome: json['annualIncome'] != null ? (json['annualIncome'] as num).toDouble() : null,
      isEws: json['isEws'] ?? false,
      parentName: json['parentName'],
      parentOccupation: json['parentOccupation'],
      fatherName: json['fatherName'],
      fatherOccupation: json['fatherOccupation'],
      motherName: json['motherName'],
      motherOccupation: json['motherOccupation'],
      guardianName: json['guardianName'],
      guardianOccupation: json['guardianOccupation'],
      prevInstitutionName: json['prevInstitutionName'],
      prevCourse: json['prevCourse'],
      prevRegisterNumber: json['prevRegisterNumber'],
      prevBoardUniversity: json['prevBoardUniversity'],
      prevPeriodOfStudy: json['prevPeriodOfStudy'],
      prevPercentage: json['prevPercentage'] != null ? (json['prevPercentage'] as num).toDouble() : null,
      bankAccountName: json['bankAccountName'],
      bankName: json['bankName'],
      bankBranch: json['bankBranch'],
      bankAccountNumber: json['bankAccountNumber'],
      bankIfscCode: json['bankIfscCode'],
      apaarId: json['apaarId'],
      aadhaarNumber: json['aadhaarNumber'],
      verificationStatus: json['verificationStatus'] ?? 'DRAFT',
      fieldFlags: parsedFlags,
      photoUrl: photo ?? json['photoUrl'],
      documents: docList,
    );
  }
}
