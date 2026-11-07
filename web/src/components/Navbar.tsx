import React from 'react';
import { AuthState } from '../types';
import { LogOut, ShieldCheck, GraduationCap, Building2, User } from 'lucide-react';

interface Props {
  auth: AuthState;
  onLogout: () => void;
  onQuickLogin: (role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN') => void;
}

export const Navbar: React.FC<Props> = ({ auth, onLogout, onQuickLogin }) => {
  const getRoleBadge = () => {
    if (!auth.user) return null;
    switch (auth.user.role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
            <Building2 className="w-3 h-3" /> Principal (Super Admin)
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-300" /> Office Staff
          </span>
        );
      case 'STUDENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-blue-300" /> Student
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <img
            src="/college_logo.png"
            alt="BPC College Logo"
            className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 shadow-sm"
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight uppercase text-white">
              BASELIOS PAULOSE II CATHOLICOSE COLLEGE
            </h1>
            <p className="text-[10px] text-blue-300 tracking-wider">
              Piravom • Student Records & Admission Verification Portal
            </p>
          </div>
        </div>

        {/* Right: Quick Demo Switcher + User Info & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Demo Role Switcher */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">
            <span className="text-[10px] text-slate-400 px-2 font-semibold uppercase">Demo Switch:</span>
            <button
              onClick={() => onQuickLogin('STUDENT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                auth.user?.role === 'STUDENT'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => onQuickLogin('ADMIN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                auth.user?.role === 'ADMIN'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Office Admin
            </button>
            <button
              onClick={() => onQuickLogin('SUPER_ADMIN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                auth.user?.role === 'SUPER_ADMIN'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Principal
            </button>
          </div>

          {auth.user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1.5">{getRoleBadge()}</div>
                <div className="text-xs text-slate-300 font-medium truncate max-w-[160px]">
                  {auth.user.email}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
