import React, { useState } from 'react';
import { StudentProfile } from '../../types';
import { api } from '../../services/api';

interface Props {
  students: StudentProfile[];
  onSelectStudent: (studentId: string) => void;
  onRefresh: () => void;
}

export const VerificationQueueDesk: React.FC<Props> = ({
  students,
  onSelectStudent,
  onRefresh,
}) => {
  const [activeBucket, setActiveBucket] = useState<'resubmissions' | 'inflow' | 'pending'>('resubmissions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedQuota, setSelectedQuota] = useState('ALL');
  const [sortBy, setSortBy] = useState<'urgency' | 'id' | 'marks'>('urgency');

  // Deletion modal state
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('Duplicate Entry / Registered Twice');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteStudent(studentToDelete.id, deleteReason);
      setStudentToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete student: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Real calculations based on database fields
  // Resubmissions: students who had flags in fieldFlags or previous corrections and are ready for re-check
  const resubmissionsList = students.filter((s) => {
    const hasFlags = s.fieldFlags && typeof s.fieldFlags === 'object' && Object.keys(s.fieldFlags).length > 0;
    return s.verificationStatus === 'DRAFT' && hasFlags;
  });

  // Fresh Inflow: submitted profiles awaiting first-time audit
  const freshInflowList = students.filter((s) => s.verificationStatus === 'SUBMITTED');

  // Waiting on student: flagged / notice sent
  const waitingList = students.filter((s) => s.verificationStatus === 'CORRECTION_REQUIRED');

  // Verified count
  const verifiedCount = students.filter((s) => s.verificationStatus === 'VERIFIED').length;

  // Determine current active list based on bucket
  let currentList =
    activeBucket === 'resubmissions'
      ? resubmissionsList
      : activeBucket === 'inflow'
      ? freshInflowList
      : waitingList;

  // If active bucket is empty but another has items, auto-select non-empty
  // (e.g. if 0 resubmissions, but fresh inflow exists)
  // We keep user selection flexible

  // Apply filters
  const filteredCandidates = currentList.filter((s) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      const matchId = (s.admissionNumber || '').toLowerCase().includes(q);
      const matchPhone = (s.user?.phoneNumber || '').toLowerCase().includes(q);
      const matchAadhaar = (s.aadhaarNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchPhone && !matchAadhaar) return false;
    }

    // Course filter
    if (selectedCourse !== 'ALL') {
      if ((s.courseAdmitted || '').toLowerCase() !== selectedCourse.toLowerCase()) {
        return false;
      }
    }

    // Quota filter
    if (selectedQuota !== 'ALL') {
      if ((s.quota || '').toLowerCase() !== selectedQuota.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (sortBy === 'id') {
      return (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
    }
    if (sortBy === 'marks') {
      return (b.prevPercentage || 0) - (a.prevPercentage || 0);
    }
    return 0; // default order
  });

  // Get photo preview url from documents
  const getPhotoUrl = (s: StudentProfile) => {
    const photoDoc = s.documents?.find((d) => d.type === 'PROFILE_PHOTO');
    if (photoDoc) {
      if (photoDoc.fileUrl) return photoDoc.fileUrl;
      return `/api/admin/documents/${photoDoc.id}/preview`;
    }
    return null;
  };

  // Format relative time helper
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Recently';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Distinct courses in DB
  const availableCourses = Array.from(
    new Set(students.map((s) => s.courseAdmitted).filter(Boolean))
  ) as string[];

  // Distinct quotas in DB
  const availableQuotas = Array.from(
    new Set(students.map((s) => s.quota).filter(Boolean))
  ) as string[];

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top Command Banner & Operational Telemetry */}
      <div className="w-full bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#00236f] tracking-tight">
                Admissions Verification Queue &amp; Smart Triage Desk
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse"></span>
                LIVE STREAM ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous inbox workflow • Prioritized verification queue for Baselios Poulose II Catholicose College
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Sync Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Tonal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Priority Resubmissions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                Priority Resubmissions
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1">
                {resubmissionsList.length}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-xs">bolt</span> Ready for Re-Check
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-teal-600">mobile_friendly</span>
            Students who corrected flagged errors on mobile
          </p>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, resubmissionsList.length > 0 ? (resubmissionsList.length / (students.length || 1)) * 100 : 0)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 2: Fresh Inflow */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1e3a8a]"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                Fresh Inflow
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1">
                {freshInflowList.length}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#00236f] text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-xs">inbox</span> Initial Verification
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-[#1e3a8a]">fact_check</span>
            New applications awaiting first-time audit
          </p>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#1e3a8a] h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, freshInflowList.length > 0 ? (freshInflowList.length / (students.length || 1)) * 100 : 0)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 3: Waiting on Student */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                Waiting on Student
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1">
                {waitingList.length}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-900 text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-xs">notification_important</span> Notice Dispatched
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-red-500">outgoing_mail</span>
            Errors flagged; awaiting candidate re-upload
          </p>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, waitingList.length > 0 ? (waitingList.length / (students.length || 1)) * 100 : 0)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 4: Verified Today */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                Verified Students
              </span>
              <span className="text-3xl font-black text-[#00236f] mt-1">
                {verifiedCount}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold flex items-center gap-1 shadow-xs border border-teal-200">
              <span className="material-symbols-outlined text-xs">verified</span> Completed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-teal-700">badge</span>
            Approved &amp; Digital College IDs issued
          </p>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, verifiedCount > 0 ? (verifiedCount / (students.length || 1)) * 100 : 0)}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Segmented Triage Buckets & Filter Bar */}
      <div className="flex flex-col gap-3">
        {/* Bucket Tabs Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/60 rounded-xl shadow-xs border border-slate-300/40">
            {/* Tab 1: Resubmissions */}
            <button
              onClick={() => setActiveBucket('resubmissions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeBucket === 'resubmissions'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              <span>Resubmissions</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeBucket === 'resubmissions'
                    ? 'bg-teal-300 text-teal-950'
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                {resubmissionsList.length}
              </span>
            </button>

            {/* Tab 2: Fresh Inflow */}
            <button
              onClick={() => setActiveBucket('inflow')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeBucket === 'inflow'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">inbox</span>
              <span>Fresh Inflow</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeBucket === 'inflow'
                    ? 'bg-blue-300 text-blue-950'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {freshInflowList.length}
              </span>
            </button>

            {/* Tab 3: Pending Student Action */}
            <button
              onClick={() => setActiveBucket('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeBucket === 'pending'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">hourglass_top</span>
              <span>Pending Student Action</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeBucket === 'pending'
                    ? 'bg-red-300 text-red-950'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {waitingList.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="material-symbols-outlined text-sm text-teal-600">tune</span>
            <span>Triage Mode: <strong className="text-slate-800">Priority Verification Flow</strong></span>
          </div>
        </div>

        {/* Universal Search & Complex Filter Row */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Universal Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Live filter by Student Name, Application ID, Mobile, or Aadhaar..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/80 focus:bg-white text-slate-900 text-xs placeholder:text-slate-400 outline-none border border-transparent focus:border-[#1e3a8a] transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Course Filter */}
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="appearance-none bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 pr-8 rounded-xl outline-none cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <option value="ALL">All Courses ({availableCourses.length})</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">
                expand_more
              </span>
            </div>

            {/* Quota Filter */}
            <div className="relative">
              <select
                value={selectedQuota}
                onChange={(e) => setSelectedQuota(e.target.value)}
                className="appearance-none bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 pr-8 rounded-xl outline-none cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <option value="ALL">All Quotas ({availableQuotas.length})</option>
                {availableQuotas.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">
                expand_more
              </span>
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 pr-8 rounded-xl outline-none cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <option value="urgency">Sort: Priority Inflow</option>
                <option value="id">Application ID</option>
                <option value="marks">12th Percentage (High to Low)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">
                sort
              </span>
            </div>

            {/* Reset Filter Button */}
            {(searchQuery || selectedCourse !== 'ALL' || selectedQuota !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCourse('ALL');
                  setSelectedQuota('ALL');
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Reset Filters"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Queue Stream (Real Candidates from DB) */}
      <div className="flex flex-col gap-3">
        {sortedCandidates.length === 0 ? (
          /* Empty Queue State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-4">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              All Caught Up! Zero pending verifications in this queue.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {activeBucket === 'resubmissions'
                ? 'No students are currently awaiting re-check after corrections.'
                : activeBucket === 'inflow'
                ? 'No fresh student submissions are waiting for initial verification.'
                : 'No students currently have active discrepancy notices dispatched.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setActiveBucket(activeBucket === 'resubmissions' ? 'inflow' : 'resubmissions')}
                className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#172554] transition-colors"
              >
                Switch Triage Bucket
              </button>
            </div>
          </div>
        ) : (
          sortedCandidates.map((student) => {
            const photoUrl = getPhotoUrl(student);
            const docsCount = student.documents?.length || 0;
            const percentage = student.prevPercentage;

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 group relative overflow-hidden"
              >
                {/* Visual side accent strip */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    activeBucket === 'resubmissions'
                      ? 'bg-teal-600'
                      : activeBucket === 'inflow'
                      ? 'bg-[#1e3a8a]'
                      : 'bg-red-500'
                  }`}
                />

                {/* Left: Avatar + Details */}
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  {/* Photo Avatar */}
                  <div className="relative shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${student.firstName} photo`}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#eff4ff] border border-blue-200 text-[#1e3a8a] font-bold text-sm flex items-center justify-center uppercase shadow-xs">
                        {student.firstName[0]}
                        {student.lastName[0] || ''}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 bg-[#1e3a8a] text-white text-[9px] font-bold px-1 rounded shadow-xs">
                      UG
                    </span>
                  </div>

                  {/* Bio & Academic Identity */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                        {student.admissionNumber}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-teal-700 font-semibold">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {formatTimeAgo((student as any).updatedAt || (student as any).createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#1e3a8a] font-semibold">
                        {student.courseAdmitted || 'UG Course Unassigned'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {student.quota || 'General Merit'}
                      </span>
                      {student.user?.phoneNumber && (
                        <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">phone</span>
                          {student.user.phoneNumber}
                        </span>
                      )}
                      {percentage != null && (
                        <span className="font-mono text-[11px] text-slate-600">
                          12th: <strong className="text-slate-900">{percentage}%</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Triage Status Badge + Action Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 justify-between xl:justify-end">
                  <div className="flex flex-col items-start sm:items-end">
                    {activeBucket === 'resubmissions' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-bold shadow-xs">
                        <span className="material-symbols-outlined text-sm">stars</span>
                        ★ Resubmitted: Corrections Received
                      </span>
                    ) : activeBucket === 'inflow' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-[#00236f] text-xs font-bold shadow-xs">
                        <span className="material-symbols-outlined text-sm">attachment</span>
                        Fresh Inflow • {docsCount} Documents Attached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-900 text-xs font-bold shadow-xs">
                        <span className="material-symbols-outlined text-sm">outgoing_mail</span>
                        Notice Dispatched • Awaiting Student Re-upload
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 mt-0.5 text-left sm:text-right">
                      {docsCount > 0 ? `${docsCount} uploaded files on record` : 'Documents pending upload'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStudentToDelete(student)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-all shadow-xs"
                      title="Purge / Delete Duplicate Record"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] whitespace-nowrap"
                    >
                      <span>Inspect &amp; Verify Dossier</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete / Purge Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Student Record</h3>
                <p className="text-xs text-slate-500">Purge duplicate entry or mistaken submission</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex flex-col gap-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{studentToDelete.firstName} {studentToDelete.lastName}</span>
                <span className="font-mono text-slate-600">{studentToDelete.admissionNumber}</span>
              </div>
              <div className="text-slate-500">{studentToDelete.courseAdmitted} • {studentToDelete.user?.email || 'No email'}</div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason for Deletion:</label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-500"
              >
                <option value="Duplicate Entry / Registered Twice">Duplicate Entry / Registered Twice</option>
                <option value="Mistaken / False Admission Number">Mistaken / False Admission Number</option>
                <option value="Student Withdrew Application">Student Withdrew Application</option>
                <option value="Test / Dummy Data Cleanup">Test / Dummy Data Cleanup</option>
                <option value="Administrative Override">Administrative Override</option>
              </select>
            </div>

            <p className="text-[11px] text-red-600/90 leading-relaxed bg-red-50 p-2.5 rounded-lg border border-red-200">
              ⚠️ <strong>Warning:</strong> This permanently deletes this student profile, login account, and purges all uploaded documents from cloud storage. This action is audited.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    <span>Confirm Delete</span>
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
