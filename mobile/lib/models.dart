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
  final String? religion;
  final String? caste;
  final double? annualIncome;
  final bool isEws;
  final String? prevInstitutionName;
  final String? prevCourse;
  final String? prevRegisterNumber;
  final double? prevPercentage;
  final String? bankAccountName;
  final String? bankName;
  final String? bankAccountNumber;
  final String? bankIfscCode;
  final String? apaarId;
  final String verificationStatus;
  final Map<String, dynamic> fieldFlags;
  final String? photoUrl;

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
    this.religion,
    this.caste,
    this.annualIncome,
    required this.isEws,
    this.prevInstitutionName,
    this.prevCourse,
    this.prevRegisterNumber,
    this.prevPercentage,
    this.bankAccountName,
    this.bankName,
    this.bankAccountNumber,
    this.bankIfscCode,
    this.apaarId,
    required this.verificationStatus,
    required this.fieldFlags,
    this.photoUrl,
  });

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    String? photo;
    if (json['documents'] != null) {
      final docs = json['documents'] as List;
      for (var d in docs) {
        if (d['type'] == 'PROFILE_PHOTO') {
          photo = d['fileUrl'];
          break;
        }
      }
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
      religion: json['religion'],
      caste: json['caste'],
      annualIncome: json['annualIncome'] != null ? (json['annualIncome'] as num).toDouble() : null,
      isEws: json['isEws'] ?? false,
      prevInstitutionName: json['prevInstitutionName'],
      prevCourse: json['prevCourse'],
      prevRegisterNumber: json['prevRegisterNumber'],
      prevPercentage: json['prevPercentage'] != null ? (json['prevPercentage'] as num).toDouble() : null,
      bankAccountName: json['bankAccountName'],
      bankName: json['bankName'],
      bankAccountNumber: json['bankAccountNumber'],
      bankIfscCode: json['bankIfscCode'],
      apaarId: json['apaarId'],
      verificationStatus: json['verificationStatus'] ?? 'DRAFT',
      fieldFlags: json['fieldFlags'] is Map ? json['fieldFlags'] : {},
      photoUrl: photo,
    );
  }
}
