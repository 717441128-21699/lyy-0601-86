import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  Database,
  AlertTriangle,
  TrendingUp,
  Bell,
  Users,
  FileDown,
  Settings,
  Heart,
} from 'lucide-react';
import { useHealthStore } from '../../store';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '指标看板' },
  { path: '/import', icon: FileUp, label: '报告导入' },
  { path: '/data', icon: Database, label: '数据管理' },
  { path: '/abnormal', icon: AlertTriangle, label: '异常清单' },
  { path: '/trend', icon: TrendingUp, label: '趋势对比' },
  { path: '/reminders', icon: Bell, label: '提醒管理' },
  { path: '/family', icon: Users, label: '家庭成员' },
  { path: '/export', icon: FileDown, label: '导出打印' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export function Sidebar() {
  const currentMember = useHealthStore((state) => {
    const members = state.members;
    const currentId = state.currentMemberId;
    return members.find((m) => m.id === currentId);
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">健康管理</h1>
            <p className="text-xs text-gray-500">Health Manager</p>
          </div>
        </div>
      </div>

      {currentMember && (
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
              currentMember.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
            }`}>
              {currentMember.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{currentMember.name}</p>
              <p className="text-xs text-gray-500">{currentMember.relationship}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          © 2024 健康管理工具
        </div>
      </div>
    </aside>
  );
}
