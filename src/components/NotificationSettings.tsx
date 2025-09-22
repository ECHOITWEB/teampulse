import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, BellOff, MessageSquare, Users, Target, Calendar, 
  CheckSquare, AtSign, Volume2, VolumeX, Smartphone,
  Clock, AlertCircle
} from 'lucide-react';
import notificationService, { NotificationSettings as INotificationSettings } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<INotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (user) {
      loadSettings();
      checkPermission();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userSettings = await notificationService.getUserSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setPermission('granted');
      // Enable notifications if permission granted
      if (settings && !settings.enabled && user) {
        await handleToggle('enabled', true);
      }
    } else {
      setPermission('denied');
    }
  };

  const handleToggle = async (key: keyof INotificationSettings, value: boolean) => {
    if (!user || !settings) return;

    // If turning on main notifications, check permission first
    if (key === 'enabled' && value && permission !== 'granted') {
      await requestPermission();
      if (Notification.permission !== 'granted') {
        return;
      }
    }

    setSaving(true);
    const newSettings = { ...settings, [key]: value };
    
    // If disabling main toggle, disable all
    if (key === 'enabled' && !value) {
      Object.keys(newSettings).forEach(k => {
        if (k !== 'enabled') {
          (newSettings as any)[k] = false;
        }
      });
    }

    setSettings(newSettings);

    try {
      await notificationService.saveUserSettings(user.id, newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">알림 설정을 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">알림 설정</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  알림을 받고 싶은 항목을 선택하세요
                </p>
              </div>
            </div>
            
            {/* Permission Status */}
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <Smartphone className="w-4 h-4" />
                  알림 허용됨
                </span>
              ) : permission === 'denied' ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  <BellOff className="w-4 h-4" />
                  알림 차단됨
                </span>
              ) : (
                <button
                  onClick={requestPermission}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  알림 권한 요청
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Toggle */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <Bell className="w-5 h-5 text-blue-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h3 className="font-medium text-gray-900">브라우저 알림</h3>
                <p className="text-sm text-gray-500">모든 알림을 켜거나 끕니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.enabled}
                onChange={(e) => handleToggle('enabled', e.target.checked)}
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Notification Types */}
        <div className="p-6 space-y-6">
          {/* Chat Messages */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">채팅 메시지</h4>
                <p className="text-sm text-gray-500">새로운 채팅 메시지가 올 때 알림</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.chat_messages}
                onChange={(e) => handleToggle('chat_messages', e.target.checked)}
                disabled={!settings.enabled || saving}
              />
              <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Direct Messages */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">다이렉트 메시지</h4>
                <p className="text-sm text-gray-500">DM을 받을 때 알림</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.direct_messages}
                onChange={(e) => handleToggle('direct_messages', e.target.checked)}
                disabled={!settings.enabled || saving}
              />
              <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Mentions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">멘션</h4>
                <p className="text-sm text-gray-500">누군가 나를 멘션할 때 알림</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.mentions}
                onChange={(e) => handleToggle('mentions', e.target.checked)}
                disabled={!settings.enabled || saving}
              />
              <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Goal Updates */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">목표 업데이트</h4>
                <p className="text-sm text-gray-500">목표 진행률이 변경될 때 알림</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.goal_updates}
                onChange={(e) => handleToggle('goal_updates', e.target.checked)}
                disabled={!settings.enabled || saving}
              />
              <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Meeting Reminders Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">회의 알림</h4>
                  <p className="text-sm text-gray-500">회의 시작 전 알림</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.meeting_reminders}
                  onChange={(e) => handleToggle('meeting_reminders', e.target.checked)}
                  disabled={!settings.enabled || saving}
                />
                <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>

            {/* Meeting reminder options */}
            {settings.meeting_reminders && (
              <div className="ml-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">5분 전 알림</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.meeting_5min_reminder}
                      onChange={(e) => handleToggle('meeting_5min_reminder', e.target.checked)}
                      disabled={!settings.enabled || !settings.meeting_reminders || saving}
                    />
                    <div className={`w-11 h-6 ${!settings.enabled || !settings.meeting_reminders ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">15분 전 알림</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.meeting_15min_reminder}
                      onChange={(e) => handleToggle('meeting_15min_reminder', e.target.checked)}
                      disabled={!settings.enabled || !settings.meeting_reminders || saving}
                    />
                    <div className={`w-11 h-6 ${!settings.enabled || !settings.meeting_reminders ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Task Assignments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">작업 할당</h4>
                <p className="text-sm text-gray-500">새로운 작업이 할당될 때 알림</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.task_assignments}
                onChange={(e) => handleToggle('task_assignments', e.target.checked)}
                disabled={!settings.enabled || saving}
              />
              <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Sound Settings */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.sound_enabled ? (
                  <Volume2 className="w-5 h-5 text-gray-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">알림 소리</h4>
                  <p className="text-sm text-gray-500">알림이 올 때 소리 재생</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.sound_enabled}
                  onChange={(e) => handleToggle('sound_enabled', e.target.checked)}
                  disabled={!settings.enabled || saving}
                />
                <div className={`w-11 h-6 ${!settings.enabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saving && (
          <div className="px-6 pb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              저장 중...
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;