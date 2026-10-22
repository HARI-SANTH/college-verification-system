export type Role = 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';

export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'CORRECTION_REQUIRED' | 'VERIFIED';

export type DocumentType =
  | 'PROFILE_PHOTO'
  | 'PLUS_TWO_CERTIFICATE'
  | 'SSLC_CERTIFICATE'
  | 'ALLOTMENT_MEMO'
  | 'CASTE_CERTIFICATE'
  | 'INCOME_CERTIFICATE'
  | 'COMMUNITY_CERTIFICATE'
  | 'BANK_PASSBOOK'
  | 'APAAR_DOCUMENT';

export interface FieldFlagDetail {
  status: 'FLAGGED_ERROR' | 'VALID';
  reason?: string;
  flaggedAt?: string;
}

export interface StudentDocument {
  id: string;
  studentProfileId: string;
  type: DocumentType;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileMimeType: string;
  fileSize: number;
  status: string;
  flagReason?: string | null;
  uploadedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  address: string;
  bloodGroup: string;
  timePeriodOfStudy: string;

  firstNameMalayalam?: string | null;
  lastNameMalayalam?: string | null;
  permanentAddress?: string | null;
  courseAdmitted?: string | null;
  quota?: string | null;
  gender?: string | null;
  dob?: string | null;
  nationality?: string | null;
  religion?: string | null;
  caste?: string | null;
  annualIncome?: number | null;
  isEws: boolean;

  parentName?: string | null;
  parentOccupation?: string | null;
  guardianName?: string | null;
  guardianOccupation?: string | null;

  bankAccountName?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;

  prevInstitutionName?: string | null;
  prevCourse?: string | null;
  prevRegisterNumber?: string | null;
  prevBoardUniversity?: string | null;
  prevPeriodOfStudy?: string | null;
  prevPercentage?: number | null;

  apaarId?: string | null;

  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  verifiedByAdminId?: string | null;

  fieldFlags: Record<string, FieldFlagDetail>;
  documents?: StudentDocument[];
  user?: {
    id: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  };
}

export interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    role: Role;
    studentProfile?: StudentProfile | null;
  } | null;
}
