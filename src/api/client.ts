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

  patch: (id: string, updates: any) =>
    api.patch(`/api/sheets/${id}`, updates),

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

  // Helper to open PDF in new tab (bypasses ngrok warning)
  openPdf: async (pdfPath: string) => {
    // Dynamic import of message to avoid circular dependency
    const { message } = await import('antd')
    
    // For Electron: open a new window with a proper URL (not about:blank)
    // about:blank triggers OS "choose app" dialog in Electron
    const newWindow = window.open('', '_blank')
    
    if (!newWindow) {
      // Fallback: fetch and open inline in same window
      message.info('Opening PDF...')
      try {
        const url = `${API_BASE}/api/projects/serve-file?path=${encodeURIComponent(pdfPath)}`
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true', 'Accept': 'application/pdf' },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      } catch (error) {
        message.error(`Failed to open PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      return
    }
    
    // Write a loading page that doesn't use about:blank navigation
    newWindow.document.open()
    newWindow.document.write(`
      <html>
        <head>
          <title>Loading PDF...</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f5f5f5;
            }
            .loader {
              text-align: center;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #2563eb;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .text {
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <div class="text">Fetching PDF...</div>
          </div>
        </body>
      </html>
    `)
    newWindow.document.close()
    
    // Show loading message in parent window too
    const hideLoading = message.loading('Fetching PDF...', 0)
    
    try {
      const url = `${API_BASE}/api/projects/serve-file?path=${encodeURIComponent(pdfPath)}`
      
      console.log('Fetching PDF from:', url)
      
      // Fetch with ngrok header
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/pdf',
        },
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Get the PDF as blob
      const blob = await response.blob()
      console.log('Blob created:', blob.size, 'bytes')
      
      // Hide loading and show success
      hideLoading()
      message.success('PDF loaded successfully', 1.5)
      
      // Create object URL and embed PDF directly in the window using an iframe
      // This avoids about:blank navigation issues in Electron
      const blobUrl = URL.createObjectURL(blob)
      console.log('Loading blob URL into window:', blobUrl)
      
      newWindow.document.open()
      newWindow.document.write(`
        <html>
          <head><title>PDF Viewer</title></head>
          <body style="margin:0;padding:0;overflow:hidden;">
            <iframe src="${blobUrl}" style="width:100%;height:100vh;border:none;" frameborder="0"></iframe>
          </body>
        </html>
      `)
      newWindow.document.close()
      
      // Clean up the blob URL after a long delay to ensure PDF loads
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
        console.log('Blob URL revoked')
      }, 60000) // 60 second delay for Electron
    } catch (error) {
      hideLoading()
      console.error('Failed to open PDF:', error)
      message.error(`Failed to open PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Show error in the new window
      newWindow.document.open()
      newWindow.document.write(`
        <html>
          <head>
            <title>Error Loading PDF</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
              }
              .error {
                max-width: 500px;
                margin: 50px auto;
                padding: 20px;
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
              }
              h2 { color: #c00; margin-top: 0; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Failed to Load PDF</h2>
              <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
              <p><small>You can close this window.</small></p>
            </div>
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  },

  downloadPdf: async (pdfPath: string, fileName?: string) => {
    // Dynamic import of message to avoid circular dependency
    const { message } = await import('antd')
    
    const hideLoading = message.loading('Downloading PDF...', 0)
    
    try {
      const url = `${API_BASE}/api/projects/serve-file?path=${encodeURIComponent(pdfPath)}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/pdf',
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      const blob = await response.blob()
      
      hideLoading()
      message.success('PDF downloaded', 1.5)
      
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName || pdfPath.split('/').pop() || pdfPath.split('\\').pop() || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (error) {
      hideLoading()
      console.error('Failed to download PDF:', error)
      message.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  // Helper to get PDF URL from pdfPath
  pdfUrl: (pdfPath: string) => {
    return `${API_BASE}/api/projects/serve-file?path=${encodeURIComponent(pdfPath)}`
  },

  // Attachment management
  uploadAttachments: (sheetId: string, files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    // IMPORTANT: Do NOT set Content-Type manually — axios auto-sets it
    // with the proper multipart boundary when FormData is passed.
    // Setting it explicitly strips the boundary and Spring can't parse files.
    return api.post(`/api/sheets/${sheetId}/attachments`, formData, {
      headers: { 'Content-Type': undefined },
      timeout: 120000, // 2 min timeout for file uploads
    })
  },

  listAttachments: (sheetId: string) =>
    api.get(`/api/sheets/${sheetId}/attachments`),

  downloadAttachment: (sheetId: string, fileName: string) =>
    `${API_BASE}/api/sheets/${sheetId}/attachments/${encodeURIComponent(fileName)}`,

  deleteAttachment: (sheetId: string, fileName: string) =>
    api.delete(`/api/sheets/${sheetId}/attachments/${encodeURIComponent(fileName)}`),
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
