import React, { useState, useEffect, useRef } from 'react';
import { StudentProfile, StudentDocument, AIVerificationSummary } from '../../types';
import { api } from '../../services/api';

interface Props {
  student: StudentProfile;
  remainingCount: number;
  onBackToQueue: () => void;
  onStudentUpdated: () => void;
}

// Comprehensive preset error reasons for all fields and documents
const FIELD_PRESET_MAP: Record<string, Array<{ id: string; label: string; text: string }>> = {
  // Identity & Names
  fullName: [
    { id: 'NAME_MISMATCH', label: 'Name spelling mismatch with 10th/12th certificate', text: 'Candidate legal name spelling does not match the official secondary school certificate.' },
    { id: 'NAME_AADHAAR', label: 'Name does not match Aadhaar card', text: 'Candidate legal name does not match the name printed on the Aadhaar identification card.' },
  ],
  nameMalayalam: [
    { id: 'MALAYALAM_SPELLING', label: 'Malayalam name spelling error', text: 'Candidate name in Malayalam contains typographical/spelling errors.' },
    { id: 'MALAYALAM_SSLC_MISMATCH', label: 'Malayalam name does not match SSLC certificate', text: 'Candidate name in Malayalam does not match the Malayalam name recorded in the Kerala SSLC certificate (പേര്).' },
  ],
  dob: [
    { id: 'DOB_MISMATCH', label: 'Date of birth differs from 10th certificate', text: 'Date of birth does not match the date recorded in the official SSLC / 10th standard certificate.' },
  ],
  gender: [
    { id: 'GENDER_MISMATCH', label: 'Gender mismatch with records', text: 'Selected gender does not match identity credentials.' },
  ],
  bloodGroup: [
    { id: 'BLOOD_GROUP', label: 'Invalid blood group entered', text: 'Please verify and enter valid certified blood group.' },
  ],
  nationality: [
    { id: 'NATIONALITY', label: 'Nationality proof required', text: 'Please provide valid proof of nationality / citizenship.' },
  ],
  phoneNumber: [
    { id: 'PHONE_INVALID', label: 'Invalid contact mobile number', text: 'Please provide an active and reachable 10-digit mobile number for official communication.' },
  ],
  email: [
    { id: 'EMAIL_INVALID', label: 'Invalid email address', text: 'Please provide a valid and active personal email address.' },
  ],
  aadhaarNumber: [
    { id: 'AADHAAR_INVALID', label: 'Aadhaar number invalid / incomplete', text: 'Aadhaar number must be a valid 12-digit UID.' },
    { id: 'AADHAAR_MISMATCH', label: 'Aadhaar number does not match uploaded copy', text: 'Entered Aadhaar number does not match the number on the uploaded Aadhaar card scan.' },
  ],
  apaarId: [
    { id: 'APAAR_INVALID', label: 'APAAR / ABC ID invalid', text: 'Please provide a valid 12-digit APAAR (Automated Permanent Academic Account Registry) ID.' },
    { id: 'APAAR_MISMATCH', label: 'APAAR ID does not match card', text: 'APAAR ID does not match the uploaded APAAR/ABC card.' },
  ],
  address: [
    { id: 'COMM_ADDRESS', label: 'Incomplete communication address', text: 'Communication address is incomplete or missing valid 6-digit postal PIN code.' },
  ],
  permanentAddress: [
    { id: 'PERM_ADDRESS', label: 'Incomplete permanent address', text: 'Permanent residential address is incomplete or missing valid 6-digit postal PIN code.' },
  ],

  // Parent & Guardian Details
  fatherName: [
    { id: 'FATHER_MISMATCH', label: 'Father\'s name mismatch with 10th certificate', text: 'Father\'s name spelling does not match the SSLC / 10th certificate records.' },
  ],
  fatherOccupation: [
    { id: 'FATHER_OCCUPATION', label: 'Father\'s occupation missing/unspecified', text: 'Please specify father\'s exact employment/occupation.' },
  ],
  motherName: [
    { id: 'MOTHER_MISMATCH', label: 'Mother\'s name mismatch with records', text: 'Mother\'s name does not match official records.' },
  ],
  motherOccupation: [
    { id: 'MOTHER_OCCUPATION', label: 'Mother\'s occupation missing/unspecified', text: 'Please specify mother\'s employment/occupation.' },
  ],
  guardianName: [
    { id: 'GUARDIAN_DETAILS', label: 'Guardian details incomplete', text: 'Please provide valid guardian legal relationship and contact details.' },
  ],

  // Academic Details
  prevRegisterNumber: [
    { id: 'REG_MISMATCH', label: 'Register number does not match marksheet', text: 'Qualifying HSE examination register number does not match the uploaded marksheet.' },
  ],
  prevBoardUniversity: [
    { id: 'BOARD_MISMATCH', label: 'Incorrect examination board selected', text: 'Qualifying examination board does not match certificate issuer.' },
  ],
  prevPercentage: [
    { id: 'MARKS_MISMATCH', label: 'Marks/percentage do not tally with marksheet', text: 'Entered marks / percentage aggregate do not tally with official marksheet scores.' },
  ],
  prevInstitutionName: [
    { id: 'SCHOOL_MISMATCH', label: 'School last attended mismatch', text: 'School last attended does not match transfer / qualifying certificate.' },
  ],
  prevCourse: [
    { id: 'STREAM_MISMATCH', label: 'Stream / group mismatch', text: 'Plus Two stream does not match the group mentioned on the marksheet.' },
  ],
  prevPeriodOfStudy: [
    { id: 'PERIOD_MISMATCH', label: 'Academic period of study mismatch', text: 'Period of study years do not match examination passout session.' },
  ],

  // Quota & Socio-Economic Details
  courseAdmitted: [
    { id: 'COURSE_MISMATCH', label: 'Course admitted mismatch with memo', text: 'Admitted UG degree program does not match official allotment memo.' },
  ],
  admissionNumber: [
    { id: 'ADM_NO_INVALID', label: 'Admission number invalid / mismatch', text: 'College admission roll number does not match allotment memo record.' },
  ],
  timePeriodOfStudy: [
    { id: 'BATCH_INVALID', label: 'Academic batch year incorrect', text: 'Academic batch period of study does not correspond to the current admission cycle.' },
  ],
  quota: [
    { id: 'QUOTA_INELIGIBLE', label: 'Ineligible for selected quota', text: 'Uploaded documents do not substantiate eligibility for this admission quota.' },
    { id: 'QUOTA_PROOF_MISSING', label: 'Supporting quota certificate missing', text: 'Required quota verification document has not been uploaded.' },
  ],
  religion: [
    { id: 'RELIGION_MISMATCH', label: 'Religion does not match school record', text: 'Religion / community entered differs from official certificate records.' },
  ],
  caste: [
    { id: 'CASTE_CERT_REQUIRED', label: 'Valid community / caste certificate required', text: 'Official Tahsildar / Village Officer caste certificate required for reservation validation.' },
  ],
  annualIncome: [
    { id: 'INCOME_MISMATCH', label: 'Income does not match income certificate', text: 'Annual family income does not match the official Revenue Department income certificate.' },
  ],
  isEws: [
    { id: 'EWS_INELIGIBLE', label: 'EWS certificate required', text: 'EWS category requires an authenticated Economically Weaker Section certificate.' },
  ],

  // Bank Details
  bankName: [
    { id: 'BANK_NAME', label: 'Bank name missing or incorrect', text: 'Please specify the exact Scheduled Commercial Bank name.' },
  ],
  bankBranch: [
    { id: 'BRANCH_INVALID', label: 'Bank branch missing or incorrect', text: 'Please specify the exact branch of your bank as printed on the passbook.' },
  ],
  bankAccountName: [
    { id: 'BANK_HOLDER', label: 'Account holder name mismatch', text: 'Bank account holder name must match candidate\'s legal name.' },
  ],
  bankAccountNumber: [
    { id: 'ACCOUNT_INVALID', label: 'Bank account number invalid', text: 'Bank account number is invalid or does not match the uploaded passbook.' },
  ],
  bankIfscCode: [
    { id: 'IFSC_INVALID', label: 'Bank IFSC code invalid', text: 'IFSC code must be an 11-character valid code (e.g. SBIN0001234).' },
  ],

  // Document Specific Flags
  PLUS_TWO_CERTIFICATE: [
    { id: 'PLUS_TWO_BLURRY', label: 'Plus Two marksheet scan is blurry / unreadable', text: 'Uploaded Plus Two marksheet scan is blurry or cropped. Please re-upload flat high-resolution scan.' },
    { id: 'PLUS_TWO_MISMATCH', label: 'Marksheet does not match entered data', text: 'Uploaded marksheet does not match student profile scores.' },
  ],
  SSLC_CERTIFICATE: [
    { id: 'SSLC_BLURRY', label: 'SSLC book scan is illegible', text: 'Uploaded SSLC / 10th certificate is illegible. Please re-upload clear scan showing Date of Birth.' },
  ],
  AADHAAR_CARD: [
    { id: 'AADHAAR_BLURRY', label: 'Aadhaar card copy is blurry / unreadable', text: 'Uploaded Aadhaar card copy is blurry or masked improperly. Please re-upload clean copy.' },
  ],
  ALLOTMENT_MEMO: [
    { id: 'MEMO_EXPIRED', label: 'Allotment memo invalid or expired', text: 'Please upload the latest official allotment memo slip for this program.' },
  ],
  APAAR_DOCUMENT: [
    { id: 'APAAR_DOC_BLURRY', label: 'APAAR document is illegible', text: 'Uploaded APAAR / ABC ID card scan is blurry or unverified.' },
  ],
  BANK_PASSBOOK: [
    { id: 'PASSBOOK_BLURRY', label: 'Bank passbook first page is illegible', text: 'Uploaded bank passbook first page must clearly show Account Number, Name, and IFSC.' },
  ],
  COMMUNITY_CERTIFICATE: [
    { id: 'COMMUNITY_INVALID', label: 'Invalid / Expired Community Certificate', text: 'Community Certificate is invalid or expired. Re-upload official parish / authority certificate.' },
    { id: 'COMMUNITY_SEAL', label: 'Missing official seal or signature', text: 'Community certificate is missing competent authority seal or signature.' },
  ],
  INCOME_CERTIFICATE: [
    { id: 'INCOME_EXPIRED', label: 'Income certificate is expired', text: 'Revenue Department income certificate must be valid for the current financial year.' },
  ],
  CASTE_CERTIFICATE: [
    { id: 'CASTE_INVALID', label: 'Caste certificate unverified', text: 'Caste certificate must be issued by competent Revenue authority (Tahsildar / Village Officer).' },
  ],
  PROFILE_PHOTO: [
    { id: 'PHOTO_INVALID', label: 'Photo does not meet passport standards', text: 'Please upload a formal color passport-size photograph with white/light background.' },
  ],
};

// Field to authoritative verification document mapping
export const FIELD_TO_DOC_MAP: Record<string, { type: string; label: string }> = {
  // Identity & Names
  fullName: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
  nameMalayalam: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
  dob: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
  gender: { type: 'AADHAAR_CARD', label: 'Aadhaar Card Copy' },
  aadhaarNumber: { type: 'AADHAAR_CARD', label: 'Aadhaar Card Copy' },
  apaarId: { type: 'APAAR_DOCUMENT', label: 'APAAR / ABC ID Card' },
  permanentAddress: { type: 'AADHAAR_CARD', label: 'Aadhaar Card Copy' },
  address: { type: 'AADHAAR_CARD', label: 'Aadhaar Card Copy' },

  // Parents / Guardians (Recorded on Kerala SSLC book)
  fatherName: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
  motherName: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
  guardianName: { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },

  // Academic / Plus Two
  prevBoardUniversity: { type: 'PLUS_TWO_CERTIFICATE', label: '+2 / HSE Marksheet' },
  prevRegisterNumber: { type: 'PLUS_TWO_CERTIFICATE', label: '+2 / HSE Marksheet' },
  prevPercentage: { type: 'PLUS_TWO_CERTIFICATE', label: '+2 / HSE Marksheet' },
  prevCourse: { type: 'PLUS_TWO_CERTIFICATE', label: '+2 / HSE Marksheet' },
  prevInstitutionName: { type: 'PLUS_TWO_CERTIFICATE', label: '+2 / HSE Marksheet' },

  // Admission / Quota / Reservation
  courseAdmitted: { type: 'ALLOTMENT_MEMO', label: 'Allotment Memo Slip' },
  admissionNumber: { type: 'ALLOTMENT_MEMO', label: 'Allotment Memo Slip' },
  quota: { type: 'ALLOTMENT_MEMO', label: 'Allotment Memo Slip' },
  religion: { type: 'CASTE_CERTIFICATE', label: 'Caste Certificate' },
  caste: { type: 'CASTE_CERTIFICATE', label: 'Caste Certificate' },
  annualIncome: { type: 'INCOME_CERTIFICATE', label: 'Income Certificate' },
  isEws: { type: 'INCOME_CERTIFICATE', label: 'Income Certificate' },

  // Banking & Passbook
  bankAccountName: { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
  bankName: { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
  bankAccountNumber: { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
  bankIfscCode: { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
  bankBranch: { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
};

const calculateAge = (dobString?: string | null): number | null => {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const SideBySideInspector: React.FC<Props> = ({
  student,
  remainingCount,
  onBackToQueue,
  onStudentUpdated,
}) => {
  // Document viewer states (Pan & Zoom engine)
  const [activeDocType, setActiveDocType] = useState<string>('AADHAAR_CARD');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetZoomAndPan = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Global window listeners for drag-to-pan smoothness
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomStep = e.deltaY < 0 ? 15 : -15;
    setZoomLevel((prev) => Math.min(350, Math.max(50, prev + zoomStep)));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary/left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  // Staged discrepancy flags
  const [stagedFlags, setStagedFlags] = useState<Array<{ key: string; reason: string }>>([]);
  const [showFlagDrawer, setShowFlagDrawer] = useState<boolean>(false);
  const [customFlagReason, setCustomFlagReason] = useState<string>('');
  const [customFlagKey, setCustomFlagKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Verification Copilot state
  const [aiAudit, setAiAudit] = useState<AIVerificationSummary | null>(null);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);

  // Modal state for field-level flagging
  const [activeFieldModal, setActiveFieldModal] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [modalReason, setModalReason] = useState<string>('');
  const [alsoFlagDocument, setAlsoFlagDocument] = useState<boolean>(true);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Auto-docking HUD text
  const [autoDockedLabel, setAutoDockedLabel] = useState<string>('Aadhaar Identification Card');

  const isCommunityQuota = (student.quota || '').toLowerCase().includes('community');

  // Find document by type or alias
  const getDocumentForType = (type: string): StudentDocument | undefined => {
    return student.documents?.find((d) => {
      const docTypeStr = d.type as string;
      if (docTypeStr === type) return true;
      if (type === 'PLUS_TWO_CERTIFICATE' && docTypeStr === 'PLUS_TWO_CERT') return true;
      if (type === 'SSLC_CERTIFICATE' && docTypeStr === 'SSLC_CERT') return true;
      if (type === 'AADHAAR_CARD' && (docTypeStr === 'AADHAAR_DOCUMENT' || docTypeStr === 'aadhaar')) return true;
      if (type === 'COMMUNITY_CERTIFICATE' && docTypeStr === 'COMMUNITY_CERT') return true;
      if (type === 'INCOME_CERTIFICATE' && docTypeStr === 'INCOME_CERT') return true;
      if (type === 'CASTE_CERTIFICATE' && docTypeStr === 'CASTE_CERT') return true;
      if (type === 'APAAR_DOCUMENT' && (docTypeStr === 'APAAR_CARD' || docTypeStr === 'APAAR')) return true;
      if (type === 'ALLOTMENT_MEMO' && docTypeStr === 'ALLOTMENT') return true;
      if (type === 'BANK_PASSBOOK' && docTypeStr === 'BANK_PASSBOOK_COPY') return true;
      return false;
    });
  };

  const activeDoc = getDocumentForType(activeDocType);
  const isPdf = Boolean(
    activeDoc && (
      (activeDoc.fileMimeType && activeDoc.fileMimeType.toLowerCase().includes('pdf')) ||
      (activeDoc.fileName && activeDoc.fileName.toLowerCase().endsWith('.pdf'))
    )
  );

  // Auto-select initial available document
  useEffect(() => {
    if (student.documents && student.documents.length > 0) {
      const preferred = [
        'AADHAAR_CARD',
        'SSLC_CERTIFICATE',
        'PLUS_TWO_CERTIFICATE',
        'ALLOTMENT_MEMO',
        'COMMUNITY_CERTIFICATE',
        'BANK_PASSBOOK',
        'APAAR_DOCUMENT',
      ];
      for (const pref of preferred) {
        if (getDocumentForType(pref)) {
          setActiveDocType(pref);
          const found = ALL_DOCUMENTS.find((d) => d.type === pref);
          if (found) setAutoDockedLabel(found.label);
          break;
        }
      }
    }
  }, [student.id]);

  // Load AI Multimodal Audit
  const loadAiAudit = async (force = false) => {
    setIsAiScanning(true);
    try {
      const summary = await api.aiVerifyStudent(student.id, force);
      setAiAudit(summary);
    } catch (err: any) {
      console.warn('[AI Verify Error]', err.message);
    } finally {
      setIsAiScanning(false);
    }
  };

  useEffect(() => {
    loadAiAudit(false);
  }, [student.id]);

  const stageAllAiFlags = () => {
    if (!aiAudit?.suggestedFlags) return;
    setStagedFlags((prev) => {
      const existingKeys = new Set(prev.map((f) => f.key));
      const additions: Array<{ key: string; reason: string }> = [];

      for (const item of aiAudit.suggestedFlags) {
        if (!existingKeys.has(item.key)) {
          additions.push(item);
          existingKeys.add(item.key);
        }
        // Also auto-stage the linked document for re-upload if available
        const linkedDoc = FIELD_TO_DOC_MAP[item.key];
        if (linkedDoc && !existingKeys.has(linkedDoc.type)) {
          additions.push({
            key: linkedDoc.type,
            reason: `Re-upload required: AI identified error in ${item.key} (${item.reason}). Please upload official copy of ${linkedDoc.label}.`,
          });
          existingKeys.add(linkedDoc.type);
        }
      }

      return [...prev, ...additions];
    });
    setShowFlagDrawer(true);
    setToastMessage(`✓ Staged ${aiAudit.suggestedFlags.length} AI error flags + linked document re-uploads!`);
  };

  // Handle auto-docking when focusing a section on the right
  const triggerAutoDock = (docType: string, label: string) => {
    setActiveDocType(docType);
    setAutoDockedLabel(label);
    resetZoomAndPan();
  };

  // Open the field flag modal
  const openFieldFlagModal = (key: string, label: string) => {
    const existing = stagedFlags.find((f) => f.key === key);
    setActiveFieldModal({ key, label });
    setAlsoFlagDocument(true);
    if (existing) {
      setModalReason(existing.reason);
    } else {
      const presets = FIELD_PRESET_MAP[key] || [];
      setModalReason(presets.length > 0 ? presets[0].text : '');
    }
  };

  const handleStageFieldFlag = (key: string, reason: string) => {
    setStagedFlags((prev) => {
      const filtered = prev.filter((f) => f.key !== key);
      return [...filtered, { key, reason }];
    });
  };

  const handleRemoveFlag = (key: string) => {
    setStagedFlags((prev) => prev.filter((f) => f.key !== key));
  };

  // Global presets at bottom
  const GLOBAL_PRESETS = [
    { key: 'PLUS_TWO_CERTIFICATE', label: 'Marks mismatch with qualifying certificate', reason: 'Mark mismatch: Candidate entered scores do not tally with official marksheet.' },
    { key: 'AADHAAR_CARD', label: 'Aadhaar name or number mismatch', reason: 'Aadhaar Name mismatch: Name on Aadhaar does not match secondary school record.' },
    { key: 'SCAN_QUALITY', label: 'Uploaded scan is blurry or unreadable', reason: 'Blurry scan: Certificate scan is illegible. Please re-upload a clear flat scan.' },
    { key: 'COMMUNITY_CERTIFICATE', label: 'Invalid / Expired Community Certificate', reason: 'Community Certificate invalid: Please re-upload official Tahsildar / Village officer attested certificate.' },
    { key: 'INCOME_CERTIFICATE', label: 'Income Certificate mismatch', reason: 'Income certificate does not match entered annual income.' },
    { key: 'BANK_PASSBOOK', label: 'Bank details or IFSC mismatch', reason: 'Bank account number or IFSC code does not match uploaded passbook copy.' },
  ];

  const toggleGlobalPreset = (preset: { key: string; reason: string }) => {
    if (stagedFlags.some((f) => f.key === preset.key)) {
      setStagedFlags((prev) => prev.filter((f) => f.key !== preset.key));
    } else {
      setStagedFlags((prev) => [...prev, preset]);
    }
  };

  const handleAddCustomRemark = () => {
    if (!customFlagReason.trim()) return;
    const key = customFlagKey.trim() || 'GENERAL_REMARK';
    handleStageFieldFlag(key, customFlagReason.trim());
    setCustomFlagReason('');
    setCustomFlagKey('');
  };

  // Delete Duplicate / Purge Student Action
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Duplicate Entry / Registered Twice');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      await api.deleteStudent(student.id, deleteReason);
      setToastMessage(`✓ Student ${student.firstName} ${student.lastName} (${student.admissionNumber}) deleted successfully.`);
      setShowDeleteModal(false);
      setTimeout(() => {
        onStudentUpdated();
        onBackToQueue();
      }, 700);
    } catch (err: any) {
      alert(`Delete error: ${err.message || 'Failed to delete student record'}`);
      setIsDeleting(false);
    }
  };

  // Approve action
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await api.verifyStudent(student.id);
      setToastMessage('✓ Student approved successfully! Returning to queue...');
      setTimeout(() => {
        onStudentUpdated();
        onBackToQueue();
      }, 700);
    } catch (err: any) {
      alert(`Approval error: ${err.message || 'Failed to verify student'}`);
      setIsSubmitting(false);
    }
  };

  // Flag & Send Notice action
  const handleSendNotice = async () => {
    if (stagedFlags.length === 0) {
      alert('Please flag at least one field or select an error notice before sending.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.flagMistakes(student.id, stagedFlags);
      setToastMessage('⚠ Error notice dispatched to student mobile app! Returning to queue...');
      setTimeout(() => {
        onStudentUpdated();
        onBackToQueue();
      }, 700);
    } catch (err: any) {
      alert(`Flagging error: ${err.message || 'Failed to send error notice'}`);
      setIsSubmitting(false);
    }
  };

  // Check if candidate corrected any field
  const previouslyFlaggedKeys =
    student.fieldFlags && typeof student.fieldFlags === 'object'
      ? Object.keys(student.fieldFlags)
      : [];
  const isResubmission =
    (student.verificationStatus === 'SUBMITTED' || student.verificationStatus === 'DRAFT') &&
    (Boolean(student.isResubmission) || previouslyFlaggedKeys.length > 0);

  // Stream preview URL
  const getPreviewUrl = (doc?: StudentDocument) => {
    if (!doc) return null;
    if (doc.fileUrl) return doc.fileUrl;
    return `/api/admin/documents/${doc.id}/preview`;
  };

  const photoDoc = student.documents?.find((d) => d.type === 'PROFILE_PHOTO');
  const photoUrl = photoDoc?.fileUrl || (photoDoc ? `/api/admin/documents/${photoDoc.id}/preview` : null);

  // Field renderer with inline flag button and state
  const renderField = ({
    fieldKey,
    label,
    value,
    copyable = false,
  }: {
    fieldKey: string;
    label: string;
    value: React.ReactNode;
    copyable?: boolean;
  }) => {
    const staged = stagedFlags.find((f) => f.key === fieldKey);
    const existing = student.fieldFlags && (student.fieldFlags as any)[fieldKey];
    const isPreviouslyFlagged = existing && existing.status === 'FLAGGED_ERROR';
    const isResolved = existing && existing.status === 'RESOLVED';

    return (
      <div
        className={`p-3 rounded-xl border transition-all ${
          staged
            ? 'bg-red-50/70 border-red-300 shadow-xs'
            : isPreviouslyFlagged
            ? 'bg-amber-50/50 border-amber-300'
            : isResolved
            ? 'bg-teal-50/60 border-teal-300'
            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block truncate">
                {label}
              </span>
              {isResolved && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[10px]">check</span>
                  Corrected by Student
                </span>
              )}
              {(() => {
                const linked = FIELD_TO_DOC_MAP[fieldKey];
                if (!linked) return null;
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerAutoDock(linked.type, linked.label);
                    }}
                    className="text-[9px] font-semibold text-slate-500 hover:text-blue-700 bg-white hover:bg-blue-50 px-1 py-0.5 rounded border border-slate-200 flex items-center gap-0.5 transition-colors shrink-0"
                    title={`Auto-dock to ${linked.label}`}
                  >
                    <span className="material-symbols-outlined text-[10px]">dock_to_right</span>
                    <span>{linked.label.replace(' Copy', '').replace(' Slip', '')}</span>
                  </button>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-slate-900 text-xs truncate">
                {value || <span className="text-slate-400 font-normal">Not Provided</span>}
              </span>
              {copyable && typeof value === 'string' && value && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(value);
                  }}
                  className="text-slate-400 hover:text-[#1e3a8a]"
                  title={`Copy ${label}`}
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              )}
            </div>

            {/* AI Field-Level Match & Error Insight */}
            {(() => {
              const aiField = aiAudit?.fieldResults?.find((f) => f.fieldKey === fieldKey);
              if (!aiField) return null;

              if (aiField.colorStatus === 'GREEN') {
                return (
                  <div
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-fit"
                    title={aiField.note || `Matched with document (${aiField.confidence}% confidence)`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-teal-600">verified</span>
                    <span>AI Match ({aiField.confidence}%)</span>
                  </div>
                );
              }

              if (aiField.colorStatus === 'RED') {
                return (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-red-800 bg-red-100/90 px-2 py-1 rounded border border-red-300 w-fit flex-wrap">
                    <span className="material-symbols-outlined text-[13px] text-red-600">error</span>
                    <span>AI Error Flag: Doc reads &quot;{aiField.documentValue}&quot;</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFieldFlagModal(fieldKey, label);
                        if (aiField.suggestedReason || aiField.note) {
                          setModalReason(aiField.suggestedReason || aiField.note || '');
                        }
                      }}
                      className="underline text-red-700 hover:text-red-900 font-bold ml-1"
                    >
                      Use AI Notice
                    </button>
                  </div>
                );
              }

              return (
                <div
                  className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-800 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit"
                  title={aiField.note || 'Review document manually'}
                >
                  <span className="material-symbols-outlined text-[13px] text-amber-600">info</span>
                  <span>AI Note: {aiField.note || 'Check scan'}</span>
                </div>
              );
            })()}
          </div>

          {/* Interactive Flag Button for this field */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFieldFlagModal(fieldKey, label);
            }}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all shrink-0 ${
              staged
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title={`Flag error for ${label}`}
          >
            <span className="material-symbols-outlined text-sm">flag</span>
            <span className="hidden sm:inline">{staged ? 'Flagged' : 'Flag'}</span>
          </button>
        </div>

        {/* Display staged notice if flagged */}
        {staged && (
          <div className="mt-2 pt-2 border-t border-red-200/80 flex items-center justify-between text-[11px] text-red-900 bg-red-100/60 px-2 py-1 rounded">
            <span className="flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-xs text-red-600 shrink-0">error</span>
              <span className="truncate font-semibold">{staged.reason}</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFlag(fieldKey);
              }}
              className="text-red-700 hover:text-red-900 font-bold ml-2 shrink-0"
              title="Remove flag"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  // List of all document specifications
  const ALL_DOCUMENTS = [
    { type: 'PLUS_TWO_CERTIFICATE', label: '+2 HSE Marksheet' },
    { type: 'SSLC_CERTIFICATE', label: 'SSLC 10th Book' },
    { type: 'AADHAAR_CARD', label: 'Aadhaar Card Copy' },
    { type: 'ALLOTMENT_MEMO', label: 'Allotment Memo Slip' },
    { type: 'APAAR_DOCUMENT', label: 'APAAR / ABC ID Card' },
    { type: 'BANK_PASSBOOK', label: 'Bank Passbook Copy' },
    ...(isCommunityQuota ? [{ type: 'COMMUNITY_CERTIFICATE', label: 'Community Quota Certificate' }] : []),
    { type: 'INCOME_CERTIFICATE', label: 'Income Certificate' },
    { type: 'CASTE_CERTIFICATE', label: 'Caste Certificate' },
    { type: 'PROFILE_PHOTO', label: 'Passport Photo' },
  ];

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-50 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#1e3a8a] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Sticky Navigation & Candidate Headline Banner (68px) */}
      <section className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs shrink-0 select-none">
        <div className="w-full px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 min-h-[64px]">
          {/* Back to Queue Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBackToQueue}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-[#1e3a8a] font-bold text-xs transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Verification Queue</span>
              <span className="bg-[#eff4ff] text-[#1e3a8a] px-2 py-0.5 rounded-full text-[11px] font-bold">
                {remainingCount} Remaining
              </span>
            </button>
          </div>

          {/* Center Candidate Identity: Profile Pic & English Name only */}
          <div className="flex items-center gap-3 justify-center flex-1">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Student Photo"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1e3a8a]/20 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#eff4ff] border border-blue-200 text-[#1e3a8a] font-bold text-sm flex items-center justify-center uppercase shrink-0">
                {student.firstName[0]}
                {student.lastName[0] || ''}
              </div>
            )}
            <span className="text-base font-bold text-slate-900 tracking-tight">
              {student.firstName} {student.lastName}
            </span>
          </div>
        </div>
      </section>

      {/* 50/50 Dual Pane Verification Geometry */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden pb-16">
        {/* LEFT PANE: Smart Auto-Docking Document Viewer (Col 6) */}
        <section className="lg:col-span-6 bg-slate-200/60 border-r border-slate-200 flex flex-col relative overflow-hidden h-full">
          {/* Document Tab Strip (Supports ALL 10 Documents) */}
          <div className="w-full bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto whitespace-nowrap flex items-center justify-between gap-1.5 shrink-0 shadow-xs">
            <div className="flex items-center gap-1.5">
              {ALL_DOCUMENTS.map((docItem) => {
                const docFound = getDocumentForType(docItem.type);
                const isActive = activeDocType === docItem.type;
                return (
                  <button
                    key={docItem.type}
                    onClick={() => triggerAutoDock(docItem.type, docItem.label)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{docItem.label}</span>
                    {docFound && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
            {activeDoc && (
              <a
                href={getPreviewUrl(activeDoc) || '#'}
                target="_blank"
                rel="noreferrer"
                download={activeDoc.fileName}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
                title="Open original document in new browser tab"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span className="hidden sm:inline">Pop-out</span>
              </a>
            )}
          </div>

          {/* Document Canvas Viewport:
              - For PDF: Browser's native grey preview engine is stationary and fitted to the section.
                All native toolbar buttons (print, +, -, rotate, download, scrollbar) work natively.
              - For Images: Scalable & pannable inside the stationary frame (mouse wheel zoom, left-click drag).
          */}
          <div
            onWheel={isPdf ? undefined : handleWheelZoom}
            onMouseDown={isPdf ? undefined : handleCanvasMouseDown}
            onDoubleClick={isPdf ? undefined : resetZoomAndPan}
            className={`relative flex-1 p-2 sm:p-3 flex flex-col items-stretch overflow-hidden bg-slate-200/50 ${
              isPdf ? '' : isDragging ? 'cursor-grabbing select-none' : 'cursor-grab select-none'
            }`}
            title={
              isPdf
                ? undefined
                : 'Scroll mouse wheel to zoom • Hold left-click and drag to move • Double-click to reset'
            }
          >
            {/* Viewer HUD overlay for Images only (PDF has native toolbar) */}
            {!isPdf && activeDoc && (
              <div
                className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur shadow-md px-2.5 py-1.5 rounded-xl border border-slate-200"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="font-mono text-[11px] font-bold text-slate-700 px-1 select-none">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                  title="Rotate 90° Clockwise"
                >
                  <span className="material-symbols-outlined text-base">rotate_right</span>
                </button>
                <button
                  onClick={() => setIsHighContrast(!isHighContrast)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                  title="Toggle High Contrast"
                >
                  <span className="material-symbols-outlined text-base">contrast</span>
                </button>
                <button
                  onClick={resetZoomAndPan}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                  title="Fit to Screen / Reset Zoom & Pan"
                >
                  <span className="material-symbols-outlined text-base">fit_screen</span>
                </button>
                <a
                  href={getPreviewUrl(activeDoc) || '#'}
                  target="_blank"
                  rel="noreferrer"
                  download={activeDoc.fileName}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                  title="Open Original Document in New Tab"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                </a>
              </div>
            )}

            {/* Active Document Viewer Content */}
            {activeDoc ? (
              /* Stationary window frame fitted to this preview section */
              <div className="w-full h-full flex-1 rounded-xl shadow-xs overflow-hidden bg-white border border-slate-200 relative flex items-center justify-center">
                {isPdf ? (
                  /* Fixed stationary native PDF engine with working buttons (print, +, -, download, scrollbar) */
                  <iframe
                    key={activeDoc.id || activeDoc.fileName}
                    src={`${getPreviewUrl(activeDoc) || ''}#view=FitH`}
                    title={activeDoc.fileName}
                    className="w-full h-full border-none block pointer-events-auto"
                  />
                ) : (
                  /* Scalable & Pannable Document Image (Only the image zooms and moves) */
                  <div
                    className="w-full h-full flex items-center justify-center overflow-hidden"
                    style={{ touchAction: 'none' }}
                  >
                    <img
                      src={getPreviewUrl(activeDoc) || ''}
                      alt={activeDoc.fileName}
                      className={`max-w-full max-h-full object-contain transition-transform duration-75 select-none ${
                        isHighContrast ? 'contrast-150 grayscale' : ''
                      }`}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                      }}
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-sm shadow-sm flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                  description
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  Document Not Yet Uploaded
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Candidate has not uploaded a file for &quot;{autoDockedLabel}&quot; yet.
                </span>
              </div>
            )}

            {/* Auto-docking HUD Status Indicator */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-full border border-teal-300 shadow-md pointer-events-none">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
              </span>
              <span className="text-xs font-semibold text-teal-800">
                ⚡ Auto-docked to: {autoDockedLabel}
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: Complete Exhaustive Data Reconciliation Cards (Col 6) */}
        <section className="lg:col-span-6 bg-slate-50 p-6 flex flex-col gap-5 overflow-y-auto h-full">
          {/* Resubmission Diff Callout if candidate updated flags */}
          {isResubmission && (
            <div className="bg-teal-50 border border-teal-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <span className="material-symbols-outlined text-teal-700 text-xl shrink-0 mt-0.5">
                verified
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-teal-900">
                  ★ Candidate Corrections Received on Mobile
                </span>
                <p className="text-xs text-teal-800 mt-0.5">
                  Candidate resubmitted updated records addressing previously flagged notices. Review the highlighted fields and matching certificates below.
                </p>
              </div>
            </div>
          )}

          {/* AI COPILOT EXECUTIVE SUMMARY CARD */}
          <div className="bg-gradient-to-r from-[#0b1c30] via-[#102a4e] to-[#1e3a8a] text-white rounded-2xl shadow-md p-5 flex flex-col gap-3.5 relative border border-blue-800/60 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-2xl">psychology</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      Gemini Multimodal AI Copilot
                    </h4>
                    <span className="bg-teal-400/20 text-teal-300 border border-teal-400/40 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                      Live
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-200">
                    Cross-checking official certificates against database records
                  </span>
                </div>
              </div>

              {/* Status or Score */}
              <div className="flex items-center gap-2 shrink-0">
                {isAiScanning ? (
                  <div className="flex items-center gap-2 text-xs text-teal-300 font-semibold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
                    <div className="w-3.5 h-3.5 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                    <span>Auditing Certificates...</span>
                  </div>
                ) : aiAudit ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                      aiAudit.overallMatchScore >= 85
                        ? 'bg-teal-500/30 text-teal-200 border border-teal-400/50'
                        : 'bg-red-500/30 text-red-200 border border-red-400/50'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {aiAudit.overallMatchScore >= 85 ? 'verified' : 'gpp_maybe'}
                      </span>
                      <span className="whitespace-nowrap">{aiAudit.overallMatchScore}% Integrity Score</span>
                    </div>

                    <button
                      onClick={() => loadAiAudit(true)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                      title="Re-run AI Multimodal Audit"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => loadAiAudit(false)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-sm transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Run AI Audit</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Summary Text & Error Flags Action Bar */}
            {aiAudit && (
              <div className="pt-3 border-t border-white/10 flex flex-col gap-3 text-xs">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-blue-100 leading-relaxed text-[11px] flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-teal-300 text-base shrink-0 mt-0.5">info</span>
                  <p>{aiAudit.summary}</p>
                </div>

                {/* Quick 1-click stage AI flags */}
                {aiAudit.suggestedFlags && aiAudit.suggestedFlags.length > 0 ? (
                  <div className="flex items-center justify-between bg-red-950/80 border border-red-500/40 p-3 rounded-xl flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 text-red-200 text-xs">
                      <span className="material-symbols-outlined text-lg text-red-400 shrink-0">report_problem</span>
                      <span>
                        AI detected <strong>{aiAudit.suggestedFlags.length}</strong> error item(s) on certificates.
                      </span>
                    </div>
                    <button
                      onClick={stageAllAiFlags}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <span>⚡ Stage All AI Error Flags</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-teal-950/60 border border-teal-500/40 p-2.5 rounded-xl text-teal-200 text-xs">
                    <span className="material-symbols-outlined text-base text-teal-400 shrink-0">verified</span>
                    <span>All uploaded documents cross-checked against portal records with high confidence.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD 1: Candidate Profile & Government Identification (Multi-docked) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">badge</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Candidate Profile &amp; Identification Records
                </h4>
              </div>
              {/* Quick-dock pills for Card 1 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => triggerAutoDock('AADHAAR_CARD', 'Aadhaar Card Copy')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'AADHAAR_CARD'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">badge</span>
                  <span>⚡ Aadhaar</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerAutoDock('SSLC_CERTIFICATE', 'SSLC 10th Book')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'SSLC_CERTIFICATE'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">menu_book</span>
                  <span>⚡ SSLC Book</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerAutoDock('APAAR_DOCUMENT', 'APAAR / ABC ID Card')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'APAAR_DOCUMENT'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">pin</span>
                  <span>⚡ APAAR ID</span>
                </button>
              </div>
            </div>

            {/* Sub-block 1A: Legal Identity (SSLC 10th Book Verified) */}
            <div
              onClick={() => triggerAutoDock('SSLC_CERTIFICATE', 'SSLC 10th Book')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'SSLC_CERTIFICATE'
                  ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-blue-700 text-base">verified_user</span>
                  <span>Legal Identity (Kerala SSLC Verified)</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks SSLC Book
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'fullName',
                  label: 'Full Legal Name (English)',
                  value: `${student.firstName} ${student.lastName}`,
                })}

                {renderField({
                  fieldKey: 'nameMalayalam',
                  label: 'Full Name (Malayalam)',
                  value: student.firstNameMalayalam ? `${student.firstNameMalayalam} ${student.lastNameMalayalam || ''}` : null,
                })}

                {renderField({
                  fieldKey: 'dob',
                  label: 'Date of Birth',
                  value: student.dob
                    ? `${student.dob}${calculateAge(student.dob) !== null ? ` (${calculateAge(student.dob)} yrs)` : ''}`
                    : null,
                })}

                {renderField({
                  fieldKey: 'gender',
                  label: 'Gender',
                  value: student.gender,
                })}
              </div>
            </div>

            {/* Sub-block 1B: Government Identification & Domicile Address (Aadhaar Card) */}
            <div
              onClick={() => triggerAutoDock('AADHAAR_CARD', 'Aadhaar Identification Card')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'AADHAAR_CARD'
                  ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-[#1e3a8a] text-base">fingerprint</span>
                  <span>Government Identification &amp; Domicile</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks Aadhaar Card
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'aadhaarNumber',
                  label: 'Aadhaar Card UID',
                  value: student.aadhaarNumber,
                  copyable: true,
                })}

                {renderField({
                  fieldKey: 'nationality',
                  label: 'Nationality',
                  value: student.nationality || 'Indian',
                })}

                {renderField({
                  fieldKey: 'bloodGroup',
                  label: 'Blood Group',
                  value: student.bloodGroup,
                })}

                {renderField({
                  fieldKey: 'phoneNumber',
                  label: 'Mobile Contact',
                  value: student.user?.phoneNumber,
                  copyable: true,
                })}

                {renderField({
                  fieldKey: 'email',
                  label: 'Email Address',
                  value: student.user?.email,
                  copyable: true,
                })}

                <div className="col-span-1 md:col-span-2">
                  {renderField({
                    fieldKey: 'permanentAddress',
                    label: 'Permanent Domicile Address',
                    value: student.permanentAddress || student.address,
                  })}
                </div>

                <div className="col-span-1 md:col-span-2">
                  {renderField({
                    fieldKey: 'address',
                    label: 'Communication / Present Address',
                    value: student.address,
                  })}
                </div>
              </div>
            </div>

            {/* Sub-block 1C: Academic Bank of Credits / APAAR ID */}
            <div
              onClick={() => triggerAutoDock('APAAR_DOCUMENT', 'APAAR / ABC ID Card')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'APAAR_DOCUMENT'
                  ? 'border-purple-400 bg-purple-50/30 ring-1 ring-purple-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-purple-700 text-base">pin</span>
                  <span>Academic Bank of Credits (Higher Ed Registry)</span>
                </div>
                <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks APAAR Card
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'apaarId',
                  label: 'APAAR / ABC ID (12-Digit)',
                  value: student.apaarId,
                  copyable: true,
                })}
              </div>
            </div>
          </div>

          {/* CARD 2: Parent & Guardian Information */}
          <div
            onClick={() => triggerAutoDock('SSLC_CERTIFICATE', 'SSLC 10th Book')}
            className={`bg-white rounded-2xl border shadow-xs p-5 flex flex-col gap-4 cursor-pointer hover:border-blue-300 transition-colors shrink-0 ${
              activeDocType === 'SSLC_CERTIFICATE' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">family_restroom</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Parent &amp; Guardian Information
                </h4>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerAutoDock('SSLC_CERTIFICATE', 'SSLC 10th Book');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  activeDocType === 'SSLC_CERTIFICATE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-xs">menu_book</span>
                <span>⚡ SSLC Book</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {renderField({
                fieldKey: 'fatherName',
                label: "Father's Name",
                value: student.fatherName || student.parentName,
              })}

              {renderField({
                fieldKey: 'fatherOccupation',
                label: "Father's Occupation",
                value: student.fatherOccupation || student.parentOccupation,
              })}

              {renderField({
                fieldKey: 'motherName',
                label: "Mother's Name",
                value: student.motherName,
              })}

              {renderField({
                fieldKey: 'motherOccupation',
                label: "Mother's Occupation",
                value: student.motherOccupation,
              })}

              {(student.guardianName || student.guardianOccupation) && (
                <>
                  {renderField({
                    fieldKey: 'guardianName',
                    label: 'Local Guardian Name',
                    value: student.guardianName,
                  })}
                  {renderField({
                    fieldKey: 'guardianOccupation',
                    label: 'Guardian Occupation',
                    value: student.guardianOccupation,
                  })}
                </>
              )}
            </div>
          </div>

          {/* CARD 3: Qualifying Examination & Academic Scores */}
          <div
            onClick={() => triggerAutoDock('PLUS_TWO_CERTIFICATE', 'Plus Two / HSE Marksheet')}
            className={`bg-white rounded-2xl border shadow-xs p-5 flex flex-col gap-4 cursor-pointer hover:border-blue-300 transition-colors shrink-0 ${
              activeDocType === 'PLUS_TWO_CERTIFICATE' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">school</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Qualifying Examination &amp; Academic Scores
                </h4>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerAutoDock('PLUS_TWO_CERTIFICATE', 'Plus Two / HSE Marksheet');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  activeDocType === 'PLUS_TWO_CERTIFICATE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-xs">school</span>
                <span>⚡ +2 Marksheet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {renderField({
                fieldKey: 'prevBoardUniversity',
                label: 'Examination Board',
                value: student.prevBoardUniversity || 'Board of Higher Secondary Education, Kerala',
              })}

              {renderField({
                fieldKey: 'prevRegisterNumber',
                label: 'HSE Register Number',
                value: student.prevRegisterNumber,
                copyable: true,
              })}

              {renderField({
                fieldKey: 'prevCourse',
                label: 'Stream / Specialization',
                value: student.prevCourse || 'General Stream',
              })}

              {renderField({
                fieldKey: 'prevPeriodOfStudy',
                label: 'Period of Study',
                value: student.prevPeriodOfStudy,
              })}

              <div className="col-span-1 md:col-span-2">
                {renderField({
                  fieldKey: 'prevInstitutionName',
                  label: 'Institution / School Last Attended',
                  value: student.prevInstitutionName,
                })}
              </div>
            </div>

            {/* Percentage Banner with Direct Flag Button & AI Calculation Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Qualifying Percentage Aggregate
                  </span>
                  <span className="text-lg font-black text-[#1e3a8a]">
                    {student.prevPercentage ? `${student.prevPercentage}%` : 'Percentage Pending Audit'}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const aiPerc = aiAudit?.fieldResults?.find((f) => f.fieldKey === 'prevPercentage');
                    openFieldFlagModal('prevPercentage', '12th Percentage Aggregate');
                    if (aiPerc?.suggestedReason || aiPerc?.note) {
                      setModalReason(aiPerc.suggestedReason || aiPerc.note || '');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    stagedFlags.some((f) => f.key === 'prevPercentage')
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  <span>{stagedFlags.some((f) => f.key === 'prevPercentage') ? 'Flagged' : 'Flag Marks'}</span>
                </button>
              </div>

              {/* AI Marksheet Calculation Breakdown */}
              {(() => {
                const aiPerc = aiAudit?.fieldResults?.find((f) => f.fieldKey === 'prevPercentage');
                if (!aiPerc) return null;

                if (aiPerc.colorStatus === 'RED') {
                  return (
                    <div className="mt-1 pt-2.5 border-t border-red-200 flex flex-col gap-1.5 text-xs bg-red-50/80 p-2.5 rounded-lg border border-red-200 text-red-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-sm text-red-600">error</span>
                        <span>AI Marksheet Calculation Mismatch Detected</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded border border-red-200">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Declared by Student</span>
                          <span className="font-mono font-bold text-slate-800">{student.prevPercentage || 'N/A'}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">AI Calculated from Marksheet</span>
                          <span className="font-mono font-bold text-red-600">{aiPerc.documentValue || 'Calculation Error'}</span>
                        </div>
                      </div>
                      {aiPerc.note && (
                        <p className="text-[11px] text-red-800 leading-snug">
                          {aiPerc.note}
                        </p>
                      )}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFieldFlagModal('prevPercentage', '12th Percentage Aggregate');
                            setModalReason(aiPerc.suggestedReason || aiPerc.note || `Calculated marksheet percentage is ${aiPerc.documentValue}, but candidate entered ${student.prevPercentage}%.`);
                          }}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-xs">flag</span>
                          <span>Stage Mark Error Flag</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (aiPerc.colorStatus === 'GREEN') {
                  return (
                    <div className="mt-1 pt-2 border-t border-teal-200 flex items-center gap-1.5 text-[11px] text-teal-800 font-semibold bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                      <span className="material-symbols-outlined text-xs text-teal-600">verified</span>
                      <span>AI Verified: Calculated marksheet percentage ({aiPerc.documentValue}) tallies with entered score.</span>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>

          {/* CARD 4: Admission, Quota & Reservation Validation (Multi-docked) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">account_tree</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Admission, Quota &amp; Reservation Validation
                </h4>
              </div>
              {/* Quick-dock pills for Card 4 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => triggerAutoDock('ALLOTMENT_MEMO', 'Allotment Memo Slip')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'ALLOTMENT_MEMO'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">receipt_long</span>
                  <span>⚡ Allotment Memo</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerAutoDock(isCommunityQuota ? 'COMMUNITY_CERTIFICATE' : 'CASTE_CERTIFICATE', isCommunityQuota ? 'Community Quota Certificate' : 'Caste Certificate')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'CASTE_CERTIFICATE' || activeDocType === 'COMMUNITY_CERTIFICATE'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">workspace_premium</span>
                  <span>⚡ {isCommunityQuota ? 'Community Cert' : 'Caste Cert'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerAutoDock('INCOME_CERTIFICATE', 'Income Certificate')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    activeDocType === 'INCOME_CERTIFICATE'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">payments</span>
                  <span>⚡ Income Cert</span>
                </button>
              </div>
            </div>

            {/* Sub-block 4A: University Seat Allotment (Allotment Memo) */}
            <div
              onClick={() => triggerAutoDock('ALLOTMENT_MEMO', 'Allotment Memo Slip')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'ALLOTMENT_MEMO'
                  ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-blue-700 text-base">receipt_long</span>
                  <span>University Seat Allotment</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks Allotment Memo
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'courseAdmitted',
                  label: 'Course Admitted',
                  value: student.courseAdmitted || 'UG General',
                })}

                {renderField({
                  fieldKey: 'admissionNumber',
                  label: 'College Admission / Roll No',
                  value: student.admissionNumber,
                  copyable: true,
                })}

                {renderField({
                  fieldKey: 'timePeriodOfStudy',
                  label: 'Academic Batch Period',
                  value: student.timePeriodOfStudy,
                })}

                {renderField({
                  fieldKey: 'quota',
                  label: 'Selected Admission Quota',
                  value: student.quota || 'General Merit',
                })}
              </div>
            </div>

            {/* Sub-block 4B: Caste & Community Reservation */}
            <div
              onClick={() => triggerAutoDock(isCommunityQuota ? 'COMMUNITY_CERTIFICATE' : 'CASTE_CERTIFICATE', isCommunityQuota ? 'Community Quota Certificate' : 'Caste Certificate')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'CASTE_CERTIFICATE' || activeDocType === 'COMMUNITY_CERTIFICATE'
                  ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-amber-700 text-base">workspace_premium</span>
                  <span>Caste &amp; Community Reservation</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks {isCommunityQuota ? 'Community Cert' : 'Caste Cert'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'religion',
                  label: 'Religion & Community',
                  value: student.religion,
                })}

                {renderField({
                  fieldKey: 'caste',
                  label: 'Caste / Category',
                  value: student.caste,
                })}

                {isCommunityQuota && (
                  <div className="col-span-1 md:col-span-2 p-3 rounded-lg bg-[#eff4ff] border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1e3a8a] text-lg">verified_user</span>
                      <div>
                        <span className="font-bold text-[#1e3a8a] text-xs block">Community Quota Certificate</span>
                        <span className="text-[10px] text-slate-500">
                          {getDocumentForType('COMMUNITY_CERTIFICATE') ? 'Uploaded & ready' : 'Not uploaded'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFieldFlagModal('COMMUNITY_CERTIFICATE', 'Community Quota Certificate');
                      }}
                      className="px-2.5 py-1 rounded bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200 font-bold text-[11px]"
                    >
                      Flag Cert
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-block 4C: Family Income & EWS Verification (Income Certificate) */}
            <div
              onClick={() => triggerAutoDock('INCOME_CERTIFICATE', 'Income Certificate')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeDocType === 'INCOME_CERTIFICATE'
                  ? 'border-emerald-400 bg-emerald-50/30 ring-1 ring-emerald-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-emerald-700 text-base">payments</span>
                  <span>Family Income &amp; EWS Verification</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">dock_to_right</span>
                  Auto-Docks Income Cert
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {renderField({
                  fieldKey: 'annualIncome',
                  label: 'Annual Family Income',
                  value: student.annualIncome != null ? `₹ ${student.annualIncome.toLocaleString('en-IN')}` : null,
                })}

                {renderField({
                  fieldKey: 'isEws',
                  label: 'EWS Eligibility Status',
                  value: student.isEws ? 'Eligible for EWS' : 'Not Applicable',
                })}
              </div>
            </div>
          </div>

          {/* CARD 5: Bank Account & Scholarship Credentials */}
          <div
            onClick={() => triggerAutoDock('BANK_PASSBOOK', 'Bank Passbook Copy')}
            className={`bg-white rounded-2xl border shadow-xs p-5 flex flex-col gap-4 cursor-pointer hover:border-blue-300 transition-colors shrink-0 ${
              activeDocType === 'BANK_PASSBOOK' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">account_balance</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Bank Account &amp; Scholarship Credentials
                </h4>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerAutoDock('BANK_PASSBOOK', 'Bank Passbook Copy');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  activeDocType === 'BANK_PASSBOOK'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-xs">account_balance</span>
                <span>⚡ Bank Passbook</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {renderField({
                fieldKey: 'bankAccountName',
                label: 'Account Holder Name',
                value: student.bankAccountName,
              })}

              {renderField({
                fieldKey: 'bankName',
                label: 'Bank Name',
                value: student.bankName,
              })}

              {renderField({
                fieldKey: 'bankBranch',
                label: 'Bank Branch',
                value: student.bankBranch,
              })}

              {renderField({
                fieldKey: 'bankAccountNumber',
                label: 'Bank Account Number',
                value: student.bankAccountNumber,
                copyable: true,
              })}

              {renderField({
                fieldKey: 'bankIfscCode',
                label: 'Bank IFSC Code',
                value: student.bankIfscCode,
                copyable: true,
              })}
            </div>
          </div>

          {/* CARD 6: Uploaded Certificates Verification Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e3a8a] text-xl">fact_check</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Complete Document Verification Checklist ({student.documents?.length || 0} Files)
                </h4>
              </div>
              <span className="text-xs text-teal-700 font-bold">
                {student.documents?.length || 0} On Record
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {ALL_DOCUMENTS.map((docItem) => {
                const docFound = getDocumentForType(docItem.type);
                const isFlagged = stagedFlags.some((f) => f.key === docItem.type);

                return (
                  <div
                    key={docItem.type}
                    onClick={() => triggerAutoDock(docItem.type, docItem.label)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isFlagged
                        ? 'bg-red-50/70 border-red-300'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-base ${
                          docFound ? 'text-teal-600' : 'text-slate-400'
                        }`}
                      >
                        {docFound ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="font-semibold text-slate-900">{docItem.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          docFound
                            ? 'bg-teal-100 text-teal-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {docFound ? 'Uploaded' : 'Missing'}
                      </span>

                      {/* Direct Document Flag Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openFieldFlagModal(docItem.type, docItem.label);
                        }}
                        className={`p-1 rounded-lg text-xs font-bold transition-colors ${
                          isFlagged
                            ? 'text-red-700 bg-red-100'
                            : 'text-slate-400 hover:text-red-600'
                        }`}
                        title={`Flag ${docItem.label}`}
                      >
                        <span className="material-symbols-outlined text-sm">flag</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 7: Global Error Presets & Custom Remarks */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-3 shrink-0">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowFlagDrawer(!showFlagDrawer)}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-xl">flag</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Global Error Presets &amp; Custom Remarks ({stagedFlags.length} Staged)
                </h4>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-lg">
                {showFlagDrawer ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {showFlagDrawer && (
              <div className="space-y-3 pt-3 border-t border-slate-100 animate-fadeIn text-xs">
                {/* Presets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GLOBAL_PRESETS.map((preset) => {
                    const isSelected = stagedFlags.some((f) => f.key === preset.key);
                    return (
                      <button
                        key={preset.key}
                        onClick={() => toggleGlobalPreset(preset)}
                        className={`p-2.5 rounded-xl text-left transition-all border ${
                          isSelected
                            ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Remark Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={customFlagReason}
                    onChange={(e) => setCustomFlagReason(e.target.value)}
                    placeholder="Enter custom notice text for student mobile app..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#1e3a8a] outline-none"
                  />
                  <button
                    onClick={handleAddCustomRemark}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
                  >
                    Add Remark
                  </button>
                </div>

                {/* Staged Flags List */}
                {stagedFlags.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      All Staged Notices Ready to Dispatch ({stagedFlags.length}):
                    </span>
                    {stagedFlags.map((flag) => (
                      <div
                        key={flag.key}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50 text-red-900 text-xs border border-red-200"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold uppercase text-[10px] bg-red-200 px-1 rounded">
                            {flag.key}
                          </span>
                          <span className="truncate">{flag.reason}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFlag(flag.key)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Field-Level Flag Modal / Popover */}
      {activeFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-900">
                <span className="material-symbols-outlined text-red-600">flag</span>
                <span className="font-bold text-sm">Flag Error: {activeFieldModal.label}</span>
              </div>
              <button
                onClick={() => setActiveFieldModal(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Linked document callout & Re-upload flag toggle */}
              {(() => {
                const linkedDoc = FIELD_TO_DOC_MAP[activeFieldModal.key];
                if (!linkedDoc) return null;
                const isDocFlagged = stagedFlags.some((f) => f.key === linkedDoc.type);
                return (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <span className="material-symbols-outlined text-amber-700 text-base">link</span>
                        <span>Linked Proof: {linkedDoc.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerAutoDock(linkedDoc.type, linkedDoc.label)}
                        className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">dock_to_right</span>
                        <span>Dock &amp; Preview</span>
                      </button>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer mt-1 pt-2 border-t border-amber-200/80">
                      <input
                        type="checkbox"
                        checked={alsoFlagDocument}
                        onChange={(e) => setAlsoFlagDocument(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-red-600">upload_file</span>
                          Also Flag Respective Uploaded Document ({linkedDoc.label})
                          {isDocFlagged && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-semibold">
                              Already Flagged
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          Instructs candidate to re-upload a clear, authentic scan of {linkedDoc.label} on their mobile app.
                        </span>
                      </div>
                    </label>
                  </div>
                );
              })()}

              {/* Presets for this specific field */}
              {(FIELD_PRESET_MAP[activeFieldModal.key] || []).length > 0 && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                    Quick Preset Notices:
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(FIELD_PRESET_MAP[activeFieldModal.key] || []).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setModalReason(preset.text)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors ${
                          modalReason === preset.text
                            ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">{preset.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Exact Notice Text Area */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  Exact Error Notice for Student Mobile App:
                </label>
                <textarea
                  rows={3}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Enter exact explanation for the candidate to correct this field..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-400 outline-none text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {stagedFlags.some((f) => f.key === activeFieldModal.key) ? (
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveFlag(activeFieldModal.key);
                    setActiveFieldModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 font-bold text-xs hover:bg-red-200"
                >
                  Remove Flag
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFieldModal(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!modalReason.trim()) {
                      alert('Please enter or select an error notice reason.');
                      return;
                    }
                    const targetKey = activeFieldModal.key;
                    const targetLabel = activeFieldModal.label;
                    handleStageFieldFlag(targetKey, modalReason.trim());

                    if (alsoFlagDocument) {
                      const linkedDoc = FIELD_TO_DOC_MAP[targetKey];
                      if (linkedDoc) {
                        const docReason = `Error noted in ${targetLabel}: Please re-upload official ${linkedDoc.label} for verification. (${modalReason.trim()})`;
                        handleStageFieldFlag(linkedDoc.type, docReason);
                        triggerAutoDock(linkedDoc.type, linkedDoc.label);
                        setToastMessage(`✓ Flagged "${targetLabel}" and requested re-upload of "${linkedDoc.label}"!`);
                      } else {
                        setToastMessage(`✓ Flagged "${targetLabel}"`);
                      }
                    } else {
                      setToastMessage(`✓ Flagged "${targetLabel}"`);
                    }
                    setActiveFieldModal(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  Save Error Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM PERSISTENT ACTION DOCK */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200/90 shadow-2xl px-6 flex items-center justify-between z-40 select-none">
        {/* Left: Error Status */}
        <div className="flex items-center gap-2">
          {stagedFlags.length === 0 ? (
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>0 errors flagged. Dossier is clean and eligible for sign-off.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
              <span className="material-symbols-outlined text-base">warning</span>
              <span>{stagedFlags.length} error notice(s) staged for student action.</span>
            </div>
          )}
        </div>

        {/* Right: The Two Decisive Actions */}
        <div className="flex items-center gap-3">
          {/* Delete Duplicate Action */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting || isDeleting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            title="Permanently remove duplicate or invalid student entry"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>Remove Duplicate</span>
          </button>

          {/* Secondary Action: Send Error Notice */}
          <button
            onClick={handleSendNotice}
            disabled={isSubmitting || stagedFlags.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-300 hover:bg-red-50 text-red-600 font-bold text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">outgoing_mail</span>
            <span>Send Error Notice &amp; Return</span>
          </button>

          {/* Primary Action: Approve Student */}
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            <span>Approve &amp; Issue Digital College ID</span>
          </button>
        </div>
      </footer>

      {/* Delete Duplicate Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-red-50/60">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-900">Delete Student Entry</h3>
                <span className="text-[11px] text-red-600 font-medium">Remove duplicate or erroneous record</span>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{student.firstName} {student.lastName}</div>
                <div className="text-slate-500 font-mono mt-0.5">Admission No: {student.admissionNumber}</div>
                <div className="text-slate-500 font-mono text-[11px]">{student.user?.email || student.user?.phoneNumber}</div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                This action will <strong className="text-red-600">permanently delete</strong> this student profile, all {student.documents?.length || 0} uploaded certificates from Cloud Storage, and the user login.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Deletion:</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-red-400 focus:outline-none"
                >
                  <option value="Duplicate Entry / Registered Twice">Duplicate Entry / Registered Twice</option>
                  <option value="Incorrect Admission Number entered">Incorrect Admission Number entered</option>
                  <option value="Student Withdrew Admission Application">Student Withdrew Admission Application</option>
                  <option value="Test / Dummy Account Cleanup">Test / Dummy Account Cleanup</option>
                  <option value="Other Administrative Correction">Other Administrative Correction</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
