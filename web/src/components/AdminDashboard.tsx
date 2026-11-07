import React, { useState, useEffect } from 'react';
import { AuthState, StudentProfile, AdminStats, AdminFilters } from '../types';
import { api } from '../services/api';
import { AdminHeader } from './admin/AdminHeader';
import { CommandDashboard } from './admin/CommandDashboard';
import { VerificationWorkbench } from './admin/VerificationWorkbench';
import { StudentRegistryConsole } from './admin/StudentRegistryConsole';
import { BatchExportView } from './admin/BatchExportView';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workbench' | 'registry' | 'export'>('dashboard');
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

      // If no student currently selected, default to first student in queue
      if (!selectedStudentId && studentsData.length > 0) {
        setSelectedStudentId(studentsData[0].id);
      }
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
    setActiveTab('workbench');
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans antialiased">
      {/* Fixed Desktop Institutional Header from Stitch */}
      <AdminHeader
        auth={auth}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={onLogout}
        onQuickLogin={onQuickLogin}
        searchQuery={filters.search || ''}
        onSearchChange={(q) => setFilters({ ...filters, search: q })}
      />

      {/* Main Desktop Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {loading && students.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-xs font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#00236f] border-t-transparent rounded-full animate-spin" />
              Loading Baselios Poulose II Catholicose College Verification Desk...
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <CommandDashboard
                students={students}
                stats={stats}
                onRefresh={fetchData}
                onSelectStudentForWorkbench={handleSelectStudentForWorkbench}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'workbench' && (
              <VerificationWorkbench
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={(id) => setSelectedStudentId(id)}
                onBackToDashboard={() => setActiveTab('dashboard')}
                onStudentUpdated={fetchData}
              />
            )}

            {activeTab === 'registry' && (
              <StudentRegistryConsole
                students={students}
                filters={filters}
                onFilterChange={(newFilters) => setFilters(newFilters)}
                onSelectStudentForWorkbench={handleSelectStudentForWorkbench}
              />
            )}

            {activeTab === 'export' && (
              <BatchExportView students={students} filters={filters} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
