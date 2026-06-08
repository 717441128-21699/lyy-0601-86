import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileUp,
  FileDown,
  Users,
  Plus,
  Calendar,
  Pill,
  Stethoscope,
  CheckCircle,
  X,
  AlertCircle,
  Settings,
  History,
  ChevronRight,
  Square,
  CheckSquare,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate, getAge } from '../utils/dateParser';
import { cn } from '../lib/utils';

const indicatorConfig = [
  { name: '收缩压', category: '血压', icon: Heart, color: 'danger' },
  { name: '舒张压', category: '血压', icon: Heart, color: 'danger' },
  { name: '空腹血糖', category: '血糖', icon: Activity, color: 'warning' },
  { name: '总胆固醇', category: '血脂', icon: TrendingUp, color: 'warning' },
  { name: '甘油三酯', category: '血脂', icon: TrendingUp, color: 'warning' },
  { name: '高密度脂蛋白胆固醇', category: '血脂', icon: TrendingUp, color: 'primary' },
  { name: '低密度脂蛋白胆固醇', category: '血脂', icon: TrendingUp, color: 'danger' },
  { name: 'BMI', category: '一般检查', icon: Activity, color: 'primary' },
  { name: '体重', category: '一般检查', icon: Activity, color: 'primary' },
  { name: '身高', category: '一般检查', icon: Activity, color: 'primary' },
];

const colorClasses = {
  primary: 'from-primary-500 to-primary-600',
  success: 'from-success-500 to-success-600',
  warning: 'from-warning-500 to-warning-600',
  danger: 'from-danger-500 to-danger-600',
};

