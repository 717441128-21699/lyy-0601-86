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

export default function TrendAnalysisPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('血压');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['收缩压', '舒张压']);
  const [timeRange, setTimeRange] = useState<string>('全部');
  const [compareYear, setCompareYear] = useState<string | null>(null);

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

  const buildChartData = useCallback((yearFilter?: number) => {
    let filtered = indicators.filter((i) => activeIndicators.includes(i.indicatorName));
    if (yearFilter) {
      filtered = filtered.filter((i) => getYear(i.examDate) === yearFilter);
    } else if (timeRange !== '全部') {
      const now = new Date();
      const months = parseInt(timeRange, 10);
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
      filtered = filtered.filter((i) => new Date(i.examDate) >= cutoff);
    }
    const grouped: Record<string, Record<string, number | string>> = {};
    filtered.forEach((i) => {
      const key = yearFilter ? i.examDate.slice(5) : i.examDate;
      if (!grouped[key]) {
        grouped[key] = {
          date: i.examDate,
          displayDate: yearFilter ? i.examDate.slice(5) : formatDisplayDate(i.examDate),
        };
      }
      if (i.numericValue !== undefined) {
        const dataKey = yearFilter ? `${i.indicatorName}(${yearFilter}年)` : i.indicatorName;
        grouped[key][dataKey] = i.numericValue;
      }
    });
    return Object.values(grouped).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [indicators, activeIndicators, timeRange]);

  const chartData = useMemo(() => buildChartData(), [buildChartData]);
  const comparisonData = useMemo(
    () => (compareYear ? buildChartData(parseInt(compareYear, 10)) : null),
    [buildChartData, compareYear]
  );

  const mergedData = useMemo(() => {
    if (!comparisonData) return chartData;
    const merged: Record<string, Record<string, number | string>> = {};
    chartData.forEach((d) => { merged[String(d.displayDate).slice(-5)] = { ...d }; });
    comparisonData.forEach((d) => { merged[String(d.displayDate)] = { ...merged[String(d.displayDate)], ...d }; });
    return Object.values(merged).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [chartData, comparisonData]);

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
          key={name}
          type="monotone"
          dataKey={name}
          stroke={getLineColor(name)}
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      );
      if (compareYear) {
        const compareKey = `${name}(${compareYear}年)`;
        lines.push(
          <Line
            key={compareKey}
            type="monotone"
            dataKey={compareKey}
            stroke={getLineColor(name)}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, strokeWidth: 2 }}
          />
        );
      }
    });
    return lines;
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
              {availableYears.map((year) => (
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
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {selectedCategory}趋势图
          {compareYear && <span className="text-sm font-normal text-gray-500 ml-2">（与{compareYear}年对比）</span>}
        </h2>
        {mergedData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ fontWeight: 600, color: '#374151' }}
                />
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
