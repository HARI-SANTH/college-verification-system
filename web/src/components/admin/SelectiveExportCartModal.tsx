import React, { useState } from 'react';
import { StudentProfile } from '../../types';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: StudentProfile[];
  appliedCourse?: string;
  appliedQuota?: string;
}

export const SelectiveExportCartModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedStudents,
  appliedCourse,
  appliedQuota,
}) => {
  const [selectedDocTypes, setSelectedDocTypes] = useState<Record<string, boolean>>({
    excel: true,
    plusTwo: true,
    sslc: false,
    aadhaar: true,
    community: true,
    casteIncome: false,
    photo: true,
    mergedPdf: false,
  });

  const [namingScheme, setNamingScheme] = useState<'standard' | 'appId'>('standard');
  const [folderOrg, setFolderOrg] = useState<'byDocType' | 'byStudent' | 'flat'>('byDocType');
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  if (!isOpen) return null;

  const count = selectedStudents.length;

  // Toggle single document type
  const toggleDoc = (key: string) => {
    setSelectedDocTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Estimate total files and MB
  const activeSelectedKeys = Object.entries(selectedDocTypes).filter(([_, v]) => v).map(([k]) => k);
  const estimatedFilesPerStudent = activeSelectedKeys.filter((k) => k !== 'excel').length;
  const totalEstimatedFiles = count * estimatedFilesPerStudent + (selectedDocTypes.excel ? 1 : 0);
  const estimatedSizeMB = Math.max(1.2, (totalEstimatedFiles * 0.35)).toFixed(1);

  const handleDownloadZip = () => {
    setIsExporting(true);
    setProgressPercent(15);

    const interval = setInterval(() => {
      setProgressPercent((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 25;
      });
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
      setProgressPercent(100);

      // Trigger download using the real backend endpoint for verified students
      const filterParams: Record<string, string> = { verificationStatus: 'VERIFIED' };
      if (appliedCourse) filterParams.course = appliedCourse;
      if (appliedQuota) filterParams.quota = appliedQuota;

      const url = api.getDocumentsZipUrl(filterParams);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BPC_College_Documents_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsExporting(false);
        setProgressPercent(0);
        onClose();
      }, 800);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#eff4ff] border-b border-slate-200 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1e3a8a] text-xl">folder_zip</span>
              <h3 className="text-base font-bold text-[#0b1c30]">
                Selective Student Dossier & Document Exporter
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-[#1e3a8a] text-white text-xs font-semibold">
                Target: {count} Selected Students
              </span>
              {(appliedCourse || appliedQuota) && (
                <span className="text-xs text-slate-500 font-medium">
                  {appliedCourse || 'All Courses'} • {appliedQuota || 'All Quotas'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#0b1c30]">
          {/* Step 1: Document Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Step 1: Choose Document Types to Package
              </label>
              <span className="text-xs text-teal-700 font-semibold">
                {activeSelectedKeys.length} Types Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Group 1: Tabular Report */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.excel}
                  onChange={() => toggleDoc('excel')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Master Data Spreadsheet (.xlsx)</span>
                  <span className="text-[11px] text-slate-500">Roll No, Name, Marks, Quota, Aadhaar & Contacts</span>
                </div>
              </label>

              {/* Group 2: Plus Two */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.plusTwo}
                  onChange={() => toggleDoc('plusTwo')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Plus Two / HSE Marksheets</span>
                  <span className="text-[11px] text-slate-500">Qualifying exam marklist scans (.pdf / .jpg)</span>
                </div>
              </label>

              {/* Group 3: SSLC */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.sslc}
                  onChange={() => toggleDoc('sslc')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">SSLC / 10th Standard Books</span>
                  <span className="text-[11px] text-slate-500">Date of birth & parentage verification proof</span>
                </div>
              </label>

              {/* Group 4: Aadhaar */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.aadhaar}
                  onChange={() => toggleDoc('aadhaar')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Aadhaar Card Copies</span>
                  <span className="text-[11px] text-slate-500">UIDAI verified identity document scans</span>
                </div>
              </label>

              {/* Group 5: Community Cert */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.community}
                  onChange={() => toggleDoc('community')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Community Quota Certificates</span>
                  <span className="text-[11px] text-slate-500">Tahsildar verified community eligibility slips</span>
                </div>
              </label>

              {/* Group 6: Caste & Income */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.casteIncome}
                  onChange={() => toggleDoc('casteIncome')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Caste & Income Certificates</span>
                  <span className="text-[11px] text-slate-500">Reservation & Fee Concession / EWS proofs</span>
                </div>
              </label>

              {/* Group 7: Passport Photo */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.photo}
                  onChange={() => toggleDoc('photo')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Passport Size Photos (.jpg)</span>
                  <span className="text-[11px] text-slate-500">Cropped identity photos for university ID cards</span>
                </div>
              </label>

              {/* Group 8: Merged Booklet */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.mergedPdf}
                  onChange={() => toggleDoc('mergedPdf')}
                  className="mt-0.5 w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900">Merged Complete Dossier PDF</span>
                  <span className="text-[11px] text-slate-500">Single consolidated booklet per student</span>
                </div>
              </label>
            </div>
          </div>

          {/* Step 2: Naming & Folder Organization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-slate-500 block mb-2">
                File Naming Structure
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="namingScheme"
                    checked={namingScheme === 'standard'}
                    onChange={() => setNamingScheme('standard')}
                    className="text-[#1e3a8a]"
                  />
                  <span>[RollNo]_[StudentName]_[DocType].pdf</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="namingScheme"
                    checked={namingScheme === 'appId'}
                    onChange={() => setNamingScheme('appId')}
                    className="text-[#1e3a8a]"
                  />
                  <span>[AppID]_[DocType].pdf</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-slate-500 block mb-2">
                ZIP Folder Arrangement
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="folderOrg"
                    checked={folderOrg === 'byDocType'}
                    onChange={() => setFolderOrg('byDocType')}
                    className="text-[#1e3a8a]"
                  />
                  <span>Group by Document Type subfolders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="folderOrg"
                    checked={folderOrg === 'byStudent'}
                    onChange={() => setFolderOrg('byStudent')}
                    className="text-[#1e3a8a]"
                  />
                  <span>Folder per Student named by Roll Number</span>
                </label>
              </div>
            </div>
          </div>

          {/* Step 3: Calculation HUD */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1e3a8a]">inventory_2</span>
              <div>
                <span className="font-bold text-slate-900 block">
                  ~{totalEstimatedFiles} files across {count} students
                </span>
                <span className="text-slate-500">Estimated ZIP size: ~{estimatedSizeMB} MB</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
              Ready to Package
            </span>
          </div>

          {/* Progress Bar when exporting */}
          {isExporting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#1e3a8a]">
                <span>Packaging student certificates into ZIP...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1e3a8a] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-xs hover:bg-slate-200/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={isExporting || count === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Generate &amp; Download Organized ZIP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
