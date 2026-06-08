import { useState } from 'react';
import {
  Lock,
  Clock,
  Sun,
  Moon,
  Trash2,
  Database,
  Key,
  AlertTriangle,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { useHealthStore } from '../store';
import { useTheme } from '../hooks/useTheme';


const autoLockOptions = [
  { value: 60, label: '1分钟' },
  { value: 180, label: '3分钟' },
  { value: 300, label: '5分钟' },
  { value: 600, label: '10分钟' },
  { value: 1800, label: '30分钟' },
  { value: 0, label: '永不锁定' },
];

type ModalType = 'password' | 'clear' | 'loadMock' | null;

export default function SettingsPage() {
  const { settings, updateSettings, resetAllData, loadMockData, encryptionKey, changePassword } = useHealthStore();
  const { theme, toggleTheme } = useTheme();

  const [showModal, setShowModal] = useState<ModalType>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const closeModal = () => {
    setShowModal(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError('新密码至少需要6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }
    const success = await changePassword(oldPassword, newPassword);
    if (success) {
      setPasswordSuccess(true);
      showNotification('success', '密码修改成功');
      setTimeout(() => closeModal(), 1500);
    } else {
      setPasswordError('原密码错误');
    }
  };

  const handleAutoLockChange = (value: number) => {
    updateSettings({ autoLockTimeout: value });
    showNotification('success', '自动锁定时间已更新');
  };

  const handleThemeChange = () => {
    toggleTheme();
    updateSettings({ theme: theme === 'light' ? 'dark' : 'light' });
    showNotification('success', '主题已切换');
  };

  const handleClearData = () => {
    resetAllData();
    closeModal();
    showNotification('success', '所有数据已清除');
  };

  const handleLoadMockData = () => {
    loadMockData();
    closeModal();
    showNotification('success', '示例数据已加载');
  };

  const SettingItem = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  );

  const ConfirmModal = ({ title, desc, onConfirm, confirmText, confirmColor }: {
    title: string; desc: string; onConfirm: () => void; confirmText: string; confirmColor: string;
  }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 ${confirmColor.replace('500', '100')} rounded-full flex items-center justify-center`}>
            <AlertTriangle className={`w-6 h-6 ${confirmColor.replace('bg-', 'text-')}`} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{desc}</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className={`px-6 py-2 text-white rounded-xl hover:opacity-90 transition-colors ${confirmColor}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
        <p className="text-gray-500 mt-1">管理应用安全、外观和数据</p>
      </div>

      {notification && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${notification.type === 'success'
          ? 'bg-success-50 text-success-700 border border-success-200'
          : 'bg-danger-50 text-danger-700 border border-danger-200'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-500" />安全设置
            </h2>
            <div className="space-y-4">
              <SettingItem
                icon={<div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><Key className="w-5 h-5 text-primary-500" /></div>}
                title="修改密码"
                desc="定期更换密码以保护数据安全"
                action={<button onClick={() => setShowModal('password')} className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm">修改</button>}
              />
              <SettingItem
                icon={<div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-warning-500" /></div>}
                title="自动锁定时间"
                desc="无操作后自动锁定应用"
                action={
                  <select value={settings.autoLockTimeout} onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 bg-white">
                    {autoLockOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-500" />外观设置
            </h2>
            <SettingItem
              icon={<div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                {theme === 'light' ? <Sun className="w-5 h-5 text-success-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
              </div>}
              title="主题模式"
              desc={`当前：${theme === 'light' ? '浅色模式' : '深色模式'}`}
              action={
                <button onClick={handleThemeChange} className={`relative w-14 h-8 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              }
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-500" />数据管理
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-warning-50 rounded-xl border border-warning-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center"><Database className="w-5 h-5 text-warning-600" /></div>
                  <div>
                    <p className="font-medium text-gray-800">加载示例数据</p>
                    <p className="text-sm text-gray-500">用于体验应用功能</p>
                  </div>
                </div>
                <button onClick={() => setShowModal('loadMock')} className="px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600 transition-colors text-sm">加载</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-danger-50 rounded-xl border border-danger-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center"><Trash2 className="w-5 h-5 text-danger-600" /></div>
                  <div>
                    <p className="font-medium text-gray-800">清除所有数据</p>
                    <p className="text-sm text-gray-500">此操作不可恢复</p>
                  </div>
                </div>
                <button onClick={() => setShowModal('clear')} className="px-4 py-2 bg-danger-500 text-white rounded-xl hover:bg-danger-600 transition-colors text-sm">清除</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">关于应用</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between"><span>应用名称</span><span className="font-medium text-gray-800">健康管理工具</span></div>
              <div className="flex justify-between"><span>版本号</span><span className="font-medium text-gray-800">1.0.0</span></div>
              <div className="flex justify-between"><span>数据加密</span><span className="font-medium text-success-600">AES-256 已启用</span></div>
              <div className="flex justify-between"><span>数据状态</span>
                <span className={`font-medium ${encryptionKey ? 'text-success-600' : 'text-warning-600'}`}>
                  {encryptionKey ? '已解锁' : '已锁定'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal === 'password' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">修改密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">原密码</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                  placeholder="请输入原密码" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">新密码</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                  placeholder="请输入新密码（至少6位）" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">确认新密码</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                  placeholder="请再次输入新密码" />
              </div>
              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 p-3 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />{passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 p-3 rounded-xl">
                  <CheckCircle className="w-4 h-4" />密码修改成功！
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">取消</button>
              <button onClick={handleChangePassword} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">确认修改</button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'clear' && (
        <ConfirmModal title="确认清除数据" desc="您确定要清除所有健康数据吗？包括家庭成员、体检报告、指标数据、用药记录等所有信息。清除后需要重新设置密码。"
          onConfirm={handleClearData} confirmText="确认清除" confirmColor="bg-danger-500" />
      )}

      {showModal === 'loadMock' && (
        <ConfirmModal title="加载示例数据" desc="加载示例数据将覆盖当前所有数据，用于体验应用的各项功能。是否继续？"
          onConfirm={handleLoadMockData} confirmText="确认加载" confirmColor="bg-warning-500" />
      )}
    </div>
  );
}
