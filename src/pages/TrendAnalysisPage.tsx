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

  const { members, currentMemberId, indicators } = useHealthStore((state) => ({
    members: state.members,
    currentMemberId: state.currentMemberId,
    indicators: state.indicators.filter((i) => i.memberId === state.currentMemberId),
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

        grouped[key].count = (grouped[key].count || 0) + 1;
        if (!grouped[key].dates?.includes(i.examDate)) {
          grouped[key].dates?.push(i.examDate);
        }
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
        merged[d.key as string] = {
          ...merged[d.key as string],
          ...d,
          count: (merged[d.key as string].count || 0) + (d.count || 0),
          dates: [...(merged[d.key as string].dates || []), ...(d.dates || [])],
        };
      }
    });

    Object.keys(merged).forEach((key) => {
      const currentCount = chartData.find((d) => d.key === key)?.count || 0;
      merged[key].displayLabel = getDisplayLabel(
        key,
        alignType === 'month',
        alignType === 'month' ? currentCount : undefined
      );
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
          dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
          activeDot={{ r: 7 }}
          connectNulls={false}
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
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        );
      }
    });
    return lines;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-48">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const indicatorName = entry.dataKey.split('(')[0];
            const isCurrent = entry.dataKey.includes('今年') || entry.dataKey.includes(`${latestDataYear}年`);
            const yearPart = entry.dataKey.match(/\((.+)\)/)?.[1];

            const dataPoint = mergedData.find((d: any) => d.displayLabel === label);
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
            <h3 className="text-sm font-medium text-gray-700 mb-4">每月检查次数</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mergedData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="displayLabel"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                            <p className="text-sm font-medium text-gray-800">{label}</p>
                            <p className="text-sm text-primary-600">
                              {payload[0].value} 次检查
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#1677ff" radius={[4, 4, 0, 0]}>
                    {mergedData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count && entry.count > 2 ? '#ef4444' : entry.count && entry.count === 2 ? '#faad14' : '#1677ff'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>颜色表示检查频率：蓝色（≤2次/月）→ 黄色（2次/月）→ 红色（＞2次/月）</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
