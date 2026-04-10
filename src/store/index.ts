import { create } from 'zustand';
import { sheetsApi, employeesApi } from '../api/client';

// ========== Types ==========
export interface ActionSheet {
  id: string;
  title: string;
  status: string;
  createdDate: string;
  dueDate: string;
  workflowState: string;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  lastModified: number;
  hasConflict: boolean;
  conflictSeverity?: string;
  overriddenBy?: string;
  overrideNote?: string;
  projectId?: string;
  pdfPath?: string;
  assignedTo: Record<string, string>;
  responses: Record<string, string>;
  othersEmails: Record<string, string>;
  formData: Record<string, any>;
  recipientTypes: Record<string, string>;
  userStatuses: Record<string, string>;
  responseHistory: any[];
  conflictLog: any[];
  conflictThreads: any[];
  recipientCount: number;
  responseCount: number;
}

export interface User {
  email: string;
  name: string;
  role: string;
  department: string;
  hierarchyLevel: number;
}

// ========== Auth Store ==========
interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (email: string) => {
    set({ isLoading: true });
    try {
      // Try to find employee in the directory
      const response = await employeesApi.getByEmail(email);
      const emp = response.data;
      const user: User = {
        email: emp.email,
        name: emp.name,
        role: emp.role || 'User',
        department: emp.department || '',
        hierarchyLevel: emp.hierarchyLevel || 5,
      };
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoading: false });
      return true;
    } catch {
      // If employee not found, create a temporary user session
      // This allows login without pre-seeded data (dev/testing)
      const user: User = {
        email,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        role: 'Admin',
        department: 'General',
        hierarchyLevel: 1,
      };
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoading: false });
      return true;
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null });
  },

  loadUser: () => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        set({ user: JSON.parse(stored) });
      } catch {
        localStorage.removeItem('user');
      }
    }
  },
}));

// ========== Sheets Store ==========
interface SheetsState {
  sheets: ActionSheet[];
  currentSheet: ActionSheet | null;
  isLoading: boolean;
  error: string | null;

  fetchSheets: (search?: string) => Promise<void>;
  fetchSheet: (id: string) => Promise<void>;
  createSheet: (sheet: Partial<ActionSheet>) => Promise<ActionSheet>;
  updateSheet: (id: string, sheet: Partial<ActionSheet>) => Promise<void>;
  deleteSheet: (id: string, deletedBy: string) => Promise<void>;
  restoreSheet: (id: string) => Promise<void>;
  sendSheet: (id: string) => Promise<void>;
  respondToSheet: (id: string, email: string, response: string) => Promise<void>;
  overrideStatus: (id: string, status: string, gmEmail: string, note: string) => Promise<void>;
  clearError: () => void;
}

export const useSheetsStore = create<SheetsState>((set, get) => ({
  sheets: [],
  currentSheet: null,
  isLoading: false,
  error: null,

  fetchSheets: async (search?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sheetsApi.getAll(search);
      set({ sheets: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, sheets: [] });
    }
  },

  fetchSheet: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sheetsApi.getById(id);
      set({ currentSheet: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createSheet: async (sheet: Partial<ActionSheet>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sheetsApi.create(sheet);
      const newSheet = response.data;
      set((state) => ({
        sheets: [newSheet, ...state.sheets],
        isLoading: false,
      }));
      return newSheet;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateSheet: async (id: string, sheet: Partial<ActionSheet>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sheetsApi.update(id, sheet);
      set((state) => ({
        sheets: state.sheets.map((s) => (s.id === id ? response.data : s)),
        currentSheet: response.data,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteSheet: async (id: string, deletedBy: string) => {
    try {
      await sheetsApi.delete(id, deletedBy);
      set((state) => ({
        sheets: state.sheets.filter((s) => s.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  restoreSheet: async (id: string) => {
    try {
      await sheetsApi.restore(id);
      get().fetchSheets();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  sendSheet: async (id: string) => {
    try {
      const response = await sheetsApi.send(id);
      set((state) => ({
        sheets: state.sheets.map((s) => (s.id === id ? response.data : s)),
        currentSheet: response.data,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  respondToSheet: async (id: string, email: string, response: string) => {
    try {
      const res = await sheetsApi.respond(id, { email, response });
      set((state) => ({
        sheets: state.sheets.map((s) => (s.id === id ? res.data : s)),
        currentSheet: res.data,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  overrideStatus: async (id: string, status: string, gmEmail: string, note: string) => {
    try {
      const response = await sheetsApi.override(id, { status, gmEmail, note });
      set((state) => ({
        sheets: state.sheets.map((s) => (s.id === id ? response.data : s)),
        currentSheet: response.data,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
