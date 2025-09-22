import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Image as ImageIcon, X, Loader2, Smile, FileText } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Attachment {
  file: File;
  url?: string;
  uploading?: boolean;
  error?: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, attachments: any[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  workspaceId?: string;
  channelId?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "메시지를 입력하세요... (@를 입력하여 멘션, /를 입력하여 명령어)",
  workspaceId,
  channelId
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = files.map(file => ({
      file,
      uploading: true
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsUploading(true);

    // Upload files
    const storage = getStorage();
    const uploadPromises = newAttachments.map(async (attachment, index) => {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${attachment.file.name}`;
        const storagePath = `workspaces/${workspaceId}/channels/${channelId}/attachments/${fileName}`;
        const storageRef = ref(storage, storagePath);
        
        const snapshot = await uploadBytes(storageRef, attachment.file);
        const url = await getDownloadURL(snapshot.ref);
        
        setAttachments(prev => prev.map((a, i) => 
          i === attachments.length + index 
            ? { ...a, url, uploading: false }
            : a
        ));
        
        return { url, name: attachment.file.name, type: attachment.file.type, size: attachment.file.size };
      } catch (error) {
        console.error('File upload error:', error);
        setAttachments(prev => prev.map((a, i) => 
          i === attachments.length + index 
            ? { ...a, uploading: false, error: 'Upload failed' }
            : a
        ));
        return null;
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || isSending || isUploading) return;

    setIsSending(true);
    try {
      const uploadedAttachments = attachments
        .filter(a => a.url && !a.uploading)
        .map(a => ({
          url: a.url,
          name: a.file.name,
          type: a.file.type,
          size: a.file.size
        }));

      await onSendMessage(message, uploadedAttachments);
      
      // Clear input
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  return (
    <div className="border-t bg-white px-4 py-3">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              {isImageFile(attachment.file) ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={URL.createObjectURL(attachment.file)} 
                    alt={attachment.file.name}
                    className="w-full h-full object-cover"
                  />
                  {attachment.uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700 max-w-[100px] truncate">
                    {attachment.file.name}
                  </span>
                  {attachment.uploading && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="absolute right-2 bottom-2 p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>
        
        <button
          onClick={handleSend}
          disabled={disabled || isSending || isUploading || (!message.trim() && attachments.length === 0)}
          className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
      />
    </div>
  );
};

export default ChatInput;