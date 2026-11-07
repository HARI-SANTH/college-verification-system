import React, { useState } from 'react';
import { StudentProfile, AdminStats } from '../../types';
import {
  TrendingUp,
  FileCheck,
  Clock,
  AlertTriangle,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  FolderArchive,
  Zap,
} from 'lucide-react';

interface Props {
  students: StudentProfile[];
  stats: AdminStats | null;
  onRefresh: () => void;
  onSelectStudentForWorkbench: (studentId: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'workbench' | 'registry' | 'export') => void;
}

export const CommandDashboard: React.FC<Props> = ({
  students,
  stats,
  onRefresh,
  onSelectStudentForWorkbench,
  onNavigateTab,
}) => {
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'FLAGGED' | 'VERIFIED'>('ALL');

  // Real filtered queue based on actual student status
  const filteredQueue = students.filter((s) => {
    if (queueFilter === 'PENDING') return s.verificationStatus === 'SUBMITTED';
    if (queueFilter === 'FLAGGED') return s.verificationStatus === 'CORRECTION_REQUIRED';
    if (queueFilter === 'VERIFIED') return s.verificationStatus === 'VERIFIED';
    return true;
  });

  // Real counts calculated directly from database records
  const totalCount = stats?.totalStudents ?? students.length;
  const verifiedCount =
    stats?.statusPipeline?.verified ??
    students.filter((s) => s.verificationStatus === 'VERIFIED').length;
  const pendingCount =
    stats?.statusPipeline?.submitted ??
    students.filter((s) => s.verificationStatus === 'SUBMITTED').length;
  const flaggedCount =
    stats?.statusPipeline?.correctionRequired ??
    students.filter((s) => s.verificationStatus === 'CORRECTION_REQUIRED').length;
  const ewsCount = stats?.ewsCount ?? students.filter((s) => s.isEws).length;

  const clearancePercent =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  // Real course distribution from database
  const coursesList =
    stats?.byCourse && stats.byCourse.length > 0
      ? stats.byCourse
      : Array.from(
          students.reduce((acc, s) => {
            const c = s.courseAdmitted || 'Unassigned';
            acc.set(c, (acc.get(c) || 0) + 1);
            return acc;
          }, new Map<string, number>())
        ).map(([course, count]) => ({ course, count }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Actions Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-700 font-extrabold mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Office Admissions & Verification Desk</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-semibold normal-case">CampusFlow 2.0</span>
          </div>
          <h1 className="text-2xl font-black text-[#00236f] tracking-tight">
            Admissions Verification Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Verify student admission data uploaded via mobile & web apps, inspect official certificates side-by-side, flag mistakes, and issue digital credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-teal-600 text-[20px] mr-2">verified_user</span>
            <div className="flex flex-col pr-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Desk Node</span>
              <span className="text-xs text-slate-900 font-extrabold">STX-OFF-04 • Online</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold">Active</span>
          </div>

          <button
            onClick={onRefresh}
            className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00236f] text-xs font-bold flex items-center gap-2 transition-colors border border-slate-200 shadow-xs"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Queue</span>
          </button>

          <button
            onClick={() => onNavigateTab('workbench')}
            className="h-10 px-4 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <Zap className="w-4 h-4 text-teal-300" />
            <span>Open Workbench</span>
          </button>
        </div>
      </div>

      {/* Operational KPI Grid (Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Registered Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Total Applicants
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#00236f]">{totalCount}</span>
                <span className="text-xs text-slate-400 font-medium">in database</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Enrolled Students</span>
            <span className="text-slate-800 font-bold">{students.length} Profiles</span>
          </div>
        </div>

        {/* KPI 2: Documents Verified */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Approved & Verified
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-emerald-700">{verifiedCount}</span>
                <span className="text-xs text-slate-400 font-medium">/ {totalCount}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">fact_check</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Clearance Progress</span>
              <span className="font-bold text-emerald-700">{clearancePercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${clearancePercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Pending Office Review
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-amber-700">{pendingCount}</span>
                <span className="text-xs text-slate-400 font-medium">submitted</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Awaiting Verification</span>
            <span className="font-bold text-amber-800">Action Required</span>
          </div>
        </div>

        {/* KPI 4: Action Needed (Flagged) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Flagged for Correction
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-rose-600">{flaggedCount}</span>
                <span className="text-xs text-rose-600 font-bold">Students</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">error</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Student Notified</span>
            <span className="text-rose-600 font-bold">Form Unlocked</span>
          </div>
        </div>

        {/* KPI 5: EWS Concession Quota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                EWS Concession Quota
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#1e3a8a]">{ewsCount}</span>
                <span className="text-xs text-teal-700 font-bold">Eligible</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Annual Income Rule</span>
            <span className="font-bold text-slate-800">&lt; ₹1,00,000</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Urgent Document Review Queue (8 Cols) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header & Filter Pills */}
            <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#00236f] leading-tight">
                    Student Verification Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live list of student profiles submitted from mobile and web app ready for office inspection
                  </p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setQueueFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    queueFilter === 'ALL'
                      ? 'bg-[#1e3a8a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  onClick={() => setQueueFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    queueFilter === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  Ready ({students.filter((s) => s.verificationStatus === 'SUBMITTED').length})
                </button>
                <button
                  onClick={() => setQueueFilter('FLAGGED')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    queueFilter === 'FLAGGED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-800 hover:bg-rose-50'
                  }`}
                >
                  Flagged ({students.filter((s) => s.verificationStatus === 'CORRECTION_REQUIRED').length})
                </button>
                <button
                  onClick={() => setQueueFilter('VERIFIED')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    queueFilter === 'VERIFIED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  Verified ({students.filter((s) => s.verificationStatus === 'VERIFIED').length})
                </button>
              </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200">
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4">Course & Batch</th>
                    <th className="py-3 px-4">Quota & Category</th>
                    <th className="py-3 px-4">Uploaded Files</th>
                    <th className="py-3 px-4">Verification State</th>
                    <th className="py-3 px-4 text-right">Duty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No students found under the '{queueFilter}' filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((student) => {
                      const hasFlag = student.verificationStatus === 'CORRECTION_REQUIRED';
                      const isVerified = student.verificationStatus === 'VERIFIED';
                      const isSubmitted = student.verificationStatus === 'SUBMITTED';
                      const flagKeys = Object.keys(student.fieldFlags || {});
                      const flagReason =
                        flagKeys.length > 0 ? student.fieldFlags[flagKeys[0]]?.reason : null;

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => onSelectStudentForWorkbench(student.id)}
                        >
                          {/* Student Details */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-200 text-[#00236f] flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                                {student.firstName.charAt(0)}
                                {student.lastName.charAt(0)}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-900 group-hover:text-[#00236f] block">
                                  {student.firstName} {student.lastName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Roll #{student.admissionNumber} • {student.user?.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Course & Batch */}
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-[#00236f]">
                              {student.courseAdmitted || 'BCA'}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {student.timePeriodOfStudy || '2024-2028'}
                            </div>
                          </td>

                          {/* Quota & Category */}
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">
                              {student.quota || 'Merit'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {student.religion || 'Christian'} {student.isEws ? '(EWS)' : ''}
                            </span>
                          </td>

                          {/* Uploaded Files Count */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-slate-400">
                                attach_file
                              </span>
                              <span className="font-bold text-slate-700">
                                {student.documents?.length || 0} Files
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {student.documents && student.documents.length > 0
                                ? student.documents.map((d) => d.type.replace('_CERTIFICATE', '')).join(', ')
                                : 'No documents yet'}
                            </span>
                          </td>

                          {/* Verification State */}
                          <td className="py-3 px-4">
                            {hasFlag ? (
                              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 w-fit text-[11px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                                <span className="truncate max-w-[150px]" title={flagReason || 'Correction flagged'}>
                                  {flagReason || 'Correction Flagged'}
                                </span>
                              </div>
                            ) : isVerified ? (
                              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 w-fit text-[11px] font-bold">
                                <CheckCircle className="w-3 h-3 text-teal-600 flex-shrink-0" />
                                <span>Verified & Approved</span>
                              </div>
                            ) : isSubmitted ? (
                              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 w-fit text-[11px] font-bold">
                                <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                <span>Ready for Review</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 w-fit text-[11px] font-medium">
                                <span>Draft Mode</span>
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectStudentForWorkbench(student.id);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white font-extrabold text-xs shadow-xs transition-all inline-flex items-center gap-1.5"
                            >
                              <span>Inspect & Verify</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredQueue.length} of {students.length} students</span>
              <span className="text-teal-700 font-bold">Database Synchronized</span>
            </div>
          </div>

          {/* Quick Launch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => onNavigateTab('workbench')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#00236f]/40 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">compare</span>
                </div>
                <h3 className="text-base font-extrabold text-[#00236f]">
                  Verification Workbench
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Inspect student text data against the actual uploaded certificates side-by-side. Flag mistakes and notify students directly.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-700">Dedicated Document Preview</span>
                <span className="text-[#00236f] font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Desk <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('registry')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#00236f]/40 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">table_chart</span>
                </div>
                <h3 className="text-base font-extrabold text-[#00236f]">
                  Student Registry & UGC Export
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Search, filter, and download the master Excel spreadsheet or bulk document ZIP archive for university compliance.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">XLSX • ZIP</span>
                <span className="text-[#00236f] font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Registry Console <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real Department Quotas & Summary (4 Cols) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Real Departmental Quota Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00236f] text-[20px]">donut_large</span>
                <h2 className="text-base font-extrabold text-[#00236f]">Program Enrollment</h2>
              </div>
              <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full font-bold">
                {totalCount} Total
              </span>
            </div>

            <div className="space-y-3 py-2">
              {coursesList.map((c) => {
                const pct = totalCount > 0 ? Math.round((c.count / totalCount) * 100) : 0;
                return (
                  <div key={c.course}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">{c.course}</span>
                      <span className="text-teal-700 font-bold">
                        {c.count} Students ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#1e3a8a] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Overall Status:</span>
              <strong className="text-slate-900 font-extrabold">
                {verifiedCount} of {totalCount} Cleared
              </strong>
            </div>
          </div>

          {/* Verification Status Overview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00236f] text-[20px]">rule</span>
                <h2 className="text-base font-extrabold text-[#00236f]">Pipeline Breakdown</h2>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-teal-900">Verified & Approved</span>
                </div>
                <strong className="text-teal-900 text-sm">{verifiedCount}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-900">Ready for Review</span>
                </div>
                <strong className="text-amber-900 text-sm">{pendingCount}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-rose-900">Corrections Required</span>
                </div>
                <strong className="text-rose-900 text-sm">{flaggedCount}</strong>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('workbench')}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold text-xs transition-colors"
            >
              Start Verifying Next Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
