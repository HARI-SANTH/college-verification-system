import React, { useState, useEffect } from 'react';
import { StudentProfile, DocumentType } from '../types';
import { api } from '../services/api';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  Lock,
  CheckCircle,
  FileText,
  User,
  Building,
  CreditCard,
  GraduationCap,
  Save,
  Info,
} from 'lucide-react';

interface Props {
  profile: StudentProfile;
  onProfileUpdated: (updated: StudentProfile) => void;
  onBackToCard: () => void;
}

export const StudentForm: React.FC<Props> = ({ profile, onProfileUpdated, onBackToCard }) => {
  const isLocked = profile.verificationStatus === 'SUBMITTED' || profile.verificationStatus === 'VERIFIED';
  const isCorrectionMode = profile.verificationStatus === 'CORRECTION_REQUIRED';
  const flags = profile.fieldFlags || {};

  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    firstNameMalayalam: profile.firstNameMalayalam || '',
    lastNameMalayalam: profile.lastNameMalayalam || '',
    permanentAddress: profile.permanentAddress || profile.address || '',
    courseAdmitted: profile.courseAdmitted || 'BCA',
    quota: profile.quota || 'Merit',
    gender: profile.gender || 'Male',
    dob: profile.dob || '2006-01-01',
    nationality: profile.nationality || 'Indian',
    religion: profile.religion || 'Christian',
    caste: profile.caste || '',
    annualIncome: profile.annualIncome ? String(profile.annualIncome) : '',
    isEws: profile.isEws || false,

    parentName: profile.parentName || '',
    parentOccupation: profile.parentOccupation || '',
    guardianName: profile.guardianName || '',
    guardianOccupation: profile.guardianOccupation || '',

    bankAccountName: profile.bankAccountName || '',
    bankName: profile.bankName || '',
    bankBranch: profile.bankBranch || '',
    bankAccountNumber: profile.bankAccountNumber || '',
    bankIfscCode: profile.bankIfscCode || '',

    prevInstitutionName: profile.prevInstitutionName || '',
    prevCourse: profile.prevCourse || 'Computer Science',
    prevRegisterNumber: profile.prevRegisterNumber || '',
    prevBoardUniversity: profile.prevBoardUniversity || 'Kerala State Board (DHSE)',
    prevPeriodOfStudy: profile.prevPeriodOfStudy || '2022-2024',
    prevPercentage: profile.prevPercentage ? String(profile.prevPercentage) : '',

    apaarId: profile.apaarId || '',
  });

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-compute EWS whenever annualIncome changes:
  // Rule: if income is provided and < 100,000 (1 Lakh), EWS = true, else false
  const handleIncomeChange = (val: string) => {
    const num = parseFloat(val);
    const ewsValue = !isNaN(num) && num > 0 && num < 100000;
    setFormData((prev) => ({
      ...prev,
      annualIncome: val,
      isEws: ewsValue,
    }));
  };

  const isFieldDisabled = (fieldName: string) => {
    if (isLocked) return true;
    if (isCorrectionMode) {
      // In correction mode, field is disabled UNLESS it is flagged
      return flags[fieldName]?.status !== 'FLAGGED_ERROR';
    }
    return false;
  };

  const isDocDisabled = (docType: string) => {
    if (isLocked) return true;
    if (isCorrectionMode) {
      return flags[docType]?.status !== 'FLAGGED_ERROR';
    }
    return false;
  };

  const handleDocUpload = async (docType: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docType);
    setErrorMessage(null);
    try {
      const res = await api.uploadDocument(docType, file);
      // Refresh profile
      const updatedProfile = await api.getStudentProfile();
      onProfileUpdated(updatedProfile);
      setSuccessMessage(`${docType.replace(/_/g, ' ')} uploaded successfully.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async (isFinal: boolean) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        ...formData,
        annualIncome: formData.annualIncome ? parseFloat(formData.annualIncome) : null,
        prevPercentage: formData.prevPercentage ? parseFloat(formData.prevPercentage) : null,
        isFinalSubmission: isFinal,
      };

      const res = await api.updateStudentProfile(payload);
      onProfileUpdated(res.profile);
      setSuccessMessage(
        isFinal
          ? 'Application successfully submitted to the college office for verification!'
          : 'Draft information saved successfully.'
      );
      if (isFinal) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save changes');
    } finally {
      setSubmitting(false);
    }
  };

  const getDoc = (type: DocumentType) => profile.documents?.find((d) => d.type === type);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={onBackToCard}
            className="text-xs font-semibold text-blue-200 hover:text-white mb-2 flex items-center gap-1.5 transition-colors"
          >
            ← Back to Digital ID Card
          </button>
          <h2 className="text-2xl font-bold tracking-tight">Student Admission & Verification Form</h2>
          <p className="text-xs text-blue-200 mt-1">
            Roll / Admission No: <span className="font-mono font-bold text-white">{profile.admissionNumber}</span> • Batch: {profile.timePeriodOfStudy}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile.verificationStatus === 'VERIFIED' && (
            <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Verified & Locked
            </div>
          )}
          {profile.verificationStatus === 'SUBMITTED' && (
            <div className="bg-sky-500/20 border border-sky-400 text-sky-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              Submitted • Under Office Review
            </div>
          )}
          {profile.verificationStatus === 'CORRECTION_REQUIRED' && (
            <div className="bg-amber-500/20 border border-amber-400 text-amber-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Action Required: Office Flagged Items
            </div>
          )}
        </div>
      </div>

      {/* Flagged Alert Banner if in correction mode */}
      {isCorrectionMode && (
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                The College Office has requested corrections
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Only the fields or documents highlighted with red badges have been unlocked. Please update them and click "Resubmit Corrections" below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-4 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 p-4 text-rose-800 text-sm flex items-center gap-2 font-medium">
          <AlertTriangle className="w-5 h-5 text-rose-600" /> {errorMessage}
        </div>
      )}

      <div className="p-6 sm:p-8 space-y-10">
        {/* SECTION 1: PROFILE PICTURE */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" /> 1. Profile Photo
          </h3>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-32 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center relative shadow-inner">
              {getDoc('PROFILE_PHOTO') ? (
                <img
                  src={getDoc('PROFILE_PHOTO')?.fileUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2 text-slate-400 text-xs">
                  <User className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  No Photo
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm ${
                  isDocDisabled('PROFILE_PHOTO')
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                {uploadingDoc === 'PROFILE_PHOTO' ? 'Uploading...' : 'Upload Student Photo (JPG/PNG)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isDocDisabled('PROFILE_PHOTO')}
                  onChange={(e) => handleDocUpload('PROFILE_PHOTO', e)}
                  className="hidden"
                />
              </label>
              {flags['PROFILE_PHOTO'] && (
                <div className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Note: {flags['PROFILE_PHOTO'].reason}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Clear formal passport-size photo. Max file size: 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL & BILINGUAL MALAYALAM DETAILS */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" /> 2. Personal & Bilingual Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                First Name (English)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('firstName')}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  flags['firstName']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('firstName')
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {flags['firstName'] && (
                <p className="text-xs text-rose-600 mt-1 font-semibold">{flags['firstName'].reason}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-malayalam">
                First Name in Malayalam (ആദ്യ പേര്)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('firstNameMalayalam')}
                placeholder="ഉദാ: അനന്യ"
                value={formData.firstNameMalayalam}
                onChange={(e) => setFormData({ ...formData, firstNameMalayalam: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-malayalam transition-all ${
                  flags['firstNameMalayalam']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('firstNameMalayalam')
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Last Name (English)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('lastName')}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  flags['lastName']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('lastName')
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-malayalam">
                Last Name in Malayalam (അവസാന പേര്)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('lastNameMalayalam')}
                placeholder="ഉദാ: ജോസഫ്"
                value={formData.lastNameMalayalam}
                onChange={(e) => setFormData({ ...formData, lastNameMalayalam: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-malayalam transition-all ${
                  flags['lastNameMalayalam']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('lastNameMalayalam')
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Permanent Address with PIN
              </label>
              <textarea
                rows={2}
                disabled={isFieldDisabled('permanentAddress')}
                value={formData.permanentAddress}
                onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm transition-all ${
                  flags['permanentAddress']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('permanentAddress')
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                disabled={isFieldDisabled('gender')}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                disabled={isFieldDisabled('dob')}
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Religion
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('religion')}
                placeholder="Christian, Hindu, Muslim, etc."
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Caste / Community
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('caste')}
                placeholder="e.g. RCSC, Nair, Ezhava, Mappila"
                value={formData.caste}
                onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: COURSE, QUOTA & DYNAMIC AUTO-EWS */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-blue-600" /> 3. Course, Quota & Financial Classification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Course Admitted
              </label>
              <select
                disabled={isFieldDisabled('courseAdmitted')}
                value={formData.courseAdmitted}
                onChange={(e) => setFormData({ ...formData, courseAdmitted: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                <option value="B.Com">B.Com (Finance / Co-operation)</option>
                <option value="B.Sc CS">B.Sc Computer Science</option>
                <option value="BA English">BA English Literature</option>
                <option value="BBA">BBA (Business Administration)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admission Quota
              </label>
              <select
                disabled={isFieldDisabled('quota')}
                value={formData.quota}
                onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Merit">Merit Quota</option>
                <option value="Management">Management Quota</option>
                <option value="Sports">Sports Quota</option>
                <option value="Cultural">Cultural Quota</option>
                <option value="Community">Community Quota</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Annual Family Income (₹)
              </label>
              <input
                type="number"
                disabled={isFieldDisabled('annualIncome')}
                placeholder="e.g. 75000"
                value={formData.annualIncome}
                onChange={(e) => handleIncomeChange(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  flags['annualIncome']
                    ? 'border-rose-500 bg-rose-50'
                    : isFieldDisabled('annualIncome')
                    ? 'bg-slate-100 border-slate-200'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Dynamic EWS Classification Card */}
          <div className="mt-4 p-4 rounded-xl border flex items-center justify-between bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                  formData.isEws ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                EWS
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Economically Weaker Section (EWS) Status:
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded text-xs font-extrabold ${
                      formData.isEws ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {formData.isEws ? 'YES (Income < ₹1,00,000)' : 'NO (Income ≥ ₹1,00,000)'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Automatically calculated by comparing declared annual income against the ₹1,00,000 threshold.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: PREVIOUS ACADEMIC DETAILS */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-blue-600" /> 4. Previous Academic Credentials (10th & 12th)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Name of Institution (12th / Plus Two)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('prevInstitutionName')}
                value={formData.prevInstitutionName}
                onChange={(e) => setFormData({ ...formData, prevInstitutionName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Stream / Course
              </label>
              <select
                disabled={isFieldDisabled('prevCourse')}
                value={formData.prevCourse}
                onChange={(e) => setFormData({ ...formData, prevCourse: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Commerce">Commerce</option>
                <option value="BioMath">Bio-Mathematics / Science</option>
                <option value="Humanities">Humanities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Board / University
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('prevBoardUniversity')}
                value={formData.prevBoardUniversity}
                onChange={(e) => setFormData({ ...formData, prevBoardUniversity: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                12th Board Register Number
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('prevRegisterNumber')}
                value={formData.prevRegisterNumber}
                onChange={(e) => setFormData({ ...formData, prevRegisterNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Percentage / Marks Secured (%)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isFieldDisabled('prevPercentage')}
                value={formData.prevPercentage}
                onChange={(e) => setFormData({ ...formData, prevPercentage: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  flags['prevPercentage']
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : isFieldDisabled('prevPercentage')
                    ? 'bg-slate-100 border-slate-200'
                    : 'border-slate-300'
                }`}
              />
              {flags['prevPercentage'] && (
                <p className="text-xs text-rose-600 mt-1 font-semibold">{flags['prevPercentage'].reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: BANK DETAILS & APAAR ID */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-blue-600" /> 5. Bank Account & APAAR ID
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Name as in Bank Account
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('bankAccountName')}
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('bankName')}
                placeholder="e.g. State Bank of India"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Branch Name
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('bankBranch')}
                value={formData.bankBranch}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Number
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('bankAccountNumber')}
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('bankIfscCode')}
                value={formData.bankIfscCode}
                onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                APAAR ID (Automated Permanent Academic Account Registry)
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('apaarId')}
                placeholder="12-digit APAAR/ABC ID"
                value={formData.apaarId}
                onChange={(e) => setFormData({ ...formData, apaarId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: PARENT & GUARDIAN */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" /> 6. Parent & Guardian Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Parent Name
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('parentName')}
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Parent Occupation
              </label>
              <input
                type="text"
                disabled={isFieldDisabled('parentOccupation')}
                value={formData.parentOccupation}
                onChange={(e) => setFormData({ ...formData, parentOccupation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 7: DOCUMENT & CERTIFICATE UPLOADS (PDF) */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-blue-600" /> 7. Mandatory Certificates & Document Uploads (PDF)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[
              { type: 'PLUS_TWO_CERTIFICATE', label: 'Plus Two (+2) Marksheet / Certificate' },
              { type: 'SSLC_CERTIFICATE', label: '10th / SSLC Certificate' },
              { type: 'ALLOTMENT_MEMO', label: 'College Allotment Memo' },
              { type: 'CASTE_CERTIFICATE', label: 'Caste Certificate (if applicable)' },
              { type: 'INCOME_CERTIFICATE', label: 'Income Certificate (for EWS / Scholarships)' },
              {
                type: 'COMMUNITY_CERTIFICATE',
                label: 'Community Certificate (Required for Management Quota)',
                requiredQuota: 'Management',
              },
              { type: 'BANK_PASSBOOK', label: 'Bank Passbook Front Page (with IFSC & A/C No)' },
              { type: 'APAAR_DOCUMENT', label: 'APAAR / ABC Card PDF' },
            ].map((item) => {
              const doc = getDoc(item.type as DocumentType);
              const disabled = isDocDisabled(item.type);
              const isFlagged = flags[item.type]?.status === 'FLAGGED_ERROR';

              // If community cert and not management quota, show note
              const isConditionalHidden =
                item.requiredQuota && formData.quota !== item.requiredQuota;

              return (
                <div
                  key={item.type}
                  className={`p-4 rounded-xl border transition-all ${
                    isFlagged
                      ? 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-200'
                      : doc
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                      {isConditionalHidden && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Only required if quota is set to {item.requiredQuota}.
                        </p>
                      )}
                    </div>
                    {doc ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FileCheck className="w-3 h-3" /> Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  {isFlagged && (
                    <div className="mt-2 text-xs font-semibold text-rose-600 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{flags[item.type]?.reason}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    {doc ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline truncate max-w-[180px]"
                      >
                        {doc.fileName}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No document uploaded</span>
                    )}

                    <label
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm ${
                        disabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingDoc === item.type ? 'Uploading...' : doc ? 'Replace' : 'Upload PDF'}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        disabled={disabled}
                        onChange={(e) => handleDocUpload(item.type as DocumentType, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onBackToCard}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            ← View Digital ID Card
          </button>

          <div className="w-full sm:w-auto flex items-center gap-3">
            {/* Draft Save button if not locked */}
            {!isLocked && !isCorrectionMode && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
            )}

            {/* Submit / Resubmit button */}
            {!isLocked && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isCorrectionMode
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {submitting
                  ? 'Submitting...'
                  : isCorrectionMode
                  ? 'Resubmit Corrections to Office'
                  : 'Submit Application for Verification'}
              </button>
            )}

            {isLocked && (
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                Form is locked. Only the college office can unlock fields for corrections.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
