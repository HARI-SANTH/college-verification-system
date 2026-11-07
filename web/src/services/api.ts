const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

const getHeaders = (isMultipart = false): HeadersInit => {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  async register(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async login(identifier: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ identifier, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch user');
    return json;
  },

  // Student
  async getStudentProfile() {
    const res = await fetch(`${API_BASE}/student/profile`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch profile');
    return json;
  },

  async updateStudentProfile(data: any) {
    const res = await fetch(`${API_BASE}/student/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update profile');
    return json;
  },

  async uploadDocument(type: string, file: File) {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/student/documents`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Document upload failed');
    return json;
  },

  // Admin
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch admin stats');
    return json;
  },

  async getStudents(filters: Record<string, string | boolean | undefined>) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        params.append(key, String(val));
      }
    });

    const res = await fetch(`${API_BASE}/admin/students?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch students');
    return json;
  },

  async getStudentById(id: string) {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch student details');
    return json;
  },

  async flagMistakes(id: string, flags: Array<{ key: string; reason: string }>) {
    const res = await fetch(`${API_BASE}/admin/students/${id}/flag`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ flags }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to flag mistakes');
    return json;
  },

  async verifyStudent(id: string) {
    const res = await fetch(`${API_BASE}/admin/students/${id}/verify`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to verify student');
    return json;
  },

  async aiVerifyStudent(id: string) {
    const res = await fetch(`${API_BASE}/admin/students/${id}/ai-verify`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to run AI verification');
    return json;
  },

  getExcelExportUrl(filters: Record<string, string | boolean | undefined>) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        params.append(key, String(val));
      }
    });
    return `${API_BASE}/admin/export/excel?${params.toString()}`;
  },

  getDocumentsZipUrl(filters: Record<string, string | boolean | undefined>, docType?: string) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        params.append(key, String(val));
      }
    });
    if (docType) {
      params.append('documentType', docType);
    }
    return `${API_BASE}/admin/export/documents-zip?${params.toString()}`;
  },

  // Principal
  async getPrincipalStats() {
    const res = await fetch(`${API_BASE}/principal/stats`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch principal stats');
    return json;
  },

  async getAdmins() {
    const res = await fetch(`${API_BASE}/principal/admins`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch admins');
    return json;
  },

  async createAdmin(data: any) {
    const res = await fetch(`${API_BASE}/principal/admins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create admin');
    return json;
  },

  async toggleAdmin(id: string) {
    const res = await fetch(`${API_BASE}/principal/admins/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to toggle admin status');
    return json;
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/principal/audit-logs`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch audit logs');
    return json;
  },
};
