import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  Activity,
  Award,
  Layers,
  Building,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from 'lucide-react';

export const PrincipalDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Admin Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [addError, setAddError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, a, l] = await Promise.all([
        api.getPrincipalStats(),
        api.getAdmins(),
        api.getAuditLogs(),
      ]);
      setStats(s);
      setAdmins(a);
      setAuditLogs(l);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.createAdmin({
        email: newEmail,
        phoneNumber: newPhone,
        password: newPassword,
        role: newRole,
      });
      setShowAddModal(false);
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      fetchData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create staff');
    }
  };

  const handleToggleAdmin = async (id: string) => {
    try {
      await api.toggleAdmin(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-xs">Loading institutional analytics...</div>;
  }

  const verifiedPercent = stats?.totalStudents
    ? Math.round((stats.statusPipeline.verified / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Principal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
              Executive Super Admin
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Principal's Institutional Oversight</h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Full governance of admissions, office verification productivity, demographic compliance, and audit logs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Office Verifier
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalStudents || 0}</div>
            <span className="text-[11px] text-slate-500">Registered across batches</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Office Verified</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">
              {stats?.statusPipeline.verified || 0}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">{verifiedPercent}% Completion</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Review Queue</span>
            <div className="text-3xl font-black text-sky-600 mt-1">
              {stats?.statusPipeline.submitted || 0}
            </div>
            <span className="text-[11px] text-slate-500">Awaiting office check</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flagged Mistakes</span>
            <div className="text-3xl font-black text-amber-600 mt-1">
              {stats?.statusPipeline.correctionRequired || 0}
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">Action with student</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Demographic & Compliance Visual Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-600" /> Quota Distribution
          </h3>
          <div className="space-y-2">
            {stats?.byQuota?.map((q: any) => (
              <div key={q.quota} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{q.quota}</span>
                  <span>{q.count} ({Math.round((q.count / (stats.totalStudents || 1)) * 100)}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(q.count / (stats.totalStudents || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EWS Category Representation */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-600" /> Financial & EWS Compliance
          </h3>
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-amber-900">EWS Category (&lt; ₹1L)</span>
              <span className="font-extrabold text-amber-800">{stats?.ewsBreakdown?.ews || 0} students</span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200 mt-2 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{
                  width: `${((stats?.ewsBreakdown?.ews || 0) / (stats?.totalStudents || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Non-EWS (&ge; ₹1L)</span>
              <span className="font-extrabold text-slate-800">{stats?.ewsBreakdown?.nonEws || 0} students</span>
            </div>
          </div>
        </div>

        {/* Course Enrollment Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" /> Course Enrollments
          </h3>
          <div className="space-y-2">
            {stats?.byCourse?.map((c: any) => (
              <div key={c.course} className="flex justify-between items-center text-xs border-b pb-1">
                <span className="font-semibold text-slate-700">{c.course}</span>
                <span className="font-bold text-indigo-900">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Office Staff Governance & Accounts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Office Staff Access & Accounts
          </h3>
          <span className="text-[11px] text-slate-400">Manage clerk credentials & permissions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Staff Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Actions Logged</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Toggle Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{admin.email}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{admin.phoneNumber}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {admin.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {admin._count?.auditLogs || 0} reviews
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        admin.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {admin.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleAdmin(admin.id)}
                      className="text-slate-500 hover:text-blue-600"
                    >
                      {admin.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Trail Log Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Immutable Verification Audit Trail
          </h3>
          <span className="text-[11px] text-slate-400">Last 100 administrative actions</span>
        </div>

        <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No actions recorded yet.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{log.admin?.email}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                  {log.details?.flaggedItems && (
                    <span className="ml-2 text-rose-600 text-[11px]">
                      (Flagged {log.details.flaggedItems.length} items)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Register New Office Staff</h3>
            <p className="text-xs text-slate-500 mt-1">
              Grant verification permissions to office clerks or assistant principals.
            </p>

            {addError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Staff Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="clerk@college.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 bg-white"
                >
                  <option value="ADMIN">Office Staff (Admin)</option>
                  <option value="SUPER_ADMIN">Vice Principal / Principal (Super Admin)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
