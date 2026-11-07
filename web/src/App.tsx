import React, { useState, useEffect } from 'react';
import { AuthState, StudentProfile } from './types';
import { api, setAuthToken } from './services/api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CreditCardID } from './components/CreditCardID';
import { StudentForm } from './components/StudentForm';
import { AdminDashboard } from './components/AdminDashboard';
import { PrincipalDashboard } from './components/PrincipalDashboard';
import { FileEdit, AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem('token'),
    user: null,
  });
  const [loading, setLoading] = useState(true);

  // Student view mode: 'id-card' or 'extra-form'
  const [studentView, setStudentView] = useState<'id-card' | 'extra-form'>('id-card');
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  const initAuth = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      setAuth({ token, user });
      if (user.role === 'STUDENT') {
        const prof = await api.getStudentProfile();
        setStudentProfile(prof);
      }
    } catch (err) {
      console.warn('Session expired, logging out');
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setAuth({ token: null, user: null });
    setStudentProfile(null);
    setStudentView('id-card');
  };

  const handleQuickLogin = async (role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN') => {
    let email = 'admin@college.edu';
    if (role === 'STUDENT') email = 'ananya.joseph@student.college.edu';
    if (role === 'SUPER_ADMIN') email = 'principal@college.edu';

    try {
      const res = await api.login(email, 'Password@123');
      setAuthToken(res.token);
      setAuth({ token: res.token, user: res.user });
      if (role === 'STUDENT') {
        const prof = await api.getStudentProfile();
        setStudentProfile(prof);
        setStudentView('id-card');
      }
    } catch (err: any) {
      alert(`Quick login failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Initializing College Portal...
        </div>
      </div>
    );
  }

  if (auth.user?.role === 'ADMIN') {
    return (
      <AdminDashboard
        auth={auth}
        onLogout={handleLogout}
        onQuickLogin={handleQuickLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        auth={auth}
        onLogout={handleLogout}
        onQuickLogin={handleQuickLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {!auth.user ? (
          <AuthModal
            onAuthSuccess={(newAuth) => {
              setAuth(newAuth);
              if (newAuth.user?.role === 'STUDENT') {
                api.getStudentProfile().then((prof) => setStudentProfile(prof));
              }
            }}
            onQuickDemoLogin={handleQuickLogin}
          />
        ) : auth.user.role === 'STUDENT' && studentProfile ? (
          studentView === 'id-card' ? (
            /* STUDENT HOME: DIGITAL CREDIT CARD ID PREVIEW */
            <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
              <div className="text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Student Digital Identity
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Welcome, {studentProfile.firstName}!
                </h2>
                <p className="text-xs text-slate-500">
                  Your official digital identity card for library, attendance, and campus checkpoints.
                </p>
              </div>

              {/* Credit-Card ID Component */}
              <CreditCardID profile={studentProfile} />

              {/* Call to action card below ID */}
              <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Detailed Admission & Certificate Submission
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Submit your academic history, Malayalam name, parent details, bank info, and upload mandatory 10th/+2 certificates and APAAR ID.
                    </p>
                  </div>

                  {studentProfile.verificationStatus === 'CORRECTION_REQUIRED' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" /> Fix Mistakes
                    </span>
                  )}
                </div>

                {studentProfile.verificationStatus === 'CORRECTION_REQUIRED' && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      The college office flagged errors in your submission. Click below to edit the unlocked fields.
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setStudentView('extra-form')}
                  className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                    studentProfile.verificationStatus === 'CORRECTION_REQUIRED'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'
                  }`}
                >
                  {studentProfile.verificationStatus === 'CORRECTION_REQUIRED' ? (
                    <>
                      <AlertTriangle className="w-4 h-4" /> Review & Fix Flagged Mistakes
                    </>
                  ) : studentProfile.verificationStatus === 'SUBMITTED' ? (
                    <>
                      <FileEdit className="w-4 h-4" /> View Submitted Profile (Locked)
                    </>
                  ) : studentProfile.verificationStatus === 'VERIFIED' ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> View Verified Admission Form
                    </>
                  ) : (
                    <>
                      <span>Fill Extra Details & Upload Documents</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* STUDENT EXTRA DATA ENTRY FORM WIZARD */
            <StudentForm
              profile={studentProfile}
              onProfileUpdated={(updated) => setStudentProfile(updated)}
              onBackToCard={() => setStudentView('id-card')}
            />
          )
        ) : auth.user.role === 'SUPER_ADMIN' ? (
          /* PRINCIPAL (SUPER ADMIN) DASHBOARD */
          <PrincipalDashboard />
        ) : null}
      </main>
    </div>
  );
};

export default App;
