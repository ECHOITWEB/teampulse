import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Hash, Users } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Objective } from '../../services/okrService';

interface ShareOKRModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: Objective;
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
  members?: string[];
}

const ShareOKRModal: React.FC<ShareOKRModalProps> = ({ isOpen, onClose, objective }) => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && currentWorkspace?.id) {
      loadChannels();
    }
  }, [isOpen, currentWorkspace?.id]);

  const loadChannels = async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const channelsQuery = query(
        collection(db, 'chat_channels'),
        where('workspace_id', '==', currentWorkspace.id)
      );
      
      const snapshot = await getDocs(channelsQuery);
      const channelsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Channel));
      
      setChannels(channelsList.filter(ch => ch.type !== 'direct'));
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedChannel || !user || !currentWorkspace) return;
    
    setLoading(true);
    try {
      // Create OKR summary message
      const okrSummary = `
📊 **OKR 공유**

**목표**: ${objective.title}
**설명**: ${objective.description || '설명 없음'}
**진행률**: ${objective.progress}%
**기간**: ${objective.period.year}년 ${objective.period.quarter ? `Q${objective.period.quarter}` : '연간'}
**유형**: ${objective.type === 'company' ? '회사' : objective.type === 'team' ? '팀' : '개인'}

${message ? `💬 **메시지**: ${message}` : ''}
      `.trim();

      // Add message to channel
      await addDoc(collection(db, 'chat_messages'), {
        channel_id: selectedChannel,
        sender_id: user.firebase_uid,
        sender_name: user.displayName || 'Unknown User',
        content: okrSummary,
        type: 'okr_share',
        okr_data: {
          objective_id: objective.id,
          title: objective.title,
          progress: objective.progress,
          quarter: objective.period.quarter,
          year: objective.period.year
        },
        created_at: serverTimestamp(),
        workspace_id: currentWorkspace.id
      });

      alert('OKR이 성공적으로 공유되었습니다!');
      onClose();
      setMessage('');
      setSelectedChannel('');
    } catch (error) {
      console.error('Error sharing OKR:', error);
      alert('OKR 공유 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">OKR 공유</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* OKR Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{objective.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{objective.period.year}년 {objective.period.quarter ? `Q${objective.period.quarter}` : '연간'}</span>
                <span>•</span>
                <span>진행률: {objective.progress}%</span>
                <span>•</span>
                <span>유형: {objective.type === 'company' ? '회사' : objective.type === 'team' ? '팀' : '개인'}</span>
              </div>
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공유할 채널 선택
              </label>
              <input
                type="text"
                placeholder="채널 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
              />
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredChannels.length > 0 ? (
                  filteredChannels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 ${
                        selectedChannel === channel.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      {channel.type === 'public' ? (
                        <Hash className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Users className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm">{channel.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-3">채널을 찾을 수 없습니다</p>
                )}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메시지 추가 (선택사항)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="OKR과 함께 공유할 메시지를 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleShare}
              disabled={!selectedChannel || loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {loading ? '공유 중...' : '공유하기'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareOKRModal;