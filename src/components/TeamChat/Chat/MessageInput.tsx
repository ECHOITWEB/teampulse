import React, { useRef } from 'react';
import { Send, Paperclip, Smile, X, Bot } from 'lucide-react';
import { FilePreview } from '../../../types/chat.types';
import { isImageFile, isVideoFile, getFileIcon } from '../../../utils/chatUtils';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (files: FileList) => void;
  onFileRemove: (index: number) => void;
  onAIInvite: () => void;
  uploadedFiles: File[];
  filePreview: FilePreview[];
  isUploading: boolean;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onFileSelect,
  onFileRemove,
  onAIInvite,
  uploadedFiles,
  filePreview,
  isUploading,
  placeholder = "메시지를 입력하세요...",
  onKeyDown,
  inputRef
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localInputRef;
  const isComposingRef = useRef(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mac에서 한글 입력 중 composition 이벤트 처리
    // isComposing이 true면 한글/중국어/일본어 등 조합 중인 상태
    if (e.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !e.defaultPrevented) {
      e.preventDefault();
      onSend();
    }
  };
  
  // IME composition 이벤트 핸들러 (Mac 한글 입력 등)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // 최대 10개 파일 제한
      const currentCount = uploadedFiles.length;
      const newFiles = Array.from(e.target.files).slice(0, 10 - currentCount);
      if (newFiles.length > 0) {
        const fileList = new DataTransfer();
        newFiles.forEach(file => fileList.items.add(file));
        onFileSelect(fileList.files);
      } else if (currentCount >= 10) {
        alert('최대 10개의 파일만 첨부할 수 있습니다.');
      }
    }
  };

  // 붙여넣기 이벤트 처리
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    
    // 클립보드 아이템에서 이미지 파일 추출
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // 파일명 생성 (현재 시간 기반)
          const timestamp = new Date().getTime();
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `paste-image-${timestamp}-${i}.${extension}`, {
            type: file.type
          });
          imageFiles.push(newFile);
        }
      }
    }
    
    // 이미지가 있으면 파일 선택 처리
    if (imageFiles.length > 0) {
      e.preventDefault(); // 기본 붙여넣기 동작 방지 (이미지인 경우)
      
      // 현재 업로드된 파일 개수 확인
      const currentCount = uploadedFiles.length;
      const remainingSlots = 10 - currentCount;
      
      if (remainingSlots <= 0) {
        alert('최대 10개의 파일만 첨부할 수 있습니다.');
        return;
      }
      
      // 남은 슬롯만큼만 추가
      const filesToAdd = imageFiles.slice(0, remainingSlots);
      
      // FileList 생성
      const dataTransfer = new DataTransfer();
      filesToAdd.forEach(file => dataTransfer.items.add(file));
      
      // 파일 선택 콜백 호출
      onFileSelect(dataTransfer.files);
      
      if (imageFiles.length > remainingSlots) {
        alert(`최대 10개 제한으로 ${imageFiles.length - remainingSlots}개의 이미지가 제외되었습니다.`);
      }
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {/* 파일 미리보기 */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              첨부 파일 ({uploadedFiles.length}/10)
            </span>
            {uploadedFiles.length === 10 && (
              <span className="text-xs text-orange-500">최대 첨부 개수에 도달했습니다</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative group">
                {filePreview[index] && isImageFile(file.name) ? (
                  <div className="relative">
                    <img
                      src={filePreview[index].url}
                      alt={file.name}
                      className="h-20 w-20 object-cover rounded-lg border-2 border-gray-300 hover:border-blue-400 transition-colors"
                      title={file.name}
                    />
                    <button
                      onClick={() => onFileRemove(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {/* 이미지 번호 표시 */}
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
              ) : (
                <div className="relative flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                  <span className="text-xl">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => onFileRemove(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      )}

      {/* 입력 필드 */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            
            {/* 액션 버튼들 */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.xml,.zip,.rar"
              />
              
              <button
                onClick={handleFileClick}
                disabled={isUploading}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="파일 첨부"
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
              </button>
              
              <button
                onClick={onAIInvite}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="AI 어시스턴트"
              >
                <Bot className="w-4 h-4 text-gray-500" />
              </button>
              
              <button
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="이모지"
              >
                <Smile className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            onSend();
          }}
          disabled={(!value.trim() && uploadedFiles.length === 0) || isUploading}
          className={`p-2 rounded-lg transition-colors ${
            value.trim() || uploadedFiles.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      
      {/* 업로딩 상태 */}
      {isUploading && (
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          파일 업로드 중...
        </div>
      )}
      
      {/* 힌트 */}
      <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>로 전송, 
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded ml-1">Shift + Enter</kbd>로 줄바꿈
        </span>
        <span className="text-gray-300">•</span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl/Cmd + V</kbd>로 이미지 붙여넣기 (최대 10개)
        </span>
      </div>
    </div>
  );
};

export default MessageInput;