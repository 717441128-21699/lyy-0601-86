import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  Activity,
  Heart,
  TrendingUp,
  Calendar,
  Users,
  Check,
  AlertCircle,
  Info,
  BarChart3,
  X,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate, getYear } from '../utils/dateParser';
import { cn } from '../lib/utils';

const indicatorConfig = {
  血压: [
    { name: '收缩压', color: '#ef4444', icon: Heart },
    { name: '舒张压', color: '#f97316', icon: Heart },
  ],
  血糖: [
    { name: '空腹血糖', color: '#eab308', icon: Activity },
  ],
  血脂: [
    { name: '总胆固醇', color: '#8b5cf6', icon: TrendingUp },
    { name: '甘油三酯', color: '#06b6d4', icon: TrendingUp },
    { name: '高密度脂蛋白胆固醇', color: '#10b981', icon: TrendingUp },
    { name: '低密度脂蛋白胆固醇', color: '#ec4899', icon: TrendingUp },
  ],
};

type Category = '血压' | '血糖' | '血脂';
type AlignType = 'month' | 'day';

export default function TrendAnalysisPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('血压');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['收缩压', '舒张压']);
  const [timeRange, setTimeRange] = useState<string>('全部');
  const [compareYear, setCompareYear] = useState<string | null>(null);
  const [alignType, setAlignType] = useState<AlignType>('month');
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<MonthData | null>(null);
  const [selectedIndicatorName, setSelectedIndicatorName] = useState<string>('');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  const { members, currentMemberId, indicators, reports } = useHealthStore((state) => ({
    members: state.members,
    currentMemberId: state.currentMemberId,
    indicators: state.indicators.filter((i) => i.memberId === state.currentMemberId),
    reports: state.reports.filter((r) => r.memberId === state.currentMemberId),
  }));

  const currentMember = members.find((m) => m.id === currentMemberId);

  const realCurrentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set(indicators.map((i) => getYear(i.examDate)));
    return Array.from(years).sort((a, b) => b - a);
  }, [indicators]);

  const latestDataYear = useMemo(() => {
    if (availableYears.length === 0) return null;
    return availableYears[0];
  }, [availableYears]);

  const hasCurrentYearData = useMemo(() => {
    return availableYears.includes(realCurrentYear);
  }, [availableYears, realCurrentYear]);

  const getYearLabel = (year: number) => {
    if (year === realCurrentYear && hasCurrentYearData) {
      return '今年';
    }
    return `${year}年`;
  };

  const activeIndicators = useMemo(
    () => (selectedIndicators.length > 0 ? selectedIndicators : indicatorConfig[selectedCategory].map((i) => i.name)),
    [selectedIndicators, selectedCategory]
  );

  const getMonthKey = (date: string) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthDayKey = (date: string) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDisplayLabel = (key: string, hasCount: boolean, count?: number) => {
    if (alignType === 'month') {
      const label = `${parseInt(key, 10)}月`;
      return hasCount && count !== undefined ? `${label} (${count}次)` : label;
    }
    return key;
  };

  interface MonthData {
    key: string;
    displayLabel: string;
    sortKey: string;
    count?: number;
    dates?: string[];
    currentCount?: number;
    compareCount?: number;
    currentDates?: string[];
    compareDates?: string[];
  }

  const buildYearData = useCallback(
    (year: number, yearLabel: string) => {
      let filtered = indicators.filter(
        (i) => activeIndicators.includes(i.indicatorName) && getYear(i.examDate) === year
      );

      if (timeRange !== '全部' && year === latestDataYear) {
        const now = new Date();
        const months = parseInt(timeRange, 10);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        filtered = filtered.filter((i) => new Date(i.examDate) >= cutoff);
      }

      const grouped: Record<string, MonthData> = {};

      filtered.forEach((i) => {
        if (i.numericValue === undefined) return;

        const key = alignType === 'month' ? getMonthKey(i.examDate) : getMonthDayKey(i.examDate);

        if (!grouped[key]) {
          grouped[key] = {
            key,
            displayLabel: '',
            sortKey: key,
            count: 0,
            dates: [],
          };
        }

        if (!grouped[key].dates?.includes(i.examDate)) {
          grouped[key].dates?.push(i.examDate);
        }
        grouped[key].count = grouped[key].dates?.length || 0;
      });

      Object.keys(grouped).forEach((key) => {
        const group = grouped[key];
        const valuesForGroup = filtered.filter(
          (f) =>
            activeIndicators.includes(f.indicatorName) &&
            (alignType === 'month'
              ? getMonthKey(f.examDate) === key
              : getMonthDayKey(f.examDate) === key)
        );

        activeIndicators.forEach((indicatorName) => {
          const valuesForIndicator = valuesForGroup.filter((f) => f.indicatorName === indicatorName);
          if (valuesForIndicator.length > 0) {
            const avgValue =
              valuesForIndicator.reduce((sum, v) => sum + (v.numericValue || 0), 0) /
              valuesForIndicator.length;
            (grouped[key] as any)[`${indicatorName}(${yearLabel})`] =
              Math.round(avgValue * 100) / 100;
            (grouped[key] as any)[`${indicatorName}(${yearLabel})_dates`] =
              valuesForIndicator.map((v) => v.examDate).sort();
          }
        });

        grouped[key].displayLabel = getDisplayLabel(
          key,
          alignType === 'month',
          grouped[key].count
        );
      });

      return Object.values(grouped).sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    },
    [indicators, activeIndicators, alignType, timeRange, latestDataYear]
  );

  const allKeys = useMemo(() => {
    if (!compareYear) return [];

    if (!latestDataYear) return [];

    const compareYearNum = parseInt(compareYear, 10);
    const keys = new Set<string>();

    indicators
      .filter(
        (i) =>
          activeIndicators.includes(i.indicatorName) &&
          (getYear(i.examDate) === latestDataYear || getYear(i.examDate) === compareYearNum)
      )
      .forEach((i) => {
        const key = alignType === 'month' ? getMonthKey(i.examDate) : getMonthDayKey(i.examDate);
        keys.add(key);
      });

    return Array.from(keys).sort();
  }, [indicators, activeIndicators, compareYear, alignType, latestDataYear]);

  const chartData = useMemo(() => {
    if (!latestDataYear) return [];
    const yearLabel = getYearLabel(latestDataYear);
    return buildYearData(latestDataYear, yearLabel);
  }, [buildYearData, latestDataYear, getYearLabel]);

  const comparisonData = useMemo(() => {
    if (!compareYear) return null;
    const yearLabel = getYearLabel(parseInt(compareYear, 10));
    return buildYearData(parseInt(compareYear, 10), yearLabel);
  }, [buildYearData, compareYear, getYearLabel]);

  const mergedData = useMemo(() => {
    if (!comparisonData || allKeys.length === 0) return chartData;

    const merged: Record<string, any> = {};

    allKeys.forEach((key) => {
      merged[key] = {
        key,
        sortKey: key,
        displayLabel: '',
        count: 0,
        dates: [],
      };
    });

    chartData.forEach((d) => {
      if (merged[d.key as string]) {
        merged[d.key as string] = {
          ...merged[d.key as string],
          ...d,
          count: d.count,
          dates: d.dates,
        };
      }
    });

    comparisonData.forEach((d) => {
      if (merged[d.key as string]) {
        const currentItem = chartData.find((cd) => cd.key === d.key);
        const currentDates = currentItem?.dates || [];
        const compareDates = d.dates || [];
        const allDates = [...new Set([...currentDates, ...compareDates])];
        merged[d.key as string] = {
          ...merged[d.key as string],
          ...d,
          count: allDates.length,
          dates: allDates,
          currentCount: currentItem?.count || 0,
          compareCount: d.count || 0,
          currentDates,
          compareDates,
        };
      }
    });

    Object.keys(merged).forEach((key) => {
      const currentItem = chartData.find((d) => d.key === key);
      const compareItem = comparisonData?.find((d) => d.key === key);
      const currentCount = currentItem?.count || 0;
      const compareCount = compareItem?.count || 0;

      if (compareYear && alignType === 'month') {
        const currentLabel = currentCount > 0 ? `${currentCount}次` : '-';
        const compareLabel = compareCount > 0 ? `${compareCount}次` : '-';
        merged[key].displayLabel = `${parseInt(key, 10)}月\n${getYearLabel(latestDataYear)}:${currentLabel} / ${getYearLabel(parseInt(compareYear, 10))}:${compareLabel}`;
      } else {
        merged[key].displayLabel = getDisplayLabel(
          key,
          alignType === 'month',
          alignType === 'month' ? currentCount : undefined
        );
      }
      merged[key].currentCount = currentCount;
      merged[key].compareCount = compareCount;
      merged[key].currentDates = currentItem?.dates || [];
      merged[key].compareDates = compareItem?.dates || [];
    });

    return Object.values(merged).sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }, [chartData, comparisonData, allKeys, alignType, getDisplayLabel]);

  const toggleIndicator = (name: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const getLineColor = (name: string) => {
    const baseName = name.split('(')[0];
    return indicatorConfig[selectedCategory].find((i) => i.name === baseName)?.color || '#6b7280';
  };

  const handlePointClick = (data: any, indicatorName: string) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    const dataPoint = data.activePayload[0].payload;
    setSelectedDataPoint(dataPoint);
    setSelectedIndicatorName(indicatorName);
    setShowDetailDrawer(true);
  };

  const renderLines = () => {
    const lines: React.ReactNode[] = [];
    const latestLabel = latestDataYear ? getYearLabel(latestDataYear) : '';

    activeIndicators.forEach((name) => {
      lines.push(
        <Line
          key={`${name}-current`}
          type="monotone"
          dataKey={`${name}(${latestLabel})`}
          stroke={getLineColor(name)}
          strokeWidth={3}
          dot={{ r: 5, strokeWidth: 2, fill: '#fff', cursor: 'pointer' }}
          activeDot={{ r: 7, cursor: 'pointer' }}
          connectNulls={false}
          onClick={(data: any) => handlePointClick(data, name)}
        />
      );
      if (compareYear) {
        const compareLabel = getYearLabel(parseInt(compareYear, 10));
        lines.push(
          <Line
            key={`${name}-compare`}
            type="monotone"
            dataKey={`${name}(${compareLabel})`}
            stroke={getLineColor(name)}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 4, strokeWidth: 2, fill: '#fff', cursor: 'pointer' }}
            activeDot={{ r: 6, cursor: 'pointer' }}
            connectNulls={false}
            onClick={(data: any) => handlePointClick(data, name)}
          />
        );
      }
    });
    return lines;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = mergedData.find((d: any) => d.displayLabel === label);

      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-48">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>

          {compareYear && alignType === 'month' && dataPoint && (
            <div className="mb-3 pb-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">检查次数</p>
              <div className="flex gap-4 text-xs">
                <span className="text-primary-600">
                  {getYearLabel(latestDataYear)}: {dataPoint.currentCount || 0}次
                </span>
                <span className="text-info-600">
                  {getYearLabel(parseInt(compareYear, 10))}: {dataPoint.compareCount || 0}次
                </span>
              </div>
            </div>
          )}

          {payload.map((entry: any, index: number) => {
            const indicatorName = entry.dataKey.split('(')[0];
            const isCurrent = entry.dataKey.includes('今年') || entry.dataKey.includes(`${latestDataYear}年`);
            const yearPart = entry.dataKey.match(/\((.+)\)/)?.[1];

            const datesKey = `${indicatorName}(${yearPart})_dates`;
            const dates: string[] | undefined = dataPoint?.[datesKey];

            return (
              <div key={index} className="mb-2 last:mb-0">
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className={isCurrent ? 'font-medium text-gray-800' : 'text-gray-500'}>
                    {entry.dataKey}:
                  </span>
                  <span className={cn('font-semibold', isCurrent ? 'text-gray-900' : 'text-gray-500')} style={{ color: entry.color }}>
                    {entry.value}
                  </span>
                </div>
                {dates && dates.length > 0 && alignType === 'day' && (
                  <p className="text-xs text-gray-400 ml-5 mt-1">
                    检查日期：{formatDisplayDate(dates[0])}
                  </p>
                )}
                {dates && dates.length > 1 && alignType === 'month' && (
                  <p className="text-xs text-gray-400 ml-5 mt-1">
                    共 {dates.length} 次检查，平均值
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const getStats = useMemo(() => {
    if (!latestDataYear || chartData.length === 0) return null;

    const yearLabel = getYearLabel(latestDataYear);
    const stats = activeIndicators.map((name) => {
      const values = chartData
        .map((d: any) => d[`${name}(${yearLabel})`])
        .filter((v: any) => v !== undefined && v !== null);

      if (values.length === 0) return null;

      const avg = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const first = values[0];
      const last = values[values.length - 1];
      const trend = last > first ? 'up' : last < first ? 'down' : 'stable';

      return {
        name,
        average: Math.round(avg * 100) / 100,
        max: Math.round(max * 100) / 100,
        min: Math.round(min * 100) / 100,
        trend,
        color: getLineColor(name),
        count: values.length,
      };
    }).filter(Boolean);

    return stats;
  }, [activeIndicators, chartData, latestDataYear, getYearLabel]);

  const getReportDetailsForDataPoint = () => {
    if (!selectedDataPoint) return [];

    const allDates: string[] = [];
    if (selectedDataPoint.currentDates) allDates.push(...selectedDataPoint.currentDates);
    if (selectedDataPoint.compareDates) allDates.push(...selectedDataPoint.compareDates);

    const uniqueDates = [...new Set(allDates)].sort();

    const reportDetails = uniqueDates.map((date) => {
      const report = reports.find((r) => r.examDate === date);
      const reportIndicators = indicators.filter(
        (i) => i.examDate === date && i.indicatorName === selectedIndicatorName
      );

      return {
        date,
        report,
        indicators: reportIndicators,
        year: getYear(date),
      };
    });

    return reportDetails;
  };

  const toggleReportExpand = (reportId: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const calculateAverage = () => {
    if (!selectedDataPoint || !selectedIndicatorName) return null;

    const allValues: number[] = [];
    const latestLabel = latestDataYear ? getYearLabel(latestDataYear) : '';
    const compareLabel = compareYear ? getYearLabel(parseInt(compareYear, 10)) : '';

    const currentValue = (selectedDataPoint as any)[`${selectedIndicatorName}(${latestLabel})`];
    if (currentValue !== undefined && currentValue !== null) {
      allValues.push(currentValue);
    }

    if (compareLabel) {
      const compareValue = (selectedDataPoint as any)[`${selectedIndicatorName}(${compareLabel})`];
      if (compareValue !== undefined && compareValue !== null) {
        allValues.push(compareValue);
      }
    }

    if (allValues.length === 0) return null;

    const sum = allValues.reduce((a, b) => a + b, 0);
    return {
      values: allValues,
      average: Math.round((sum / allValues.length) * 100) / 100,
      formula: `(${allValues.join(' + ')}) / ${allValues.length} = ${Math.round((sum / allValues.length) * 100) / 100}`,
    };
  };

  const renderDetailDrawer = () => {
    if (!showDetailDrawer || !selectedDataPoint) return null;

    const reportDetails = getReportDetailsForDataPoint();
    const averageInfo = calculateAverage();
    const unit = indicators.find((i) => i.indicatorName === selectedIndicatorName)?.unit || '';

    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setShowDetailDrawer(false)}
        />
        <div className="relative w-full max-w-md bg-white h-full overflow-y-auto animate-slide-in-right">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedIndicatorName} 指标详情</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedDataPoint.displayLabel}</p>
            </div>
            <button
              onClick={() => setShowDetailDrawer(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {averageInfo && (
              <div className="bg-primary-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">均值计算</h3>
                <p className="text-xs text-gray-500 mb-2 font-mono bg-white px-2 py-1 rounded">
                  {averageInfo.formula}
                </p>
                <p className="text-2xl font-bold text-primary-600">
                  {averageInfo.average} <span className="text-sm font-normal text-gray-500">{unit}</span>
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">检查报告列表</h3>
              {reportDetails.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">暂无报告数据</p>
              ) : (
                <div className="space-y-3">
                  {reportDetails.map((detail, index) => {
                    const isExpanded = detail.report && expandedReports.has(detail.report.id);
                    return (
                      <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                        <div
                          className={cn(
                            'p-4 cursor-pointer transition-colors',
                            detail.report ? 'hover:bg-gray-100' : ''
                          )}
                          onClick={() => detail.report && toggleReportExpand(detail.report.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-800">
                                  {formatDisplayDate(detail.date)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                                  {detail.year}年
                                </span>
                              </div>
                              {detail.report ? (
                                <>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {detail.report.hospital}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    {detail.report.reportType}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-gray-400 mt-1">未找到对应报告</p>
                              )}
                            </div>
                            {detail.report && (
                              <div className="flex items-center gap-2">
                                {detail.indicators.length > 0 && (
                                  <span className="text-lg font-bold text-primary-600">
                                    {detail.indicators[0].value}
                                    <span className="text-xs font-normal text-gray-400 ml-1">
                                      {detail.indicators[0].unit}
                                    </span>
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            )}
                            {!detail.report && detail.indicators.length > 0 && (
                              <span className="text-lg font-bold text-primary-600">
                                {detail.indicators[0].value}
                                <span className="text-xs font-normal text-gray-400 ml-1">
                                  {detail.indicators[0].unit}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && detail.indicators.length > 0 && (
                          <div className="border-t border-gray-200 p-4 bg-white">
                            <h4 className="text-xs font-medium text-gray-500 mb-2">指标明细</h4>
                            <div className="space-y-2">
                              {detail.indicators.map((ind, indIndex) => (
                                <div
                                  key={indIndex}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-600">{ind.indicatorName}</span>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'font-semibold',
                                        ind.status === 'normal'
                                          ? 'text-success-600'
                                          : ind.status === 'high'
                                          ? 'text-danger-600'
                                          : ind.status === 'low'
                                          ? 'text-warning-600'
                                          : 'text-gray-800'
                                      )}
                                    >
                                      {ind.value} {ind.unit}
                                    </span>
                                    {ind.referenceRange && (
                                      <span className="text-xs text-gray-400">
                                        ({ind.referenceRange})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">请先添加家庭成员</h2>
        <p className="text-gray-400 mb-6">添加家庭成员后即可查看趋势分析</p>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">趋势对比分析</h1>
        <p className="text-gray-500 mt-1">{currentMember.name} 的健康指标趋势分析</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-6 items-start">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">指标类别</label>
            <div className="flex gap-2">
              {(['血压', '血糖', '血脂'] as const).map((cat) => {
                const Icon = indicatorConfig[cat][0].icon;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedIndicators(indicatorConfig[cat].map((i) => i.name));
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors',
                      selectedCategory === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">对齐方式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAlignType('month')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors',
                  alignType === 'month'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                按月份对齐
              </button>
              <button
                onClick={() => setAlignType('day')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors',
                  alignType === 'day'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Calendar className="w-4 h-4" />
                按日期对齐
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">时间范围</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-700 border-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="全部">全部时间</option>
                <option value="12">近12个月</option>
                <option value="24">近24个月</option>
                <option value="36">近36个月</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">历年对比</label>
            <select
              value={compareYear || ''}
              onChange={(e) => setCompareYear(e.target.value || null)}
              className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-700 border-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">不对比</option>
              {availableYears
                .filter((y) => latestDataYear && y !== latestDataYear)
                .map((year) => (
                  <option key={year} value={year.toString()}>
                    {getYearLabel(year)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-3 block">选择指标（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {indicatorConfig[selectedCategory].map((item) => (
              <button
                key={item.name}
                onClick={() => toggleIndicator(item.name)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                  selectedIndicators.includes(item.name) ? 'text-white' : 'bg-gray-100 text-gray-600'
                )}
                style={{
                  backgroundColor: selectedIndicators.includes(item.name) ? item.color : undefined,
                }}
              >
                {selectedIndicators.includes(item.name) && <Check className="w-3 h-3" />}
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {compareYear && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-600" />
                <span className="text-gray-600">
                  {latestDataYear ? getYearLabel(latestDataYear) : ''}（实线）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af, #9ca3af 3px, transparent 3px, transparent 6px)' }} />
                <span className="text-gray-600">
                  {compareYear ? getYearLabel(parseInt(compareYear, 10)) : ''}（虚线）
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>无数据的月份不会连线</span>
              </div>
            </div>
          </div>
        )}

        {!hasCurrentYearData && latestDataYear && (
          <div className="mt-4 p-3 bg-info-50 border border-info-200 rounded-xl flex items-start gap-2">
            <Info className="w-5 h-5 text-info-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-info-700">
              当前最新数据为 <span className="font-semibold">{latestDataYear}年</span>，暂无 {realCurrentYear} 年（今年）的数据。
              {compareYear && parseInt(compareYear, 10) !== latestDataYear && (
                <> 图表中实线代表 {latestDataYear}年数据。</>
              )}
            </div>
          </div>
        )}
      </div>

      {getStats && getStats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {getStats.map((stat) => (
            stat && (
              <div key={stat.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="font-medium text-gray-800">{stat.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{stat.count} 个数据点</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold" style={{ color: stat.color }}>
                      {stat.average}
                    </div>
                    <div className="text-xs text-gray-500">平均值</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-success-600">{stat.min}</div>
                    <div className="text-xs text-gray-500">最低值</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-danger-600">{stat.max}</div>
                    <div className="text-xs text-gray-500">最高值</div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {selectedCategory}趋势图
          {compareYear && latestDataYear && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              （{getYearLabel(latestDataYear)} vs {getYearLabel(parseInt(compareYear, 10))}）
            </span>
          )}
        </h2>
        {mergedData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="displayLabel"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                {renderLines()}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {alignType === 'month' && mergedData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">每月检查次数</h3>
              {compareYear && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-primary-500" />
                    {getYearLabel(latestDataYear)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-info-500" />
                    {getYearLabel(parseInt(compareYear, 10))}
                  </span>
                </div>
              )}
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mergedData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey={compareYear ? 'key' : 'displayLabel'}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value: string) => {
                      if (compareYear) {
                        return `${parseInt(value, 10)}月`;
                      }
                      return value;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const dataPoint = mergedData.find((d: any) => d.key === label || d.displayLabel === label);
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-40">
                            <p className="text-sm font-medium text-gray-800 mb-2">
                              {dataPoint ? (compareYear ? `${parseInt(dataPoint.key, 10)}月` : dataPoint.displayLabel) : label}
                            </p>
                            {compareYear ? (
                              <>
                                <p className="text-sm text-primary-600 mb-1">
                                  {getYearLabel(latestDataYear)}: {dataPoint?.currentCount || 0} 次
                                </p>
                                <p className="text-sm text-info-600">
                                  {getYearLabel(parseInt(compareYear, 10))}: {dataPoint?.compareCount || 0} 次
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-primary-600">
                                {payload[0].value} 次检查
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {compareYear ? (
                    <>
                      <Bar dataKey="currentCount" name={latestDataYear ? getYearLabel(latestDataYear) : ''} fill="#1677ff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="compareCount" name={compareYear ? getYearLabel(parseInt(compareYear, 10)) : ''} fill="#1890ff" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <Bar dataKey="count" fill="#1677ff" radius={[4, 4, 0, 0]}>
                      {mergedData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.count && entry.count > 2 ? '#ef4444' : entry.count && entry.count === 2 ? '#faad14' : '#1677ff'}
                        />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!compareYear && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                <span>颜色表示检查频率：蓝色（≤2次/月）→ 黄色（2次/月）→ 红色（＞2次/月）</span>
              </p>
            )}
          </div>
        )}
      </div>

      {renderDetailDrawer()}
    </div>
  );
}
