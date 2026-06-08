export interface FamilyMember {
  id: string;
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  relationship: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface HealthReport {
  id: string;
  memberId: string;
  examDate: string;
  hospital: string;
  reportType: string;
  sourceFileName?: string;
  createdAt: string;
}

export interface HealthIndicator {
  id: string;
  reportId: string;
  memberId: string;
  indicatorName: string;
  indicatorCode?: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  minValue?: number;
  maxValue?: number;
  status: 'normal' | 'high' | 'low' | 'critical';
  category: string;
  isAbnormal: boolean;
  examDate: string;
  manualEdited?: boolean;
}

export interface IndicatorDictionary {
  id: string;
  standardName: string;
  aliases: string[];
  unit: string;
  defaultReference: string;
  category: string;
}

export interface MedicationNote {
  id: string;
  memberId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
}

export interface DoctorAdvice {
  id: string;
  memberId: string;
  reportId?: string;
  content: string;
  dateRecorded: string;
}

export interface FollowUpReminder {
  id: string;
  memberId: string;
  title: string;
  description?: string;
  remindDate: string;
  isCompleted: boolean;
  relatedIndicator?: string;
}

export interface ParsedIndicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
}

export interface ImportedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'parsing' | 'parsed' | 'error';
  parsedDate?: string;
  parsedMemberId?: string;
  parsedIndicators?: ParsedIndicator[];
  error?: string;
}

export interface AppSettings {
  autoLockTimeout: number;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en';
}

export interface AppState {
  isLocked: boolean;
  isInitialized: boolean;
  currentMemberId: string | null;
  encryptionKey?: string;
  settings: AppSettings;
}

export interface HealthData {
  members: FamilyMember[];
  reports: HealthReport[];
  indicators: HealthIndicator[];
  medications: MedicationNote[];
  advices: DoctorAdvice[];
  reminders: FollowUpReminder[];
  dictionary: IndicatorDictionary[];
}
