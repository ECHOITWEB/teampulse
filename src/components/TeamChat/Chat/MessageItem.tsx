import React, { useState } from 'react';
import { Bot, Edit2, Trash2, MoreVertical, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../../services/chatService';
import { formatMessageTime, isImageFile, isVideoFile, getFileIcon } from '../../../utils/chatUtils';

interface MessageItemProps {
  message: ChatMessage;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onMenuToggle: (messageId: string | null) => void;
  showMenu: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onMenuToggle,
  showMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
    onMenuToggle(null);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (window.confirm('정말 이 메시지를 삭제하시겠습니까?')) {
      onDelete(message.id);
    }
    onMenuToggle(null);
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment, index) => {
          // Use the attachment name if available, otherwise extract from URL
          const fileName = attachment.name || attachment.url.split('/').pop()?.split('?')[0] || 'file';
          // Decode the filename if it's URL encoded
          const displayName = decodeURIComponent(fileName).replace(/^\d+_/, ''); // Remove timestamp prefix
          
          if (isImageFile(displayName)) {
            return (
              <div key={index} className="relative group">
                <img 
                  src={attachment.url} 
                  alt={displayName}
                  className="max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(attachment.url, '_blank')}
                />
                <a
                  href={attachment.url}
                  download={displayName}
                  className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            );
          }
          
          if (isVideoFile(displayName)) {
            return (
              <div key={index} className="relative group">
                <video 
                  controls
                  className="max-w-md rounded-lg"
                  src={attachment.url}
                >
                  <source src={attachment.url} />
                  Your browser does not support the video tag.
                </video>
              </div>
            );
          }
          
          return (
            <a
              key={index}
              href={attachment.url}
              download={displayName}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="text-xl">{getFileIcon(displayName)}</span>
              <span className="text-sm text-gray-700">{displayName}</span>
              <Download className="w-4 h-4 text-gray-500" />
            </a>
          );
        })}
      </div>
    );
  };

  const isAI = message.type === 'ai';
  
  return (
    <div className={`flex items-start gap-3 ${
      message.user_id === currentUserId ? 'flex-row-reverse' : ''
    }`}>
      {message.type === 'system' ? (
        <div className="flex-1 text-center">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {message.content}
          </span>
        </div>
      ) : (
        <>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
            message.user_id === currentUserId 
              ? 'bg-gradient-to-br from-green-500 to-teal-500'
              : isAI
              ? 'bg-gradient-to-br from-blue-500 to-purple-500'
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            {isAI ? (
              <Bot className="w-5 h-5" />
            ) : (
              message.user_name?.charAt(0).toUpperCase()
            )}
          </div>
      
          <div className={`${
            isAI ? 'max-w-[90%]' : 'max-w-[70%]'
          } ${
            message.user_id === currentUserId ? 'items-end' : 'items-start'
          }`}>
            <div className={`flex items-center gap-2 mb-1 ${
              message.user_id === currentUserId ? 'flex-row-reverse' : ''
            }`}>
              <span className="font-semibold text-gray-900 text-sm">
                {isAI ? 'Pulse AI' : 
                 message.user_id === currentUserId ? '나' : message.user_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatMessageTime(message.created_at)}
              </span>
              {message.edited_at && (
                <span className="text-xs text-gray-400">(수정됨)</span>
              )}
            </div>
        
            <div className="relative group">
              <div className={`rounded-lg px-3 py-2 ${
                message.user_id === currentUserId 
                  ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                  : isAI 
                  ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 text-gray-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {isAI ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({children}) => <p className="mb-2">{children}</p>,
                            ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                            li: ({children}) => <li className="mb-1">{children}</li>,
                            code: ({className, children}) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-sm">{children}</code>
                              ) : (
                                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                  <code>{children}</code>
                                </pre>
                              );
                            },
                            blockquote: ({children}) => (
                              <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>
                            ),
                            h1: ({children}) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                            h2: ({children}) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                            h3: ({children}) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                            hr: () => <hr className="my-3 border-gray-300" />,
                            strong: ({children}) => <strong className="font-bold">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className={`whitespace-pre-wrap break-words ${
                        message.user_id === currentUserId ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message.content}
                      </div>
                    )}
                    {renderAttachments()}
                  </>
                )}
              </div>
      
              {/* 메시지 액션 버튼 */}
              {!isEditing && !isAI && (
                <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-lg shadow-sm">
                  {message.user_id === currentUserId && (
                    <button
                      onClick={handleEdit}
                      className="p-1 hover:bg-gray-100"
                      title="수정"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                  {(message.user_id === currentUserId || isAdmin) && (
                    <button
                      onClick={handleDelete}
                      className="p-1 hover:bg-gray-100 text-red-600"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MessageItem;