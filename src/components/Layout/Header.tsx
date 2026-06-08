import { useState, useEffect } from 'react';
import {
  Lock,
  User,
  ChevronDown,
  Bell,
  Calendar,
} from 'lucide-react';
import { useHealthStore } from '../../store';
import { formatDisplayDate, getAge } from '../../utils/dateParser';
import type { FamilyMember } from '../../types';

export function Header() {
  const {
    members,
    currentMemberId,
    setCurrentMember,
    lock,
    reminders,
  } = useHealthStore();

  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [pendingReminders, setPendingReminders] = useState(0);

  const currentMember = members.find((m) => m.id === currentMemberId);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const pending = reminders.filter(
      (r) => !r.isCompleted && r.remindDate <= today
    ).length;
    setPendingReminders(pending);
  }, [reminders]);

  const handleMemberChange = (member: FamilyMember) => {
    setCurrentMember(member.id);
    setShowMemberMenu(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">
          {currentMember ? `${currentMember.name}的健康档案` : '健康管理中心'}
        </h2>
        {currentMember && (
          <span className="text-sm text-gray-500">
            {currentMember.gender === 'male' ? '男' : '女'} · {getAge(currentMember.birthDate)}岁
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {pendingReminders > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 text-warning-600 rounded-full text-sm">
            <Bell className="w-4 h-4" />
            <span>{pendingReminders} 项待办提醒</span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMemberMenu(!showMemberMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
          >
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white ${
                    member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                  } ${member.id === currentMemberId ? 'ring-2 ring-primary-500' : ''}`}
                >
                  {member.name.charAt(0)}
                </div>
              ))}
            </div>
            <User className="w-4 h-4 text-gray-600" />
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showMemberMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-slide-down">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase">选择家庭成员</p>
              </div>
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberChange(member)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    member.id === currentMemberId ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium ${
                    member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                  }`}>
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {member.relationship} · {member.gender === 'male' ? '男' : '女'} · {getAge(member.birthDate)}岁
                    </p>
                  </div>
                  {member.id === currentMemberId && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDisplayDate(new Date().toISOString().split('T')[0])}</span>
        </div>

        <button
          onClick={lock}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
          title="锁定应用"
        >
          <Lock className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
