import React, { useState, useEffect } from 'react';
import { StudentProfile, StudentDocument } from '../types';
import { api } from '../services/api';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Flag,
  FileText,
  User,
  CreditCard,
  Building,
  GraduationCap,
  ExternalLink,
  X,
  Mail,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<string>('PLUS_TWO_CERTIFICATE');

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    timePeriodOfStudy: '',
    gender: '',
    religion: '',
    quota: '',
    isEws: '',
    verificationStatus: '',
  });

  // Flagging State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagTargetKey, setFlagTargetKey] = useState<string>('');
  const [flagReason, setFlagReason] = useState<string>('');
  const [flagStagedList, setFlagStagedList] = useState<Array<{ key: string; reason: string }>>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getStudents(filters);
      setStudents(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const handleApplyPreset = (preset: 'christianGirlsBCA' | 'pending' | 'ews') => {
    if (preset === 'christianGirlsBCA') {
      setFilters({
        ...filters,
        course: 'BCA',
        timePeriodOfStudy: '2024-2028',
        religion: 'Christian',
        gender: 'Female',
      });
    } else if (preset === 'pending') {
      setFilters({
        ...filters,
        verificationStatus: 'SUBMITTED',
      });
    } else if (preset === 'ews') {
      setFilters({
        ...filters,
        isEws: 'true',
      });
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      course: '',
      timePeriodOfStudy: '',
      gender: '',
      religion: '',
      quota: '',
      isEws: '',
      verificationStatus: '',
    });
  };

  const handleOpenStudentReview = async (studentId: string) => {
    try {
      const full = await api.getStudentById(studentId);
      setSelectedStudent(full);
      setFlagStagedList([]);
      if (full.documents && full.documents.length > 0) {
        setActiveDocTab(full.documents[0].type);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stageFlag = (key: string, label: string) => {
    setFlagTargetKey(key);
    setFlagReason('');
    setFlagModalOpen(true);
  };

  const handleConfirmStageFlag = () => {
    if (!flagReason.trim()) return;
    setFlagStagedList((prev) => [
      ...prev.filter((i) => i.key !== flagTargetKey),
      { key: flagTargetKey, reason: flagReason.trim() },
    ]);
    setFlagModalOpen(false);
    setFlagReason('');
  };

  const removeStagedFlag = (key: string) => {
    setFlagStagedList((prev) => prev.filter((i) => i.key !== key));
  };

  const handleDispatchFlags = async () => {
    if (!selectedStudent || flagStagedList.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.flagMistakes(selectedStudent.id, flagStagedList);
      setSelectedStudent(res.student);
      setFlagStagedList([]);
      setFeedbackMessage({
        text: 'Discrepancies flagged and college mail notification sent to student.',
        type: 'success',
      });
      fetchStudents();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to flag mistakes', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyStudent = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const res = await api.verifyStudent(selectedStudent.id);
      setSelectedStudent(res.student);
      setFeedbackMessage({ text: 'Student verified and approved successfully!', type: 'success' });
      fetchStudents();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to verify', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        );
      case 'CORRECTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3" /> Needs Correction
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
            <Clock className="w-3 h-3" /> Ready for Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Hub */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Office Verification Desk</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student admissions, inspect credentials, flag errors for student re-upload, and export filtered archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={api.getExcelExportUrl(filters)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export to Excel (.xlsx)
          </a>

          <a
            href={api.getDocumentsZipUrl(filters)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            <FolderArchive className="w-4 h-4" /> Download Documents (.ZIP)
          </a>

          <button
            onClick={fetchStudents}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Filter Presets */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Quick Filters:
        </span>
        <button
          onClick={() => handleApplyPreset('christianGirlsBCA')}
          className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border border-blue-200 transition-colors"
        >
          🎓 Christian Girls in BCA 2024-2028
        </button>
        <button
          onClick={() => handleApplyPreset('pending')}
          className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold border border-sky-200 transition-colors"
        >
          ⏳ Pending Office Verification
        </button>
        <button
          onClick={() => handleApplyPreset('ews')}
          className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200 transition-colors"
        >
          🏷️ EWS Students (Income &lt; ₹1L)
        </button>
        <button
          onClick={handleResetFilters}
          className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Search Student
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Name, Roll No, Phone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        {/* Course */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Course
          </label>
          <select
            value={filters.course}
            onChange={(e) => setFilters({ ...filters, course: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Courses</option>
            <option value="BCA">BCA</option>
            <option value="B.Com">B.Com</option>
            <option value="B.Sc CS">B.Sc CS</option>
            <option value="BA English">BA English</option>
            <option value="BBA">BBA</option>
          </select>
        </div>

        {/* Batch / Period */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Batch / Period
          </label>
          <select
            value={filters.timePeriodOfStudy}
            onChange={(e) => setFilters({ ...filters, timePeriodOfStudy: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Batches</option>
            <option value="2024-2028">2024-2028</option>
            <option value="2024-2027">2024-2027</option>
            <option value="2023-2027">2023-2027</option>
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Gender
          </label>
          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Religion */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Religion
          </label>
          <select
            value={filters.religion}
            onChange={(e) => setFilters({ ...filters, religion: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Religions</option>
            <option value="Christian">Christian</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Quota */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Admission Quota
          </label>
          <select
            value={filters.quota}
            onChange={(e) => setFilters({ ...filters, quota: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Quotas</option>
            <option value="Merit">Merit</option>
            <option value="Management">Management</option>
            <option value="Sports">Sports</option>
          </select>
        </div>

        {/* EWS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            EWS Category
          </label>
          <select
            value={filters.isEws}
            onChange={(e) => setFilters({ ...filters, isEws: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All</option>
            <option value="true">EWS Only (Income &lt; ₹1L)</option>
            <option value="false">Non-EWS</option>
          </select>
        </div>

        {/* Verification Status */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={filters.verificationStatus}
            onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Ready for Review (Submitted)</option>
            <option value="CORRECTION_REQUIRED">Needs Correction (Flagged)</option>
            <option value="VERIFIED">Verified & Approved</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700">
            Matching Students: <span className="text-blue-600 font-extrabold">{students.length}</span>
          </span>
          <span className="text-[11px] text-slate-400">Click "Review & Verify" to inspect credentials</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading records...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No students found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll / Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course & Batch</th>
                  <th className="py-3 px-4">Gender & Religion</th>
                  <th className="py-3 px-4">Quota & EWS</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {student.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {student.firstName} {student.lastName}
                      </div>
                      {(student.firstNameMalayalam || student.lastNameMalayalam) && (
                        <div className="text-[11px] font-malayalam text-blue-700">
                          {student.firstNameMalayalam} {student.lastNameMalayalam}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">{student.user?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{student.courseAdmitted || 'Pending'}</span>
                      <div className="text-[10px] text-slate-400">{student.timePeriodOfStudy}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{student.gender || 'N/A'}</span>
                      <div className="text-[10px] text-slate-400">{student.religion || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{student.quota || 'Merit'}</div>
                      {student.isEws ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          EWS (₹{student.annualIncome?.toLocaleString()})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Non-EWS</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(student.verificationStatus)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenStudentReview(student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-xs transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DUAL-PANE SIDE-BY-SIDE VERIFICATION WORKSPACE MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Top Bar */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">
                  {selectedStudent.firstName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    {(selectedStudent.firstNameMalayalam || selectedStudent.lastNameMalayalam) && (
                      <span className="font-malayalam text-xs text-blue-300">
                        ({selectedStudent.firstNameMalayalam} {selectedStudent.lastNameMalayalam})
                      </span>
                    )}
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-blue-200">
                      {selectedStudent.admissionNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Course: <strong className="text-white">{selectedStudent.courseAdmitted}</strong> • Batch:{' '}
                    {selectedStudent.timePeriodOfStudy} • Email: {selectedStudent.user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(selectedStudent.verificationStatus)}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification messages */}
            {feedbackMessage && (
              <div
                className={`p-3 text-xs font-bold flex items-center justify-between ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                <span>{feedbackMessage.text}</span>
                <button onClick={() => setFeedbackMessage(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Split Screen Workspace Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              {/* LEFT PANE: STUDENT PROFILE DATA (7 COLS) */}
              <div className="lg:col-span-6 p-6 overflow-y-auto space-y-6 border-r border-slate-200 bg-slate-50/40">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Application Form Data
                  </h4>
                  <span className="text-[11px] text-slate-400">Click 🚩 to flag any mismatch</span>
                </div>

                {/* Staged Flags Box */}
                {flagStagedList.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" /> Staged Corrections (
                        {flagStagedList.length}):
                      </span>
                      <button
                        onClick={handleDispatchFlags}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Mail className="w-3.5 h-3.5" /> Dispatch Mail & Unlock Fields
                      </button>
                    </div>
                    <ul className="text-xs text-rose-700 space-y-1">
                      {flagStagedList.map((item) => (
                        <li key={item.key} className="flex justify-between items-center bg-white/70 p-1.5 rounded">
                          <span>
                            <strong>{item.key}:</strong> {item.reason}
                          </span>
                          <button
                            onClick={() => removeStagedFlag(item.key)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Data Sections */}
                <div className="space-y-4 text-xs">
                  {/* Personal & Bilingual */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="font-bold text-slate-800 flex justify-between items-center border-b pb-1">
                      <span>Personal Information</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Full Name:</span>
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Name in Malayalam:</span>
                        <span className="font-malayalam font-bold text-blue-900">
                          {selectedStudent.firstNameMalayalam} {selectedStudent.lastNameMalayalam}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gender & DOB:</span>
                        {selectedStudent.gender || 'N/A'} • {selectedStudent.dob || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Blood Group:</span>
                        <span className="font-extrabold text-rose-600">{selectedStudent.bloodGroup}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Religion & Caste:</span>
                        {selectedStudent.religion} ({selectedStudent.caste || 'N/A'})
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nationality:</span>
                        {selectedStudent.nationality}
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">Permanent Address:</span>
                        {selectedStudent.permanentAddress || selectedStudent.address}
                      </div>
                    </div>
                  </div>

                  {/* Quota & EWS */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="font-bold text-slate-800 flex justify-between items-center border-b pb-1">
                      <span>Admission Quota & Financial Classification</span>
                      <button
                        onClick={() => stageFlag('annualIncome', 'Annual Income')}
                        className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-[11px]"
                      >
                        <Flag className="w-3 h-3" /> Flag Income
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Admitted Quota:</span>
                        <span className="font-bold">{selectedStudent.quota || 'Merit'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Annual Income:</span>
                        ₹{selectedStudent.annualIncome ? selectedStudent.annualIncome.toLocaleString() : 'N/A'}
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">EWS Eligibility:</span>
                        {selectedStudent.isEws ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            EWS (Income &lt; 1 Lakh)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">Non-EWS</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Academic Previous Details */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="font-bold text-slate-800 flex justify-between items-center border-b pb-1">
                      <span>12th / Qualifying Credentials</span>
                      <button
                        onClick={() => stageFlag('prevPercentage', '12th Percentage')}
                        className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-[11px]"
                      >
                        <Flag className="w-3 h-3" /> Flag Percentage
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">School:</span>
                        {selectedStudent.prevInstitutionName || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Course Stream:</span>
                        {selectedStudent.prevCourse || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Register No:</span>
                        <span className="font-mono">{selectedStudent.prevRegisterNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Board:</span>
                        {selectedStudent.prevBoardUniversity || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Percentage Secured:</span>
                        <span className="font-bold text-blue-700">
                          {selectedStudent.prevPercentage ? `${selectedStudent.prevPercentage}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bank & APAAR */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="font-bold text-slate-800 flex justify-between items-center border-b pb-1">
                      <span>Bank Account & APAAR Registry</span>
                      <button
                        onClick={() => stageFlag('bankAccountNumber', 'Bank Details')}
                        className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-[11px]"
                      >
                        <Flag className="w-3 h-3" /> Flag Bank Info
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Holder:</span>
                        {selectedStudent.bankAccountName || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bank & Branch:</span>
                        {selectedStudent.bankName || 'N/A'} ({selectedStudent.bankBranch || 'N/A'})
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account No:</span>
                        <span className="font-mono">{selectedStudent.bankAccountNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">IFSC Code:</span>
                        <span className="font-mono">{selectedStudent.bankIfscCode || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">APAAR / ABC ID:</span>
                        <span className="font-mono font-bold text-indigo-900">
                          {selectedStudent.apaarId || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: DOCUMENT & PDF VIEWER (6 COLS) */}
              <div className="lg:col-span-6 p-6 flex flex-col bg-slate-100 overflow-hidden">
                {/* Document Type Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200">
                  {[
                    { type: 'PLUS_TWO_CERTIFICATE', label: '+2 Marksheet' },
                    { type: 'SSLC_CERTIFICATE', label: '10th SSLC' },
                    { type: 'ALLOTMENT_MEMO', label: 'Allotment' },
                    { type: 'CASTE_CERTIFICATE', label: 'Caste' },
                    { type: 'INCOME_CERTIFICATE', label: 'Income' },
                    { type: 'COMMUNITY_CERTIFICATE', label: 'Community' },
                    { type: 'BANK_PASSBOOK', label: 'Passbook' },
                    { type: 'APAAR_DOCUMENT', label: 'APAAR' },
                  ].map((tab) => {
                    const doc = selectedStudent.documents?.find((d) => d.type === tab.type);
                    const isActive = activeDocTab === tab.type;
                    return (
                      <button
                        key={tab.type}
                        onClick={() => setActiveDocTab(tab.type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : doc
                            ? 'bg-white text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {tab.label}
                        {doc && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Active Document Viewer */}
                {(() => {
                  const doc = selectedStudent.documents?.find((d) => d.type === activeDocTab);
                  return (
                    <div className="flex-1 mt-3 flex flex-col bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-inner">
                      {doc ? (
                        <>
                          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                              {doc.fileName}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => stageFlag(doc.type, doc.type.replace(/_/g, ' '))}
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 border border-rose-200"
                              >
                                <Flag className="w-3 h-3" /> Flag Document
                              </button>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-500 hover:text-blue-600"
                                title="Open in new window"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>

                          <div className="flex-1 bg-slate-200 flex items-center justify-center overflow-auto">
                            {doc.fileMimeType === 'application/pdf' ? (
                              <iframe
                                src={`${doc.fileUrl}#toolbar=0`}
                                title={doc.fileName}
                                className="w-full h-full border-none"
                              />
                            ) : (
                              <img
                                src={doc.fileUrl}
                                alt={doc.fileName}
                                className="max-h-full max-w-full object-contain p-4"
                              />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                          <FileText className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                          <h5 className="text-xs font-bold text-slate-600">No Document Uploaded</h5>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                            Student has not attached this certificate yet.
                          </p>
                          <button
                            onClick={() => stageFlag(activeDocTab, activeDocTab.replace(/_/g, ' '))}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1"
                          >
                            <Flag className="w-3.5 h-3.5" /> Flag as Missing
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Bottom Approval Action Bar */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Close Workspace
              </button>

              <div className="flex items-center gap-3">
                {flagStagedList.length > 0 && (
                  <button
                    onClick={handleDispatchFlags}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                  >
                    <Mail className="w-4 h-4" /> Send ({flagStagedList.length}) Flags to Student
                  </button>
                )}

                <button
                  onClick={handleVerifyStudent}
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4" /> Set Status = VERIFIED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE FLAG DIALOG MODAL */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" /> Flag Discrepancy: {flagTargetKey}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Provide specific feedback so the student knows exactly how to correct this field or document.
            </p>

            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g. Scanned certificate is blurry, or percentage entered doesn't match marksheet."
              className="w-full mt-3 p-3 text-xs border rounded-xl border-slate-300 focus:ring-2 focus:ring-rose-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFlagModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStageFlag}
                disabled={!flagReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Add Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
