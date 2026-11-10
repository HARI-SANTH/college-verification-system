import React, { useState, useEffect } from 'react';
import { AuthState, StudentProfile, AdminStats, AdminFilters } from '../types';
import { api } from '../services/api';
import { AdminHeader } from './admin/AdminHeader';
import { VerificationWorkbench } from './admin/VerificationWorkbench';
import { StudentRegistryConsole } from './admin/StudentRegistryConsole';

interface Props {
  auth?: AuthState;
  onLogout?: () => void;
  onQuickLogin?: (role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN') => void;
}

export const AdminDashboard: React.FC<Props> = ({
  auth = { token: null, user: null },
  onLogout = () => {},
  onQuickLogin = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'registry'>('queue');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<AdminFilters>({
    search: '',
    course: '',
    timePeriodOfStudy: '',
    gender: '',
    religion: '',
    quota: '',
    isEws: '',
    verificationStatus: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsData, statsData] = await Promise.all([
        api.getStudents(filters as any),
        api.getAdminStats().catch(() => null),
      ]);
      setStudents(studentsData);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleSelectStudentForWorkbench = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('queue');
  };

  const pendingCount = students.filter(
    (s) => s.verificationStatus === 'SUBMITTED' || s.verificationStatus === 'CORRECTION_REQUIRED'
  ).length;

  const verifiedCount = students.filter(
    (s) => s.verificationStatus === 'VERIFIED'
  ).length;

  const isInspectingStudent = activeTab === 'queue' && selectedStudentId !== null;

  return (
    <div
      className={`min-h-screen bg-[#faf8ff] text-[#0b1c30] flex flex-col font-sans antialiased ${
        isInspectingStudent ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {/* Top Header from Stitch */}
      <AdminHeader
        auth={auth}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'queue') {
            // Clicking Queue in header clears selected student so admin returns to the queue list
            setSelectedStudentId(null);
          }
        }}
        onLogout={onLogout}
        onQuickLogin={onQuickLogin}
        pendingCount={pendingCount}
        totalCount={students.length}
        verifiedCount={verifiedCount}
        onRefresh={fetchData}
      />

      {/* Main Container */}
      <main
        className={`flex-1 w-full flex flex-col ${
          isInspectingStudent ? 'p-0 overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {loading && students.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-xs font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
              <span>Loading Baselios Poulose II Catholicose College Verification Desk...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <VerificationWorkbench
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={(id) => setSelectedStudentId(id)}
                onBackToDashboard={() => {
                  setSelectedStudentId(null);
                  setActiveTab('queue');
                }}
                onStudentUpdated={fetchData}
              />
            )}

            {activeTab === 'registry' && (
              <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                <StudentRegistryConsole
                  students={students}
                  filters={filters}
                  onFilterChange={(newFilters) => setFilters(newFilters)}
                  onSelectStudentForWorkbench={handleSelectStudentForWorkbench}
                  onRefresh={fetchData}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
