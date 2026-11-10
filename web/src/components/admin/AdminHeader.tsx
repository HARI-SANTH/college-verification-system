import React, { useState, useEffect } from 'react';
import { AuthState } from '../../types';

interface Props {
  auth: AuthState;
  activeTab: 'queue' | 'workbench' | 'registry';
  onTabChange: (tab: 'queue' | 'registry') => void;
  onLogout: () => void;
  onQuickLogin?: (role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN') => void;
  pendingCount: number;
  totalCount: number;
  verifiedCount?: number;
  onRefresh?: () => void;
}

export const AdminHeader: React.FC<Props> = ({
  auth,
  activeTab,
  onTabChange,
  onLogout,
  onQuickLogin,
  pendingCount,
  totalCount,
  verifiedCount,
  onRefresh,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const adminName =
    (auth.user as any)?.name ||
    auth.user?.email?.split('@')[0] ||
    'Admissions Officer';
  const adminRole = auth.user?.role || 'ADMIN';

  const isQueueActive = activeTab === 'queue' || activeTab === 'workbench';
  const isRegistryActive = activeTab === 'registry';

  return (
    <header className="sticky top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none">
      <div className="h-16 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: College Identity */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer"
          onClick={() => onTabChange('queue')}
        >
          <img
            alt="College Crest Logo"
            className="h-9 w-auto object-contain rounded-lg p-0.5 bg-white shadow-xs border border-slate-200"
            src="/college_logo.png"
            onError={(e: any) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#00236f] tracking-tight whitespace-nowrap uppercase">
                Baselios Poulose II Catholicose College
              </span>
              <span className="bg-[#eff4ff] text-[#1e3a8a] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-[#dce9ff]">
                UG Portal
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium leading-tight">
              Admissions Verification Desk • Institutional Governance
            </span>
          </div>
        </div>

        {/* Center: Module Navigation Pills */}
        <div className="flex items-center justify-center flex-1">
          <nav className="flex items-center bg-[#eff4ff] p-1 rounded-xl gap-1 border border-slate-200/50">
            {/* Tab 1: Verification Queue */}
            <button
              onClick={() => onTabChange('queue')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs transition-all ${
                isQueueActive
                  ? 'bg-[#1e3a8a] text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Verification Queue</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isQueueActive
                    ? 'bg-teal-300 text-teal-950'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pendingCount} Pending
              </span>
            </button>

            {/* Tab 2: Student Master Registry */}
            <button
              onClick={() => onTabChange('registry')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs transition-all ${
                isRegistryActive
                  ? 'bg-[#1e3a8a] text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span>Student Master Registry</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isRegistryActive
                    ? 'bg-teal-300 text-teal-950 font-bold'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {verifiedCount !== undefined ? `${verifiedCount} Verified` : `${totalCount} Total Records`}
              </span>
            </button>
          </nav>
        </div>

        {/* Right: Live Telemetry & Staff Profile */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Live Sync Status */}
          <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-slate-500 bg-[#eff4ff] px-3 py-1 rounded-lg border border-slate-200/60">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
            </span>
            <span className="font-semibold text-teal-700">Live Sync Active</span>
            <span className="text-slate-300">|</span>
            <span>{currentTime || 'Syncing...'}</span>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <div
              className="flex items-center gap-2.5 pl-3 border-l border-slate-200 cursor-pointer"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
            >
              <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-300 shadow-xs">
                {adminName.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs text-slate-900 font-bold leading-none capitalize">
                  {adminName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                  {adminRole}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">
                expand_more
              </span>
            </div>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                    Signed in as
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate block">
                    {auth.user?.email || adminName}
                  </span>
                </div>

                {onQuickLogin && (
                  <div className="py-1 border-b border-slate-100">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-3 py-1 block">
                      Quick Switch (Testing)
                    </span>
                    <button
                      onClick={() => {
                        onQuickLogin('STUDENT');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-blue-600">school</span>
                      <span>Switch to Student View</span>
                    </button>
                    <button
                      onClick={() => {
                        onQuickLogin('SUPER_ADMIN');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-purple-600">shield</span>
                      <span>Super Admin Console</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-2 font-medium mt-1"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
