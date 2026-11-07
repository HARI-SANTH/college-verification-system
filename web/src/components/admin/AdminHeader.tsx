import React, { useState, useEffect } from 'react';
import { AuthState } from '../../types';
import {
  School,
  Search,
  Calendar,
  Bell,
  Lock,
  ChevronRight,
  LogOut,
  Building2,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface Props {
  auth: AuthState;
  activeTab: 'dashboard' | 'workbench' | 'registry' | 'export';
  onTabChange: (tab: 'dashboard' | 'workbench' | 'registry' | 'export') => void;
  onLogout: () => void;
  onQuickLogin: (role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const AdminHeader: React.FC<Props> = ({
  auth,
  activeTab,
  onTabChange,
  onLogout,
  onQuickLogin,
  searchQuery,
  onSearchChange,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('admin-quick-search') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all select-none">
      {/* Top Tier: College Identity, Omnibox, Profile */}
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col justify-between py-2 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4 h-14">
          {/* Logo & College Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onTabChange('dashboard')}
          >
            <img
              src="/college_logo.png"
              alt="BPC College Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 shadow-xs border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#00236f] leading-tight tracking-tight uppercase">
                BASELIOS PAULOSE II CATHOLICOSE COLLEGE
              </span>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <span>Piravom • Office Administration & Verification Desk</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span className="text-teal-700 font-bold text-[11px] tracking-wide">CampusFlow 2.0</span>
              </div>
            </div>
          </div>

          {/* Omnibox Search with ⌘K */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[20px] pointer-events-none">
                search
              </span>
              <input
                id="admin-quick-search"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Quick search student by Roll No, Reg ID, or Name (e.g. 24-BCOM-1082)..."
                className="w-full pl-10 pr-14 py-2 bg-slate-100/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00236f]/20 border border-transparent focus:border-[#00236f]/30 transition-all shadow-inner"
              />
              <kbd className="absolute right-3 px-1.5 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-mono text-slate-500 font-bold shadow-xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Action Tools: Session, Notifications, Admin Profile */}
          <div className="flex items-center gap-3">
            {/* Session Pill */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="material-symbols-outlined text-teal-600 text-[18px]">calendar_today</span>
              <span className="text-slate-500 font-medium">Session:</span>
              <span className="font-bold text-slate-800">AY 2024-25</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors relative"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-800">Desk Notifications</span>
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full">
                      3 New
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-800">Rahul Nair resubmitted certificate</p>
                      <span className="text-[10px] text-slate-400">10m ago • Marksheet corrected</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-800">Batch 2024-28 UGC Report Ready</p>
                      <span className="text-[10px] text-slate-400">45m ago • 24 Verified records</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Pill (Demo) */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors border border-slate-200"
              >
                <span className="material-symbols-outlined text-[16px] text-indigo-600">swap_horiz</span>
                <span>Switch Role</span>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Fast Demo Switch
                  </div>
                  <button
                    onClick={() => {
                      onQuickLogin('STUDENT');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600" /> Student View
                  </button>
                  <button
                    onClick={() => {
                      onQuickLogin('ADMIN');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Office Admin (Current)
                  </button>
                  <button
                    onClick={() => {
                      onQuickLogin('SUPER_ADMIN');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-amber-600" /> Principal Dashboard
                  </button>
                </div>
              )}
            </div>

            <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

            {/* Officer Profile Badge */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {auth.user?.email.split('@')[0] || 'Thomas M.'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Senior Verification Officer
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#00236f] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar Tier */}
        <div className="flex items-center justify-between h-11 pt-1">
          <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Verification Desk</span>
            </button>

            <button
              onClick={() => onTabChange('workbench')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'workbench'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">compare</span>
              <span>Verification Workbench</span>
            </button>

            <button
              onClick={() => onTabChange('registry')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'registry'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span>Student Registry & Filters</span>
            </button>

            <button
              onClick={() => onTabChange('export')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Batch Document Export</span>
            </button>
          </nav>

          {/* Node Status Pill */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
              <span className="text-[10px] text-teal-800 uppercase tracking-wider font-extrabold">
                Verification Node Online
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Desk ID: BPC-OFF-01</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-bar: Breadcrumb & Shortcuts reminder */}
      <div className="h-8 w-full px-4 sm:px-6 lg:px-8 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[16px] text-slate-400">domain</span>
          <span>Administration</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span>Registrar Services</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">
            {activeTab === 'dashboard' && 'Command & Operations Overview'}
            {activeTab === 'workbench' && 'Dual-Pane Side-by-Side Document Inspector'}
            {activeTab === 'registry' && 'Multi-Parameter Query Console & Registry'}
            {activeTab === 'export' && 'UGC Master Excel & Archival ZIP Dispatcher'}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[11px]">
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Shortcuts:</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Alt+A</kbd>
            <span>Approve</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Alt+F</kbd>
            <span>Flag Notice</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Alt+N</kbd>
            <span>Next Record</span>
          </div>
        </div>
      </div>
    </header>
  );
};
