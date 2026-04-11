import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  if (user) {
    const parsed = JSON.parse(user);
    config.headers['X-User-Email'] = parsed.email;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== Action Sheet API ==========
export const sheetsApi = {
  getAll: (search?: string) =>
    api.get('/api/sheets', { params: search ? { search } : {} }),

  getById: (id: string) =>
    api.get(`/api/sheets/${id}`),

  create: (sheet: any) =>
    api.post('/api/sheets', sheet),

  update: (id: string, sheet: any) =>
    api.put(`/api/sheets/${id}`, sheet),

  delete: (id: string, deletedBy: string) =>
    api.delete(`/api/sheets/${id}`, { params: { deletedBy } }),

  restore: (id: string) =>
    api.post(`/api/sheets/${id}/restore`),

  getDrafts: () =>
    api.get('/api/sheets/drafts'),

  getDeleted: () =>
    api.get('/api/sheets/deleted'),

  send: (id: string) =>
    api.post(`/api/sheets/${id}/send`),

  respond: (id: string, data: {
    email: string;
    response: string;
    senderUserId?: string;
    senderRole?: string;
    hierarchyLevel?: number;
  }) => api.post(`/api/sheets/${id}/respond`, data),

  override: (id: string, data: {
    status: string;
    gmEmail: string;
    note: string;
  }) => api.post(`/api/sheets/${id}/override`, data),

  resend: (id: string) =>
    api.post(`/api/sheets/${id}/resend`),

  fileUrl: (fileName: string) =>
    `${API_BASE}/api/sheets/files/${encodeURIComponent(fileName)}`,
};

// ========== Auth API ==========
export const authApi = {
  login: (email: string, password?: string) =>
    api.post('/api/auth/login', { email, password }),

  logout: () =>
    api.post('/api/auth/logout'),

  me: (email: string) =>
    api.get('/api/auth/me', { params: { email } }),
};

// ========== Draft Recovery API (Admin) ==========
export const draftRecoveryApi = {
  list: () => api.get('/api/admin/draft-recovery'),
  restore: (fileName: string) => api.post(`/api/admin/draft-recovery/restore/${encodeURIComponent(fileName)}`),
  deleteSnapshot: (fileName: string) => api.delete(`/api/admin/draft-recovery/${encodeURIComponent(fileName)}`),
};

// ========== Admin Config API ==========
export const configApi = {
  getEmail: () => api.get('/api/admin/config/email'),
  getAd: () => api.get('/api/admin/config/ad'),
  getNotifications: () => api.get('/api/admin/config/notifications'),
  getSystem: () => api.get('/api/admin/config/system'),
};

// ========== Admin Users API (users.json) ==========
export const usersApi = {
  list: () => api.get('/api/admin/users'),
  add: (data: { username: string; email: string; password: string; role: string }) => api.post('/api/admin/users', data),
  update: (email: string, data: { username?: string; role?: string; password?: string }) => api.put(`/api/admin/users/${encodeURIComponent(email)}`, data),
  remove: (email: string) => api.delete(`/api/admin/users/${encodeURIComponent(email)}`),
};

// ========== Project API ==========
export const projectsApi = {
  getAll: () => api.get('/api/projects'),
  create: (project: any) => api.post('/api/projects', project),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
  getFiles: (id: string) => api.get(`/api/projects/${id}/files`),
  serveFileUrl: (path: string) =>
    `${API_BASE}/api/projects/serve-file?path=${encodeURIComponent(path)}`,
};

// ========== Employee API ==========
export const employeesApi = {
  getAll: () => api.get('/api/employees'),
  getByEmail: (email: string) => api.get(`/api/employees/${encodeURIComponent(email)}`),
  search: (query: string) =>
    api.get('/api/employees', { params: { search: query } }),
  create: (employee: any) => api.post('/api/employees', employee),
  delete: (email: string) => api.delete(`/api/employees/${encodeURIComponent(email)}`),
};

// ========== Repository API ==========
export const repositoryApi = {
  getDocuments: (dateKey: string, includeDeleted = false) =>
    api.get(`/api/repository/documents/${dateKey}`, { params: { includeDeleted } }),
  getDatesWithDocs: (year: number, month: number) =>
    api.get(`/api/repository/dates/${year}/${month}`),
  upload: (dateKey: string, files: File[], uploaderName = 'Current User') => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('uploaderName', uploaderName)
    return api.post(`/api/repository/upload/${dateKey}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  downloadUrl: (dateKey: string, fileName: string) =>
    `${API_BASE}/api/repository/download/${dateKey}/${encodeURIComponent(fileName)}`,
  deleteDocument: (dateKey: string, docId: string) =>
    api.delete(`/api/repository/documents/${dateKey}/${docId}`),
  restoreDocument: (dateKey: string, docId: string) =>
    api.post(`/api/repository/restore/${dateKey}/${docId}`),
};

export default api;
