import React, { useState } from 'react';
import { X, Hash, Lock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceUser, ChannelType } from '../../../types/chat.types';

interface CreateChannelModalProps {
  show: boolean;
  workspaceUsers: WorkspaceUser[];
  onClose: () => void;
  onCreate: (name: string, description: string, type: ChannelType, memberIds: string[]) => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  show,
  workspaceUsers,
  onClose,
  onCreate
}) => {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('public');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelName.trim()) {
      onCreate(channelName, channelDescription, channelType, selectedMembers);
      // Reset form
      setChannelName('');
      setChannelDescription('');
      setChannelType('public');
      setSelectedMembers([]);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">새 채널 만들기</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* 채널 이름 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채널 이름
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="예: 일반"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={80}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  채널 이름은 소문자로 변환되며 공백 없이 입력해주세요
                </p>
              </div>

              {/* 채널 설명 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명 (선택사항)
                </label>
                <textarea
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="이 채널의 용도를 설명해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={250}
                />
              </div>

              {/* 채널 타입 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  채널 타입
                </label>
                <div className="space-y-2">
                  <label className="block p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="channelType"
                        value="public"
                        checked={channelType === 'public'}
                        onChange={(e) => setChannelType(e.target.value as ChannelType)}
                        className="mt-1 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">공개 채널</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          워크스페이스의 모든 멤버가 참여할 수 있습니다
                        </p>
                      </div>
                    </div>
                  </label>
                  
                  <label className="block p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="channelType"
                        value="private"
                        checked={channelType === 'private'}
                        onChange={(e) => setChannelType(e.target.value as ChannelType)}
                        className="mt-1 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">비공개 채널</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          초대받은 멤버만 참여할 수 있습니다
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 비공개 채널일 때 멤버 선택 */}
              {channelType === 'private' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline w-4 h-4 mr-1" />
                    멤버 초대 (선택사항)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {workspaceUsers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm">{user.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  채널 만들기
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateChannelModal;