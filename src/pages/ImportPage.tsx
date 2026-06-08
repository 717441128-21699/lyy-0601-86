import { useState, useCallback, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { useHealthStore } from '../store';
import type { ImportedFile, ParsedIndicator, HealthIndicator, FamilyMember } from '../types';
import { parseTextContent, findStandardName, parseReferenceRange, determineStatus } from '../utils/indicatorParser';
import { extractDate, extractNameFromFilename } from '../utils/dateParser';
import { cn } from '../lib/utils';

type ImportMode = 'file' | 'paste';

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('file');
  const [pastedText, setPastedText] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberGender, setNewMemberGender] = useState<'男' | '女'>('男');
  const [newMemberBirthDate, setNewMemberBirthDate] = useState('');
  const [parseResult, setParseResult] = useState<{
    indicators: ParsedIndicator[];
    parsedDate: string | null;
    parsedName: string | null;
  } | null>(null);

  const { members, currentMemberId, addReport, addIndicators, dictionary, addMember } = useHealthStore(
    (state) => ({
      members: state.members,
      currentMemberId: state.currentMemberId,
      addReport: state.addReport,
      addIndicators: state.addIndicators,
      dictionary: state.dictionary,
      addMember: state.addMember,
    })
  );

  const hasMembers = members.length > 0;

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    addMember({
      name: newMemberName.trim(),
      gender: newMemberGender === '男' ? 'male' : 'female',
      birthDate: newMemberBirthDate || '',
      relationship: '本人',
    });
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberBirthDate('');
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: ImportedFile[] = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      for (const fileItem of newFiles) {
        setFiles((prev) => prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'parsing' } : f)));
        try {
          const text = await fileItem.file.text();
          const indicators = parseTextContent(text);
          const parsedDate = extractDate(text) || extractDate(fileItem.name);
          const parsedName = extractNameFromFilename(fileItem.name);
          const matchedMember = parsedName
            ? members.find((m) => m.name.includes(parsedName) || parsedName.includes(m.name))
            : null;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: 'parsed', parsedDate: parsedDate || undefined, parsedMemberId: matchedMember?.id || currentMemberId || undefined, parsedIndicators: indicators }
                : f
            )
          );
        } catch {
          setFiles((prev) => prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', error: '文件解析失败' } : f)));
        }
      }
    },
    [members, currentMemberId]
  );

  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const indicators = parseTextContent(pastedText);
    const parsedDate = extractDate(pastedText);
    const lines = pastedText.split('\n').slice(0, 5).join(' ');
    const parsedName = extractNameFromFilename(lines);

    setParseResult({
      indicators,
      parsedDate,
      parsedName,
    });
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

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const startEdit = (file: ImportedFile) => {
    setEditingFileId(file.id);
    setEditMemberId(file.parsedMemberId || currentMemberId || '');
    setEditDate(file.parsedDate || new Date().toISOString().split('T')[0]);
  };
  const saveEdit = (id: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, parsedMemberId: editMemberId, parsedDate: editDate } : f)));
    setEditingFileId(null);
  };
  const cancelEdit = () => setEditingFileId(null);
  const updateIndicator = (fileId: string, index: number, field: keyof ParsedIndicator, value: string) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId || !f.parsedIndicators) return f;
      const newIndicators = [...f.parsedIndicators];
      newIndicators[index] = { ...newIndicators[index], [field]: value };
      return { ...f, parsedIndicators: newIndicators };
    }));
  };
  const updatePastedIndicator = (index: number, field: keyof ParsedIndicator, value: string) => {
    if (!parseResult) return;
    const newIndicators = [...parseResult.indicators];
    newIndicators[index] = { ...newIndicators[index], [field]: value };
    setParseResult({ ...parseResult, indicators: newIndicators });
  };
  const removeIndicator = (fileId: string, index: number) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId || !f.parsedIndicators) return f;
      return { ...f, parsedIndicators: f.parsedIndicators.filter((_, i) => i !== index) };
    }));
  };
  const removePastedIndicator = (index: number) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      indicators: parseResult.indicators.filter((_, i) => i !== index),
    });
  };

  const doImport = (
    memberId: string,
    examDate: string,
    indicators: ParsedIndicator[],
    sourceName: string
  ) => {
    const reportId = addReport({
      memberId,
      examDate,
      hospital: '导入报告',
      reportType: '体检报告',
      sourceFileName: sourceName,
    });
    const healthIndicators: Array<Omit<HealthIndicator, 'id'>> = indicators.map((pi) => {
      const dictItem = findStandardName(pi.name, dictionary);
      const numericValue = parseFloat(pi.value);
      const { minValue, maxValue } = parseReferenceRange(pi.referenceRange || dictItem?.defaultReference || '');
      const { status, isAbnormal } = determineStatus(isNaN(numericValue) ? undefined : numericValue, minValue, maxValue);
      return {
        reportId,
        memberId,
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
  };

  const importAll = () => {
    const parsedFiles = files.filter((f) => f.status === 'parsed' && f.parsedIndicators);
    for (const file of parsedFiles) {
      if (!file.parsedMemberId || !file.parsedDate || !file.parsedIndicators) continue;
      doImport(file.parsedMemberId, file.parsedDate, file.parsedIndicators, file.name);
    }
    navigate('/dashboard');
  };

  const importPasted = (memberId: string, examDate: string) => {
    if (!parseResult || parseResult.indicators.length === 0) return;
    doImport(memberId, examDate, parseResult.indicators, '粘贴文本导入');
    navigate('/dashboard');
  };

  const parsedFiles = useMemo(() => files.filter((f) => f.status === 'parsed'), [files]);
  const canImport = parsedFiles.length > 0 && parsedFiles.every((f) => f.parsedMemberId && f.parsedDate);

  const statusIcons = { pending: AlertCircle, parsing: Loader2, parsed: CheckCircle, error: XCircle } as const;
  const statusColors = { pending: 'text-gray-400', parsing: 'text-primary-500 animate-spin', parsed: 'text-success-500', error: 'text-danger-500' } as const;

  const getStatusText = (file: ImportedFile) => {
    if (file.status === 'parsed') return `${file.parsedIndicators?.length || 0} 项指标`;
    if (file.status === 'error') return file.error;
    if (file.status === 'parsing') return '解析中...';
    return '等待解析';
  };

  const [pastedMemberId, setPastedMemberId] = useState(currentMemberId || '');
  const [pastedDate, setPastedDate] = useState(new Date().toISOString().split('T')[0]);

  const canImportPasted = parseResult && parseResult.indicators.length > 0 && pastedMemberId && pastedDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">导入体检报告</h1>
        {importMode === 'file' && canImport && (
          <button onClick={importAll} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" />
            导入全部 ({parsedFiles.length})
          </button>
        )}
        {importMode === 'paste' && canImportPasted && (
          <button onClick={() => importPasted(pastedMemberId, pastedDate)} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" />
            导入数据
          </button>
        )}
      </div>

      {!hasMembers && (
        <div className="bg-warning-50 border border-warning-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-warning-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-2">请先添加家庭成员</h3>
              <p className="text-gray-600 mb-4">导入体检报告前需要先创建家庭成员档案，以便正确归档数据。</p>
              {!showAddMember ? (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加家庭成员
                </button>
              ) : (
                <div className="bg-white rounded-xl p-4 border border-warning-200">
                  <h4 className="font-medium text-gray-800 mb-3">新增家庭成员</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">姓名</label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="请输入姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">性别</label>
                      <select
                        value={newMemberGender}
                        onChange={(e) => setNewMemberGender(e.target.value as '男' | '女')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">出生日期</label>
                      <input
                        type="date"
                        value={newMemberBirthDate}
                        onChange={(e) => setNewMemberBirthDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddMember(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                      取消
                    </button>
                    <button onClick={handleAddMember} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                      确认添加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => { setImportMode('file'); setParseResult(null); }}
            className={cn(
              'px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2',
              importMode === 'file' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Upload className="w-4 h-4" />
            上传文件
          </button>
          <button
            onClick={() => { setImportMode('paste'); setFiles([]); }}
            className={cn(
              'px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2',
              importMode === 'paste' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <ClipboardPaste className="w-4 h-4" />
            粘贴文本
          </button>
        </div>
      </div>

      {importMode === 'file' ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            )}
          >
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">拖拽文件到此处或点击上传</p>
            <p className="text-sm text-gray-500">支持 TXT 格式，可批量上传多个文件</p>
            <input ref={fileInputRef} type="file" multiple accept=".txt" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800">文件列表</h2>
              {files.map((file) => (
                <div key={file.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-primary-500" />
                      <div>
                        <p className="font-medium text-gray-800">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB · {getStatusText(file)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = statusIcons[file.status]; return <Icon className={cn('w-5 h-5', statusColors[file.status])} />; })()}
                      {file.status === 'parsed' && (
                        <button onClick={() => startEdit(file)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                      <button onClick={() => removeFile(file.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {file.status === 'parsed' && file.parsedIndicators && (
                    <div className="border-t border-gray-100">
                      {editingFileId === file.id ? (
                        <div className="p-4 bg-gray-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <User className="w-4 h-4 inline mr-1" />成员
                              </label>
                              <select value={editMemberId} onChange={(e) => setEditMemberId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />体检日期
                              </label>
                              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={cancelEdit} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
                              <X className="w-4 h-4" />取消
                            </button>
                            <button onClick={() => saveEdit(file.id)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-1">
                              <Check className="w-4 h-4" />保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" />{members.find((m) => m.id === file.parsedMemberId)?.name || '未设置'}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{file.parsedDate || '未设置'}</span>
                            {(!file.parsedMemberId || !file.parsedDate) && (
                              <span className="text-warning-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />请完善成员和日期信息</span>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-200">
                                  <th className="text-left py-2 px-2 font-medium">指标名称</th>
                                  <th className="text-left py-2 px-2 font-medium">数值</th>
                                  <th className="text-left py-2 px-2 font-medium">单位</th>
                                  <th className="text-left py-2 px-2 font-medium">参考范围</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {file.parsedIndicators.map((indicator, index) => (
                                  <tr key={index} className="border-b border-gray-100">
                                    {(['name', 'value', 'unit', 'referenceRange'] as const).map((field) => (
                                      <td key={field} className="py-2 px-2">
                                        <input
                                          type="text"
                                          value={indicator[field]}
                                          onChange={(e) => updateIndicator(file.id, index, field, e.target.value)}
                                          className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
                                        />
                                      </td>
                                    ))}
                                    <td className="py-2 px-2">
                                      <button onClick={() => removeIndicator(file.id, index)} className="p-1 hover:bg-danger-50 rounded text-danger-500">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {!parseResult ? (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">粘贴体检报告文本</h3>
                <p className="text-sm text-gray-500 mb-4">将体检报告中的指标数据粘贴到下方，系统将自动解析。每行一条指标，格式示例：「空腹血糖: 5.6 mmol/L (3.9-6.1)」</p>
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
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim()}
                    className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    解析文本
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {hasMembers && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="w-4 h-4 inline mr-1" />成员
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={pastedMemberId}
                          onChange={(e) => setPastedMemberId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                        </select>
                        <button
                          onClick={() => setShowAddMember(true)}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          title="新增成员"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />体检日期
                      </label>
                      <input
                        type="date"
                        value={pastedDate}
                        onChange={(e) => setPastedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  {parseResult.parsedDate && (
                    <p className="text-sm text-gray-500 mt-2">
                      识别到日期：{parseResult.parsedDate}
                      {parseResult.parsedName && ` · 识别到姓名：${parseResult.parsedName}`}
                    </p>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">解析结果</h3>
                    <p className="text-sm text-gray-500">共 {parseResult.indicators.length} 项指标，可直接编辑修改</p>
                  </div>
                  <button
                    onClick={() => { setParseResult(null); setPastedText(''); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    重新粘贴
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-gray-500">
                        <th className="text-left py-3 px-4 font-medium">指标名称</th>
                        <th className="text-left py-3 px-4 font-medium">数值</th>
                        <th className="text-left py-3 px-4 font-medium">单位</th>
                        <th className="text-left py-3 px-4 font-medium">参考范围</th>
                        <th className="w-10 py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.indicators.map((indicator, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          {(['name', 'value', 'unit', 'referenceRange'] as const).map((field) => (
                            <td key={field} className="py-2 px-4">
                              <input
                                type="text"
                                value={indicator[field]}
                                onChange={(e) => updatePastedIndicator(index, field, e.target.value)}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-4">
                            <button onClick={() => removePastedIndicator(index)} className="p-1 hover:bg-danger-50 rounded text-danger-500">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {showAddMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6">
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
                          <span>{g}</span>
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
                  <button onClick={() => setShowAddMember(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">取消</button>
                  <button onClick={handleAddMember} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">确认添加</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
