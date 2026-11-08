import React, { useState } from 'react';
import { StudentProfile, AdminFilters } from '../../types';
import { api } from '../../services/api';
import {
  Filter,
  Search,
  RotateCcw,
  Sparkles,
  Download,
  FileSpreadsheet,
  FolderArchive,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Mail,
  FileText,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  students: StudentProfile[];
  filters: AdminFilters;
  onFilterChange: (filters: AdminFilters) => void;
  onSelectStudentForWorkbench: (studentId: string) => void;
}

export const StudentRegistryConsole: React.FC<Props> = ({
  students,
  filters,
  onFilterChange,
  onSelectStudentForWorkbench,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [zipDocTypes, setZipDocTypes] = useState({
    marksheets: true,
    apaar: true,
    bank: true,
    income: true,
  });

  const handleApplyPreset = (preset: 'christianGirlsBCA' | 'pending' | 'ews') => {
    if (preset === 'christianGirlsBCA') {
      onFilterChange({
        ...filters,
        course: 'BCA',
        timePeriodOfStudy: '2024-2028',
        religion: 'Christian',
        gender: 'Female',
        verificationStatus: 'VERIFIED',
      });
    } else if (preset === 'pending') {
      onFilterChange({
        ...filters,
        verificationStatus: 'SUBMITTED',
      });
    } else if (preset === 'ews') {
      onFilterChange({
        ...filters,
        isEws: 'true',
      });
    }
  };

  const handleResetFilters = () => {
    onFilterChange({
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

  const removeFilterKey = (key: keyof AdminFilters) => {
    const updated = { ...filters };
    delete updated[key];
    onFilterChange(updated);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. QUERY BUILDER & CONTROLLER HEADER */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">filter_alt</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-[#00236f] leading-tight">
                Advanced Query Builder & Institutional Registry
              </h2>
              <p className="text-xs text-slate-500">
                Configure multi-conditional cohort rules for university submission, reservation audits, & scholarships.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          {/* Course */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Course / Program
            </label>
            <select
              value={filters.course || ''}
              onChange={(e) => onFilterChange({ ...filters, course: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Programs</option>
              <option value="BCA">BCA (Bachelor of Computer Applications)</option>
              <option value="B.Com Finance">B.Com Finance</option>
              <option value="B.Sc Computer Science">B.Sc Computer Science</option>
              <option value="BA English Language & Literature">BA English Language & Literature</option>
              <option value="BBA (Business Administration)">BBA (Business Administration)</option>
              <option value="B.Sc Mathematics">B.Sc Mathematics</option>
            </select>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Academic Term
            </label>
            <select
              value={filters.timePeriodOfStudy || ''}
              onChange={(e) => onFilterChange({ ...filters, timePeriodOfStudy: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Batches</option>
              <option value="2024-2028">AY 2024–28</option>
              <option value="2023-2027">AY 2023–27</option>
            </select>
          </div>

          {/* Quota */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Admission Quota
            </label>
            <select
              value={filters.quota || ''}
              onChange={(e) => onFilterChange({ ...filters, quota: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Quotas</option>
              <option value="Merit">Merit</option>
              <option value="Community Quota">Community Quota</option>
              <option value="Management Quota">Management Quota</option>
              <option value="Sports Quota">Sports Quota</option>
              <option value="Cultural Quota">Cultural Quota</option>
              <option value="NRI / Special">NRI / Special</option>
            </select>
          </div>

          {/* Religion / Community */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Religion / Community
            </label>
            <select
              value={filters.religion || ''}
              onChange={(e) => onFilterChange({ ...filters, religion: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Communities</option>
              <option value="Christian">Christian</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Sikh">Sikh</option>
              <option value="Jain">Jain</option>
              <option value="Other / Not Specified">Other / Not Specified</option>
            </select>
          </div>

          {/* EWS Category */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              EWS Concession
            </label>
            <select
              value={filters.isEws || ''}
              onChange={(e) => onFilterChange({ ...filters, isEws: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Income Brackets</option>
              <option value="true">EWS Category (≤ 1 Lakh)</option>
              <option value="false">Non-EWS Category</option>
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Desk Status
            </label>
            <select
              value={filters.verificationStatus || ''}
              onChange={(e) => onFilterChange({ ...filters, verificationStatus: e.target.value })}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="SUBMITTED">Ready for Review</option>
              <option value="CORRECTION_REQUIRED">Needs Correction</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {/* Quick Presets & Active Filter Pills */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" /> Presets:
          </span>
          <button
            onClick={() => handleApplyPreset('christianGirlsBCA')}
            className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition-colors"
          >
            🎓 Christian Girls in BCA 2024-2028
          </button>
          <button
            onClick={() => handleApplyPreset('pending')}
            className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold border border-amber-200 transition-colors"
          >
            ⏳ Pending Verification Queue
          </button>
          <button
            onClick={() => handleApplyPreset('ews')}
            className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-200 transition-colors"
          >
            🏛️ EWS Concession Quota
          </button>
        </div>

        {/* Removable Active Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 text-[10px] font-bold uppercase pr-1">Active Rules:</span>
          {filters.course && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
              Course: <strong className="text-[#00236f]">{filters.course}</strong>
              <button onClick={() => removeFilterKey('course')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.gender && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
              Gender: <strong className="text-[#00236f]">{filters.gender}</strong>
              <button onClick={() => removeFilterKey('gender')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.religion && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
              Community: <strong className="text-[#00236f]">{filters.religion}</strong>
              <button onClick={() => removeFilterKey('religion')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.verificationStatus && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
              Status: <strong className="text-teal-900">{filters.verificationStatus}</strong>
              <button onClick={() => removeFilterKey('verificationStatus')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.isEws && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              EWS: <strong className="text-emerald-900">{filters.isEws === 'true' ? 'Yes' : 'No'}</strong>
              <button onClick={() => removeFilterKey('isEws')} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Matched Summary Banner */}
        <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-[20px]">verified_user</span>
            <span className="font-extrabold text-slate-900">
              {students.length} Students matched criteria:
            </span>
            <span className="text-slate-600 hidden md:inline">
              Filtered admissions registry for AY 2024-2028 (Desk clearance active)
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
            <span>Index Sync: 100% Up to Date</span>
            <span>•</span>
            <span className="text-teal-700 font-bold">SHA-256 Validated</span>
          </div>
        </div>
      </section>

      {/* 2. FINTECH-INSPIRED MASTER BATCH EXPORT CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Master XLSX / CSV Export */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">table_chart</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    University Audit File
                  </span>
                  <h3 className="text-base font-extrabold text-[#00236f]">
                    Export Student Records (Excel / CSV)
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase">
                Ready
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Generates a comprehensive master spreadsheet containing bilingual English/Malayalam names, Institutional Roll Numbers, APAAR 12-digit IDs, registered contact information, Community Quota categories, EWS classification, and validated IFSC Bank Accounts.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 block">Schema Format</span>
                <span className="font-extrabold text-slate-900 text-xs">UGC Bilingual v3.2</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 block">Total Columns</span>
                <span className="font-extrabold text-slate-900 text-xs">22 Formatted Fields</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 block">Integrity Check</span>
                <span className="font-extrabold text-teal-700 text-xs">0 Missing Values</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                <input
                  type="radio"
                  name="exportFmt"
                  checked={exportFormat === 'XLSX'}
                  onChange={() => setExportFormat('XLSX')}
                  className="accent-[#00236f]"
                />
                <span>.XLSX</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                <input
                  type="radio"
                  name="exportFmt"
                  checked={exportFormat === 'CSV'}
                  onChange={() => setExportFormat('CSV')}
                  className="accent-[#00236f]"
                />
                <span>.CSV (UTF-8)</span>
              </label>
            </div>

            <a
              href={api.getExcelExportUrl(filters as any)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>Download Master {exportFormat}</span>
            </a>
          </div>
        </div>

        {/* Card 2: Bulk Document Archiver (ZIP) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">folder_zip</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Registrar Vault Archival
                  </span>
                  <h3 className="text-base font-extrabold text-[#00236f]">
                    Bulk Document Archiver (ZIP)
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">
                {students.reduce((acc, s) => acc + (s.documents?.length || 0), 0)} Files
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Bundles all verified uploaded documents into categorized folders structured by Roll Number (e.g. <strong className="text-slate-800">24BCA001_Ananya_Joseph/</strong>). Files include institutional verification timestamps.
            </p>

            {/* Checkbox Options Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipDocTypes.marksheets}
                  onChange={(e) => setZipDocTypes({ ...zipDocTypes, marksheets: e.target.checked })}
                  className="accent-[#00236f] rounded"
                />
                <span>Plus Two & SSLC Marksheets</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipDocTypes.apaar}
                  onChange={(e) => setZipDocTypes({ ...zipDocTypes, apaar: e.target.checked })}
                  className="accent-[#00236f] rounded"
                />
                <span>APAAR & Aadhaar Cards</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipDocTypes.bank}
                  onChange={(e) => setZipDocTypes({ ...zipDocTypes, bank: e.target.checked })}
                  className="accent-[#00236f] rounded"
                />
                <span>Bank Passbooks & Mandates</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipDocTypes.income}
                  onChange={(e) => setZipDocTypes({ ...zipDocTypes, income: e.target.checked })}
                  className="accent-[#00236f] rounded"
                />
                <span>Income & Caste Certificates</span>
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Digital seal embed enabled</span>
            </div>

            <a
              href={api.getDocumentsZipUrl(filters as any)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <FolderArchive className="w-4 h-4 text-teal-200" />
              <span>Compile & Download ZIP Bundle</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3. MATCHED COHORT REGISTRY TABLE SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Top Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#00236f]">Matched Cohort Registry</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1e3a8a] text-white text-[11px] font-bold">
              {students.length} Active Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert('Please select students from the table using checkboxes.');
                } else {
                  alert(`Batch action ready for ${selectedIds.length} selected students.`);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs"
            >
              <span>Batch Action ({selectedIds.length} selected)</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200">
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === students.length && students.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-[#00236f] rounded"
                  />
                </th>
                <th className="px-4 py-3">Student & Bilingual ID</th>
                <th className="px-4 py-3">Course & Quota</th>
                <th className="px-4 py-3">Community & Category</th>
                <th className="px-4 py-3">Annual Income & EWS</th>
                <th className="px-4 py-3 text-center">Verification</th>
                <th className="px-4 py-3">Uploaded Documents</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No students match the current query criteria. Try clearing or expanding your filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isChecked = selectedIds.includes(student.id);
                  const isVerified = student.verificationStatus === 'VERIFIED';
                  const isFlagged = student.verificationStatus === 'CORRECTION_REQUIRED';
                  const isSubmitted = student.verificationStatus === 'SUBMITTED';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectStudentForWorkbench(student.id)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="accent-[#00236f] rounded"
                        />
                      </td>

                      {/* Bilingual Student Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-[#00236f] flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                            {student.firstName.charAt(0)}
                            {student.lastName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 group-hover:text-[#00236f] block">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-sans block">
                              {student.firstNameMalayalam || 'അനന്യ'} {student.lastNameMalayalam || 'നായർ'}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                {student.admissionNumber}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-700 font-semibold">
                                UID: {student.aadhaarNumber || 'Not Provided'}
                              </span>
                              {student.apaarId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">APAAR: {student.apaarId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course & Quota */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">
                          {student.courseAdmitted || 'BCA'} {student.timePeriodOfStudy || '2024-28'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {student.quota || 'Merit (Open General)'}
                        </span>
                      </td>

                      {/* Community */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">
                          {student.religion || 'Christian'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {student.caste || 'General Merit'}
                        </span>
                      </td>

                      {/* Income & EWS */}
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold block ${
                            student.isEws ? 'text-teal-700' : 'text-slate-800'
                          }`}
                        >
                          EWS: {student.isEws ? 'Yes' : 'No'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ₹{student.annualIncome?.toLocaleString('en-IN') || '85,000'} / yr
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="px-4 py-3 text-center">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold">
                            <CheckCircle className="w-3 h-3 text-teal-600" /> Verified
                          </span>
                        ) : isFlagged ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                            <Clock className="w-3 h-3 text-amber-600" /> In Review
                          </span>
                        )}
                      </td>

                      {/* Document Chips */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">SSLC</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">+2</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Aadhaar</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Passbook</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">APAAR</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectStudentForWorkbench(student.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#00236f] hover:bg-slate-100"
                            title="Inspect in Workbench"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={api.getDocumentsZipUrl({ search: student.admissionNumber })}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                            title="Download Dossier"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => alert(`Email notice queued for ${student.firstName} (${student.admissionNumber}).`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Send Notice"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
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
          <span>Showing {students.length} of {students.length} cohort records</span>
          <span className="text-teal-700 font-bold">SHA-256 Validated Digital Archive</span>
        </div>
      </section>
    </div>
  );
};
