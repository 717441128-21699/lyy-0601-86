import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, X, User, Pill, CheckCircle2, AlertCircle } from 'lucide-react';
import { useHealthStore } from '../store';
import { formatDisplayDate, getAge } from '../utils/dateParser';
import type { FamilyMember, MedicationNote } from '../types';

export default function FamilyPage() {
  const {
    members,
    medications,
    currentMemberId,
    setCurrentMember,
    addMember,
    updateMember,
    deleteMember,
    addMedication,
    updateMedication,
    deleteMedication,
  } = useHealthStore((state) => ({
    members: state.members,
    medications: state.medications,
    currentMemberId: state.currentMemberId,
    setCurrentMember: state.setCurrentMember,
    addMember: state.addMember,
    updateMember: state.updateMember,
    deleteMember: state.deleteMember,
    addMedication: state.addMedication,
    updateMedication: state.updateMedication,
    deleteMedication: state.deleteMedication,
  }));

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(currentMemberId);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editingMedication, setEditingMedication] = useState<MedicationNote | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', gender: 'male' as 'male' | 'female', birthDate: '', relationship: '' });
  const [medicationForm, setMedicationForm] = useState({ medicationName: '', dosage: '', frequency: '', startDate: '', notes: '' });

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberMedications = medications.filter((m) => m.memberId === selectedMemberId);

  const saveMember = () => {
    if (!memberForm.name.trim() || !memberForm.birthDate || !memberForm.relationship) return;
    if (editingMember) updateMember(editingMember.id, memberForm);
    else addMember(memberForm);
    setShowMemberModal(false);
  };

  const saveMedication = () => {
    if (!medicationForm.medicationName.trim() || !selectedMemberId || !medicationForm.startDate) return;
    const data = { ...medicationForm, memberId: selectedMemberId, isActive: true };
    if (editingMedication) updateMedication(editingMedication.id, data);
    else addMedication(data);
    setShowMedicationModal(false);
  };

  const openEditMember = (m: FamilyMember) => { setEditingMember(m); setMemberForm({ name: m.name, gender: m.gender, birthDate: m.birthDate, relationship: m.relationship }); setShowMemberModal(true); };
  const openEditMedication = (med: MedicationNote) => { setEditingMedication(med); setMedicationForm({ medicationName: med.medicationName, dosage: med.dosage, frequency: med.frequency, startDate: med.startDate, notes: med.notes || '' }); setShowMedicationModal(true); };
  const openAddMember = () => { setEditingMember(null); setMemberForm({ name: '', gender: 'male', birthDate: '', relationship: '' }); setShowMemberModal(true); };
  const openAddMedication = () => { if (!selectedMemberId) return; setEditingMedication(null); setMedicationForm({ medicationName: '', dosage: '', frequency: '', startDate: new Date().toISOString().split('T')[0], notes: '' }); setShowMedicationModal(true); };

  const handleDeleteMember = (id: string) => {
    if (confirm('确定删除该家庭成员？相关的所有数据也会被删除。')) {
      deleteMember(id);
      if (selectedMemberId === id) setSelectedMemberId(null);
    }
  };

  const toggleMedicationActive = (med: MedicationNote) => updateMedication(med.id, { isActive: !med.isActive });
  const iconBtn = 'p-2 rounded-lg transition-colors text-gray-400';

  const Modal = ({ title, onClose, children, onSave, disabled }: {
    title: string; onClose: () => void; children: React.ReactNode; onSave: () => void; disabled?: boolean;
  }) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">家庭成员管理</h1>
          <p className="text-gray-500 mt-1">管理家庭成员信息和用药记录</p>
        </div>
        <button onClick={openAddMember} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"><Plus className="w-4 h-4" />添加成员</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-primary-500" />成员列表</h2>
          {members.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无家庭成员</p>
              <button onClick={openAddMember} className="mt-3 text-primary-500 hover:text-primary-600 text-sm">+ 添加第一位成员</button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => { setSelectedMemberId(member.id); setCurrentMember(member.id); }}
                  className={`bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all ${selectedMemberId === member.id ? 'border-primary-500 shadow-lg' : 'border-gray-100 hover:border-primary-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${member.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.relationship} · {getAge(member.birthDate)}岁</p>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditMember(member)} className={`${iconBtn} hover:text-primary-500 hover:bg-primary-50`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteMember(member.id)} className={`${iconBtn} hover:text-danger-500 hover:bg-danger-50`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {currentMemberId === member.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-primary-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />当前选中</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Pill className="w-5 h-5 text-primary-500" />用药备注</h2>
            {selectedMemberId && (
              <button onClick={openAddMedication} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 text-sm">
                <Plus className="w-4 h-4" />添加用药
              </button>
            )}
          </div>
          {!selectedMember ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">请选择一位家庭成员查看用药记录</p>
            </div>
          ) : memberMedications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无用药记录</p>
              <button onClick={openAddMedication} className="mt-3 text-primary-500 hover:text-primary-600 text-sm">+ 添加第一条用药</button>
            </div>
          ) : (
            <div className="space-y-3">
              {memberMedications.map((med) => (
                <div key={med.id} className={`bg-white rounded-2xl p-5 border border-gray-100 ${!med.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Pill className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-800">{med.medicationName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${med.isActive ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-500'}`}>
                            {med.isActive ? '服用中' : '已停用'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{med.dosage} · {med.frequency}</p>
                        <p className="text-xs text-gray-400 mt-1">开始日期：{formatDisplayDate(med.startDate)}</p>
                        {med.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg">{med.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => toggleMedicationActive(med)} className={`${iconBtn} hover:text-success-500 hover:bg-success-50`} title={med.isActive ? '停用' : '启用'}>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditMedication(med)} className={`${iconBtn} hover:text-primary-500 hover:bg-primary-50`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteMedication(med.id)} className={`${iconBtn} hover:text-danger-500 hover:bg-danger-50`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMemberModal && (
        <Modal title={editingMember ? '编辑成员' : '添加家庭成员'} onClose={() => setShowMemberModal(false)} onSave={saveMember} disabled={!memberForm.name.trim() || !memberForm.birthDate || !memberForm.relationship}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
              <input type="text" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="请输入姓名" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">性别</label>
              <div className="flex gap-3">
                {['male', 'female'].map((g) => (
                  <button key={g} type="button" onClick={() => setMemberForm({ ...memberForm, gender: g as 'male' | 'female' })} className={`flex-1 py-3 rounded-xl border-2 transition-colors ${memberForm.gender === g ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {g === 'male' ? '男' : '女'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">出生日期</label>
              <input type="date" value={memberForm.birthDate} onChange={(e) => setMemberForm({ ...memberForm, birthDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">与本人关系</label>
              <input type="text" value={memberForm.relationship} onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="如：本人、配偶、父亲、母亲等" />
            </div>
          </div>
        </Modal>
      )}

      {showMedicationModal && (
        <Modal title={editingMedication ? '编辑用药' : '添加用药记录'} onClose={() => setShowMedicationModal(false)} onSave={saveMedication} disabled={!medicationForm.medicationName.trim() || !medicationForm.startDate}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">药品名称</label>
              <input type="text" value={medicationForm.medicationName} onChange={(e) => setMedicationForm({ ...medicationForm, medicationName: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="请输入药品名称" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">剂量</label>
                <input type="text" value={medicationForm.dosage} onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="如：5mg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服用频率</label>
                <input type="text" value={medicationForm.frequency} onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="如：每日1次" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input type="date" value={medicationForm.startDate} onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
              <textarea value={medicationForm.notes} onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="添加用药备注..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