const bgColorClasses = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);

  const {
    members,
    currentMemberId,
    indicators,
    reports,
    abnormalIndicators,
    medications,
    advices,
    reminders,
    lastImportResult,
    clearLastImportResult,
    importHistory,
    memberFavoriteIndicators,
    setMemberFavoriteIndicators,
  } = useHealthStore((state) => ({
    members: state.members,
    currentMemberId: state.currentMemberId,
    indicators: state.indicators.filter((i) => i.memberId === state.currentMemberId),
    reports: state.reports.filter((r) => r.memberId === state.currentMemberId),
    abnormalIndicators: state.indicators.filter(
      (i) => i.memberId === state.currentMemberId && i.isAbnormal
    ),
    medications: state.medications.filter((m) => m.memberId === state.currentMemberId),
    advices: state.advices.filter((a) => a.memberId === state.currentMemberId),
    reminders: state.reminders.filter((r) => r.memberId === state.currentMemberId),
    lastImportResult: state.lastImportResult,
    clearLastImportResult: state.clearLastImportResult,
    importHistory: state.importHistory,
    memberFavoriteIndicators: state.memberFavoriteIndicators,
    setMemberFavoriteIndicators: state.setMemberFavoriteIndicators,
  }));

  const keyIndicators = useMemo(() => {
    if (!currentMemberId) return indicatorConfig.slice(0, 6);
    const favorites = memberFavoriteIndicators[currentMemberId];
    if (favorites && favorites.length > 0) {
      return indicatorConfig.filter((i) => favorites.includes(i.name));
    }
    return indicatorConfig.slice(0, 6);
  }, [currentMemberId, memberFavoriteIndicators]);

  useEffect(() => {
    if (currentMemberId && memberFavoriteIndicators[currentMemberId]) {
      setSelectedIndicators(memberFavoriteIndicators[currentMemberId]);
    } else {
      setSelectedIndicators(indicatorConfig.slice(0, 6).map((i) => i.name));
    }
  }, [currentMemberId, memberFavoriteIndicators]);

  useEffect(() => {
    if (lastImportResult) {
      const timer = setTimeout(() => {
        clearLastImportResult();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [lastImportResult, clearLastImportResult]);

  const currentMember = members.find((m) => m.id === currentMemberId);

  const latestIndicators = useMemo(() => {
    const latestDate = indicators.length > 0
      ? Math.max(...indicators.map((i) => new Date(i.examDate).getTime()))
      : 0;
    const latestDateStr = latestDate > 0 ? new Date(latestDate).toISOString().split('T')[0] : '';
    return indicators.filter((i) => i.examDate === latestDateStr);
  }, [indicators]);

  const getIndicatorLatestValue = (name: string) => {
    const indicator = latestIndicators.find((i) => i.indicatorName === name);
    if (!indicator) return null;

    const history = indicators
      .filter((i) => i.indicatorName === name)
      .sort((a, b) => a.examDate.localeCompare(b.examDate));

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 2) {
      const prev = history[history.length - 2];
      const curr = history[history.length - 1];
      if (prev.numericValue !== undefined && curr.numericValue !== undefined) {
        if (curr.numericValue > prev.numericValue) trend = 'up';
        else if (curr.numericValue < prev.numericValue) trend = 'down';
      }
    }

    return { ...indicator, trend, history };
  };

  const stats = useMemo(() => ({
    totalReports: reports.length,
    totalIndicators: indicators.length,
    abnormalCount: abnormalIndicators.length,
    activeMedications: medications.filter((m) => m.isActive).length,
    pendingReminders: reminders.filter((r) => !r.isCompleted).length,
  }), [reports, indicators, abnormalIndicators, medications, reminders]);

  const quickActions = [
    { icon: FileUp, label: '导入报告', color: 'primary', action: () => navigate('/import') },
    { icon: FileDown, label: '导出数据', color: 'success', action: () => navigate('/export') },
    { icon: Users, label: '家庭成员', color: 'warning', action: () => navigate('/family') },
    { icon: Plus, label: '手动录入', color: 'danger', action: () => navigate('/data') },
  ];

  if (!currentMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">请先添加家庭成员</h2>
        <p className="text-gray-400 mb-6">添加家庭成员后即可开始管理健康档案</p>
        <button
          onClick={() => navigate('/family')}
          className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
        >
          添加家庭成员
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastImportResult && lastImportResult.memberId === currentMemberId && (
        <div className="bg-success-50 border border-success-200 rounded-2xl p-5 flex items-start gap-4 animate-slide-down">
          <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-success-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-success-800 text-lg">报告导入成功！</h3>
            <p className="text-success-700 mt-1">
              {formatDisplayDate(lastImportResult.examDate)} 的体检报告已成功导入
            </p>
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-success-600">导入指标：</span>
                <span className="font-bold text-success-700 text-lg">{lastImportResult.totalCount} 项</span>
              </div>
              {lastImportResult.abnormalCount > 0 ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-500" />
                  <span className="text-sm text-warning-600">其中异常：</span>
                  <span className="font-bold text-warning-700 text-lg">{lastImportResult.abnormalCount} 项</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-500" />
                  <span className="text-sm text-success-600">全部正常，太棒了！</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearLastImportResult}
            className="p-2 hover:bg-success-100 rounded-lg transition-colors text-success-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">欢迎回来，{currentMember.name}</h1>
                <p className="text-white/80 text-sm">
                  {currentMember.gender === 'male' ? '男' : '女'} · {getAge(currentMember.birthDate)}岁 · {currentMember.relationship}
                </p>
              </div>
            </div>
            {latestIndicators.length > 0 && (
              <p className="text-white/80 text-sm mt-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                最新体检日期：{formatDisplayDate(latestIndicators[0].examDate)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalReports}</div>
              <div className="text-white/70 text-sm">体检报告</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${stats.abnormalCount > 0 ? 'text-warning-200' : ''}`}>
                {stats.abnormalCount}
              </div>
              <div className="text-white/70 text-sm">异常指标</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.activeMedications}</div>
              <div className="text-white/70 text-sm">在服药物</div>
            </div>
          </div>
        </div>
      </div>

      {stats.pendingReminders > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-warning-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-warning-800">
              您有 {stats.pendingReminders} 项待办提醒
            </p>
            <p className="text-sm text-warning-600">
              请及时处理复查预约和医生建议
            </p>
          </div>
          <button
            onClick={() => navigate('/reminders')}
            className="px-4 py-2 bg-warning-500 text-white rounded-lg hover:bg-warning-600 transition-colors text-sm"
          >
            查看提醒
          </button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">快捷操作</h2>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-primary-300 hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[action.color as keyof typeof colorClasses]} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon className="w-7 h-7" />
              </div>
              <span className="font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">关键指标</h2>
          <div className="flex items-center gap-2">
            {importHistory.length > 0 && (
              <button
                onClick={() => setShowImportHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                最近导入
              </button>
            )}
            <button
              onClick={() => {
                setSelectedIndicators(keyIndicators.map((i) => i.name));
                setShowIndicatorSelector(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              自定义
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {keyIndicators.map((item) => {
            const data = getIndicatorLatestValue(item.name);
            if (!data) {
              return (
                <div
                  key={item.name}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${bgColorClasses[item.color as keyof typeof bgColorClasses]} flex items-center justify-center`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-300">--</div>
                  <p className="text-sm text-gray-400 mt-1">暂无数据</p>
                </div>
              );
            }

            const statusColor = data.isAbnormal
              ? data.status === 'high'
                ? 'text-warning-500'
                : 'text-danger-500'
              : 'text-success-500';

            const statusBg = data.isAbnormal
              ? data.status === 'high'
                ? 'bg-warning-50 text-warning-600'
                : 'bg-danger-50 text-danger-600'
              : 'bg-success-50 text-success-600';

            return (
              <div
                key={item.name}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/trend')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bgColorClasses[item.color as keyof typeof bgColorClasses]} flex items-center justify-center`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  {data.trend !== 'stable' && (
                    <div className={`flex items-center gap-1 text-xs ${
                      data.trend === 'up' ? 'text-danger-500' : 'text-success-500'
                    }`}>
                      {data.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-bold ${statusColor}`}>
                    {data.value}
                  </span>
                  <span className="text-gray-400 text-sm mb-1">{data.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2 py-1 rounded-lg ${statusBg}`}>
                    {data.status === 'normal' ? '正常' : data.status === 'high' ? '偏高' : '偏低'}
                  </span>
                  <span className="text-xs text-gray-400">
                    参考: {data.referenceRange}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {abnormalIndicators.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">异常指标</h2>
              <button
                onClick={() => navigate('/abnormal')}
                className="text-sm text-primary-500 hover:text-primary-600"
              >
                查看全部
              </button>
            </div>
            <div className="space-y-3">
              {abnormalIndicators.slice(0, 5).map((indicator) => (
                <div
                  key={indicator.id}
                  className="flex items-center justify-between p-3 bg-danger-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-800">{indicator.indicatorName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDisplayDate(indicator.examDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-danger-600">
                      {indicator.value} {indicator.unit}
                    </p>
                    <p className="text-xs text-gray-400">
                      参考: {indicator.referenceRange}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {advices.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">医生建议</h2>
              <button
                onClick={() => navigate('/reminders')}
                className="text-sm text-primary-500 hover:text-primary-600"
              >
                查看全部
              </button>
            </div>
            <div className="space-y-3">
              {advices.slice(0, 3).map((advice) => (
                <div
                  key={advice.id}
                  className="p-4 bg-warning-50 rounded-xl border-l-4 border-warning-400"
                >
                  <p className="text-sm text-gray-700">{advice.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDisplayDate(advice.dateRecorded)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {medications.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">用药记录</h2>
              <button
                onClick={() => navigate('/family')}
                className="text-sm text-primary-500 hover:text-primary-600"
              >
                管理
              </button>
            </div>
            <div className="space-y-3">
              {medications.filter((m) => m.isActive).map((med) => (
                <div
                  key={med.id}
                  className="flex items-center gap-4 p-3 bg-primary-50 rounded-xl"
                >
                  <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{med.medicationName}</p>
                    <p className="text-xs text-gray-500">
                      {med.dosage} · {med.frequency}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-success-100 text-success-600 rounded-lg">
                    服用中
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">历年体检报告</h2>
            <button
              onClick={() => navigate('/data')}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              管理数据
            </button>
          </div>
          <div className="space-y-3">
            {reports
              .sort((a, b) => b.examDate.localeCompare(a.examDate))
              .slice(0, 5)
              .map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{report.reportType}</p>
                      <p className="text-xs text-gray-500">{report.hospital}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDisplayDate(report.examDate)}
                  </p>
                </div>
              ))}
            {reports.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <FileUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无体检报告</p>
                <button
                  onClick={() => navigate('/import')}
                  className="mt-3 text-primary-500 text-sm hover:text-primary-600"
                >
                  立即导入
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showIndicatorSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowIndicatorSelector(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 mx-4 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">自定义关键指标</h2>
              <button
                onClick={() => setShowIndicatorSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">选择您想在看板上关注的指标（最多6项）</p>

            <div className="space-y-2 mb-6">
              {indicatorConfig.map((item) => {
                const isSelected = selectedIndicators.includes(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedIndicators((prev) => prev.filter((i) => i !== item.name));
                      } else if (selectedIndicators.length < 6) {
                        setSelectedIndicators((prev) => [...prev, item.name]);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    disabled={!isSelected && selectedIndicators.length >= 6}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <div className={`w-8 h-8 rounded-lg ${bgColorClasses[item.color as keyof typeof bgColorClasses]} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIndicatorSelector(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (currentMemberId && selectedIndicators.length > 0) {
                    setMemberFavoriteIndicators(currentMemberId, selectedIndicators);
                    setShowIndicatorSelector(false);
                  }
                }}
                disabled={selectedIndicators.length === 0}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存选择
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowImportHistory(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 mx-4 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">最近导入记录</h2>
              <button
                onClick={() => setShowImportHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {importHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无导入记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importHistory.map((record, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => {
                      setShowImportHistory(false);
                      if (record.memberId !== currentMemberId) {
                        useHealthStore.getState().setCurrentMember(record.memberId);
                      }
                      navigate('/data');
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-success-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{record.memberName}</p>
                            <span className="text-xs text-gray-500">
                              {formatDisplayDate(record.examDate)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(record.importedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="flex items-center gap-4 mt-3 pl-12">
                      <span className="text-sm text-gray-600">
                        导入指标：<span className="font-semibold text-gray-800">{record.totalCount} 项</span>
                      </span>
                      {record.abnormalCount > 0 ? (
                        <span className="text-sm text-warning-600">
                          异常：<span className="font-semibold">{record.abnormalCount} 项</span>
                        </span>
                      ) : (
                        <span className="text-sm text-success-600 font-semibold">全部正常</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
