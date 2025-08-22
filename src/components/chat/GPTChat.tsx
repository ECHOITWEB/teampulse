// GPTChat.tsx - OpenAI GPT model specific chat component
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChatComponent, 
  Message, 
  MessageContent, 
  Attachment, 
  TokenUsage, 
  ChatConfig,
  ModelInfo,
  ChatComponentProps
} from '../../interfaces/ChatInterface';
import { marked } from 'marked';
// import hljs from 'highlight.js';
// import 'highlight.js/styles/github-dark.css';

// Configure marked for syntax highlighting
marked.setOptions({
  breaks: true,
  gfm: true
} as any);

class GPTChatService extends ChatComponent {
  private model: string;
  private apiEndpoint: string;

  constructor(model: string) {
    super();
    this.model = model;
    this.apiEndpoint = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  async sendMessage(
    content: string, 
    attachments?: Attachment[], 
    config?: ChatConfig
  ): Promise<Message> {
    // Determine if this is a GPT-5 model
    const isGPT5 = this.model.includes('gpt-5');
    
    // Prepare request body with appropriate parameters
    const requestBody: any = {
      command: 'ai',
      prompt: content,
      model: this.model,
      attachments: attachments,
      ...config
    };
    
    // Add GPT-5 specific parameters
    if (isGPT5) {
      // Auto-detect reasoning effort and verbosity from content
      if (content.toLowerCase().includes('quick') || content.toLowerCase().includes('brief')) {
        requestBody.reasoningEffort = 'low';
        requestBody.textVerbosity = 'low';
      } else if (content.toLowerCase().includes('detailed') || content.toLowerCase().includes('comprehensive')) {
        requestBody.reasoningEffort = 'high';
        requestBody.textVerbosity = 'high';
      } else if (content.toLowerCase().includes('debug') || content.toLowerCase().includes('fix')) {
        requestBody.reasoningEffort = 'high';
        requestBody.textVerbosity = 'medium';
      } else {
        requestBody.reasoningEffort = (config as any)?.reasoningEffort || 'medium';
        requestBody.textVerbosity = (config as any)?.textVerbosity || 'medium';
      }
    }
    
    const response = await fetch(`${this.apiEndpoint}/api/chat/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatResponse(data);
  }

  async streamMessage(
    content: string,
    attachments?: Attachment[],
    config?: ChatConfig,
    onChunk?: (chunk: string) => void
  ): Promise<Message> {
    // Implement streaming for GPT models
    const response = await fetch(`${this.apiEndpoint}/api/chat/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        command: 'ai',
        prompt: content,
        model: this.model,
        attachments: attachments,
        stream: true,
        ...config
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullContent += chunk;
        if (onChunk) onChunk(chunk);
      }
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date(),
      model: this.model,
      isStreaming: false
    };
  }

  formatResponse(response: any): Message {
    const content = response.data?.content || response.content || '';
    const usage = response.data?.usage || response.usage;
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: content,
      timestamp: new Date(),
      model: this.model,
      usage: usage ? {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
        cost: this.calculateCost(usage)
      } : undefined
    };
  }

  estimateTokens(content: string, attachments?: Attachment[]): number {
    // GPT token estimation: ~1 token per 4 characters (English), ~2-3 chars (Korean)
    const koreanChars = (content.match(/[가-힣]/g) || []).length;
    const otherChars = content.length - koreanChars;
    
    let tokens = Math.ceil(koreanChars / 2.5) + Math.ceil(otherChars / 4);
    
    // Add tokens for attachments
    if (attachments) {
      attachments.forEach(att => {
        if (att.type.startsWith('image/')) {
          tokens += 85 + 1000; // Base overhead + image tokens
        } else if (att.type.includes('text')) {
          tokens += 100; // Text file overhead
        }
      });
    }
    
    return tokens;
  }

  calculateCost(usage: TokenUsage): number {
    const modelPricing = this.getModelInfo().pricing;
    const inputCost = (usage.inputTokens / 10000) * modelPricing.input;
    const outputCost = (usage.outputTokens / 10000) * modelPricing.output;
    return inputCost + outputCost;
  }

  getModelInfo(): ModelInfo {
    const modelInfoMap: Record<string, ModelInfo> = {
      'gpt-5': {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        contextWindow: 272000,
        maxOutput: 128000,
        supportedFeatures: ['text', 'vision', 'code', 'web-search', 'canvas'],
        pricing: { input: 0.375, output: 3.0 }
      },
      'gpt-5-mini': {
        id: 'gpt-5-mini',
        name: 'GPT-5-mini',
        provider: 'openai',
        contextWindow: 272000,
        maxOutput: 128000,
        supportedFeatures: ['text', 'vision', 'code', 'web-search'],
        pricing: { input: 0.075, output: 0.6 }
      },
      'gpt-5-nano': {
        id: 'gpt-5-nano',
        name: 'GPT-5-nano',
        provider: 'openai',
        contextWindow: 272000,
        maxOutput: 128000,
        supportedFeatures: ['text', 'vision', 'code'],
        pricing: { input: 0.015, output: 0.12 }
      },
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'code', 'web-search'],
        pricing: { input: 0.075, output: 0.30 }
      },
      'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o-mini',
        provider: 'openai',
        contextWindow: 128000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'code'],
        pricing: { input: 0.0045, output: 0.018 }
      }
    };
    
    return modelInfoMap[this.model] || modelInfoMap['gpt-4o-mini'];
  }

  supportsFeature(feature: string): boolean {
    return this.getModelInfo().supportedFeatures.includes(feature);
  }
}

