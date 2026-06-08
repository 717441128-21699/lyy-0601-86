import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Lock,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { useHealthStore, checkAppInitialized } from '../store';
import { hasPasswordHash } from '../utils/encryption';

export default function LoginPage() {
  const navigate = useNavigate();
  const { unlock, initialize, loadMockData, isLocked } = useHealthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoOption, setShowDemoOption] = useState(false);

  useEffect(() => {
    const initialized = checkAppInitialized();
    const hasPwd = hasPasswordHash();
    setIsNewUser(!initialized && !hasPwd);
    setShowDemoOption(!hasPwd);

    if (!isLocked && initialized) {
      navigate('/');
    }
  }, [navigate, isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isNewUser) {
        if (password.length < 6) {
          setError('密码长度至少6位');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setIsLoading(false);
          return;
        }
        const success = await initialize(password);
        if (success) {
          navigate('/family');
        } else {
          setError('初始化失败，请重试');
        }
      } else {
        const success = await unlock(password);
        if (success) {
          navigate('/');
        } else {
          setError('密码错误，请重试');
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = () => {
    loadMockData();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl shadow-xl shadow-primary-500/30 mb-6">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">健康管理中心</h1>
          <p className="text-gray-500">
            {isNewUser ? '创建您的健康档案' : '请输入密码解锁'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {showDemoOption && (
            <button
              onClick={handleLoadDemo}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 mb-6 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:shadow-lg hover:shadow-success-500/30 transition-all duration-300"
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">加载示例数据体验</span>
            </button>
          )}

          {showDemoOption && (
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">或</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isNewUser ? '设置密码' : '访问密码'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isNewUser ? '请设置6位以上密码' : '请输入密码'}
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isNewUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-danger-500 text-sm bg-danger-50 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isNewUser && (
              <div className="flex items-start gap-3 text-sm text-gray-600 bg-primary-50 px-4 py-3 rounded-xl">
                <Shield className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-700">数据安全保障</p>
                  <p className="text-primary-600 text-xs mt-1">
                    您的数据将使用AES加密存储在本地浏览器，不会上传到任何服务器。请妥善保管密码，丢失后无法找回。
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isNewUser ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>创建账户</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span>解锁访问</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          {isNewUser
            ? '创建密码即表示您同意本地存储您的健康数据'
            : '数据安全存储在本地，隐私有保障'}
        </p>
      </div>
    </div>
  );
}

function Unlock(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}
