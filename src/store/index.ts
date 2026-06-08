import { create } from 'zustand';
import type {
  AppState,
  HealthData,
  FamilyMember,
  HealthReport,
  HealthIndicator,
  MedicationNote,
  DoctorAdvice,
  FollowUpReminder,
  IndicatorDictionary,
  AppSettings,
} from '../types';
import {
  generateKey,
  verifyPassword,
  hashPassword,
  savePasswordHash,
  getPasswordHash,
  saveEncryptedData,
  loadEncryptedData,
  hasPasswordHash,
  hasStoredData,
  clearAllData,
} from '../utils/encryption';
import { DEFAULT_DICTIONARY, generateId, parseReferenceRange, determineStatus } from '../utils/indicatorParser';
import { createMockData } from '../utils/mockData';

interface ImportResult {
  memberId: string;
  memberName: string;
  totalCount: number;
  abnormalCount: number;
  reportId: string;
  examDate: string;
  importedAt: string;
}

interface StoreState extends AppState, HealthData {
  unlock: (password: string) => Promise<boolean>;
  initialize: (password: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  lock: () => void;
  setCurrentMember: (memberId: string | null) => void;
  saveData: () => void;
  loadData: (key?: string) => boolean;
  lastImportResult: ImportResult | null;
  clearLastImportResult: () => void;
  importHistory: ImportResult[];
  addMember: (member: Omit<FamilyMember, 'id' | 'createdAt' | 'isActive'>) => string;
  updateMember: (id: string, member: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;
  addReport: (report: Omit<HealthReport, 'id' | 'createdAt'>) => string;
  addIndicators: (indicators: Array<Omit<HealthIndicator, 'id'>>) => void;
  updateIndicator: (id: string, updates: Partial<HealthIndicator>) => void;
  deleteIndicator: (id: string) => void;
  addMedication: (medication: Omit<MedicationNote, 'id'>) => void;
  updateMedication: (id: string, updates: Partial<MedicationNote>) => void;
  deleteMedication: (id: string) => void;
  addAdvice: (advice: Omit<DoctorAdvice, 'id'>) => void;
  updateAdvice: (id: string, updates: Partial<DoctorAdvice>) => void;
  deleteAdvice: (id: string) => void;
  addReminder: (reminder: Omit<FollowUpReminder, 'id'>) => void;
  updateReminder: (id: string, updates: Partial<FollowUpReminder>) => void;
  deleteReminder: (id: string) => void;
  addDictionaryItem: (item: Omit<IndicatorDictionary, 'id'>) => void;
  updateDictionaryItem: (id: string, updates: Partial<IndicatorDictionary>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetAllData: () => void;
  loadMockData: () => void;
  setLastImportResult: (result: Omit<ImportResult, 'importedAt'> | null) => void;
  memberFavoriteIndicators: Record<string, string[]>;
  setMemberFavoriteIndicators: (memberId: string, indicators: string[]) => void;
}

const initialSettings: AppSettings = {
  autoLockTimeout: 300,
  theme: 'light',
  language: 'zh-CN',
};

const initialHealthData: HealthData = {
  members: [],
  reports: [],
  indicators: [],
  medications: [],
  advices: [],
  reminders: [],
  dictionary: DEFAULT_DICTIONARY,
};

const initialAppState: AppState & { lastImportResult: ImportResult | null; importHistory: ImportResult[]; memberFavoriteIndicators: Record<string, string[]> } = {
  isLocked: true,
  isInitialized: false,
  currentMemberId: null,
  settings: initialSettings,
  lastImportResult: null,
  importHistory: [],
  memberFavoriteIndicators: {},
};

export const useHealthStore = create<StoreState>((set, get) => ({
  ...initialAppState,
  ...initialHealthData,

  unlock: async (password: string) => {
    const passwordHash = getPasswordHash();
    if (!passwordHash) return false;

    if (!verifyPassword(password, passwordHash)) {
      return false;
    }

    const key = generateKey(password);
    const success = get().loadData(key);

    if (success) {
      set({ isLocked: false, encryptionKey: key });
      return true;
    }

    return false;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const currentHash = getPasswordHash();
    if (!currentHash) return false;

    if (!verifyPassword(oldPassword, currentHash)) {
      return false;
    }

    const oldKey = generateKey(oldPassword);
    const newKey = generateKey(newPassword);

    const { encryptionKey, settings, ...healthData } = get();
    const dataToSave = { ...healthData, settings };
    saveEncryptedData(dataToSave, newKey);

    const newHash = hashPassword(newPassword);
    savePasswordHash(newHash);

    set({ encryptionKey: newKey });
    return true;
  },

  initialize: async (password: string) => {
    const hash = hashPassword(password);
    savePasswordHash(hash);

    const key = generateKey(password);
    const data = {
      ...initialHealthData,
      settings: initialSettings,
    };
    saveEncryptedData(data, key);

    set({
      ...initialHealthData,
      isLocked: false,
      isInitialized: true,
      encryptionKey: key,
    });

    return true;
  },

  lock: () => {
    set({ isLocked: true, encryptionKey: undefined });
  },

  setCurrentMember: (memberId: string | null) => {
    set({ currentMemberId: memberId });
  },

  saveData: () => {
    const { encryptionKey, settings, ...healthData } = get();
    if (!encryptionKey) return;

    const dataToSave = {
      ...healthData,
      settings,
    };
    saveEncryptedData(dataToSave, encryptionKey);
  },

  loadData: (key?: string) => {
    const encryptionKey = key || get().encryptionKey;
    if (!encryptionKey) return false;

    const data = loadEncryptedData<HealthData & { settings: AppSettings }>(encryptionKey);
    if (!data) return false;

    const hasData = data.members && data.members.length > 0;

    set({
      members: data.members || [],
      reports: data.reports || [],
      indicators: data.indicators || [],
      medications: data.medications || [],
      advices: data.advices || [],
      reminders: data.reminders || [],
      dictionary: data.dictionary || DEFAULT_DICTIONARY,
      settings: data.settings || initialSettings,
      isInitialized: hasPasswordHash(),
      currentMemberId: data.members && data.members.length > 0 ? data.members[0].id : null,
    });

    return true;
  },

  addMember: (member) => {
    const newMember: FamilyMember = {
      ...member,
      id: generateId(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      members: [...state.members, newMember],
      currentMemberId: state.currentMemberId || newMember.id,
    }));
    get().saveData();
    return newMember.id;
  },

  updateMember: (id, updates) => {
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    get().saveData();
  },

  deleteMember: (id) => {
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
      reports: state.reports.filter((r) => r.memberId !== id),
      indicators: state.indicators.filter((i) => i.memberId !== id),
      medications: state.medications.filter((m) => m.memberId !== id),
      advices: state.advices.filter((a) => a.memberId !== id),
      reminders: state.reminders.filter((r) => r.memberId !== id),
      currentMemberId: state.currentMemberId === id ? null : state.currentMemberId,
    }));
    get().saveData();
  },

  addReport: (report) => {
    const newReport: HealthReport = {
      ...report,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ reports: [...state.reports, newReport] }));
    get().saveData();
    return newReport.id;
  },

  addIndicators: (indicators) => {
    const newIndicators: HealthIndicator[] = indicators.map((i) => ({
      ...i,
      id: generateId(),
    }));
    set((state) => ({ indicators: [...state.indicators, ...newIndicators] }));
    get().saveData();
  },

  updateIndicator: (id, updates) => {
    set((state) => ({
      indicators: state.indicators.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, ...updates, manualEdited: true };
        if (updates.value !== undefined || updates.referenceRange !== undefined) {
          const numericValue = parseFloat(updated.value);
          const { minValue, maxValue } = parseReferenceRange(updated.referenceRange || '');
          const { status, isAbnormal } = determineStatus(
            isNaN(numericValue) ? undefined : numericValue,
            minValue,
            maxValue
          );
          return {
            ...updated,
            numericValue: isNaN(numericValue) ? undefined : numericValue,
            minValue,
            maxValue,
            status,
            isAbnormal,
          };
        }
        return updated;
      }),
    }));
    get().saveData();
  },

  deleteIndicator: (id) => {
    set((state) => ({
      indicators: state.indicators.filter((i) => i.id !== id),
    }));
    get().saveData();
  },

  addMedication: (medication) => {
    const newMedication: MedicationNote = {
      ...medication,
      id: generateId(),
    };
    set((state) => ({ medications: [...state.medications, newMedication] }));
    get().saveData();
  },

  updateMedication: (id, updates) => {
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
    get().saveData();
  },

  deleteMedication: (id) => {
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id),
    }));
    get().saveData();
  },

  addAdvice: (advice) => {
    const newAdvice: DoctorAdvice = {
      ...advice,
      id: generateId(),
    };
    set((state) => ({ advices: [...state.advices, newAdvice] }));
    get().saveData();
  },

  updateAdvice: (id, updates) => {
    set((state) => ({
      advices: state.advices.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
    get().saveData();
  },

  deleteAdvice: (id) => {
    set((state) => ({
      advices: state.advices.filter((a) => a.id !== id),
    }));
    get().saveData();
  },

  addReminder: (reminder) => {
    const newReminder: FollowUpReminder = {
      ...reminder,
      id: generateId(),
    };
    set((state) => ({ reminders: [...state.reminders, newReminder] }));
    get().saveData();
  },

  updateReminder: (id, updates) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    get().saveData();
  },

  deleteReminder: (id) => {
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
    get().saveData();
  },

  addDictionaryItem: (item) => {
    const newItem: IndicatorDictionary = {
      ...item,
      id: generateId(),
    };
    set((state) => ({ dictionary: [...state.dictionary, newItem] }));
    get().saveData();
  },

  updateDictionaryItem: (id, updates) => {
    set((state) => ({
      dictionary: state.dictionary.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
    get().saveData();
  },

  updateSettings: (settings) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
    get().saveData();
  },

  resetAllData: () => {
    clearAllData();
    set({
      ...initialAppState,
      ...initialHealthData,
    });
  },

  loadMockData: () => {
    const mockData = createMockData();
    set({
      ...mockData,
      isLocked: false,
      isInitialized: true,
      currentMemberId: mockData.members[0]?.id || null,
    });
    get().saveData();
  },

  setLastImportResult: (result: Omit<ImportResult, 'importedAt'> | null) => {
      if (result) {
        const resultWithTime: ImportResult = { ...result, importedAt: new Date().toISOString() };
        set((state) => ({
          lastImportResult: resultWithTime,
          importHistory: [resultWithTime, ...state.importHistory].slice(0, 20),
        }));
      } else {
        set({ lastImportResult: null });
      }
    },

  clearLastImportResult: () => {
    set({ lastImportResult: null });
  },

  setMemberFavoriteIndicators: (memberId, indicators) => {
    set((state) => ({
      memberFavoriteIndicators: {
        ...state.memberFavoriteIndicators,
        [memberId]: indicators,
      },
    }));
  },
}));

export function checkAppInitialized(): boolean {
  return hasPasswordHash() && hasStoredData();
}
