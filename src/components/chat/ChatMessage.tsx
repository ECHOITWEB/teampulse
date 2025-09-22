import React from 'react';
import { Bot, FileText, Image as ImageIcon, File } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Attachment {
  url: string;
  name?: string;
  type?: string;
  size?: number;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: any;
  type: 'user' | 'ai' | 'system';
  ai_model?: string;
  attachments?: Attachment[];
}

interface ChatMessageProps {
  message: ChatMessage;
  onImageClick?: (url: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onImageClick }) => {
  const { user } = useAuth();
  
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  return (
    <div className={`flex gap-3 px-4 py-3 hover:bg-gray-50 ${
      message.type === 'system' ? 'justify-center' : ''
    }`}>
      {message.type === 'system' ? (
        <div className="text-sm text-gray-500 italic">
          {message.content}
        </div>
      ) : (
        <>
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
              message.type === 'ai' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}>
              {message.type === 'ai' ? (
                <Bot className="w-5 h-5" />
              ) : (
                message.user_name?.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">
                {message.type === 'ai' ? 'Pulse AI' : 
                 message.user_id === user?.firebase_uid ? '나' : message.user_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </span>
              {message.ai_model && (
                <span className="text-xs text-purple-600 font-medium">
                  {message.ai_model}
                </span>
              )}
            </div>
            
            {/* Message Content */}
            <div className="text-gray-700 whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index}>
                    {isImageFile(attachment.name || '') || attachment.type === 'image' ? (
                      <div 
                        className="inline-block cursor-pointer"
                        onClick={() => onImageClick?.(attachment.url)}
                      >
                        <img 
                          src={attachment.url} 
                          alt={attachment.name || 'Image'}
                          className="max-w-sm rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                        />
                      </div>
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">
                          {attachment.name || 'File'}
                        </span>
                        {attachment.size && (
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.size)})
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatMessage;