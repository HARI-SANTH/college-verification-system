import React, { useState, useEffect, useRef } from 'react';
import { StudentProfile, StudentDocument } from '../../types';
import { api } from '../../services/api';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  X,
  Send,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  Check,
  FileWarning,
  Sparkles,
  Bot,
  PanelLeftClose,
  PanelLeft,
  Split,
  Move,
  Zap,
} from 'lucide-react';

interface Props {
  students: StudentProfile[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  onBackToDashboard: () => void;
  onStudentUpdated: () => void;
}

// Canonical document specifications matching the mobile app
interface DocSpec {
  type: string;
  aliases: string[];
  label: string;
  fullName: string;
  category: string;
  icon: string;
  description: string;
  isRequired: boolean;
}

const DOCUMENT_SPECS: DocSpec[] = [
  {
    type: 'PLUS_TWO_CERTIFICATE',
    aliases: ['PLUS_TWO_CERT'],
    label: '+2 HSE Marksheet',
    fullName: 'Plus Two / Higher Secondary Marksheet',
    category: 'Academic',
    icon: 'description',
    description: 'Mandatory qualifying exam marksheet to verify register number, board, and marks percentage aggregate.',
    isRequired: true,
  },
  {
    type: 'SSLC_CERTIFICATE',
    aliases: ['SSLC_CERT'],
    label: 'SSLC 10th',
    fullName: 'SSLC / 10th Class Certificate',
    category: 'Identity',
    icon: 'school',
    description: 'Primary legal baseline for Date of Birth, Candidate Full Name, Gender, Nationality, Father\'s Name, Mother\'s Name, and Permanent Residential Address.',
    isRequired: true,
  },
  {
    type: 'ALLOTMENT_MEMO',
    aliases: [],
    label: 'Allotment Memo',
    fullName: 'College / University Allotment Memo Slip',
    category: 'Admission',
    icon: 'assignment',
    description: 'Official seat allotment slip issued by university or admissions authority.',
    isRequired: true,
  },
  {
    type: 'INCOME_CERTIFICATE',
    aliases: ['INCOME_CERT'],
    label: 'Income & EWS',
    fullName: 'Revenue Village Income Certificate (EWS)',
    category: 'Income',
    icon: 'receipt_long',
    description: 'Tahsildar / Village Officer income certificate for EWS eligibility (< ₹1,00,000) & fee concession.',
    isRequired: false,
  },
  {
    type: 'COMMUNITY_CERTIFICATE',
    aliases: ['COMMUNITY_CERT'],
    label: 'Community Cert',
    fullName: 'Community / Parish Certificate',
    category: 'Quota',
    icon: 'groups',
    description: 'Parish priest or competent community authority certificate for community quota verification.',
    isRequired: false,
  },
  {
    type: 'CASTE_CERTIFICATE',
    aliases: ['CASTE_CERT'],
    label: 'Caste Cert',
    fullName: 'Caste / Reservation Certificate',
    category: 'Quota',
    icon: 'verified',
    description: 'Competent revenue authority caste certificate for SC/ST/OBC/OEC reservation.',
    isRequired: false,
  },
  {
    type: 'BANK_PASSBOOK',
    aliases: [],
    label: 'Bank Passbook',
    fullName: 'Bank Account Passbook Front Page',
    category: 'Financial',
    icon: 'account_balance',
    description: 'Passbook front page showing Account Holder Name, Account Number, and IFSC code for DBT direct scholarship transfer.',
    isRequired: false,
  },
  {
    type: 'APAAR_DOCUMENT',
    aliases: ['APAAR_CARD'],
    label: 'APAAR Card',
    fullName: 'APAAR Card / DigiLocker Verification Slip',
    category: 'Identity',
    icon: 'badge',
    description: '12-digit Automated Permanent Academic Account Registry card from DigiLocker.',
    isRequired: false,
  },
  {
    type: 'AADHAAR_CARD',
    aliases: ['AADHAAR_DOCUMENT', 'aadhaar'],
    label: 'Aadhaar Card',
    fullName: 'Government Aadhaar Card (UIDAI)',
    category: 'Identity',
    icon: 'credit_card',
    description: 'Official 12-digit UIDAI Aadhaar identity document or e-Aadhaar PDF proof.',
    isRequired: false,
  },
  {
    type: 'PROFILE_PHOTO',
    aliases: ['photoUrl', 'photo'],
    label: 'Profile Photo',
    fullName: 'Student Official ID Photo',
    category: 'Identity',
    icon: 'portrait',
    description: 'Passport-size formal photograph for student smart ID card and UGC registry.',
    isRequired: true,
  },
];

export const VerificationWorkbench: React.FC<Props> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onBackToDashboard,
  onStudentUpdated,
}) => {
  const [inflowFilter, setInflowFilter] = useState<'ALL' | 'PENDING' | 'FLAGGED' | 'VERIFIED'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // Layout & Sidebar Controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'wide' | 'equal' | 'fullscreen'>('wide');

  // Document Viewer Controls & Mouse Wheel Zoom
  const [activeDocSpecType, setActiveDocSpecType] = useState<string>('PLUS_TWO_CERTIFICATE');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // AI Automated Verification State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [showAiBanner, setShowAiBanner] = useState(true);

  // Flagging State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagTargetKey, setFlagTargetKey] = useState<string>('');
  const [flagTargetLabel, setFlagTargetLabel] = useState<string>('');
  const [flagReasonPreset, setFlagReasonPreset] = useState<string>('CUSTOM');
  const [flagCustomReason, setFlagCustomReason] = useState<string>('');
  const [presetOptions, setPresetOptions] = useState<Array<{ id: string; label: string; text: string }>>([]);
  const [stagedFlags, setStagedFlags] = useState<Array<{ key: string; reason: string }>>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Helper to find document for a given spec
  const findDocForSpec = (spec: DocSpec, docs?: StudentDocument[]): StudentDocument | undefined => {
    if (!docs) return undefined;
    return docs.find(
      (d) => d.type === spec.type || spec.aliases.includes(d.type)
    );
  };

  // Helper to resolve absolute or relative URL
  const resolveFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    return `/${url}`;
  };

  // Helper to resolve inline document preview stream URL with auth token (prevents browser download prompt)
  const getDocPreviewUrl = (doc?: StudentDocument | null) => {
    if (!doc) return '';
    const token = localStorage.getItem('token') || '';
    if (doc.id) {
      return `/api/admin/documents/${doc.id}/preview?token=${encodeURIComponent(token)}`;
    }
    return resolveFileUrl(doc.fileUrl);
  };

  // Helper to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter Inflow queue
  const filteredQueue = students.filter((s) => {
    if (inflowFilter === 'PENDING' && s.verificationStatus !== 'SUBMITTED') return false;
    if (inflowFilter === 'FLAGGED' && s.verificationStatus !== 'CORRECTION_REQUIRED') return false;
    if (inflowFilter === 'VERIFIED' && s.verificationStatus !== 'VERIFIED') return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      const matchRoll = s.admissionNumber.toLowerCase().includes(q);
      const matchCourse = (s.courseAdmitted || '').toLowerCase().includes(q);
      return matchName || matchRoll || matchCourse;
    }
    return true;
  });

  // Fetch full student profile when selected
  const loadStudentDetails = async (id: string) => {
    setLoadingStudent(true);
    try {
      const full = await api.getStudentById(id);
      setSelectedStudent(full);
      setStagedFlags([]);
      setActionMessage(null);
      setZoomLevel(100);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setAiSummary(null);

      // Auto-trigger AI audit to immediately evaluate and tri-color code all fields & documents
      setAiLoading(true);
      try {
        const result = await api.aiVerifyStudent(id);
        setAiSummary(result);
        setShowAiBanner(true);

        // AUTOMATIC FLAGGING: If AI detected confirmed mismatches or unsubmitted items (RED), auto-stage them!
        if (result.suggestedFlags && result.suggestedFlags.length > 0) {
          setStagedFlags(result.suggestedFlags);
          setActionMessage({
            text: `⚡ AI Auto-Audit complete: ${result.suggestedFlags.length} confirmed discrepancies / missing items automatically flagged and staged.`,
            type: 'error',
          });
        }
      } catch (aiErr) {
        console.warn('AI automatic audit error', aiErr);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      console.error('Failed to load student', err);
    } finally {
      setLoadingStudent(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentDetails(selectedStudentId);
    } else if (students.length > 0) {
      loadStudentDetails(students[0].id);
    }
  }, [selectedStudentId]);

  // Hotkey navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleApproveStudent();
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNextStudent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudent, filteredQueue]);

  const handleNextStudent = () => {
    if (!selectedStudent || filteredQueue.length <= 1) return;
    const currentIndex = filteredQueue.findIndex((s) => s.id === selectedStudent.id);
    const nextIndex = (currentIndex + 1) % filteredQueue.length;
    onSelectStudent(filteredQueue[nextIndex].id);
  };

  // Mouse wheel zoom handler
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 15 : -15;
    setZoomLevel((prev) => Math.min(300, Math.max(40, prev + zoomDelta)));
  };

  // Mouse drag to pan handler (when zoomed in)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Run AI automated verification scan
  const handleRunAiAudit = async () => {
    if (!selectedStudent) return;
    setAiLoading(true);
    try {
      const result = await api.aiVerifyStudent(selectedStudent.id);
      setAiSummary(result);
      setShowAiBanner(true);

      // Auto-stage all confirmed RED mismatches
      if (result.suggestedFlags && result.suggestedFlags.length > 0) {
        setStagedFlags((prev) => {
          const existingKeys = new Set(prev.map((f) => f.key));
          const newFlags = result.suggestedFlags.filter((f: any) => !existingKeys.has(f.key));
          return [...prev, ...newFlags];
        });
        setActionMessage({
          text: `⚡ AI Audit completed: ${result.suggestedFlags.length} confirmed discrepancies / missing items automatically flagged and staged.`,
          type: 'error',
        });
      } else {
        setActionMessage({
          text: `✓ AI Audit verified: All textual fields and documents match with 0 discrepancies!`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'AI verification failed', type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-stage all AI suggested flags
  const handleApplyAiFlags = () => {
    if (!aiSummary || !aiSummary.suggestedFlags || aiSummary.suggestedFlags.length === 0) return;
    setStagedFlags((prev) => {
      const existingKeys = new Set(prev.map((f) => f.key));
      const newFlags = aiSummary.suggestedFlags.filter((f: any) => !existingKeys.has(f.key));
      return [...prev, ...newFlags];
    });
    setActionMessage({
      text: `${aiSummary.suggestedFlags.length} discrepancy flags from AI analysis have been staged. Review and click 'Send Discrepancy Notice' to notify the student.`,
      type: 'success',
    });
  };

  // Open the flag modal with smart presets tailored to the field or document
  const openFlagModal = (key: string, label: string) => {
    setFlagTargetKey(key);
    setFlagTargetLabel(label);

    let presets: Array<{ id: string; label: string; text: string }> = [];

    if (key.includes('CERT') || key.includes('MEMO') || key.includes('PASSBOOK') || key.includes('APAAR_DOCUMENT') || key.includes('PHOTO')) {
      presets = [
        {
          id: 'BLURRY',
          label: 'Blurry / Unreadable scan',
          text: `The uploaded ${label} is blurry, pixelated, or illegible. Please re-upload a clear, high-resolution original PDF or image scan.`,
        },
        {
          id: 'MISSING_SEAL',
          label: 'Missing Official Stamp / Seal',
          text: `The uploaded ${label} is missing the mandatory institutional seal, principal/authority signature, or holographic stamp.`,
        },
        {
          id: 'WRONG_DOC',
          label: 'Wrong document uploaded',
          text: `The uploaded document does not appear to be a valid ${label}. Please upload the correct official document.`,
        },
        {
          id: 'EXPIRED',
          label: 'Certificate validity expired',
          text: `The validity period of the uploaded ${label} has lapsed. Please provide a current valid certificate issued by competent authority.`,
        },
        {
          id: 'MISSING_FILE',
          label: 'Document Missing',
          text: `Mandatory document ${label} has not been uploaded. Please upload a clear scanned copy to complete registration.`,
        },
      ];
    } else if (key === 'prevPercentage') {
      presets = [
        {
          id: 'MARKS_MISMATCH',
          label: 'Marks percentage mismatch',
          text: 'The qualifying examination percentage entered on the portal does not match the aggregate marks total on your uploaded Plus Two marksheet. Please correct your marks entry.',
        },
        {
          id: 'CALC_ERROR',
          label: 'Calculation / Aggregate error',
          text: 'Total marks obtained calculation differs from the board score card. Please recalculate and update percentage.',
        },
      ];
    } else if (key === 'fatherName') {
      presets = [
        {
          id: 'FATHER_NAME_MISMATCH',
          label: "Father's name mismatch",
          text: "Father's full name does not match the name recorded in official school or identity records. Please correct spelling.",
        },
      ];
    } else if (key === 'fatherOccupation') {
      presets = [
        {
          id: 'FATHER_OCC_INVALID',
          label: "Father's occupation missing / unclear",
          text: "Please provide a valid and complete entry for father's occupation.",
        },
      ];
    } else if (key === 'motherName') {
      presets = [
        {
          id: 'MOTHER_NAME_MISMATCH',
          label: "Mother's name mismatch",
          text: "Mother's full name does not match official documentation. Please correct spelling.",
        },
      ];
    } else if (key === 'motherOccupation') {
      presets = [
        {
          id: 'MOTHER_OCC_INVALID',
          label: "Mother's occupation missing / unclear",
          text: "Please provide a valid entry for mother's occupation.",
        },
      ];
    } else if (key === 'guardianName') {
      presets = [
        {
          id: 'GUARDIAN_NAME_MISMATCH',
          label: "Guardian's name mismatch",
          text: "Guardian's name requires correction or verification against legal guardianship documentation.",
        },
      ];
    } else if (key === 'guardianOccupation') {
      presets = [
        {
          id: 'GUARDIAN_OCC_INVALID',
          label: "Guardian's occupation missing / unclear",
          text: "Please specify guardian's occupation clearly.",
        },
      ];
    } else if (key === 'permanentAddress') {
      presets = [
        {
          id: 'ADDR_INCOMPLETE',
          label: 'Address incomplete',
          text: 'Permanent residential address is incomplete. Please include House Name/Number, Street, Post Office, District, and PIN Code.',
        },
      ];
    } else if (key === 'dob') {
      presets = [
        {
          id: 'DOB_MISMATCH',
          label: 'DOB differs from SSLC Certificate',
          text: 'Date of Birth entered does not match the official date recorded in your SSLC / 10th Class certificate. Please correct the DOB.',
        },
      ];
    } else if (key === 'firstName' || key === 'lastName') {
      presets = [
        {
          id: 'NAME_MISMATCH',
          label: 'Name spelling mismatch',
          text: 'Candidate name spelling does not match your official Board certificate / Aadhaar record. Please verify spelling.',
        },
      ];
    } else if (key === 'firstNameMalayalam' || key === 'lastNameMalayalam') {
      presets = [
        {
          id: 'MALAYALAM_SPELLING',
          label: 'Malayalam script spelling error',
          text: 'മലയാളത്തിലുള്ള പേരിന്റെ അക്ഷരവിന്യാസത്തിൽ തെറ്റുണ്ട്. ദയവായി തിരുത്തി സമർപ്പിക്കുക (Spelling error in Malayalam name).',
        },
      ];
    } else if (key === 'courseAdmitted' || key === 'quota') {
      presets = [
        {
          id: 'QUOTA_MISMATCH',
          label: 'Course or Quota mismatch with Allotment Memo',
          text: 'The admitted course or quota selected does not match the official College Allotment Memo slip.',
        },
      ];
    } else if (key === 'religion' || key === 'caste') {
      presets = [
        {
          id: 'CASTE_MISMATCH',
          label: 'Caste / Community category mismatch',
          text: 'Religion or Caste/Reservation category selected does not match the uploaded community/caste certificate.',
        },
      ];
    } else if (key === 'annualIncome') {
      presets = [
        {
          id: 'INCOME_MISMATCH',
          label: 'Income differs from Tahsildar certificate',
          text: 'Annual income entered on the portal does not tally with the amount certified by the Revenue Village Officer / Tahsildar certificate.',
        },
      ];
    } else if (key === 'prevRegisterNumber') {
      presets = [
        {
          id: 'REG_MISMATCH',
          label: 'Board register number mismatch',
          text: 'Qualifying examination register number does not match your uploaded Plus Two / 12th marksheet.',
        },
      ];
    } else if (key.includes('bank') || key.includes('Ifsc')) {
      presets = [
        {
          id: 'BANK_MISMATCH',
          label: 'Bank account / IFSC mismatch',
          text: 'Bank account number or IFSC code does not match the details shown on the uploaded passbook front page. Please verify account details for DBT transfer.',
        },
      ];
    } else if (key === 'apaarId') {
      presets = [
        {
          id: 'APAAR_MISMATCH',
          label: 'APAAR ID mismatch',
          text: 'The 12-digit APAAR / ABC ID does not match the official DigiLocker card uploaded. Please verify the 12-digit number.',
        },
      ];
    } else {
      presets = [
        {
          id: 'DATA_MISMATCH',
          label: 'Data discrepancy with submitted records',
          text: `The value entered for ${label} does not match the official documentation. Please correct this field.`,
        },
      ];
    }

    setPresetOptions(presets);
    if (presets.length > 0) {
      setFlagReasonPreset(presets[0].id);
      setFlagCustomReason(presets[0].text);
    } else {
      setFlagReasonPreset('CUSTOM');
      setFlagCustomReason('');
    }
    setFlagModalOpen(true);
  };

  const handleSelectPreset = (optId: string) => {
    setFlagReasonPreset(optId);
    if (optId === 'CUSTOM') {
      setFlagCustomReason('');
    } else {
      const match = presetOptions.find((p) => p.id === optId);
      if (match) {
        setFlagCustomReason(match.text);
      }
    }
  };

  const handleConfirmStageFlag = () => {
    const finalReason = flagCustomReason.trim();
    if (!finalReason) return;

    setStagedFlags((prev) => [
      ...prev.filter((i) => i.key !== flagTargetKey),
      { key: flagTargetKey, reason: finalReason },
    ]);
    setFlagModalOpen(false);
  };

  const handleRemoveStagedFlag = (key: string) => {
    setStagedFlags((prev) => prev.filter((i) => i.key !== key));
  };

  const handleDispatchFlags = async () => {
    if (!selectedStudent || stagedFlags.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.flagMistakes(selectedStudent.id, stagedFlags);
      setSelectedStudent(res.student);
      setStagedFlags([]);
      setActionMessage({
        text: `Discrepancy notice sent to ${res.student.user?.email || 'student'}! Correction required form has been unlocked on their mobile app.`,
        type: 'success',
      });
      onStudentUpdated();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to dispatch flags', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveStudent = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const res = await api.verifyStudent(selectedStudent.id);
      setSelectedStudent(res.student);
      setActionMessage({
        text: `Student ${res.student.firstName} ${res.student.lastName} (${res.student.admissionNumber}) has been approved and marked as VERIFIED!`,
        type: 'success',
      });
      onStudentUpdated();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Verification failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Find active spec and uploaded document
  const activeSpec = DOCUMENT_SPECS.find((s) => s.type === activeDocSpecType) || DOCUMENT_SPECS[0];
  const activeDoc = findDocForSpec(activeSpec, selectedStudent?.documents);
  const activeDocFlag = selectedStudent?.fieldFlags && (
    selectedStudent.fieldFlags[activeSpec.type] ||
    activeSpec.aliases.map((a) => selectedStudent.fieldFlags[a]).find(Boolean)
  );

  // Check if a field has an existing flag or is staged
  const getFieldFlagInfo = (key: string) => {
    const staged = stagedFlags.find((f) => f.key === key);
    if (staged) return { isStaged: true, isFlagged: false, reason: staged.reason };
    const existing = selectedStudent?.fieldFlags && selectedStudent.fieldFlags[key];
    if (existing && existing.status === 'FLAGGED_ERROR') {
      return { isStaged: false, isFlagged: true, reason: existing.reason };
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-7.5rem)] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
      {/* 1. TOP STATUS & NAVIGATION BAR */}
      <div className="h-12 bg-white px-4 flex items-center justify-between border-b border-slate-200 shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#00236f] font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Desk Overview</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200"></div>

          {selectedStudent ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                {selectedStudent.firstName} {selectedStudent.lastName}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#00236f]/10 text-[#00236f] text-xs font-mono font-bold">
                {selectedStudent.admissionNumber}
              </span>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="text-xs text-slate-500 hidden md:inline truncate">
                {selectedStudent.courseAdmitted || 'BCA'} • AY {selectedStudent.timePeriodOfStudy || '2024–28'}
              </span>
              <span className="text-slate-300 hidden lg:inline">•</span>
              <span className="text-xs text-slate-500 hidden lg:inline">
                Quota: <strong className="text-slate-700">{selectedStudent.quota || 'Merit'}</strong>
              </span>
              <span className="text-slate-300 hidden xl:inline">•</span>
              <span className="text-xs text-slate-400 hidden xl:inline">
                BASELIOS POULOSE II CATHOLICOSE COLLEGE • Piravom
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Select a student from the inflow queue</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* AI Pre-Check Scan Button */}
          {selectedStudent && (
            <button
              onClick={handleRunAiAudit}
              disabled={aiLoading}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-xs ${
                aiSummary
                  ? aiSummary.status === 'ALL_MATCHED'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 hover:bg-emerald-100'
                    : 'bg-amber-50 border border-amber-300 text-amber-950 hover:bg-amber-100'
                  : 'bg-gradient-to-r from-indigo-600 to-[#00236f] text-white hover:brightness-110'
              }`}
              title="Run automated AI visual comparison of certificates against student portal entries"
            >
              <Zap className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin text-amber-500' : 'text-amber-400 fill-amber-400'}`} />
              <span>
                {aiLoading
                  ? 'Auditing Fields...'
                  : aiSummary
                  ? `AI Match: ${aiSummary.overallMatchScore}%`
                  : 'AI Pre-Check Audit'}
              </span>
              {aiSummary?.stats && !aiLoading && (
                <span className="hidden md:flex items-center gap-1.5 pl-1.5 border-l border-slate-300/80 font-mono text-[10px]">
                  <span className="text-emerald-700 font-bold" title="Matched Fields (Green)">🟢 {aiSummary.stats.greenCount}</span>
                  <span className="text-amber-700 font-bold" title="Uncertain Fields (Yellow)">🟡 {aiSummary.stats.yellowCount}</span>
                  <span className="text-rose-700 font-bold" title="Flagged Mismatches / Unsubmitted (Red)">🔴 {aiSummary.stats.redCount}</span>
                </span>
              )}
            </button>
          )}

          {selectedStudent && (
            <div className="flex items-center gap-1.5 mr-1">
              {selectedStudent.verificationStatus === 'VERIFIED' ? (
                <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[11px] font-extrabold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified</span>
                </span>
              ) : selectedStudent.verificationStatus === 'CORRECTION_REQUIRED' ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Correction Required</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Ready for Verification</span>
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleNextStudent}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Next Student (Alt+N)"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN DUAL-PANE WORKBENCH BODY */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: ACTIVE INFLOW QUEUE (Collapsible ~280px or ~48px) */}
        <aside
          className={`shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-xs z-10 transition-all duration-200 ${
            sidebarCollapsed ? 'w-12 items-center' : 'w-64 lg:w-72'
          }`}
        >
          {/* Collapse/Expand Toggle Header */}
          <div className="p-2.5 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 w-full">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1 text-xs font-black text-[#00236f] truncate">
                <span className="material-symbols-outlined text-[17px]">inbox</span>
                <span>Inflow Queue</span>
                <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                  {filteredQueue.length}
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors mx-auto"
              title={sidebarCollapsed ? 'Expand Queue (gives more fields info)' : 'Collapse Queue (gives maximum space to Document Preview)'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-[#00236f]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Search & Filter Bar */}
              <div className="p-3 flex flex-col gap-2 bg-slate-50/50 border-b border-slate-200">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter roll or applicant..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setInflowFilter('ALL')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      inflowFilter === 'ALL'
                        ? 'bg-[#00236f] text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setInflowFilter('PENDING')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      inflowFilter === 'PENDING'
                        ? 'bg-[#00236f] text-white'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setInflowFilter('FLAGGED')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      inflowFilter === 'FLAGGED'
                        ? 'bg-[#00236f] text-white'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    }`}
                  >
                    Flagged
                  </button>
                  <button
                    onClick={() => setInflowFilter('VERIFIED')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      inflowFilter === 'VERIFIED'
                        ? 'bg-[#00236f] text-white'
                        : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                    }`}
                  >
                    Verified
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredQueue.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  const hasFlag = s.verificationStatus === 'CORRECTION_REQUIRED';
                  const isVerified = s.verificationStatus === 'VERIFIED';
                  const docCount = s.documents?.length || 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-50/70 border-[#00236f] shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#00236f]"></div>
                      )}
                      <div className="flex items-start gap-2.5 pl-1.5">
                        <div className="w-8 h-8 rounded-lg bg-[#00236f]/10 text-[#00236f] flex items-center justify-center font-bold text-xs shrink-0">
                          {s.firstName.charAt(0)}
                          {s.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {s.firstName} {s.lastName}
                            </span>
                            {hasFlag ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold">
                                Flagged
                              </span>
                            ) : isVerified ? (
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[9px] font-extrabold">
                                Verified
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Review
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-[#00236f] mt-0.5">
                            {s.admissionNumber}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span className="truncate">{s.courseAdmitted || 'BCA'}</span>
                            <span className="font-semibold text-slate-600">{docCount} docs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Mini icons when collapsed */}
          {sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2">
              {filteredQueue.map((s) => {
                const isSelected = selectedStudent?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectStudent(s.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#00236f] text-white shadow-sm ring-2 ring-blue-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title={`${s.firstName} ${s.lastName} (${s.admissionNumber})`}
                  >
                    {s.firstName.charAt(0)}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* WORKBENCH CENTRAL AREA */}
        <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-slate-50 overflow-hidden">
          {/* ======================================================== */}
          {/* PANE 1: DEDICATED DOCUMENT PREVIEW SPACE */}
          {/* ======================================================== */}
          <section
            className={`flex flex-col bg-slate-100 border-r border-slate-200 min-w-0 relative transition-all duration-200 ${
              layoutMode === 'fullscreen'
                ? 'w-full'
                : layoutMode === 'wide'
                ? 'w-full md:w-[60%] lg:w-[62%]'
                : 'w-full md:w-1/2'
            }`}
          >
            {/* Document Tabs Bar */}
            <div className="bg-white px-2 pt-1 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {DOCUMENT_SPECS.map((spec) => {
                  const isSelectedTab = activeDocSpecType === spec.type;
                  const uploadedDoc = findDocForSpec(spec, selectedStudent?.documents);
                  const isUploaded = !!uploadedDoc;
                  const isFlagged =
                    uploadedDoc?.status === 'FLAGGED_ERROR' ||
                    stagedFlags.some((f) => f.key === spec.type || spec.aliases.includes(f.key)) ||
                    (selectedStudent?.fieldFlags && (
                      selectedStudent.fieldFlags[spec.type]?.status === 'FLAGGED_ERROR' ||
                      spec.aliases.some((a) => selectedStudent.fieldFlags[a]?.status === 'FLAGGED_ERROR')
                    ));

                  const aiDocCheck = aiSummary?.fieldResults?.find(
                    (r: any) => r.fieldKey === spec.type || spec.aliases.includes(r.fieldKey)
                  );

                  const isDocRed = aiDocCheck?.colorStatus === 'RED' || isFlagged;
                  const isDocYellow = !isDocRed && (aiDocCheck?.colorStatus === 'YELLOW');
                  const isDocGreen = !isDocRed && !isDocYellow && (aiDocCheck?.colorStatus === 'GREEN' || isUploaded);

                  return (
                    <button
                      key={spec.type}
                      onClick={() => {
                        setActiveDocSpecType(spec.type);
                        setZoomLevel(100);
                        setRotation(0);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className={`px-3 py-2 rounded-t-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap border-b-2 ${
                        isSelectedTab
                          ? isDocRed
                            ? 'bg-rose-50 text-rose-800 border-rose-600 shadow-2xs font-extrabold'
                            : isDocYellow
                            ? 'bg-amber-50 text-amber-900 border-amber-500 shadow-2xs font-extrabold'
                            : isDocGreen
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-600 shadow-2xs font-extrabold'
                            : 'bg-slate-100 text-[#00236f] border-[#00236f] shadow-2xs'
                          : isDocRed
                          ? 'text-rose-700 bg-rose-50/40 border-transparent hover:bg-rose-50'
                          : isDocYellow
                          ? 'text-amber-700 bg-amber-50/40 border-transparent hover:bg-amber-50'
                          : isDocGreen
                          ? 'text-emerald-700 bg-emerald-50/40 border-transparent hover:bg-emerald-50'
                          : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          isDocRed
                            ? 'text-rose-600'
                            : isDocYellow
                            ? 'text-amber-600'
                            : isDocGreen
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {spec.icon}
                      </span>
                      <span>{spec.label}</span>
                      {isDocRed ? (
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Discrepancy / Unsubmitted (Auto-Flagged)"></span>
                      ) : isDocYellow ? (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Review Recommended"></span>
                      ) : isDocGreen ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Verified Valid"></span>
                      ) : (
                        <span className="text-[10px] text-slate-300">•</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Layout Mode Toggles (Wide / Equal / Fullscreen) */}
              <div className="hidden sm:flex items-center gap-1 pl-2">
                <button
                  onClick={() => setLayoutMode(layoutMode === 'wide' ? 'equal' : 'wide')}
                  className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                    layoutMode === 'wide'
                      ? 'bg-slate-200 border-slate-300 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  title={layoutMode === 'wide' ? 'Switch to Equal 50/50 Split' : 'Switch to Wide Document 62% Split'}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{layoutMode === 'wide' ? 'Wide View' : '50/50 Split'}</span>
                </button>

                <button
                  onClick={() => setLayoutMode(layoutMode === 'fullscreen' ? 'wide' : 'fullscreen')}
                  className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                    layoutMode === 'fullscreen'
                      ? 'bg-[#00236f] border-[#00236f] text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  title={layoutMode === 'fullscreen' ? 'Exit Full Screen' : 'Maximize Document Preview'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Inspection Toolbar */}
            <div className="h-10 bg-white/95 backdrop-blur px-3 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(40, z - 20))}
                  className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  title="Zoom Out (or Scroll Down)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-xs min-w-[38px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(300, z + 20))}
                  className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  title="Zoom In (or Scroll Up)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  title="Rotate Document 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    setRotation(0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 rounded hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                  title="Reset Zoom to 100% & Center"
                >
                  <span>100%</span>
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(135);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 rounded hover:bg-slate-100 text-slate-700 font-bold text-[11px] hidden sm:flex items-center gap-1"
                  title="Fit width of document"
                >
                  <span>Fit Width</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 hidden xl:inline flex items-center gap-1">
                  <Move className="w-3 h-3 text-slate-400" />
                  <span>Mouse scroll to zoom • Click & drag to pan</span>
                </span>

                {activeDoc && (
                  <>
                    <a
                      href={getDocPreviewUrl(activeDoc)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      title="Open file in separate browser tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Tab</span>
                    </a>

                    <button
                      onClick={() => openFlagModal(activeSpec.type, activeSpec.fullName)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Flag className="w-3 h-3 text-rose-600" />
                      <span>Flag Document</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Canvas Body with Mouse Scroll Zoom & Pan */}
            <div
              ref={viewerContainerRef}
              onWheel={handleWheelZoom}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex-1 overflow-hidden p-3 flex flex-col items-center justify-start bg-slate-200/70 relative select-none"
            >
              {activeDoc ? (
                // REAL UPLOADED DOCUMENT VIEW
                <div className="w-full h-full flex flex-col gap-2">
                  {/* Document Meta Header Strip */}
                  <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[18px] text-[#00236f]">
                        {activeSpec.icon}
                      </span>
                      <div className="truncate">
                        <div className="font-extrabold text-slate-900 truncate">
                          {activeDoc.fileName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatFileSize(activeDoc.fileSize)} • Type: {activeDoc.fileMimeType || 'Document'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const activeAiDocCheck = aiSummary?.fieldResults?.find(
                          (r: any) => r.fieldKey === activeSpec.type || activeSpec.aliases.includes(r.fieldKey)
                        );
                        const isDocFlagged =
                          activeDoc?.status === 'FLAGGED_ERROR' ||
                          stagedFlags.some((f) => f.key === activeSpec.type || activeSpec.aliases.includes(f.key)) ||
                          !!activeDocFlag;
                        const isRed = activeAiDocCheck?.colorStatus === 'RED' || isDocFlagged;
                        const isYellow = !isRed && (activeAiDocCheck?.colorStatus === 'YELLOW');

                        if (isRed) {
                          return (
                            <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                              <span>{activeAiDocCheck?.isUnsubmitted ? 'Unsubmitted' : 'AI Mismatch'} (Auto-Flagged)</span>
                            </span>
                          );
                        } else if (isYellow) {
                          return (
                            <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>AI Uncertain (Review Needed)</span>
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              <span>AI Verified Valid</span>
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* AI Finding Note / Discrepancy details */}
                  {(() => {
                    const activeAiDocCheck = aiSummary?.fieldResults?.find(
                      (r: any) => r.fieldKey === activeSpec.type || activeSpec.aliases.includes(r.fieldKey)
                    );
                    if (activeAiDocCheck && activeAiDocCheck.colorStatus === 'RED') {
                      return (
                        <div className="p-2.5 rounded-xl bg-rose-100/90 border border-rose-300 text-xs text-rose-950 flex items-start gap-2 shrink-0 font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-extrabold text-rose-800">
                              {activeAiDocCheck.isUnsubmitted ? 'Mandatory Document Missing: ' : 'AI Confirmed Discrepancy: '}
                            </span>
                            <span>{activeAiDocCheck.suggestedReason || activeAiDocCheck.note}</span>
                          </div>
                        </div>
                      );
                    }
                    if (activeDoc?.status === 'FLAGGED_ERROR' || activeDocFlag) {
                      return (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 shrink-0">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold">Active Office Remark: </span>
                            <span>{activeDoc.flagReason || activeDocFlag?.reason || 'Correction requested'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Document Rendering (PDF iframe or Image with Scroll Zoom) */}
                  <div className="flex-1 w-full bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden relative flex items-center justify-center">
                    {activeDoc.fileMimeType?.includes('image') ||
                    activeDoc.fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) ||
                    activeSpec.type === 'PROFILE_PHOTO' ? (
                      <div className="w-full h-full overflow-hidden flex items-center justify-center p-4">
                        <img
                          src={getDocPreviewUrl(activeDoc)}
                          alt={activeDoc.fileName}
                          style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                            cursor: zoomLevel > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                          }}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-sm pointer-events-auto"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      // Native Inline PDF Frame Viewer with Zero Download Prompt
                      <div className="w-full h-full flex flex-col bg-slate-100 relative">
                        <iframe
                          key={activeDoc.id || activeDoc.fileName}
                          src={`${getDocPreviewUrl(activeDoc)}#view=FitH&toolbar=1&navpanes=0`}
                          className="w-full h-full border-0 rounded-xl"
                          title={activeDoc.fileName}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // DOCUMENT NOT UPLOADED PLACEHOLDER
                <div className="w-full max-w-md my-auto p-8 rounded-2xl bg-white shadow-sm border border-slate-200 text-center flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <FileWarning className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {activeSpec.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {activeSpec.description}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 w-full">
                    {activeSpec.isRequired ? (
                      <span className="text-amber-800 font-bold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Mandatory Document: Not Uploaded by Student</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Optional / Category Document: Not Uploaded
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      openFlagModal(
                        activeSpec.type,
                        activeSpec.fullName
                      )
                    }
                    className="mt-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-600" />
                    <span>Flag Missing Document & Request Upload</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ======================================================== */}
          {/* PANE 2: SIDE-BY-SIDE TEXTUAL DATA & DISCREPANCY RECONCILIATION */}
          {/* ======================================================== */}
          {layoutMode !== 'fullscreen' && (
            <section
              className={`flex flex-col bg-white min-w-0 transition-all duration-200 ${
                layoutMode === 'wide' ? 'w-full md:w-[40%] lg:w-[38%]' : 'w-full md:w-1/2'
              }`}
            >
              {/* Header */}
              <div className="h-10 px-4 bg-slate-50 flex items-center justify-between border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00236f]">
                  <span className="material-symbols-outlined text-[18px]">fact_check</span>
                  <span>Student Form Reconciliation Grid (5 Stages)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {stagedFlags.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                      <span>{stagedFlags.length} Staged</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Fields Sections: Clean Labels without Bracket Descriptions */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* AI Automated Audit Banner (when scanned) */}
                {aiSummary && showAiBanner && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs space-y-2.5 animate-fadeIn shadow-sm ${
                      aiSummary.status === 'ALL_MATCHED'
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50/90 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-sm">
                        <Bot
                          className={`w-4 h-4 ${
                            aiSummary.status === 'ALL_MATCHED' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        />
                        <span>AI Document & Field Verification Report</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            aiSummary.status === 'ALL_MATCHED'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          Match Score: {aiSummary.overallMatchScore}%
                        </span>
                      </div>
                      <button
                        onClick={() => setShowAiBanner(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Live Tri-Color Status Breakdown */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>{aiSummary.stats?.greenCount || 0} Matched (Green)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>{aiSummary.stats?.yellowCount || 0} Uncertain (Yellow)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                        <span>{aiSummary.stats?.redCount || 0} Auto-Flagged (Red)</span>
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed font-medium">
                      {aiSummary.summary}
                    </p>

                    {aiSummary.suggestedFlags && aiSummary.suggestedFlags.length > 0 && (
                      <div className="pt-1 flex items-center justify-between border-t border-rose-200/80">
                        <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                          <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                          <span>{aiSummary.suggestedFlags.length} confirmed discrepancies automatically flagged</span>
                        </span>
                        <button
                          onClick={handleDispatchFlags}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Discrepancy Notice ({stagedFlags.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {actionMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      actionMessage.type === 'success'
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>{actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* STEP 1: PERSONAL & IDENTITY DATA */}
                {/* ---------------------------------------------------- */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#00236f] text-white flex items-center justify-center font-bold text-[10px]">
                        1
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Personal & Identity Data
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Step 1</span>
                  </div>

                  {/* Candidate English Names */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'First Name',
                      'firstName',
                      selectedStudent?.firstName || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'Last Name',
                      'lastName',
                      selectedStudent?.lastName || 'Not Provided'
                    )}
                  </div>

                  {/* Candidate Malayalam Names */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'മലയാളത്തിൽ പേര്',
                      'firstNameMalayalam',
                      selectedStudent?.firstNameMalayalam || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'മലയാളത്തിൽ അവസാന പേര്',
                      'lastNameMalayalam',
                      selectedStudent?.lastNameMalayalam || 'Not Provided'
                    )}
                  </div>

                  {/* Father's Name & Father's Occupation */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      "Father's Name",
                      'fatherName',
                      selectedStudent?.fatherName || selectedStudent?.parentName || 'Not Provided'
                    )}
                    {renderFieldRow(
                      "Father's Occupation",
                      'fatherOccupation',
                      selectedStudent?.fatherOccupation || selectedStudent?.parentOccupation || 'Not Provided'
                    )}
                  </div>

                  {/* Mother's Name & Mother's Occupation */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      "Mother's Name",
                      'motherName',
                      selectedStudent?.motherName || 'Not Provided'
                    )}
                    {renderFieldRow(
                      "Mother's Occupation",
                      'motherOccupation',
                      selectedStudent?.motherOccupation || 'Not Provided'
                    )}
                  </div>

                  {/* Guardian Name & Guardian Occupation */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Guardian Name',
                      'guardianName',
                      selectedStudent?.guardianName || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'Guardian Occupation',
                      'guardianOccupation',
                      selectedStudent?.guardianOccupation || 'Not Provided'
                    )}
                  </div>

                  {/* Permanent Residential Address */}
                  {renderFieldRow(
                    'Permanent Residential Address',
                    'permanentAddress',
                    selectedStudent?.permanentAddress || selectedStudent?.address || 'Not Provided'
                  )}

                  {/* Date of Birth & Nationality */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Date of Birth',
                      'dob',
                      selectedStudent?.dob || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'Nationality',
                      'nationality',
                      selectedStudent?.nationality || 'Indian'
                    )}
                  </div>

                  {/* Gender & Blood Group */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Gender',
                      'gender',
                      selectedStudent?.gender || 'Not Specified'
                    )}
                    {renderFieldRow(
                      'Blood Group',
                      'bloodGroup',
                      selectedStudent?.bloodGroup || 'Not Specified'
                    )}
                  </div>

                  {/* Religion & Caste Category */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Religion',
                      'religion',
                      selectedStudent?.religion || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'Caste / Category',
                      'caste',
                      selectedStudent?.caste || 'General / Open'
                    )}
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* STEP 2: ADMISSION QUOTA & INCOME */}
                {/* ---------------------------------------------------- */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
                        2
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Admission Quota & Income
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Step 2</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Course Admitted',
                      'courseAdmitted',
                      selectedStudent?.courseAdmitted || 'BCA'
                    )}
                    {renderFieldRow(
                      'Admission Quota',
                      'quota',
                      selectedStudent?.quota || 'Merit'
                    )}
                  </div>

                  {renderFieldRow(
                    'Annual Family Income',
                    'annualIncome',
                    selectedStudent?.annualIncome !== undefined && selectedStudent?.annualIncome !== null
                      ? `₹${selectedStudent.annualIncome.toLocaleString('en-IN')}`
                      : 'Not Provided'
                  )}

                  {/* Live EWS Status Banner */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      selectedStudent?.isEws
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        className={`w-4 h-4 ${
                          selectedStudent?.isEws ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <div className="font-bold">
                          {selectedStudent?.isEws
                            ? 'EWS Eligible: Auto-Qualified (< ₹1,00,000)'
                            : 'General Category: Non-EWS (≥ ₹1,00,000)'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {selectedStudent?.isEws
                            ? 'Income is below ₹1,00,000 threshold. Revenue Village Income Certificate required.'
                            : 'Standard fee classification applies.'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedStudent?.isEws
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedStudent?.isEws ? 'EWS Tagged' : 'General'}
                    </span>
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* STEP 3: PRIOR ACADEMIC RECORDS */}
                {/* ---------------------------------------------------- */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                        3
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Prior Academic Records
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Step 3</span>
                  </div>

                  {renderFieldRow(
                    'Previous Institution',
                    'prevInstitutionName',
                    selectedStudent?.prevInstitutionName || 'Not Provided'
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Previous Stream',
                      'prevCourse',
                      selectedStudent?.prevCourse || 'Plus Two Science'
                    )}
                    {renderFieldRow(
                      'Board Register Number',
                      'prevRegisterNumber',
                      selectedStudent?.prevRegisterNumber || 'Not Provided'
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Board / University',
                      'prevBoardUniversity',
                      selectedStudent?.prevBoardUniversity || 'DHSE Kerala'
                    )}
                    {renderFieldRow(
                      'Period of Study',
                      'prevPeriodOfStudy',
                      selectedStudent?.prevPeriodOfStudy || '2022-2024'
                    )}
                  </div>

                  {renderFieldRow(
                    'Qualifying Marks / Percentage',
                    'prevPercentage',
                    selectedStudent?.prevPercentage !== undefined && selectedStudent?.prevPercentage !== null
                      ? `${selectedStudent.prevPercentage}%`
                      : 'Not Provided'
                  )}
                </div>

                {/* ---------------------------------------------------- */}
                {/* STEP 4: OFFICIAL CERTIFICATES AUDIT */}
                {/* ---------------------------------------------------- */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                        4
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Official Certificates Audit
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Step 4 Uploads</span>
                  </div>

                  <div className="space-y-1.5">
                    {DOCUMENT_SPECS.map((spec) => {
                      const doc = findDocForSpec(spec, selectedStudent?.documents);
                      const isUploaded = !!doc;
                      const isFlagged =
                        doc?.status === 'FLAGGED_ERROR' ||
                        stagedFlags.some((f) => f.key === spec.type || spec.aliases.includes(f.key)) ||
                        (selectedStudent?.fieldFlags && (
                          selectedStudent.fieldFlags[spec.type]?.status === 'FLAGGED_ERROR' ||
                          spec.aliases.some((a) => selectedStudent.fieldFlags[a]?.status === 'FLAGGED_ERROR')
                        ));

                      const aiDocCheck = aiSummary?.fieldResults?.find(
                        (r: any) => r.fieldKey === spec.type || spec.aliases.includes(r.fieldKey)
                      );

                      const isDocRed = aiDocCheck?.colorStatus === 'RED' || isFlagged;
                      const isDocYellow = !isDocRed && (aiDocCheck?.colorStatus === 'YELLOW');
                      const isDocGreen = !isDocRed && !isDocYellow && (aiDocCheck?.colorStatus === 'GREEN' || isUploaded);

                      return (
                        <div
                          key={spec.type}
                          className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs transition-all ${
                            isDocRed
                              ? 'bg-rose-50/90 border-rose-400 ring-1 ring-rose-400/80 shadow-xs'
                              : isDocYellow
                              ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                              : isDocGreen
                              ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                              : 'bg-slate-50/50 border-dashed border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`material-symbols-outlined text-[18px] ${
                                  isDocRed
                                    ? 'text-rose-600'
                                    : isDocYellow
                                    ? 'text-amber-600'
                                    : isDocGreen
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {spec.icon}
                              </span>
                              <div className="truncate">
                                <div className={`font-extrabold truncate ${
                                  isDocRed ? 'text-rose-950' : isDocYellow ? 'text-amber-950' : isDocGreen ? 'text-emerald-950' : 'text-slate-800'
                                }`}>
                                  {spec.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {isUploaded
                                    ? `${doc.fileName} (${formatFileSize(doc.fileSize)})`
                                    : spec.isRequired
                                    ? 'Mandatory - Not Uploaded'
                                    : 'Optional - Not Uploaded'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {aiDocCheck && (
                                isDocRed ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5 text-white" />
                                    {aiDocCheck.isUnsubmitted ? 'Unsubmitted' : 'AI Mismatch'} (Auto-Flagged)
                                  </span>
                                ) : isDocYellow ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black inline-flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Review Needed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black inline-flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" /> AI Validated
                                  </span>
                                )
                              )}

                              {isUploaded ? (
                                <button
                                  onClick={() => {
                                    setActiveDocSpecType(spec.type);
                                    setZoomLevel(100);
                                    setRotation(0);
                                    setPanOffset({ x: 0, y: 0 });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                                  title="Inspect this certificate in left viewer"
                                >
                                  <Eye className="w-3 h-3 text-[#00236f]" />
                                  <span>Inspect</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-rose-600 italic">
                                  Missing
                                </span>
                              )}

                              <button
                                onClick={() => openFlagModal(spec.type, spec.fullName)}
                                className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Flag this document"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Discrepancy Note */}
                          {isDocRed && aiDocCheck && (
                            <div className="text-[11px] text-rose-950 bg-rose-100/90 p-2 rounded-lg border border-rose-300 font-medium flex items-start gap-1.5 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-rose-800">
                                  {aiDocCheck.isUnsubmitted ? 'Mandatory Document Missing: ' : 'AI Discrepancy Found: '}
                                </span>
                                <span>{aiDocCheck.suggestedReason || aiDocCheck.note}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* STEP 5: BANK DETAILS & APAAR IDENTIFICATION */}
                {/* ---------------------------------------------------- */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                        5
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Bank Details & APAAR Identification
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Step 5</span>
                  </div>

                  {renderFieldRow(
                    'Name as in Bank Account',
                    'bankAccountName',
                    selectedStudent?.bankAccountName || 'Not Provided'
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Bank Name',
                      'bankName',
                      selectedStudent?.bankName || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'Branch Name',
                      'bankBranch',
                      selectedStudent?.bankBranch || 'Not Provided'
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {renderFieldRow(
                      'Account Number',
                      'bankAccountNumber',
                      selectedStudent?.bankAccountNumber || 'Not Provided'
                    )}
                    {renderFieldRow(
                      'IFSC Code',
                      'bankIfscCode',
                      selectedStudent?.bankIfscCode || 'Not Provided'
                    )}
                  </div>

                  {renderFieldRow(
                    'Aadhaar Number',
                    'aadhaarNumber',
                    selectedStudent?.aadhaarNumber || 'Not Provided'
                  )}

                  {renderFieldRow(
                    'APAAR / ABC ID',
                    'apaarId',
                    selectedStudent?.apaarId || 'Not Provided'
                  )}
                </div>

                {/* ---------------------------------------------------- */}
                {/* STAGED DISCREPANCIES PREVIEW LIST */}
                {/* ---------------------------------------------------- */}
                {stagedFlags.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-black text-rose-900">
                      <div className="flex items-center gap-1.5">
                        <Flag className="w-4 h-4 text-rose-600" />
                        <span>Staged Discrepancies Ready to Dispatch ({stagedFlags.length})</span>
                      </div>
                      <span className="text-[10px] text-rose-600 uppercase font-bold">Unsaved Draft</span>
                    </div>
                    {stagedFlags.map((f) => (
                      <div
                        key={f.key}
                        className="p-2.5 bg-white rounded-lg border border-rose-200 flex items-start justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <strong className="text-rose-800 block text-xs">{f.key}:</strong>
                          <span className="text-slate-600 text-xs mt-0.5 block">{f.reason}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveStagedFlag(f.key)}
                          className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                          title="Remove staged flag"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Sticky Bar */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 hidden xl:block">
                  Hotkeys: <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold">Alt+A</kbd> Approve •{' '}
                  <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold">Alt+N</kbd> Next
                </div>

                <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                  {stagedFlags.length > 0 && (
                    <button
                      disabled={actionLoading}
                      onClick={handleDispatchFlags}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Discrepancy Notice ({stagedFlags.length})</span>
                    </button>
                  )}

                  <button
                    disabled={actionLoading || selectedStudent?.verificationStatus === 'VERIFIED'}
                    onClick={handleApproveStudent}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {selectedStudent?.verificationStatus === 'VERIFIED'
                        ? 'Already Verified'
                        : 'Approve & Mark Verified'}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 3. FLAG DISCREPANCY MODAL */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Flag Discrepancy / Request Correction</span>
              </div>
              <button
                onClick={() => setFlagModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Flagging <strong className="text-slate-900">{flagTargetLabel}</strong> for applicant{' '}
              <strong className="text-slate-900">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </strong>
              . This will unlock the field in their mobile app and send an automated notification.
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Select Discrepancy Reason:
              </label>

              <div className="space-y-1.5 text-xs max-h-56 overflow-y-auto">
                {presetOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      flagReasonPreset === opt.id
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="flagPreset"
                      value={opt.id}
                      checked={flagReasonPreset === opt.id}
                      onChange={() => handleSelectPreset(opt.id)}
                      className="accent-rose-600 mt-0.5"
                    />
                    <div>
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.text}</div>
                    </div>
                  </label>
                ))}

                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    flagReasonPreset === 'CUSTOM'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="flagPreset"
                    value="CUSTOM"
                    checked={flagReasonPreset === 'CUSTOM'}
                    onChange={() => handleSelectPreset('CUSTOM')}
                    className="accent-rose-600"
                  />
                  <span>Custom Discrepancy Note</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instructions Sent to Student:
                </label>
                <textarea
                  rows={3}
                  value={flagCustomReason}
                  onChange={(e) => setFlagCustomReason(e.target.value)}
                  placeholder="Explain exactly what the student needs to correct..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setFlagModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStageFlag}
                disabled={!flagCustomReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm disabled:opacity-50"
              >
                Stage Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render an individual field comparison card without bracketed descriptions
  function renderFieldRow(
    label: string,
    key: string,
    value: string
  ) {
    const flagInfo = getFieldFlagInfo(key);
    const aiCheck = aiSummary?.fieldResults?.find((r: any) => r.fieldKey === key);

    const isRed = aiCheck?.colorStatus === 'RED' || flagInfo?.isFlagged || flagInfo?.isStaged;
    const isYellow = !isRed && (aiCheck?.colorStatus === 'YELLOW');
    const isGreen = !isRed && !isYellow && (aiCheck?.colorStatus === 'GREEN');

    return (
      <div
        key={key}
        className={`p-3 rounded-xl border transition-all text-xs ${
          isRed
            ? 'bg-rose-50/90 border-rose-400 ring-1 ring-rose-400/80 shadow-xs'
            : isYellow
            ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
            : isGreen
            ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`font-extrabold text-xs truncate ${
                isRed ? 'text-rose-950' : isYellow ? 'text-amber-950' : isGreen ? 'text-emerald-950' : 'text-slate-800'
              }`}
            >
              {label}
            </span>
            {aiCheck && (
              isGreen ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black inline-flex items-center gap-1 shadow-2xs">
                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" /> AI Matched
                </span>
              ) : isYellow ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black inline-flex items-center gap-1 shadow-2xs">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 stroke-[3]" /> AI Uncertain ({aiCheck.confidence}%)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black inline-flex items-center gap-1 shadow-xs animate-pulse">
                  <AlertCircle className="w-2.5 h-2.5 text-white" />
                  {aiCheck.isUnsubmitted ? 'Unsubmitted' : 'AI Mismatch'} (Auto-Flagged)
                </span>
              )
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {flagInfo?.isStaged ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black flex items-center gap-1">
                <Flag className="w-3 h-3 text-rose-600 fill-rose-600" /> Auto-Flagged
              </span>
            ) : flagInfo?.isFlagged ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" /> Flagged
              </span>
            ) : (
              <button
                onClick={() => openFlagModal(key, label)}
                className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold text-[10px] flex items-center gap-1 transition-colors"
                title="Flag Error for Student"
              >
                <Flag className="w-3 h-3 text-rose-500" />
                <span>Flag</span>
              </button>
            )}
          </div>
        </div>

        {/* Portal Value Display */}
        <div
          className={`mt-1.5 p-2 rounded-lg border flex items-center justify-between ${
            isRed
              ? 'bg-white/95 border-rose-300 text-rose-950 font-bold'
              : isYellow
              ? 'bg-white/95 border-amber-300 text-amber-950 font-medium'
              : isGreen
              ? 'bg-white/95 border-emerald-300 text-emerald-950 font-bold'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <span
            className={`text-xs ${
              value === 'Not Provided' || value === 'Not Specified'
                ? 'text-rose-600 italic font-semibold'
                : ''
            }`}
          >
            {value}
          </span>
          <span className="text-[10px] font-mono text-slate-400">key: {key}</span>
        </div>

        {/* AI Finding Note / Discrepancy details */}
        {aiCheck && aiCheck.colorStatus === 'RED' && (
          <div className="mt-1.5 text-[11px] text-rose-950 bg-rose-100/90 p-2 rounded-lg border border-rose-300 flex items-start gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-rose-800">
                {aiCheck.isUnsubmitted ? 'Mandatory Field Missing: ' : 'AI Confirmed Mismatch: '}
              </span>
              <span>{aiCheck.suggestedReason || aiCheck.note}</span>
            </div>
          </div>
        )}

        {aiCheck && aiCheck.colorStatus === 'YELLOW' && aiCheck.note && (
          <div className="mt-1.5 text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-lg border border-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-800">AI Observation: </span>
              <span>{aiCheck.note}</span>
            </div>
          </div>
        )}

        {/* Office Flag Remark if present */}
        {flagInfo && !aiCheck && (
          <div className="mt-1.5 text-[11px] text-rose-700 font-medium bg-rose-100/60 p-1.5 rounded-lg border border-rose-200">
            <strong>Remark: </strong> {flagInfo.reason}
          </div>
        )}
      </div>
    );
  }
};
