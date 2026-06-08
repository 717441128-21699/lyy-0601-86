import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Eye,
  Calendar,
  CheckSquare,
  Square,
  Users,
  FileText,
  Activity,
  AlertTriangle,
  Pill,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { exportToExcel, generatePrintSummary, printSummary } from '../utils/exportUtils';
import { formatDisplayDate, getAge } from '../utils/dateParser';

interface ExportOptions {
  includeReports: boolean;
  includeIndicators: boolean;
  includeAbnormal: boolean;
  includeMedications: boolean;
  includeAdvices: boolean;
  includeReminders: boolean;
}

const exportItems = [
  { key: 'includeReports', label: '体检报告', icon: FileText },
  { key: 'includeIndicators', label: '指标数据', icon: Activity },
  { key: 'includeAbnormal', label: '异常指标', icon: AlertTriangle },
  { key: 'includeMedications', label: '用药记录', icon: Pill },
  { key: 'includeAdvices', label: '医生建议', icon: MessageSquare },
  { key: 'includeReminders', label: '复查提醒', icon: Bell },
];

export default function ExportPage() {
  const { members, currentMemberId, indicators, reports, medications, advices, reminders } =
    useHealthStore((state) => ({
      members: state.members,
      currentMemberId: state.currentMemberId,
      indicators: state.indicators.filter((i) => i.memberId === state.currentMemberId),
      reports: state.reports.filter((r) => r.memberId === state.currentMemberId),
      medications: state.medications.filter((m) => m.memberId === state.currentMemberId),
      advices: state.advices.filter((a) => a.memberId === state.currentMemberId),
      reminders: state.reminders.filter((r) => r.memberId === state.currentMemberId),
    }));

  const currentMember = members.find((m) => m.id === currentMemberId);
  const [options, setOptions] = useState<ExportOptions>({
    includeReports: true,
    includeIndicators: true,
    includeAbnormal: true,
    includeMedications: true,
    includeAdvices: true,
    includeReminders: true,
  });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showPreview, setShowPreview] = useState(false);

  const latestIndicators = useMemo(() => {
    const latestDate = indicators.length > 0
      ? Math.max(...indicators.map((i) => new Date(i.examDate).getTime()))
      : 0;
    const latestDateStr = latestDate > 0 ? new Date(latestDate).toISOString().split('T')[0] : '';
    return indicators.filter((i) => i.examDate === latestDateStr);
  }, [indicators]);

  const abnormalIndicators = useMemo(
    () => indicators.filter((i) => i.isAbnormal),
    [indicators]
  );

  const handleToggle = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(options).every(Boolean);
    setOptions(Object.keys(options).reduce((acc, key) => {
      acc[key as keyof ExportOptions] = !allSelected;
      return acc;
    }, {} as ExportOptions));
  };

  const handleExportExcel = () => {
    if (!currentMember) return;
    const range = dateRange.start && dateRange.end ? dateRange : undefined;
    exportToExcel(currentMember, reports, indicators, medications, advices, reminders, {
      ...options,
      dateRange: range,
    });
  };

  const handlePrint = () => {
    if (!currentMember) return;
    const html = generatePrintSummary(
      currentMember,
      latestIndicators,
      abnormalIndicators,
      medications,
      advices,
      reminders
    );
    printSummary(html);
  };

  if (!currentMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">请先添加家庭成员</h2>
        <p className="text-gray-400">添加家庭成员后即可开始导出健康数据</p>
      </div>
    );
  }

  const normalCount = latestIndicators.filter((i) => !i.isAbnormal).length;
  const pendingReminders = reminders.filter((r) => !r.isCompleted).length;
  const activeMeds = medications.filter((m) => m.isActive).length;
  const latestDate = latestIndicators.length > 0 ? formatDisplayDate(latestIndicators[0].examDate) : '无数据';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">导出打印</h1>
        <p className="text-gray-500 mt-1">导出健康数据或打印健康摘要报告</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary-500" />选择导出内容
            </h2>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <span className="text-sm text-gray-600">全选/取消</span>
              <button onClick={handleSelectAll} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600">
                {Object.values(options).every(Boolean) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {Object.values(options).every(Boolean) ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {exportItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleToggle(item.key as keyof ExportOptions)}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                  style={{
                    borderColor: options[item.key as keyof ExportOptions] ? '#1677ff' : '#e5e7eb',
                    backgroundColor: options[item.key as keyof ExportOptions] ? '#f0f7ff' : '#fff',
                  }}
                >
                  {options[item.key as keyof ExportOptions] ? (
                    <CheckSquare className="w-5 h-5 text-primary-500" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                  <item.icon className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />时间范围（可选）
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">开始日期</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">结束日期</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                清除时间范围
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">导出人员</h2>
            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {currentMember.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{currentMember.name}</p>
                <p className="text-sm text-gray-500">
                  {currentMember.gender === 'male' ? '男' : '女'} · {getAge(currentMember.birthDate)}岁
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>体检报告</span><span className="font-medium">{reports.length} 份</span></div>
              <div className="flex justify-between"><span>指标数据</span><span className="font-medium">{indicators.length} 条</span></div>
              <div className="flex justify-between"><span>异常指标</span><span className="font-medium text-danger-500">{abnormalIndicators.length} 条</span></div>
              <div className="flex justify-between"><span>在服药物</span><span className="font-medium">{activeMeds} 种</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">操作</h2>
            <div className="space-y-3">
              <button onClick={() => setShowPreview(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium">
                <Eye className="w-5 h-5" />预览摘要
              </button>
              <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-100 text-primary-600 rounded-xl hover:bg-primary-200 transition-colors font-medium">
                <Printer className="w-5 h-5" />打印报告
              </button>
              <button onClick={handleExportExcel} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors font-medium">
                <FileSpreadsheet className="w-5 h-5" />导出Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">健康摘要预览</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-primary-500 text-center pb-3 border-b-2 border-primary-500 mb-6">
                  🩺 {currentMember.name} 健康摘要报告
                </h1>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-gray-50 rounded-lg"><span className="text-gray-500 text-sm">姓名：</span><span className="font-medium">{currentMember.name}</span></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><span className="text-gray-500 text-sm">性别：</span><span className="font-medium">{currentMember.gender === 'male' ? '男' : '女'}</span></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><span className="text-gray-500 text-sm">年龄：</span><span className="font-medium">{getAge(currentMember.birthDate)}岁</span></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><span className="text-gray-500 text-sm">最新检查：</span><span className="font-medium">{latestDate}</span></div>
                </div>
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-5 rounded-xl mb-6">
                  <h2 className="font-bold text-gray-800 mb-4">📊 健康概览</h2>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div><div className="text-3xl font-bold text-success-500">{normalCount}</div><div className="text-sm text-gray-500">正常指标</div></div>
                    <div><div className="text-3xl font-bold text-danger-500">{abnormalIndicators.length}</div><div className="text-sm text-gray-500">异常指标</div></div>
                    <div><div className="text-3xl font-bold text-primary-500">{medications.length}</div><div className="text-sm text-gray-500">在用药物</div></div>
                    <div><div className="text-3xl font-bold text-warning-500">{pendingReminders}</div><div className="text-sm text-gray-500">待办提醒</div></div>
                  </div>
                </div>
                {abnormalIndicators.length > 0 && (
                  <div className="mb-6">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning-500" />异常指标</h2>
                    <div className="bg-danger-50 rounded-xl p-4 space-y-2">
                      {abnormalIndicators.slice(0, 5).map((i) => (
                        <div key={i.id} className="flex items-center justify-between py-2 border-b border-danger-100 last:border-0">
                          <span className="font-medium">{i.indicatorName}</span>
                          <div className="text-right">
                            <span className="font-bold text-danger-600">{i.value} {i.unit}</span>
                            <span className="text-xs text-gray-400 ml-2">参考: {i.referenceRange}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-center text-xs text-gray-400 mt-8">本报告由健康管理工具自动生成 | 仅供参考</div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">关闭</button>
              <button onClick={handlePrint} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">打印</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
