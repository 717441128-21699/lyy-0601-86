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
} from 'recharts';
import {
  Activity,
  Heart,
  TrendingUp,
  Calendar,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate, getYear } from '../utils/dateParser';

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

  const availableYears = useMemo(() => {
    const years = new Set(indicators.map((i) => getYear(i.examDate)));
    return Array.from(years).sort((a, b) => b - a);
  }, [indicators]);

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

  const getDisplayLabel = (key: string) => {
    if (alignType === 'month') {
      return `${parseInt(key, 10)}月`;
    }
    return key;
  };

  const buildYearData = useCallback(
    (year: number, yearLabel: string) => {
      let filtered = indicators.filter(
        (i) => activeIndicators.includes(i.indicatorName) && getYear(i.examDate) === year
      );

      if (timeRange !== '全部' && year === availableYears[0]) {
        const now = new Date();
        const months = parseInt(timeRange, 10);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        filtered = filtered.filter((i) => new Date(i.examDate) >= cutoff);
      }

      const grouped: Record<string, Record<string, number | string>> = {};

      filtered.forEach((i) => {
        if (i.numericValue === undefined) return;

        const key = alignType === 'month' ? getMonthKey(i.examDate) : getMonthDayKey(i.examDate);

        if (!grouped[key]) {
          grouped[key] = {
            key,
            displayLabel: getDisplayLabel(key),
            sortKey: key,
          };
        }

        const valuesForIndicator = filtered.filter(
          (f) =>
            f.indicatorName === i.indicatorName &&
            (alignType === 'month'
              ? getMonthKey(f.examDate) === key
              : getMonthDayKey(f.examDate) === key)
        );

        if (valuesForIndicator.length > 0) {
          const avgValue =
            valuesForIndicator.reduce((sum, v) => sum + (v.numericValue || 0), 0) /
            valuesForIndicator.length;
          grouped[key][`${i.indicatorName}(${yearLabel})`] = Math.round(avgValue * 100) / 100;
          grouped[key][`${i.indicatorName}(${yearLabel})_date`] = formatDisplayDate(i.examDate);
        }
      });

      return Object.values(grouped).sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    },
    [indicators, activeIndicators, alignType, timeRange, availableYears]
  );

  const allKeys = useMemo(() => {
    if (!compareYear) return [];

    const currentYear = availableYears[0];
    if (!currentYear) return [];

    const compareYearNum = parseInt(compareYear, 10);
    const keys = new Set<string>();

    indicators
      .filter(
        (i) =>
          activeIndicators.includes(i.indicatorName) &&
          (getYear(i.examDate) === currentYear || getYear(i.examDate) === compareYearNum)
      )
      .forEach((i) => {
        const key = alignType === 'month' ? getMonthKey(i.examDate) : getMonthDayKey(i.examDate);
        keys.add(key);
      });

    return Array.from(keys).sort();
  }, [indicators, activeIndicators, compareYear, alignType, availableYears]);

  const chartData = useMemo(() => {
    if (availableYears.length === 0) return [];
    const currentYear = availableYears[0];
    return buildYearData(currentYear, '今年');
  }, [buildYearData, availableYears]);

  const comparisonData = useMemo(() => {
    if (!compareYear) return null;
    return buildYearData(parseInt(compareYear, 10), `${compareYear}年`);
  }, [buildYearData, compareYear]);

  const mergedData = useMemo(() => {
    if (!comparisonData || allKeys.length === 0) return chartData;

    const merged: Record<string, Record<string, number | string>> = {};

    allKeys.forEach((key) => {
      merged[key] = {
        key,
        displayLabel: getDisplayLabel(key),
        sortKey: key,
      };
    });

    chartData.forEach((d) => {
      if (merged[d.key as string]) {
        merged[d.key as string] = { ...merged[d.key as string], ...d };
      }
    });

    comparisonData.forEach((d) => {
      if (merged[d.key as string]) {
        merged[d.key as string] = { ...merged[d.key as string], ...d };
      }
    });

    return Object.values(merged).sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }, [chartData, comparisonData, allKeys]);

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
    activeIndicators.forEach((name) => {
      lines.push(
        <Line
          key={`${name}-current`}
          type="monotone"
          dataKey={`${name}(今年)`}
          stroke={getLineColor(name)}
          strokeWidth={3}
          dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
          activeDot={{ r: 7 }}
          connectNulls={false}
        />
      );
      if (compareYear) {
        lines.push(
          <Line
            key={`${name}-compare`}
            type="monotone"
            dataKey={`${name}(${compareYear}年)`}
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const isCurrent = entry.dataKey.includes('(今年)');
            const indicatorName = entry.dataKey.split('(')[0];
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={isCurrent ? 'font-medium text-gray-800' : 'text-gray-500'}>
                  {entry.dataKey}:
                </span>
                <span className={isCurrent ? 'font-semibold' : ''} style={{ color: entry.color }}>
                  {entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
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
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  alignType === 'month'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                按月份对齐
              </button>
              <button
                onClick={() => setAlignType('day')}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  alignType === 'day'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
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
                .filter((y) => y !== availableYears[0])
                .map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}年
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedIndicators.includes(item.name) ? 'text-white' : 'bg-gray-100 text-gray-600'
                }`}
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
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-600" />
                <span className="text-gray-600">今年（实线）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af, #9ca3af 3px, transparent 3px, transparent 6px)' }} />
                <span className="text-gray-600">{compareYear}年（虚线）</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>无数据的月份不会连线</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {selectedCategory}趋势图
          {compareYear && <span className="text-sm font-normal text-gray-500 ml-2">（今年 vs {compareYear}年）</span>}
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
      </div>
    </div>
  );
}