interface GPTChatProps extends ChatComponentProps {
  showCanvas?: boolean;
}

const GPTChat: React.FC<GPTChatProps> = ({
  workspaceId,
  channelId,
  userId,
  model,
  onMessage,
  onError,
  onTokenUsage,
  showCanvas = true
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [canvasContent, setCanvasContent] = useState<any>(null);
  const chatService = useRef(new GPTChatService(model));
  const streamingRef = useRef<string>('');

  const renderStructuredContent = (content: string | MessageContent[]) => {
    if (typeof content === 'string') {
      // Parse markdown and render structured content
      const html = marked.parse(content) as string;
      
      // Check for code blocks that might be canvas content
      const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g);
      if (codeBlocks && showCanvas) {
        codeBlocks.forEach(block => {
          const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
          if (match) {
            const lang = match[1] || 'text';
            const code = match[2];
            
            // If it's HTML/CSS/JS, render in canvas
            if (['html', 'css', 'javascript', 'jsx', 'tsx'].includes(lang)) {
              setCanvasContent({
                type: 'code',
                language: lang,
                content: code
              });
            }
          }
        });
      }
      
      return (
        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    }
    
    // Handle structured MessageContent array
    return (
      <div className="space-y-4">
        {content.map((item, index) => {
          switch (item.type) {
            case 'text':
              return (
                <div key={index} className="prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(item.text || '') as string }} />
                </div>
              );
            
            case 'code':
              return (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
                    <span className="text-sm text-gray-400">{item.language || 'code'}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.text || '')}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto">
                    <code className={`language-${item.language || 'text'}`}>
                      {item.text}
                    </code>
                  </pre>
                </div>
              );
            
            case 'canvas':
              return (
                <div key={index} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300">{item.title || 'Canvas'}</h4>
                    <button
                      onClick={() => setCanvasContent(item.data)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Open in Canvas
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded p-4">
                    {/* Render canvas preview */}
                    <pre className="text-xs text-gray-400">{JSON.stringify(item.data, null, 2)}</pre>
                  </div>
                </div>
              );
            
            case 'image':
              return (
                <img 
                  key={index}
                  src={item.url} 
                  alt={item.title || 'Image'} 
                  className="rounded-lg max-w-full"
                />
              );
            
            default:
              return null;
          }
        })}
      </div>
    );
  };

  const handleStreamingMessage = useCallback(async (
    content: string,
    attachments?: Attachment[]
  ) => {
    setIsStreaming(true);
    streamingRef.current = '';
    
    try {
      const message = await chatService.current.streamMessage(
        content,
        attachments,
        { stream: true },
        (chunk) => {
          streamingRef.current += chunk;
          setCurrentMessage(streamingRef.current);
        }
      );
      
      if (onMessage) onMessage(message);
      if (onTokenUsage && message.usage) onTokenUsage(message.usage);
    } catch (error) {
      if (onError) onError(error as Error);
    } finally {
      setIsStreaming(false);
      setCurrentMessage('');
    }
  }, [onMessage, onError, onTokenUsage]);

  // Canvas sidebar for code execution and preview
  const renderCanvas = () => {
    if (!canvasContent || !showCanvas) return null;
    
    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-lg z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Canvas</h3>
          <button
            onClick={() => setCanvasContent(null)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 h-full overflow-auto">
          {canvasContent.type === 'code' && (
            <div>
              <div className="mb-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Run Code
                </button>
              </div>
              <pre className="bg-gray-800 p-4 rounded overflow-x-auto">
                <code className={`language-${canvasContent.language}`}>
                  {canvasContent.content}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-sm">
          AI is thinking...
        </div>
      )}
      
      {/* Current streaming message */}
      {currentMessage && (
        <div className="p-4 bg-gray-800 rounded-lg mb-4">
          {renderStructuredContent(currentMessage)}
        </div>
      )}
      
      {/* Canvas sidebar */}
      {renderCanvas()}
    </div>
  );
};

export default GPTChat;
export { GPTChatService };