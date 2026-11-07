import React, { useState } from 'react';
import { StudentProfile, AdminFilters } from '../../types';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  FolderArchive,
  Download,
  ShieldCheck,
  CheckCircle,
  FileText,
  Filter,
} from 'lucide-react';

interface Props {
  students: StudentProfile[];
  filters: AdminFilters;
}

export const BatchExportView: React.FC<Props> = ({ students, filters }) => {
  const [selectedFormat, setSelectedFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('ALL');

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#00236f] tracking-tight">
            Batch Document Export & Archival Console
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Download regulatory UGC spreadsheets, University of Kerala compliance dossiers, and cryptographic student document bundles.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Institutional Signing Key Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Master XLSX / CSV Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#00236f]">Master Student Registry (.xlsx / .csv)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Generates a master bilingual spreadsheet conforming to UGC v3.2 standards. Includes English & Malayalam candidate names, 12-digit APAAR IDs, DBT bank IFSC credentials, and reservation quota categories.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Active Cohort Filter:</span>
                <strong className="text-slate-900">{students.length} Students Selected</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Spreadsheet Columns:</span>
                <strong className="text-slate-900">22 Complete Attributes</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Character Encoding:</span>
                <strong className="text-slate-900">UTF-8 (Malayalam Script Enabled)</strong>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Choose Format:</label>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="fmt"
                    checked={selectedFormat === 'XLSX'}
                    onChange={() => setSelectedFormat('XLSX')}
                    className="accent-[#00236f]"
                  />
                  <span>Microsoft Excel (.xlsx)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="fmt"
                    checked={selectedFormat === 'CSV'}
                    onChange={() => setSelectedFormat('CSV')}
                    className="accent-[#00236f]"
                  />
                  <span>CSV (Comma Delimited UTF-8)</span>
                </label>
              </div>
            </div>
          </div>

          <a
            href={api.getExcelExportUrl(filters as any)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Download className="w-4 h-4 text-teal-300" />
            <span>Download Master Spreadsheet ({selectedFormat})</span>
          </a>
        </div>

        {/* Card 2: Bulk Document Archiver ZIP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#00236f]">Verified Documents Bundle (.ZIP)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Packages certificates, marksheets, bank passbooks, and APAAR cards into structured student sub-folders named with Roll Numbers (e.g. <span className="font-bold text-slate-800">24BCA001_Ananya_Joseph/</span>).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Compression Engine:</span>
                <strong className="text-slate-900">Deflate Level 9 (Max Efficiency)</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Verification State:</span>
                <strong className="text-teal-700">Validated Only</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Sub-folder Organization:</span>
                <strong className="text-slate-900">[AdmissionNo]_[Name]</strong>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Filter Specific Document Type:</label>
              <select
                value={selectedDocCategory}
                onChange={(e) => setSelectedDocCategory(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              >
                <option value="ALL">All Documents (Marksheets, Passbooks, APAAR)</option>
                <option value="PLUS_TWO_CERTIFICATE">Plus Two Marksheets Only</option>
                <option value="SSLC_CERTIFICATE">SSLC 10th Certificates Only</option>
                <option value="APAAR_DOCUMENT">APAAR Cards Only</option>
                <option value="BANK_PASSBOOK">Bank Passbooks Only</option>
                <option value="INCOME_CERTIFICATE">Income & EWS Certificates Only</option>
              </select>
            </div>
          </div>

          <a
            href={api.getDocumentsZipUrl(
              filters as any,
              selectedDocCategory === 'ALL' ? undefined : selectedDocCategory
            )}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Download className="w-4 h-4 text-teal-200" />
            <span>Compile & Download ZIP Archive</span>
          </a>
        </div>
      </div>
    </div>
  );
};
