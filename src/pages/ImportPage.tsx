import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Calendar,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  ClipboardPaste,
  Plus,
  Building2,
  FileSpreadsheet,
  ChevronRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Merge,
  Paintbrush,
  Info,
} from 'lucide-react';
import { useHealthStore } from '../store';
import type { ParsedIndicator, HealthIndicator, FamilyMember } from '../types';
import {
  parseTextContent,
  findStandardName,
  parseReferenceRange,
  determineStatus,
  DEFAULT_DICTIONARY,
} from '../utils/indicatorParser';
import { extractDate, extractNameFromFilename, formatDisplayDate } from '../utils/dateParser';
import { cn } from '../lib/utils';

type ImportStep = 'select' | 'preview' | 'success';
type ImportMode = 'file' | 'paste';

interface ParsedResult {
  indicators: ParsedIndicator[];
  parsedDate: string | null;
  parsedName: string | null;
  sourceName: string;
}

const REPORT_TYPES = ['体检报告', '门诊报告', '住院报告', '复查报告', '其他'];
const HOSPITAL_SUGGESTIONS = ['人民医院', '中心医院', '第一医院', '协和医院', '301医院', '瑞金医院', '中山医院'];

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('select');
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [hospital, setHospital] = useState('');
  const [reportType, setReportType] = useState('体检报告');
  const [selectedIndicatorIndices, setSelectedIndicatorIndices] = useState<Set<number>>(new Set());

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberGender, setNewMemberGender] = useState<'男' | '女'>('男');
  const [newMemberBirthDate, setNewMemberBirthDate] = useState('');

  const [importStats, setImportStats] = useState<{
    totalCount: number;
    abnormalCount: number;
    memberName: string;
    examDate: string;
    reportId: string;
  } | null>(null);

  const {
    members,
    addMember,
    addReport,
    addIndicators,
    dictionary,
    setCurrentMember,
    setLastImportResult,
  } = useHealthStore((state) => ({
    members: state.members,
    addMember: state.addMember,
    addReport: state.addReport,
    addIndicators: state.addIndicators,
    dictionary: state.dictionary,
    setCurrentMember: state.setCurrentMember,
    setLastImportResult: state.setLastImportResult,
  }));

  const hasMembers = members.length > 0;
  const allIndicators = parsedResult?.indicators || [];
  const allSelected = allIndicators.length > 0 && selectedIndicatorIndices.size === allIndicators.length;
  const someSelected = selectedIndicatorIndices.size > 0 && selectedIndicatorIndices.size < allIndicators.length;

  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      const parsedName = parsedResult?.parsedName;
      if (parsedName) {
        const matched = members.find(
          (m) => m.name.includes(parsedName) || parsedName.includes(m.name)
        );
        if (matched) {
          setSelectedMemberId(matched.id);
          return;
        }
      }
      setSelectedMemberId(members[0].id);
    }
  }, [members, parsedResult, selectedMemberId]);

  useEffect(() => {
    if (parsedResult?.parsedDate) {
      setExamDate(parsedResult.parsedDate);
    }
  }, [parsedResult]);

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newId = addMember({
      name: newMemberName.trim(),
      gender: newMemberGender === '男' ? 'male' : 'female',
      birthDate: newMemberBirthDate || '',
      relationship: '本人',
    });
    setSelectedMemberId(newId);
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberBirthDate('');
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    setIsParsing(true);
    setParseError(null);
    const file = fileList[0];
    try {
      const text = await file.text();
      const indicators = parseTextContent(text);
      const parsedDate = extractDate(text) || extractDate(file.name);
      const parsedName = extractNameFromFilename(file.name);

      if (indicators.length === 0) {
        setParseError('未能识别到任何指标，请检查文本格式或使用粘贴模式手动调整。');
        setIsParsing(false);
        return;
      }

      setParsedResult({
        indicators,
        parsedDate,
        parsedName,
        sourceName: file.name,
      });
      setHospital('');
      setReportType('体检报告');
      setSelectedIndicatorIndices(new Set(indicators.map((_, i) => i)));
      setStep('preview');
    } catch (e) {
      setParseError('文件解析失败，请重试或使用粘贴模式。');
    }
    setIsParsing(false);
  }, []);

  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setIsParsing(true);
    setParseError(null);

    const indicators = parseTextContent(pastedText);
    const parsedDate = extractDate(pastedText);
    const lines = pastedText.split('\n').slice(0, 5).join(' ');
    const parsedName = extractNameFromFilename(lines);

    if (indicators.length === 0) {
      setParseError('未能识别到任何指标，请检查文本格式。每行一条指标，格式如：空腹血糖: 5.6 mmol/L (3.9-6.1)');
      setIsParsing(false);
      return;
    }

    setParsedResult({
      indicators,
      parsedDate,
      parsedName,
      sourceName: '粘贴文本导入',
    });
    setHospital('');
    setReportType('体检报告');
    setSelectedIndicatorIndices(new Set(indicators.map((_, i) => i)));
    setStep('preview');
    setIsParsing(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const toggleSelect = (index: number) => {
    setSelectedIndicatorIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIndicatorIndices(new Set());
    } else {
      setSelectedIndicatorIndices(new Set(allIndicators.map((_, i) => i)));
    }
  };

  const deleteSelected = () => {
    if (!parsedResult || selectedIndicatorIndices.size === 0) return;
    const newIndicators = parsedResult.indicators.filter((_, i) => !selectedIndicatorIndices.has(i));
    setParsedResult({ ...parsedResult, indicators: newIndicators });
    setSelectedIndicatorIndices(new Set());
  };

  const batchFillEmptyUnit = () => {
    if (!parsedResult) return;
    const newIndicators = parsedResult.indicators.map((indicator) => {
      if (!indicator.unit.trim()) {
        const dictItem = findStandardName(indicator.name, dictionary);
        return { ...indicator, unit: dictItem?.unit || '' };
      }
      return indicator;
    });
    setParsedResult({ ...parsedResult, indicators: newIndicators });
  };

  const batchFillEmptyReference = () => {
    if (!parsedResult) return;
    const newIndicators = parsedResult.indicators.map((indicator) => {
      if (!indicator.referenceRange.trim()) {
        const dictItem = findStandardName(indicator.name, dictionary);
        return { ...indicator, referenceRange: dictItem?.defaultReference || '' };
      }
      return indicator;
    });
    setParsedResult({ ...parsedResult, indicators: newIndicators });
  };

  const mergeToStandardNames = () => {
    if (!parsedResult) return;
    const newIndicators = parsedResult.indicators.map((indicator) => {
      const dictItem = findStandardName(indicator.name, dictionary);
      if (dictItem && dictItem.standardName !== indicator.name) {
        return {
          ...indicator,
          name: dictItem.standardName,
          unit: indicator.unit || dictItem.unit,
          referenceRange: indicator.referenceRange || dictItem.defaultReference,
        };
      }
      return indicator;
    });
    setParsedResult({ ...parsedResult, indicators: newIndicators });
  };

  const updateIndicator = (index: number, field: keyof ParsedIndicator, value: string) => {
    if (!parsedResult) return;
    const newIndicators = [...parsedResult.indicators];
    newIndicators[index] = { ...newIndicators[index], [field]: value };
    setParsedResult({ ...parsedResult, indicators: newIndicators });
  };

  const removeIndicator = (index: number) => {
    if (!parsedResult) return;
    const newIndicators = parsedResult.indicators.filter((_, i) => i !== index);
    const newSelected = new Set<number>();
    selectedIndicatorIndices.forEach((i) => {
      if (i < index) newSelected.add(i);
      if (i > index) newSelected.add(i - 1);
    });
    setParsedResult({ ...parsedResult, indicators: newIndicators });
    setSelectedIndicatorIndices(newSelected);
  };

  const canImport = useMemo(() => {
    return (
      selectedMemberId &&
      examDate &&
      parsedResult &&
      parsedResult.indicators.length > 0 &&
      selectedIndicatorIndices.size > 0
    );
  }, [selectedMemberId, examDate, parsedResult, selectedIndicatorIndices]);

  const handleImport = () => {
    if (!canImport || !parsedResult) {
      if (!selectedMemberId) setParseError('请先选择或新增家庭成员');
      else if (!examDate) setParseError('请选择体检日期');
      else if (selectedIndicatorIndices.size === 0) setParseError('请至少勾选一项指标');
      else setParseError('请完善必要信息后再导入');
      return;
    }

    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;

    const reportId = addReport({
      memberId: selectedMemberId,
      examDate,
      hospital: hospital || '未填写医院',
      reportType,
      sourceFileName: parsedResult.sourceName,
    });

    const selectedIndicators = parsedResult.indicators.filter((_, i) => selectedIndicatorIndices.has(i));
    const healthIndicators: Array<Omit<HealthIndicator, 'id'>> = selectedIndicators.map((pi) => {
      const dictItem = findStandardName(pi.name, dictionary);
      const numericValue = parseFloat(pi.value);
      const { minValue, maxValue } = parseReferenceRange(pi.referenceRange || dictItem?.defaultReference || '');
      const { status, isAbnormal } = determineStatus(
        isNaN(numericValue) ? undefined : numericValue,
        minValue,
        maxValue
      );
      return {
        reportId,
        memberId: selectedMemberId,
        indicatorName: dictItem?.standardName || pi.name,
        indicatorCode: dictItem?.id,
        value: pi.value,
        numericValue: isNaN(numericValue) ? undefined : numericValue,
        unit: pi.unit || dictItem?.unit || '',
        referenceRange: pi.referenceRange || dictItem?.defaultReference || '',
        minValue,
        maxValue,
        status,
        category: dictItem?.category || '其他',
        isAbnormal,
        examDate,
      };
    });

    addIndicators(healthIndicators);

    const abnormalCount = healthIndicators.filter((i) => i.isAbnormal).length;

    setImportStats({
      totalCount: healthIndicators.length,
      abnormalCount,
      memberName: member.name,
      examDate,
      reportId,
    });

    setLastImportResult({
      memberId: selectedMemberId,
      memberName: member.name,
      totalCount: healthIndicators.length,
      abnormalCount,
      reportId,
      examDate,
    });

    setCurrentMember(selectedMemberId);
    navigate('/dashboard');
  };

  const goToDashboard = () => {
    if (selectedMemberId) {
      setCurrentMember(selectedMemberId);
    }
    navigate('/dashboard');
  };

  const resetImport = () => {
    setStep('select');
    setImportMode(null);
    setPastedText('');
    setParsedResult(null);
    setParseError(null);
    setSelectedIndicatorIndices(new Set());
    setImportStats(null);
  };

  const goBackToSelect = () => {
    setStep('select');
    setParseError(null);
    setImportStats(null);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { key: 'select', label: '选择方式', active: step === 'select', done: step !== 'select' },
        { key: 'preview', label: '预览确认', active: step === 'preview', done: step === 'success' },
        { key: 'success', label: '导入完成', active: step === 'success', done: false },
      ].map((item, idx, arr) => (
        <div key={item.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                item.active
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                  : item.done
                  ? 'bg-success-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {item.done ? <Check className="w-5 h-5" /> : idx + 1}
            </div>
            <span
              className={cn(
                'mt-2 text-sm font-medium',
                item.active ? 'text-primary-600' : item.done ? 'text-success-600' : 'text-gray-400'
              )}
            >
              {item.label}
            </span>
          </div>
          {idx < arr.length - 1 && (
            <div
              className={cn(
                'w-24 h-1 mx-4 rounded',
                item.done ? 'bg-success-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderAddMemberModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4">新增家庭成员</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">姓名 *</label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">性别</label>
            <div className="flex gap-4">
              {(['男', '女'] as const).map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={g}
                    checked={newMemberGender === g}
                    onChange={(e) => setNewMemberGender(e.target.value as '男' | '女')}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-gray-700">{g}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">出生日期</label>
            <input
              type="date"
              value={newMemberBirthDate}
              onChange={(e) => setNewMemberBirthDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowAddMember(false);
              setNewMemberName('');
              setNewMemberBirthDate('');
            }}
            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAddMember}
            disabled={!newMemberName.trim()}
            className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            确认添加
          </button>
        </div>
      </div>
    </div>
  );

  const getMainContent = () => {
    if (step === 'select') {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">导入体检报告</h1>
            <p className="text-gray-500">选择导入方式，开始整理您的健康数据</p>
          </div>

          {renderStepIndicator()}

          <div className="grid grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setImportMode('file')}
              className={cn(
                'p-8 rounded-2xl border-2 transition-all text-left',
                importMode === 'file'
                  ? 'border-primary-500 bg-primary-50 shadow-lg'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              )}
            >
              <Upload className={cn('w-12 h-12 mb-4', importMode === 'file' ? 'text-primary-500' : 'text-gray-400')} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">上传 TXT 文件</h3>
              <p className="text-gray-500 text-sm">
                支持从体检报告导出的 TXT 文本文件，批量导入多份报告
              </p>
            </button>

            <button
              onClick={() => setImportMode('paste')}
              className={cn(
                'p-8 rounded-2xl border-2 transition-all text-left',
                importMode === 'paste'
                  ? 'border-primary-500 bg-primary-50 shadow-lg'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              )}
            >
              <ClipboardPaste className={cn('w-12 h-12 mb-4', importMode === 'paste' ? 'text-primary-500' : 'text-gray-400')} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">粘贴文本内容</h3>
              <p className="text-gray-500 text-sm">
                直接复制粘贴体检报告的指标数据，适合快速录入
              </p>
            </button>
          </div>

          {importMode === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
                isParsing ? 'opacity-50 pointer-events-none' : ''
              )}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
                  <p className="text-lg font-medium text-gray-700">正在解析文件...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    拖拽 TXT 文件到此处或点击上传
                  </p>
                  <p className="text-sm text-gray-500">每次导入一份报告，可多次导入</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          )}

          {importMode === 'paste' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">粘贴体检报告文本</h3>
              <p className="text-sm text-gray-500 mb-4">
                将体检报告中的指标数据粘贴到下方，系统将自动解析。每行一条指标，格式示例：「空腹血糖: 5.6 mmol/L (3.9-6.1)」
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="请粘贴体检报告文本内容...

示例格式：
收缩压: 125 mmHg (90-140)
舒张压: 85 mmHg (60-90)
空腹血糖: 5.6 mmol/L (3.9-6.1)
总胆固醇: 4.8 mmol/L (<5.2)"
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono text-sm"
                disabled={isParsing}
              />
              {parseError && (
                <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-danger-800">解析失败</p>
                    <p className="text-sm text-danger-600">{parseError}</p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={resetImport}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim() || isParsing}
                  className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="w-4 h-4" />
                      解析文本
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!hasMembers && (
            <div className="mt-6 bg-warning-50 border border-warning-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-warning-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">请先添加家庭成员</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    导入体检报告前需要先创建家庭成员档案，以便正确归档数据。
                  </p>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加家庭成员
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === 'preview' && parsedResult) {
      const emptyUnitCount = allIndicators.filter((i) => !i.unit.trim()).length;
      const emptyRefCount = allIndicators.filter((i) => !i.referenceRange.trim()).length;
      const canMerge = allIndicators.some((i) => {
        const dictItem = findStandardName(i.name, dictionary);
        return dictItem && dictItem.standardName !== i.name;
      });

      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">预览与确认</h1>
            <p className="text-gray-500">
              共识别到 <span className="font-semibold text-primary-600">{allIndicators.length}</span> 项指标，请确认信息无误
            </p>
          </div>

          {renderStepIndicator()}

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">基本信息</h2>
              {parsedResult.parsedName && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  识别到姓名：{parsedResult.parsedName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />成员 *
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">请选择成员</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-3 py-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-center"
                    title="新增成员"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />体检日期 *
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />医院
                </label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="请输入或选择"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  list="hospital-list"
                />
                <datalist id="hospital-list">
                  {HOSPITAL_SUGGESTIONS.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileSpreadsheet className="w-4 h-4 inline mr-1" />报告类型
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-gray-800">
                  指标列表
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    （已选 {selectedIndicatorIndices.size}/{allIndicators.length}）
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  {allSelected ? <CheckSquare className="w-4 h-4" /> : someSelected ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4" />}
                  {allSelected ? '取消全选' : '全选'}
                </button>

                <button
                  onClick={deleteSelected}
                  disabled={selectedIndicatorIndices.size === 0}
                  className="px-3 py-1.5 text-sm bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除选中
                </button>

                <button
                  onClick={batchFillEmptyUnit}
                  disabled={emptyUnitCount === 0}
                  className="px-3 py-1.5 text-sm bg-warning-50 text-warning-600 rounded-lg hover:bg-warning-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title={emptyUnitCount > 0 ? `填充 ${emptyUnitCount} 项空单位` : '单位已齐全'}
                >
                  <Paintbrush className="w-4 h-4" />
                  补填单位 {emptyUnitCount > 0 && `(${emptyUnitCount})`}
                </button>

                <button
                  onClick={batchFillEmptyReference}
                  disabled={emptyRefCount === 0}
                  className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title={emptyRefCount > 0 ? `填充 ${emptyRefCount} 项空参考范围` : '参考范围已齐全'}
                >
                  <Paintbrush className="w-4 h-4" />
                  补填参考 {emptyRefCount > 0 && `(${emptyRefCount})`}
                </button>

                <button
                  onClick={mergeToStandardNames}
                  disabled={!canMerge}
                  className="px-3 py-1.5 text-sm bg-success-50 text-success-600 rounded-lg hover:bg-success-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title={canMerge ? '合并识别的别名到标准指标名' : '所有指标已是标准名称'}
                >
                  <Merge className="w-4 h-4" />
                  合并标准名
                </button>
              </div>
            </div>

            {parseError && (
              <div className="mx-4 my-4 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-danger-800">无法导入</p>
                  <p className="text-sm text-danger-600">{parseError}</p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-gray-500">
                    <th className="w-10 py-3 px-2"></th>
                    <th className="text-left py-3 px-3 font-medium">指标名称</th>
                    <th className="text-left py-3 px-3 font-medium">数值</th>
                    <th className="text-left py-3 px-3 font-medium">单位</th>
                    <th className="text-left py-3 px-3 font-medium">参考范围</th>
                    <th className="w-10 py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {allIndicators.map((indicator, index) => {
                    const dictItem = findStandardName(indicator.name, dictionary);
                    const isSelected = selectedIndicatorIndices.has(index);
                    return (
                      <tr
                        key={index}
                        className={cn(
                          'border-b border-gray-100 transition-colors',
                          isSelected ? 'bg-primary-50/50' : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="py-2 px-2">
                          <button
                            onClick={() => toggleSelect(index)}
                            className="text-gray-400 hover:text-primary-500 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-primary-500" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        {(['name', 'value', 'unit', 'referenceRange'] as const).map((field) => (
                          <td key={field} className="py-2 px-3">
                            <input
                              type="text"
                              value={indicator[field]}
                              onChange={(e) => updateIndicator(index, field, e.target.value)}
                              className={cn(
                                'w-full px-2 py-1 border border-transparent rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-transparent',
                                field === 'name' && dictItem && dictItem.standardName !== indicator.name && 'text-warning-600'
                              )}
                              placeholder={
                                field === 'unit' && dictItem?.unit
                                  ? dictItem.unit
                                  : field === 'referenceRange' && dictItem?.defaultReference
                                  ? dictItem.defaultReference
                                  : ''
                              }
                            />
                          </td>
                        ))}
                        <td className="py-2 px-2">
                          <button
                            onClick={() => removeIndicator(index)}
                            className="p-1 hover:bg-danger-50 rounded text-danger-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={goBackToSelect}
              className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回选择
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2',
                canImport
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Check className="w-5 h-5" />
              确认导入
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    if (step === 'success' && importStats) {
      return (
        <div className="max-w-2xl mx-auto">
          {renderStepIndicator()}

          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-success-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">导入成功！</h1>
            <p className="text-gray-500 mb-8">
              {importStats.memberName} 的 {formatDisplayDate(importStats.examDate)} 体检报告已成功导入
            </p>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-4xl font-bold text-primary-600">{importStats.totalCount}</div>
                  <div className="text-sm text-gray-500 mt-1">导入指标</div>
                </div>
                <div>
                  <div className={cn('text-4xl font-bold', importStats.abnormalCount > 0 ? 'text-warning-500' : 'text-success-500')}>
                    {importStats.abnormalCount}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">异常指标</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-success-600">
                    {importStats.totalCount - importStats.abnormalCount}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">正常指标</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={resetImport}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                继续导入
              </button>
              <button
                onClick={goToDashboard}
                className="px-8 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-semibold flex items-center gap-2 shadow-lg shadow-primary-200"
              >
                <FileText className="w-4 h-4" />
                查看健康看板
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {getMainContent()}
      {showAddMember && renderAddMemberModal()}
    </>
  );
}
