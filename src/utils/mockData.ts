import type {
  FamilyMember,
  HealthReport,
  HealthIndicator,
  MedicationNote,
  DoctorAdvice,
  FollowUpReminder,
  IndicatorDictionary,
  HealthData,
} from '../types';
import { DEFAULT_DICTIONARY, generateId, parseReferenceRange, determineStatus } from './indicatorParser';

function generateMemberId(): string {
  return `member-${generateId()}`;
}

function generateReportId(): string {
  return `report-${generateId()}`;
}

function createIndicator(
  reportId: string,
  memberId: string,
  examDate: string,
  name: string,
  value: number,
  unit: string,
  referenceRange: string,
  category: string
): HealthIndicator {
  const { minValue, maxValue } = parseReferenceRange(referenceRange);
  const { status, isAbnormal } = determineStatus(value, minValue, maxValue);

  return {
    id: `indicator-${generateId()}`,
    reportId,
    memberId,
    indicatorName: name,
    value: value.toString(),
    numericValue: value,
    unit,
    referenceRange,
    minValue,
    maxValue,
    status,
    category,
    isAbnormal,
    examDate,
  };
}

export function createMockData(): HealthData & { dictionary: IndicatorDictionary[] } {
  const member1Id = generateMemberId();
  const member2Id = generateMemberId();

  const members: FamilyMember[] = [
    {
      id: member1Id,
      name: '张三',
      gender: 'male',
      birthDate: '1980-05-15',
      relationship: '本人',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: member2Id,
      name: '李四',
      gender: 'female',
      birthDate: '1982-08-20',
      relationship: '配偶',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const examDates = ['2021-06-15', '2022-06-20', '2023-06-18', '2024-06-22'];
  const reports: HealthReport[] = [];
  const indicators: HealthIndicator[] = [];

  examDates.forEach((date, index) => {
    const reportId = generateReportId();
    reports.push({
      id: reportId,
      memberId: member1Id,
      examDate: date,
      hospital: `北京协和医院体检中心`,
      reportType: '年度体检',
      sourceFileName: `张三_${date}_体检报告.pdf`,
      createdAt: new Date().toISOString(),
    });

    const baseSystolic = 125 + index * 5;
    const baseDiastolic = 80 + index * 3;
    const baseGlucose = 5.8 + index * 0.3;
    const baseCholesterol = 4.8 + index * 0.4;
    const baseTriglyceride = 1.5 + index * 0.2;

    indicators.push(
      createIndicator(reportId, member1Id, date, '收缩压', baseSystolic, 'mmHg', '90-140', '血压'),
      createIndicator(reportId, member1Id, date, '舒张压', baseDiastolic, 'mmHg', '60-90', '血压'),
      createIndicator(reportId, member1Id, date, '空腹血糖', baseGlucose, 'mmol/L', '3.9-6.1', '血糖'),
      createIndicator(reportId, member1Id, date, '总胆固醇', baseCholesterol, 'mmol/L', '<5.2', '血脂'),
      createIndicator(reportId, member1Id, date, '甘油三酯', baseTriglyceride, 'mmol/L', '<1.7', '血脂'),
      createIndicator(reportId, member1Id, date, '高密度脂蛋白胆固醇', 1.2 - index * 0.05, 'mmol/L', '>1.0', '血脂'),
      createIndicator(reportId, member1Id, date, '低密度脂蛋白胆固醇', 3.0 + index * 0.3, 'mmol/L', '<3.4', '血脂'),
      createIndicator(reportId, member1Id, date, '体重', 75 + index, 'kg', '—', '一般检查'),
      createIndicator(reportId, member1Id, date, '身高', 175, 'cm', '—', '一般检查'),
      createIndicator(reportId, member1Id, date, 'BMI', (75 + index) / (1.75 * 1.75), 'kg/m²', '18.5-23.9', '一般检查'),
      createIndicator(reportId, member1Id, date, '心率', 72 + index * 2, '次/分', '60-100', '一般检查'),
      createIndicator(reportId, member1Id, date, '白细胞计数', 6.5 + index * 0.3, '×10⁹/L', '4-10', '血常规'),
      createIndicator(reportId, member1Id, date, '红细胞计数', 4.8, '×10¹²/L', '4.0-5.5', '血常规'),
      createIndicator(reportId, member1Id, date, '血红蛋白', 145 - index * 2, 'g/L', '120-160', '血常规'),
      createIndicator(reportId, member1Id, date, '血小板计数', 220, '×10⁹/L', '100-300', '血常规'),
      createIndicator(reportId, member1Id, date, '谷丙转氨酶', 35 + index * 5, 'U/L', '0-40', '肝功能'),
      createIndicator(reportId, member1Id, date, '谷草转氨酶', 28 + index * 3, 'U/L', '0-40', '肝功能'),
      createIndicator(reportId, member1Id, date, '肌酐', 80 + index * 5, 'μmol/L', '44-133', '肾功能'),
      createIndicator(reportId, member1Id, date, '尿素氮', 5.2 + index * 0.3, 'mmol/L', '2.9-8.2', '肾功能'),
      createIndicator(reportId, member1Id, date, '尿酸', 380 + index * 20, 'μmol/L', '150-420', '肾功能')
    );
  });

  const member2ExamDates = ['2022-03-10', '2023-03-15', '2024-03-12'];
  member2ExamDates.forEach((date, index) => {
    const reportId = generateReportId();
    reports.push({
      id: reportId,
      memberId: member2Id,
      examDate: date,
      hospital: '北京协和医院体检中心',
      reportType: '年度体检',
      sourceFileName: `李四_${date}_体检报告.pdf`,
      createdAt: new Date().toISOString(),
    });

    indicators.push(
      createIndicator(reportId, member2Id, date, '收缩压', 115 + index * 3, 'mmHg', '90-140', '血压'),
      createIndicator(reportId, member2Id, date, '舒张压', 75 + index * 2, 'mmHg', '60-90', '血压'),
      createIndicator(reportId, member2Id, date, '空腹血糖', 5.2 + index * 0.2, 'mmol/L', '3.9-6.1', '血糖'),
      createIndicator(reportId, member2Id, date, '总胆固醇', 4.5 + index * 0.3, 'mmol/L', '<5.2', '血脂'),
      createIndicator(reportId, member2Id, date, '甘油三酯', 1.2 + index * 0.15, 'mmol/L', '<1.7', '血脂'),
      createIndicator(reportId, member2Id, date, '高密度脂蛋白胆固醇', 1.4 - index * 0.03, 'mmol/L', '>1.0', '血脂'),
      createIndicator(reportId, member2Id, date, '低密度脂蛋白胆固醇', 2.8 + index * 0.2, 'mmol/L', '<3.4', '血脂'),
      createIndicator(reportId, member2Id, date, '体重', 60 + index * 0.5, 'kg', '—', '一般检查'),
      createIndicator(reportId, member2Id, date, '身高', 165, 'cm', '—', '一般检查'),
      createIndicator(reportId, member2Id, date, 'BMI', (60 + index * 0.5) / (1.65 * 1.65), 'kg/m²', '18.5-23.9', '一般检查'),
      createIndicator(reportId, member2Id, date, '心率', 70 + index, '次/分', '60-100', '一般检查')
    );
  });

  const medications: MedicationNote[] = [
    {
      id: `med-${generateId()}`,
      memberId: member1Id,
      medicationName: '氨氯地平片',
      dosage: '5mg',
      frequency: '每日1次',
      startDate: '2023-06-20',
      isActive: true,
      notes: '早餐后服用，用于控制血压',
    },
    {
      id: `med-${generateId()}`,
      memberId: member1Id,
      medicationName: '阿托伐他汀钙片',
      dosage: '20mg',
      frequency: '每晚1次',
      startDate: '2023-06-20',
      isActive: true,
      notes: '用于控制血脂',
    },
  ];

  const advices: DoctorAdvice[] = [
    {
      id: `advice-${generateId()}`,
      memberId: member1Id,
      content: '血压和血脂偏高，建议低盐低脂饮食，增加运动，控制体重。每日监测血压，定期复查。',
      dateRecorded: '2024-06-22',
    },
    {
      id: `advice-${generateId()}`,
      memberId: member2Id,
      content: '各项指标基本正常，建议保持良好的生活习惯，定期体检。',
      dateRecorded: '2024-03-12',
    },
  ];

  const reminders: FollowUpReminder[] = [
    {
      id: `reminder-${generateId()}`,
      memberId: member1Id,
      title: '血压复查',
      description: '复查血压和血脂情况',
      remindDate: '2024-12-22',
      isCompleted: false,
      relatedIndicator: '收缩压',
    },
    {
      id: `reminder-${generateId()}`,
      memberId: member1Id,
      title: '年度体检',
      description: '预约2025年度体检',
      remindDate: '2025-06-01',
      isCompleted: false,
    },
  ];

  return {
    members,
    reports,
    indicators,
    medications,
    advices,
    reminders,
    dictionary: DEFAULT_DICTIONARY,
  };
}
