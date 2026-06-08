import { useState } from 'react';
import { Stethoscope, Calendar, CheckCircle2, Clock, Plus, Edit2, Trash2, X, Bell, AlertCircle } from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate } from '../utils/dateParser';
import type { DoctorAdvice, FollowUpReminder } from '../types';

export default function RemindersPage() {
  const {
    currentMemberId,
    members,
    advices,
    reminders,
    addAdvice,
    updateAdvice,
    deleteAdvice,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useHealthStore((state) => ({
    currentMemberId: state.currentMemberId,
    members: state.members,
    advices: state.advices.filter((a) => a.memberId === state.currentMemberId),
    reminders: state.reminders.filter((r) => r.memberId === state.currentMemberId),
    addAdvice: state.addAdvice,
    updateAdvice: state.updateAdvice,
    deleteAdvice: state.deleteAdvice,
    addReminder: state.addReminder,
    updateReminder: state.updateReminder,
    deleteReminder: state.deleteReminder,
  }));

  const [activeTab, setActiveTab] = useState<'advices' | 'calendar' | 'todos'>('advices');
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<DoctorAdvice | null>(null);
  const [editingReminder, setEditingReminder] = useState<FollowUpReminder | null>(null);
  const [adviceForm, setAdviceForm] = useState({ content: '' });
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', remindDate: new Date().toISOString().split('T')[0] });

  const currentMember = members.find((m) => m.id === currentMemberId);
  const pending = reminders.filter((r) => !r.isCompleted);
  const completed = reminders.filter((r) => r.isCompleted);

  const saveAdvice = () => {
    if (!adviceForm.content.trim() || !currentMemberId) return;
    if (editingAdvice) updateAdvice(editingAdvice.id, { content: adviceForm.content });
    else addAdvice({ memberId: currentMemberId, content: adviceForm.content, dateRecorded: new Date().toISOString().split('T')[0] });
    setShowAdviceModal(false);
  };

  const saveReminder = () => {
    if (!reminderForm.title.trim() || !currentMemberId) return;
    const data = { title: reminderForm.title, description: reminderForm.description, remindDate: reminderForm.remindDate };
    if (editingReminder) updateReminder(editingReminder.id, data);
    else addReminder({ ...data, memberId: currentMemberId, isCompleted: false });
    setShowReminderModal(false);
  };

  const openEditAdvice = (advice: DoctorAdvice) => { setEditingAdvice(advice); setAdviceForm({ content: advice.content }); setShowAdviceModal(true); };
  const openEditReminder = (reminder: FollowUpReminder) => { setEditingReminder(reminder); setReminderForm({ title: reminder.title, description: reminder.description || '', remindDate: reminder.remindDate }); setShowReminderModal(true); };
  const openAddAdvice = () => { setEditingAdvice(null); setAdviceForm({ content: '' }); setShowAdviceModal(true); };
  const openAddReminder = () => { setEditingReminder(null); setReminderForm({ title: '', description: '', remindDate: new Date().toISOString().split('T')[0] }); setShowReminderModal(true); };
  const toggleComplete = (id: string, isCompleted: boolean) => updateReminder(id, { isCompleted: !isCompleted });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getRemindersForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reminders.filter((r) => r.remindDate === dateStr);
  };

  const tabs = [{ key: 'advices', label: '医生建议', icon: Stethoscope }, { key: 'calendar', label: '复查日历', icon: Calendar }, { key: 'todos', label: '待办提醒', icon: Clock }];
  const iconBtn = 'p-2 rounded-lg transition-colors text-gray-400';

  const Modal = ({ title, onClose, children, onSave, disabled }: { title: string; onClose: () => void; children: React.ReactNode; onSave: () => void; disabled?: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        {children}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">取消</button>
          <button onClick={onSave} disabled={disabled} className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );

  if (!currentMember) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Bell className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-2">请先选择家庭成员</h2>
      <p className="text-gray-400">选择家庭成员后即可管理提醒事项</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">提醒管理</h1>
          <p className="text-gray-500 mt-1">管理 {currentMember.name} 的医生建议和复查提醒</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddAdvice} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"><Plus className="w-4 h-4" />添加建议</button>
          <button onClick={openAddReminder} className="flex items-center gap-2 px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600"><Plus className="w-4 h-4" />添加提醒</button>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-100 w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'advices' && (
        <div className="space-y-4">
          {advices.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无医生建议</p>
              <button onClick={openAddAdvice} className="mt-4 text-primary-500 hover:text-primary-600">+ 添加第一条建议</button>
            </div>
          ) : (
            advices.map((advice) => (
              <div key={advice.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0"><Stethoscope className="w-6 h-6 text-warning-600" /></div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed">{advice.content}</p>
                      <p className="text-sm text-gray-400 mt-3">{formatDisplayDate(advice.dateRecorded)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditAdvice(advice)} className={`${iconBtn} hover:text-primary-500 hover:bg-primary-50`}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteAdvice(advice.id)} className={`${iconBtn} hover:text-danger-500 hover:bg-danger-50`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">{year}年 {monthNames[month]}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning-500" />待复查</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success-500" />已完成</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">{day}</div>)}
            {days.map((day, index) => {
              if (day === null) return <div key={index} />;
              const dayReminders = getRemindersForDay(day);
              const hasReminders = dayReminders.length > 0;
              const allDone = dayReminders.length > 0 && dayReminders.every((r) => r.isCompleted);
              const isToday = day === new Date().getDate();
              return (
                <div key={index} className={`aspect-square p-1 rounded-xl ${isToday ? 'bg-primary-50 ring-2 ring-primary-500' : 'hover:bg-gray-50'}`}>
                  <div className={`w-full h-full flex flex-col items-center justify-center rounded-lg ${isToday ? 'font-bold text-primary-600' : 'text-gray-700'}`}>
                    <span className="text-sm">{day}</span>
                    {hasReminders && <div className={`w-2 h-2 rounded-full mt-1 ${allDone ? 'bg-success-500' : 'bg-warning-500'}`} />}
                  </div>
                </div>
              );
            })}
          </div>
          {pending.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-warning-500" />即将到来</h3>
              <div className="space-y-2">
                {pending.sort((a, b) => a.remindDate.localeCompare(b.remindDate)).slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-warning-50 rounded-xl">
                    <div><p className="font-medium text-gray-800">{r.title}</p><p className="text-xs text-gray-500">{formatDisplayDate(r.remindDate)}</p></div>
                    <button onClick={() => toggleComplete(r.id, r.isCompleted)} className="p-2 text-warning-500 hover:bg-warning-100 rounded-lg"><CheckCircle2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'todos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-warning-500" />待处理 ({pending.length})</h2>
            {pending.length === 0 ? <p className="text-gray-400 text-center py-8">暂无待办提醒</p> : (
              <div className="space-y-3">
                {pending.sort((a, b) => a.remindDate.localeCompare(b.remindDate)).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleComplete(r.id, r.isCompleted)} className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-success-500 flex items-center justify-center" />
                      <div>
                        <p className="font-medium text-gray-800">{r.title}</p>
                        {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                        <p className="text-xs text-warning-500 mt-1">{formatDisplayDate(r.remindDate)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditReminder(r)} className={`${iconBtn} hover:text-primary-500 hover:bg-primary-50`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteReminder(r.id)} className={`${iconBtn} hover:text-danger-500 hover:bg-danger-50`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {completed.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success-500" />已完成 ({completed.length})</h2>
              <div className="space-y-3">
                {completed.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-success-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleComplete(r.id, r.isCompleted)} className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></button>
                      <div><p className="font-medium text-gray-500 line-through">{r.title}</p><p className="text-xs text-gray-400">{formatDisplayDate(r.remindDate)}</p></div>
                    </div>
                    <button onClick={() => deleteReminder(r.id)} className={`${iconBtn} hover:text-danger-500 hover:bg-danger-50`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdviceModal && (
        <Modal title={editingAdvice ? '编辑建议' : '添加医生建议'} onClose={() => setShowAdviceModal(false)} onSave={saveAdvice} disabled={!adviceForm.content.trim()}>
          <label className="block text-sm font-medium text-gray-700 mb-2">建议内容</label>
          <textarea value={adviceForm.content} onChange={(e) => setAdviceForm({ content: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="请输入医生建议内容..." />
        </Modal>
      )}

      {showReminderModal && (
        <Modal title={editingReminder ? '编辑提醒' : '添加复查提醒'} onClose={() => setShowReminderModal(false)} onSave={saveReminder} disabled={!reminderForm.title.trim()}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">提醒标题</label>
              <input type="text" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="例如：血压复查" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">提醒日期</label>
              <input type="date" value={reminderForm.remindDate} onChange={(e) => setReminderForm({ ...reminderForm, remindDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
              <textarea value={reminderForm.description} onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="添加详细描述..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
