import React, { useState, useEffect } from 'react';
import { X, Save, Bell, Mail, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationPreference {
  id: number;
  user_id: number;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  digest_frequency: 'immediately' | 'hourly' | 'daily' | 'weekly' | 'never';
}

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationTypeLabels: Record<string, { label: string; description: string; category: string }> = {
  // Goal notifications
  deadline_approaching: {
    label: 'Deadline Approaching',
    description: 'Notify me 3 days before goal deadlines',
    category: 'Goals'
  },
  deadline_today: {
    label: 'Deadline Today',
    description: 'Notify me when goals are due today',
    category: 'Goals'
  },
  deadline_overdue: {
    label: 'Overdue Goals',
    description: 'Notify me when goals become overdue',
    category: 'Goals'
  },
  goal_progress_reminder: {
    label: 'Progress Reminders',
    description: 'Remind me to update goal progress weekly',
    category: 'Goals'
  },
  goal_at_risk: {
    label: 'Goals At Risk',
    description: 'Notify me when goals are at risk of not being completed',
    category: 'Goals'
  },
  goal_status_change: {
    label: 'Status Changes',
    description: 'Notify me when goal statuses change',
    category: 'Goals'
  },
  // Comment notifications
  comment_mention: {
    label: 'Mentions',
    description: 'Notify me when I\'m mentioned in comments',
    category: 'Comments'
  },
  comment_reply: {
    label: 'Comment Replies',
    description: 'Notify me when someone replies to my comments',
    category: 'Comments'
  },
  // Objective notifications
  objective_assigned: {
    label: 'Objective Assignments',
    description: 'Notify me when I\'m assigned new objectives',
    category: 'Objectives'
  },
  objective_completed: {
    label: 'Objective Completions',
    description: 'Notify me when objectives are completed',
    category: 'Objectives'
  },
  key_result_updated: {
    label: 'Key Result Updates',
    description: 'Notify me when key results are updated',
    category: 'Objectives'
  },
  // Task notifications (legacy)
  task_assigned: {
    label: 'Task Assignments',
    description: 'Notify me when I\'m assigned new tasks',
    category: 'Tasks'
  },
  task_completed: {
    label: 'Task Completions',
    description: 'Notify me when tasks are completed',
    category: 'Tasks'
  }
};

const digestFrequencyOptions = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' }
];

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ isOpen, onClose }) => {
  const { user, getToken } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  const fetchPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (notificationType: string, field: keyof NotificationPreference, value: any) => {
    setPreferences(prev => {
      const existingIndex = prev.findIndex(p => p.notification_type === notificationType);
      
      if (existingIndex >= 0) {
        // Update existing preference
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], [field]: value };
        return updated;
      } else {
        // Create new preference
        const newPreference: NotificationPreference = {
          id: 0, // Will be set by server
          user_id: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0),
          notification_type: notificationType,
          in_app_enabled: field === 'in_app_enabled' ? value : true,
          email_enabled: field === 'email_enabled' ? value : false,
          push_enabled: field === 'push_enabled' ? value : false,
          digest_frequency: field === 'digest_frequency' ? value : 'immediately'
        };
        return [...prev, newPreference];
      }
    });
  };

  const getPreference = (notificationType: string): NotificationPreference => {
    const existing = preferences.find(p => p.notification_type === notificationType);
    return existing || {
      id: 0,
      user_id: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0),
      notification_type: notificationType,
      in_app_enabled: true,
      email_enabled: false,
      push_enabled: false,
      digest_frequency: 'immediately'
    };
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Convert preferences array to object format expected by API
      const preferencesObject: Record<string, any> = {};
      
      Object.keys(notificationTypeLabels).forEach(type => {
        const pref = getPreference(type);
        preferencesObject[type] = {
          in_app_enabled: pref.in_app_enabled,
          email_enabled: pref.email_enabled,
          push_enabled: pref.push_enabled,
          digest_frequency: pref.digest_frequency
        };
      });

      const token = await getToken();
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: preferencesObject })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAllInCategory = (category: string, enabled: boolean) => {
    Object.entries(notificationTypeLabels)
      .filter(([_, config]) => config.category === category)
      .forEach(([type, _]) => {
        updatePreference(type, 'in_app_enabled', enabled);
      });
  };

  const groupedNotifications = Object.entries(notificationTypeLabels).reduce((groups, [type, config]) => {
    if (!groups[config.category]) {
      groups[config.category] = [];
    }
    groups[config.category].push([type, config]);
    return groups;
  }, {} as Record<string, Array<[string, typeof notificationTypeLabels[string]]>>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                  <p className="text-gray-600 mt-1">Manage how and when you receive notifications</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading preferences...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedNotifications).map(([category, notifications]) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleAllInCategory(category, true)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Enable All
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => toggleAllInCategory(category, false)}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              Disable All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {notifications.map(([type, config]) => {
                            const pref = getPreference(type);
                            return (
                              <div key={type} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{config.label}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  {/* In-App Notifications */}
                                  <div className="flex items-center space-x-3">
                                    <Bell className="w-5 h-5 text-gray-500" />
                                    <div className="flex-1">
                                      <label className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={pref.in_app_enabled}
                                          onChange={(e) => updatePreference(type, 'in_app_enabled', e.target.checked)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">In-App</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Email Notifications */}
                                  <div className="flex items-center space-x-3">
                                    <Mail className="w-5 h-5 text-gray-500" />
                                    <div className="flex-1">
                                      <label className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={pref.email_enabled}
                                          onChange={(e) => updatePreference(type, 'email_enabled', e.target.checked)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">Email</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Push Notifications */}
                                  <div className="flex items-center space-x-3">
                                    <Smartphone className="w-5 h-5 text-gray-500" />
                                    <div className="flex-1">
                                      <label className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={pref.push_enabled}
                                          onChange={(e) => updatePreference(type, 'push_enabled', e.target.checked)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">Push</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Digest Frequency */}
                                  <div className="flex-1">
                                    <select
                                      value={pref.digest_frequency}
                                      onChange={(e) => updatePreference(type, 'digest_frequency', e.target.value)}
                                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                      disabled={!pref.email_enabled}
                                    >
                                      {digestFrequencyOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {message && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    message.type === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={savePreferences}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPreferences;