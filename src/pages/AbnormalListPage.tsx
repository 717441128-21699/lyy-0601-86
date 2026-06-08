import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate } from '../utils/dateParser';
import type { HealthIndicator } from '../types';

export default function AbnormalListPage() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>('全部');
  const [timeRange, setTimeRange] = useState<string>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { members, currentMemberId, indicators } = useHealthStore((state) => ({
    members: state.members,
    currentMemberId: state.currentMemberId,
    indicators: state.indicators.filter(
      (i) => i.memberId === state.currentMemberId && i.isAbnormal
    ),
  }));

  const currentMember = members.find((m) => m.id === currentMemberId);

  const categories = useMemo(() => {
    const cats = new Set(indicators.map((i) => i.category));
    return ['全部', ...Array.from(cats)];
  }, [indicators]);

  const filteredIndicators = useMemo(() => {
    let result = [...indicators];

    if (categoryFilter !== '全部') {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (timeRange !== '全部') {
      const now = new Date();
      const months = parseInt(timeRange, 10);
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
      result = result.filter((i) => new Date(i.examDate) >= cutoff);
    }

    return result.sort((a, b) => b.examDate.localeCompare(a.examDate));
  }, [indicators, categoryFilter, timeRange]);

  const getTrend = (indicator: HealthIndicator): 'up' | 'down' | 'stable' => {
    const history = indicators
      .filter((i) => i.indicatorName === indicator.indicatorName)
      .sort((a, b) => a.examDate.localeCompare(b.examDate));

    if (history.length >= 2) {
      const prev = history[history.length - 2];
      const curr = history[history.length - 1];
      if (prev.numericValue !== undefined && curr.numericValue !== undefined) {
        if (curr.numericValue > prev.numericValue) return 'up';
        if (curr.numericValue < prev.numericValue) return 'down';
      }
    }
    return 'stable';
  };

  const getIndicatorHistory = (indicatorName: string) => {
    return indicators
      .filter((i) => i.indicatorName === indicatorName)
      .sort((a, b) => b.examDate.localeCompare(a.examDate));
  };

  if (!currentMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">请先添加家庭成员</h2>
        <p className="text-gray-400 mb-6">添加家庭成员后即可查看异常指标</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">异常指标清单</h1>
          <p className="text-gray-500 mt-1">
            {currentMember.name} 的健康异常指标跟踪
          </p>
        </div>
        <div className="flex items-center gap-3 bg-danger-50 px-4 py-2 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-danger-500" />
          <span className="font-bold text-danger-600">{filteredIndicators.length}</span>
          <span className="text-danger-600">项异常</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">类别：</span>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">时间：</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 border-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="全部">全部时间</option>
            <option value="3">近3个月</option>
            <option value="6">近6个月</option>
            <option value="12">近12个月</option>
          </select>
        </div>
      </div>

      {filteredIndicators.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <X className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">暂无异常指标</h3>
          <p className="text-gray-400">继续保持健康的生活方式！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIndicators.map((indicator) => {
            const trend = getTrend(indicator);
            const history = getIndicatorHistory(indicator.indicatorName);
            const isExpanded = expandedId === indicator.id;

            return (
              <div
                key={indicator.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : indicator.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        indicator.status === 'high' ? 'bg-warning-50' : 'bg-danger-50'
                      }`}>
                        <AlertTriangle className={`w-6 h-6 ${
                          indicator.status === 'high' ? 'text-warning-500' : 'text-danger-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{indicator.indicatorName}</h3>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            {indicator.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatDisplayDate(indicator.examDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${
                            indicator.status === 'high' ? 'text-warning-600' : 'text-danger-600'
                          }`}>
                            {indicator.value}
                          </span>
                          <span className="text-gray-400">{indicator.unit}</span>
                          {trend !== 'stable' && (
                            <div className={`flex items-center gap-0.5 ${
                              trend === 'up' ? 'text-danger-500' : 'text-success-500'
                            }`}>
                              {trend === 'up' ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          参考范围：{indicator.referenceRange}
                        </p>
                      </div>

                      <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        indicator.status === 'high'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-danger-100 text-danger-700'
                      }`}>
                        {indicator.status === 'high' ? '偏高' : '偏低'}
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">历史变化趋势</h4>
                    <div className="space-y-2">
                      {history.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-xl ${
                            idx === 0 ? 'bg-primary-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 w-24">
                              {formatDisplayDate(item.examDate)}
                            </span>
                            {idx === 0 && (
                              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full">
                                最新
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              item.isAbnormal
                                ? item.status === 'high'
                                  ? 'text-warning-600'
                                  : 'text-danger-600'
                                : 'text-success-600'
                            }`}>
                              {item.value} {item.unit}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({item.referenceRange})
                            </span>
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
  );
}
