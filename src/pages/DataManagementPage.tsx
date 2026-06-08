import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  User,
} from 'lucide-react';
import { useHealthStore } from '../store';
import type { HealthIndicator } from '../types';
import { cn } from '../lib/utils';
import { formatDisplayDate } from '../utils/dateParser';

export default function DataManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<HealthIndicator>>({});

  const { members, indicators, updateIndicator, deleteIndicator, currentMemberId } = useHealthStore(
    (state) => ({
      members: state.members,
      indicators: state.indicators.filter((i) => i.memberId === state.currentMemberId),
      updateIndicator: state.updateIndicator,
      deleteIndicator: state.deleteIndicator,
      currentMemberId: state.currentMemberId,
    })
  );

  const categories = useMemo(() => {
    const cats = new Set(indicators.map((i) => i.category));
    return ['全部', ...Array.from(cats)];
  }, [indicators]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter((i) => {
      const matchSearch =
        i.indicatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.indicatorCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === '全部' || i.category === filterCategory;
      const matchStatus =
        filterStatus === '全部' ||
        (filterStatus === '异常' && i.isAbnormal) ||
        (filterStatus === '正常' && !i.isAbnormal);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [indicators, searchTerm, filterCategory, filterStatus]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };
  const toggleSelectAll = () => {
    selectedIds.size === filteredIndicators.length
      ? setSelectedIds(new Set())
      : setSelectedIds(new Set(filteredIndicators.map((i) => i.id)));
  };
  const startEdit = (indicator: HealthIndicator) => {
    setEditingId(indicator.id);
    setEditValues({ indicatorName: indicator.indicatorName, value: indicator.value, referenceRange: indicator.referenceRange, unit: indicator.unit });
  };
  const saveEdit = () => {
    if (!editingId) return;
    updateIndicator(editingId, editValues);
    setEditingId(null);
    setEditValues({});
  };
  const cancelEdit = () => { setEditingId(null); setEditValues({}); };
  const handleDelete = (id: string) => {
    deleteIndicator(id);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.size} 项指标吗？`)) {
      selectedIds.forEach((id) => deleteIndicator(id));
      setSelectedIds(new Set());
    }
  };

  const currentMember = members.find((m) => m.id === currentMemberId);

  const statusConfig = {
    normal: { icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-50', label: '正常' },
    high: { icon: ArrowUpCircle, color: 'text-warning-500', bg: 'bg-warning-50', label: '偏高' },
    low: { icon: ArrowDownCircle, color: 'text-danger-500', bg: 'bg-danger-50', label: '偏低' },
    critical: { icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-100', label: '严重' },
  } as const;

  const inputClass = 'px-2 py-1 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500';
  const btnClass = 'p-1 rounded transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据管理</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <User className="w-4 h-4" />
            {currentMember?.name || '未选择成员'} · 共 {indicators.length} 条记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-danger-500 text-white rounded-xl hover:bg-danger-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              批量删除 ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索指标名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="全部">全部状态</option>
              <option value="正常">正常</option>
              <option value="异常">异常</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-gray-600 text-sm">
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredIndicators.length && filteredIndicators.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </th>
                <th className="py-3 px-4 text-left font-medium">指标名称</th>
                <th className="py-3 px-4 text-left font-medium">数值</th>
                <th className="py-3 px-4 text-left font-medium">参考范围</th>
                <th className="py-3 px-4 text-left font-medium">分类</th>
                <th className="py-3 px-4 text-left font-medium">状态</th>
                <th className="py-3 px-4 text-left font-medium">日期</th>
                <th className="py-3 px-4 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIndicators.map((indicator) => {
                const config = statusConfig[indicator.status];
                const StatusIcon = config.icon;
                const isEditing = editingId === indicator.id;

                return (
                  <tr key={indicator.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(indicator.id)}
                        onChange={() => toggleSelect(indicator.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input type="text" value={editValues.indicatorName || ''} onChange={(e) => setEditValues({ ...editValues, indicatorName: e.target.value })} className={`w-full ${inputClass}`} />
                      ) : (
                        <div>
                          <p className="font-medium text-gray-800">{indicator.indicatorName}</p>
                          {indicator.manualEdited && <span className="text-xs text-primary-500">已手动编辑</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={editValues.value || ''} onChange={(e) => setEditValues({ ...editValues, value: e.target.value })} className={`w-20 ${inputClass}`} />
                          <input type="text" value={editValues.unit || ''} onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })} className={`w-16 ${inputClass} text-sm text-gray-500`} />
                        </div>
                      ) : (
                        <p className={cn('font-medium', indicator.isAbnormal ? config.color : 'text-gray-800')}>
                          {indicator.value} <span className="text-gray-500 font-normal">{indicator.unit}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input type="text" value={editValues.referenceRange || ''} onChange={(e) => setEditValues({ ...editValues, referenceRange: e.target.value })} className={`w-full ${inputClass}`} />
                      ) : (
                        <p className="text-gray-600">{indicator.referenceRange}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{indicator.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium', config.bg, config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{formatDisplayDate(indicator.examDate)}</span>
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button onClick={saveEdit} className={`${btnClass} hover:bg-success-50 text-success-500`}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className={`${btnClass} hover:bg-gray-100 text-gray-500`}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(indicator)} className={`${btnClass} hover:bg-gray-100 text-gray-500`}>
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(indicator.id)} className={`${btnClass} hover:bg-danger-50 text-danger-500`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredIndicators.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无匹配的指标数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
