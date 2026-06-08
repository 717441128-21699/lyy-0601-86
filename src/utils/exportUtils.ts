import * as XLSX from 'xlsx';
import type { HealthIndicator, HealthReport, FamilyMember, FollowUpReminder, MedicationNote, DoctorAdvice } from '../types';
import { formatDisplayDate, getAge } from './dateParser';

interface ExportOptions {
  includeReports?: boolean;
  includeIndicators?: boolean;
  includeAbnormal?: boolean;
  includeMedications?: boolean;
  includeAdvices?: boolean;
  includeReminders?: boolean;
  dateRange?: { start: string; end: string };
}

export function exportToExcel(
  member: FamilyMember,
  reports: HealthReport[],
  indicators: HealthIndicator[],
  medications: MedicationNote[],
  advices: DoctorAdvice[],
  reminders: FollowUpReminder[],
  options: ExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();
  const {
    includeReports = true,
    includeIndicators = true,
    includeAbnormal = true,
    includeMedications = true,
    includeAdvices = true,
    includeReminders = true,
    dateRange,
  } = options;

  let filteredIndicators = indicators;
  let filteredReports = reports;

  if (dateRange) {
    filteredIndicators = indicators.filter(
      (i) => i.examDate >= dateRange.start && i.examDate <= dateRange.end
    );
    filteredReports = reports.filter(
      (r) => r.examDate >= dateRange.start && r.examDate <= dateRange.end
    );
  }

  const memberInfo = [
    ['健康管理报告'],
    [],
    ['个人信息'],
    ['姓名', member.name],
    ['性别', member.gender === 'male' ? '男' : '女'],
    ['出生日期', formatDisplayDate(member.birthDate)],
    ['年龄', getAge(member.birthDate) + '岁'],
    ['关系', member.relationship],
    ['导出日期', formatDisplayDate(new Date().toISOString().split('T')[0])],
    [],
  ];

  const memberSheet = XLSX.utils.aoa_to_sheet(memberInfo);
  XLSX.utils.book_append_sheet(wb, memberSheet, '个人信息');

  if (includeReports) {
    const reportData = [
      ['体检报告记录'],
      ['检查日期', '医院', '报告类型', '源文件'],
      ...filteredReports
        .sort((a, b) => b.examDate.localeCompare(a.examDate))
        .map((r) => [
          formatDisplayDate(r.examDate),
          r.hospital,
          r.reportType,
          r.sourceFileName || '',
        ]),
    ];
    const reportSheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, reportSheet, '体检报告');
  }

  if (includeIndicators) {
    const indicatorData = [
      ['健康指标数据'],
      ['检查日期', '指标名称', '数值', '单位', '参考范围', '状态', '类别'],
      ...filteredIndicators
        .sort((a, b) => b.examDate.localeCompare(a.examDate))
        .map((i) => [
          formatDisplayDate(i.examDate),
          i.indicatorName,
          i.value,
          i.unit,
          i.referenceRange,
          getStatusText(i.status),
          i.category,
        ]),
    ];
    const indicatorSheet = XLSX.utils.aoa_to_sheet(indicatorData);
    XLSX.utils.book_append_sheet(wb, indicatorSheet, '指标数据');
  }

  if (includeAbnormal) {
    const abnormalIndicators = filteredIndicators.filter((i) => i.isAbnormal);
    const abnormalData = [
      ['异常指标清单'],
      ['检查日期', '指标名称', '数值', '单位', '参考范围', '状态', '类别'],
      ...abnormalIndicators
        .sort((a, b) => b.examDate.localeCompare(a.examDate))
        .map((i) => [
          formatDisplayDate(i.examDate),
          i.indicatorName,
          i.value,
          i.unit,
          i.referenceRange,
          getStatusText(i.status),
          i.category,
        ]),
    ];
    const abnormalSheet = XLSX.utils.aoa_to_sheet(abnormalData);
    XLSX.utils.book_append_sheet(wb, abnormalSheet, '异常指标');
  }

  if (includeMedications && medications.length > 0) {
    const medicationData = [
      ['用药记录'],
      ['药品名称', '剂量', '频率', '开始日期', '结束日期', '状态', '备注'],
      ...medications.map((m) => [
        m.medicationName,
        m.dosage,
        m.frequency,
        formatDisplayDate(m.startDate),
        m.endDate ? formatDisplayDate(m.endDate) : '-',
        m.isActive ? '服用中' : '已停用',
        m.notes || '',
      ]),
    ];
    const medicationSheet = XLSX.utils.aoa_to_sheet(medicationData);
    XLSX.utils.book_append_sheet(wb, medicationSheet, '用药记录');
  }

  if (includeAdvices && advices.length > 0) {
    const adviceData = [
      ['医生建议'],
      ['记录日期', '建议内容'],
      ...advices
        .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded))
        .map((a) => [formatDisplayDate(a.dateRecorded), a.content]),
    ];
    const adviceSheet = XLSX.utils.aoa_to_sheet(adviceData);
    XLSX.utils.book_append_sheet(wb, adviceSheet, '医生建议');
  }

  if (includeReminders && reminders.length > 0) {
    const reminderData = [
      ['复查提醒'],
      ['提醒日期', '标题', '描述', '相关指标', '状态'],
      ...reminders
        .sort((a, b) => a.remindDate.localeCompare(b.remindDate))
        .map((r) => [
          formatDisplayDate(r.remindDate),
          r.title,
          r.description || '',
          r.relatedIndicator || '',
          r.isCompleted ? '已完成' : '待完成',
        ]),
    ];
    const reminderSheet = XLSX.utils.aoa_to_sheet(reminderData);
    XLSX.utils.book_append_sheet(wb, reminderSheet, '复查提醒');
  }

  const fileName = `${member.name}_健康报告_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    normal: '正常',
    high: '偏高',
    low: '偏低',
    critical: '异常',
  };
  return statusMap[status] || status;
}

export function generatePrintSummary(
  member: FamilyMember,
  latestIndicators: HealthIndicator[],
  abnormalIndicators: HealthIndicator[],
  medications: MedicationNote[],
  advices: DoctorAdvice[],
  reminders: FollowUpReminder[]
): string {
  const latestDate = latestIndicators.length > 0
    ? formatDisplayDate(latestIndicators[0].examDate)
    : '无数据';

  const normalCount = latestIndicators.filter((i) => !i.isAbnormal).length;
  const abnormalCount = abnormalIndicators.length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${member.name} - 健康摘要报告</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; padding: 40px; line-height: 1.6; }
    h1 { color: #1677ff; text-align: center; border-bottom: 2px solid #1677ff; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 25px; border-left: 4px solid #1677ff; padding-left: 10px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
    .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
    .label { font-weight: bold; color: #666; }
    .summary-box { background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat-row { display: flex; justify-content: space-around; margin: 15px 0; }
    .stat-item { text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { color: #666; font-size: 14px; }
    .normal { color: #52c41a; }
    .abnormal { color: #ff4d4f; }
    .high { color: #faad14; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f5ff; color: #1677ff; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
    .badge-normal { background: #f6ffed; color: #52c41a; }
    .badge-high { background: #fffbe6; color: #faad14; }
    .badge-low { background: #fff1f0; color: #ff4d4f; }
    .badge-critical { background: #fff1f0; color: #cf1322; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🩺 ${member.name} 健康摘要报告</h1>

  <div class="info-grid">
    <div class="info-item"><span class="label">姓名：</span>${member.name}</div>
    <div class="info-item"><span class="label">性别：</span>${member.gender === 'male' ? '男' : '女'}</div>
    <div class="info-item"><span class="label">年龄：</span>${getAge(member.birthDate)}岁</div>
    <div class="info-item"><span class="label">最新检查：</span>${latestDate}</div>
  </div>

  <div class="summary-box">
    <h2 style="border: none; padding: 0; margin-top: 0;">📊 健康概览</h2>
    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-value normal">${normalCount}</div>
        <div class="stat-label">正常指标</div>
      </div>
      <div class="stat-item">
        <div class="stat-value abnormal">${abnormalCount}</div>
        <div class="stat-label">异常指标</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #1677ff;">${medications.length}</div>
        <div class="stat-label">在用药物</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #faad14;">${reminders.filter(r => !r.isCompleted).length}</div>
        <div class="stat-label">待办提醒</div>
      </div>
    </div>
  </div>

  <h2>⚠️ 异常指标</h2>
  ${abnormalIndicators.length > 0 ? `
  <table>
    <tr><th>指标名称</th><th>检查日期</th><th>数值</th><th>参考范围</th><th>状态</th></tr>
    ${abnormalIndicators.map(i => `
    <tr>
      <td>${i.indicatorName}</td>
      <td>${formatDisplayDate(i.examDate)}</td>
      <td><strong>${i.value} ${i.unit}</strong></td>
      <td>${i.referenceRange}</td>
      <td><span class="badge badge-${i.status}">${getStatusText(i.status)}</span></td>
    </tr>
    `).join('')}
  </table>
  ` : '<p style="color: #52c41a;">✓ 暂无异常指标，继续保持！</p>'}

  ${medications.length > 0 ? `
  <h2>💊 用药记录</h2>
  <table>
    <tr><th>药品名称</th><th>剂量</th><th>频率</th><th>状态</th><th>备注</th></tr>
    ${medications.map(m => `
    <tr>
      <td>${m.medicationName}</td>
      <td>${m.dosage}</td>
      <td>${m.frequency}</td>
      <td>${m.isActive ? '服用中' : '已停用'}</td>
      <td>${m.notes || '-'}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${advices.length > 0 ? `
  <h2>📋 医生建议</h2>
  ${advices.slice(0, 3).map(a => `
  <div style="background: #fffbe6; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #faad14;">
    <div style="color: #666; font-size: 14px;">${formatDisplayDate(a.dateRecorded)}</div>
    <div>${a.content}</div>
  </div>
  `).join('')}
  ` : ''}

  ${reminders.filter(r => !r.isCompleted).length > 0 ? `
  <h2>⏰ 待办提醒</h2>
  <table>
    <tr><th>提醒日期</th><th>标题</th><th>描述</th></tr>
    ${reminders.filter(r => !r.isCompleted).map(r => `
    <tr>
      <td>${formatDisplayDate(r.remindDate)}</td>
      <td><strong>${r.title}</strong></td>
      <td>${r.description || '-'}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  <div class="footer">
    <p>本报告由健康管理工具自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}</p>
    <p>仅供参考，如有疑问请咨询专业医生</p>
  </div>
</body>
</html>
  `;
}

export function printSummary(htmlContent: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
