import React, { useState } from 'react';
import { StudentProfile, AdminFilters } from '../../types';
import { api } from '../../services/api';
import { SelectiveExportCartModal } from './SelectiveExportCartModal';

interface Props {
  students: StudentProfile[];
  filters: AdminFilters;
  onFilterChange: (filters: AdminFilters) => void;
  onSelectStudentForWorkbench: (studentId: string) => void;
  onRefresh?: () => void;
}

export const StudentRegistryConsole: React.FC<Props> = ({
  students,
  filters,
  onFilterChange,
  onSelectStudentForWorkbench,
  onRefresh,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [rowDensity, setRowDensity] = useState<'compact' | 'comfortable'>('comfortable');

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
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Failed to delete student: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Multi-parameter local filter inputs
  const [searchInput, setSearchInput] = useState<string>(filters.search || '');

  // Master Registry strictly displays VERIFIED & approved students
  const verifiedStudents = students.filter((s) => s.verificationStatus === 'VERIFIED');

  // Extract distinct criteria exclusively from verified students
  const distinctCourses = Array.from(new Set(verifiedStudents.map((s) => s.courseAdmitted).filter(Boolean))) as string[];
  const distinctQuotas = Array.from(new Set(verifiedStudents.map((s) => s.quota).filter(Boolean))) as string[];
  const distinctBatches = Array.from(new Set(verifiedStudents.map((s) => s.timePeriodOfStudy).filter(Boolean))) as string[];
  const distinctReligions = Array.from(new Set(verifiedStudents.map((s) => s.religion).filter(Boolean))) as string[];

  // Debounced search updater
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    onFilterChange({ ...filters, search: val });
  };

  const handleSelectFilter = (key: keyof AdminFilters, val: string) => {
    onFilterChange({ ...filters, [key]: val === 'ALL' ? '' : val });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    onFilterChange({
      search: '',
      course: '',
      quota: '',
      verificationStatus: 'VERIFIED',
      gender: '',
      religion: '',
      isEws: '',
      timePeriodOfStudy: '',
    });
  };

  // Filtered verified students for table view
  const filteredStudents = verifiedStudents.filter((s) => {
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase().trim();
      const matchName = `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      const matchAdm = (s.admissionNumber || '').toLowerCase().includes(q);
      const matchReg = (s.prevRegisterNumber || '').toLowerCase().includes(q);
      const matchPhone = (s.user?.phoneNumber || '').toLowerCase().includes(q);
      const matchAadhaar = (s.aadhaarNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchAdm && !matchReg && !matchPhone && !matchAadhaar) return false;
    }
    if (filters.course && s.courseAdmitted !== filters.course) return false;
    if (filters.quota && s.quota !== filters.quota) return false;
    if (filters.religion && s.religion !== filters.religion) return false;
    if (filters.gender && s.gender !== filters.gender) return false;
    if (filters.isEws !== '' && filters.isEws !== undefined) {
      const isEwsBool = filters.isEws === 'true';
      if (s.isEws !== isEwsBool) return false;
    }
    if (filters.timePeriodOfStudy && s.timePeriodOfStudy !== filters.timePeriodOfStudy) return false;
    return true;
  });

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedStudents = filteredStudents.filter((s) => selectedIds.includes(s.id));

  // Get photo preview url from documents
  const getPhotoUrl = (s: StudentProfile) => {
    const photoDoc = s.documents?.find((d) => d.type === 'PROFILE_PHOTO');
    if (photoDoc) {
      if (photoDoc.fileUrl) return photoDoc.fileUrl;
      return `/api/admin/documents/${photoDoc.id}/preview`;
    }
    return null;
  };

  // Trigger Excel export strictly for verified students
  const handleExportExcel = () => {
    const exportFilters = { ...filters, verificationStatus: 'VERIFIED' };
    const url = api.getExcelExportUrl(exportFilters as any);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BPC_College_Verified_Master_Registry_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Count active filters
  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v !== '' && v !== undefined && k !== 'search' && k !== 'verificationStatus'
  );

  return (
    <div className="w-full flex flex-col gap-5 animate-fadeIn pb-24 font-sans text-slate-800">
      {/* Top Header & Telemetry Ribbon */}
      <div className="w-full bg-white px-6 py-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-[#00236f] tracking-tight">
              Student Master Registry — Baselios Poulose II Catholicose College
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive Institutional Database • AY 2026–2029 Admissions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-[#1e3a8a] text-xs font-bold transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              <span>Quick Export to Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Real Summary Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex flex-col">
            <span className="text-teal-700 font-bold uppercase text-[10px]">Verified Admissions</span>
            <span className="text-lg font-black text-teal-800">{verifiedStudents.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-600 font-bold uppercase text-[10px]">Academic Programs</span>
            <span className="text-lg font-black text-slate-900">{distinctCourses.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#1e3a8a] font-bold uppercase text-[10px]">Admission Quotas</span>
            <span className="text-lg font-black text-[#1e3a8a]">{distinctQuotas.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-indigo-700 font-bold uppercase text-[10px]">EWS Category Scholars</span>
            <span className="text-lg font-black text-indigo-700">{verifiedStudents.filter((s) => s.isEws).length}</span>
          </div>
        </div>
      </div>

      {/* Advanced Multi-Parameter Filter Console */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col gap-3">
        {/* Omni-Search Bar */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Universal instant query by Name, Admission / Roll Number, Mobile, or Aadhaar..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100/80 focus:bg-white text-slate-900 text-xs placeholder:text-slate-400 outline-none border border-transparent focus:border-[#1e3a8a] transition-all"
          />
        </div>

        {/* Multi-Parameter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* 1. Program */}
          <select
            value={filters.course || 'ALL'}
            onChange={(e) => handleSelectFilter('course', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Program: All</option>
            {distinctCourses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* 2. Quota */}
          <select
            value={filters.quota || 'ALL'}
            onChange={(e) => handleSelectFilter('quota', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Quota: All</option>
            {distinctQuotas.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>

          {/* 3. Religion */}
          <select
            value={filters.religion || 'ALL'}
            onChange={(e) => handleSelectFilter('religion', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Religion: All</option>
            {distinctReligions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* 4. Gender */}
          <select
            value={filters.gender || 'ALL'}
            onChange={(e) => handleSelectFilter('gender', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Gender: All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* 5. EWS */}
          <select
            value={filters.isEws || 'ALL'}
            onChange={(e) => handleSelectFilter('isEws', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">EWS: All</option>
            <option value="true">EWS Eligible</option>
            <option value="false">Non-EWS</option>
          </select>

          {/* 6. Batch */}
          <select
            value={filters.timePeriodOfStudy || 'ALL'}
            onChange={(e) => handleSelectFilter('timePeriodOfStudy', e.target.value)}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-transparent focus:border-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Batch: All</option>
            {distinctBatches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {(activeFilters.length > 0 || searchInput) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Applied Filters:</span>
            {searchInput && (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold flex items-center gap-1">
                Query: &quot;{searchInput}&quot;
                <button onClick={() => handleSearchChange('')} className="hover:text-red-600">✕</button>
              </span>
            )}
            {activeFilters.map(([k, v]) => (
              <span
                key={k}
                className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#1e3a8a] font-semibold flex items-center gap-1"
              >
                {k}: {String(v)}
                <button
                  onClick={() => handleSelectFilter(k as any, 'ALL')}
                  className="hover:text-red-600 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-bold ml-2 underline"
            >
              Clear All Filters
            </button>
            <span className="ml-auto text-slate-500 font-medium">
              Showing {students.length} matching candidate records
            </span>
          </div>
        )}
      </div>

      {/* Master Student Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Controls */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.length === students.length && students.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
              />
              <span>Select All {students.length} Candidates</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="bg-[#1e3a8a] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>Density:</span>
            <button
              onClick={() => setRowDensity('comfortable')}
              className={`px-2 py-1 rounded text-xs ${
                rowDensity === 'comfortable' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'hover:bg-slate-200'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setRowDensity('compact')}
              className={`px-2 py-1 rounded text-xs ${
                rowDensity === 'compact' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'hover:bg-slate-200'
              }`}
            >
              Compact
            </button>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Candidate Identity</th>
                <th className="p-3">Course &amp; Batch</th>
                <th className="p-3">Quota &amp; Category</th>
                <th className="p-3">Aadhaar Status</th>
                <th className="p-3">Verification Status</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300">verified_user</span>
                      <span className="font-bold text-sm text-slate-700">No Verified Students Found</span>
                      <span className="text-xs text-slate-400">
                        {verifiedStudents.length === 0
                          ? 'Only students approved through the Verification Queue appear in the Master Registry.'
                          : 'No verified students match your active search and filter criteria.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  const photoUrl = getPhotoUrl(student);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-[#eff4ff] text-[#0b1c30]'
                          : 'hover:bg-slate-50/80'
                      } ${rowDensity === 'compact' ? 'h-10' : 'h-14'}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                        />
                      </td>

                      {/* Candidate Identity */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center uppercase">
                              {student.firstName[0]}
                              {student.lastName[0] || ''}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 leading-tight">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {student.admissionNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Course & Batch */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">
                            {student.courseAdmitted || 'UG Course'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {student.timePeriodOfStudy || '2026-2029'}
                          </span>
                        </div>
                      </td>

                      {/* Quota & Category */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1e3a8a]">
                            {student.quota || 'General Merit'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {student.caste || student.religion || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Aadhaar Status */}
                      <td className="p-3">
                        {student.aadhaarNumber ? (
                          <div className="flex items-center gap-1 text-teal-700 font-mono text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            <span>•••• {student.aadhaarNumber.slice(-4)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not Entered</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          Verified &amp; Enrolled
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {student.user?.phoneNumber || 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectStudentForWorkbench(student.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#1e3a8a] text-slate-700 hover:text-white font-bold text-xs transition-colors"
                            title="Inspect full verification dossier"
                          >
                            Inspect Dossier
                          </button>
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-colors"
                            title="Purge / Delete Duplicate Record"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
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
      </div>

      {/* Floating Contextual Bulk Action Dock (Slides up when 1+ rows are checked) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#00236f] text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 animate-fadeIn border border-blue-400/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">check_box</span>
            <span className="font-bold text-xs">
              {selectedIds.length} Student{selectedIds.length > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">table_view</span>
              <span>Export Table (.xlsx)</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm">folder_zip</span>
              <span>Selective Document Export Cart →</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 4: Selective Export Cart Modal */}
      <SelectiveExportCartModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedStudents={selectedStudents}
        appliedCourse={filters.course}
        appliedQuota={filters.quota}
      />

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
