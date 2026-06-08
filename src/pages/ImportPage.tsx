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
} from 'lucide-react';
import { useHealthStore } from '../store';
import type { ImportedFile, ParsedIndicator, HealthIndicator } from '../types';
import { parseTextContent, findStandardName, parseReferenceRange, determineStatus } from '../utils/indicatorParser';
import { extractDate, extractNameFromFilename } from '../utils/dateParser';
import { cn } from '../lib/utils';

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState('');
  const [editDate, setEditDate] = useState('');

  const { members, currentMemberId, addReport, addIndicators, dictionary } = useHealthStore(
    (state) => ({
      members: state.members,
      currentMemberId: state.currentMemberId,
      addReport: state.addReport,
      addIndicators: state.addIndicators,
      dictionary: state.dictionary,
    })
  );

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
  const removeIndicator = (fileId: string, index: number) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId || !f.parsedIndicators) return f;
      return { ...f, parsedIndicators: f.parsedIndicators.filter((_, i) => i !== index) };
    }));
  };
  const importAll = () => {
    const parsedFiles = files.filter((f) => f.status === 'parsed' && f.parsedIndicators);
    for (const file of parsedFiles) {
      if (!file.parsedMemberId || !file.parsedDate || !file.parsedIndicators) continue;
      const reportId = addReport({ memberId: file.parsedMemberId, examDate: file.parsedDate, hospital: '导入报告', reportType: '体检报告', sourceFileName: file.name });
      const indicators: Array<Omit<HealthIndicator, 'id'>> = file.parsedIndicators.map((pi) => {
        const dictItem = findStandardName(pi.name, dictionary);
        const numericValue = parseFloat(pi.value);
        const { minValue, maxValue } = parseReferenceRange(pi.referenceRange || dictItem?.defaultReference || '');
        const { status, isAbnormal } = determineStatus(isNaN(numericValue) ? undefined : numericValue, minValue, maxValue);
        return {
          reportId,
          memberId: file.parsedMemberId!,
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
          examDate: file.parsedDate!,
        };
      });
      addIndicators(indicators);
    }
    navigate('/dashboard');
  };

  const parsedFiles = useMemo(() => files.filter((f) => f.status === 'parsed'), [files]);
  const canImport = parsedFiles.length > 0;

  const statusIcons = { pending: AlertCircle, parsing: Loader2, parsed: CheckCircle, error: XCircle } as const;
  const statusColors = { pending: 'text-gray-400', parsing: 'text-primary-500 animate-spin', parsed: 'text-success-500', error: 'text-danger-500' } as const;

  const getStatusText = (file: ImportedFile) => {
    if (file.status === 'parsed') return `${file.parsedIndicators?.length || 0} 项指标`;
    if (file.status === 'error') return file.error;
    if (file.status === 'parsing') return '解析中...';
    return '等待解析';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">导入体检报告</h1>
        {canImport && (
          <button onClick={importAll} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" />
            导入全部 ({parsedFiles.length})
          </button>
        )}
      </div>

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
    </div>
  );
}
