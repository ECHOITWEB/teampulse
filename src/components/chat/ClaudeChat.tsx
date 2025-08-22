// ClaudeChat.tsx - Anthropic Claude model specific chat component with Artifacts support
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

// Artifact type for Claude's special content blocks
interface Artifact {
  id: string;
  type: 'code' | 'document' | 'html' | 'svg' | 'react' | 'mermaid';
  title: string;
  content: string;
  language?: string;
  version?: number;
  metadata?: Record<string, any>;
}

class ClaudeChatService extends ChatComponent {
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
    const response = await fetch(`${this.apiEndpoint}/api/chat/ai`, {
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
        ...config
      })
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
    
    // Parse for artifacts in Claude's response
    const artifacts = this.parseArtifacts(content);
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: artifacts.length > 0 ? this.formatWithArtifacts(content, artifacts) : content,
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

  private parseArtifacts(content: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const artifactRegex = /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+title="([^"]+)")?>[\s\S]*?<\/artifact>/g;
    
    let match;
    while ((match = artifactRegex.exec(content)) !== null) {
      artifacts.push({
        id: match[1],
        type: match[2] as any,
        title: match[3] || 'Untitled',
        content: match[0].replace(/<\/?artifact[^>]*>/g, '').trim(),
        version: 1
      });
    }
    
    return artifacts;
  }

  private formatWithArtifacts(content: string, artifacts: Artifact[]): MessageContent[] {
    const result: MessageContent[] = [];
    let lastIndex = 0;
    
    artifacts.forEach(artifact => {
      const artifactStart = content.indexOf(`<artifact id="${artifact.id}"`);
      if (artifactStart > lastIndex) {
        // Add text before artifact
        result.push({
          type: 'text',
          text: content.substring(lastIndex, artifactStart)
        });
      }
      
      // Add artifact as special content
      result.push({
        type: 'artifact' as any,
        title: artifact.title,
        data: artifact
      });
      
      const artifactEnd = content.indexOf('</artifact>', artifactStart) + '</artifact>'.length;
      lastIndex = artifactEnd;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      result.push({
        type: 'text',
        text: content.substring(lastIndex)
      });
    }
    
    return result;
  }

  estimateTokens(content: string, attachments?: Attachment[]): number {
    // Claude token estimation
    const koreanChars = (content.match(/[가-힣]/g) || []).length;
    const otherChars = content.length - koreanChars;
    
    let tokens = Math.ceil(koreanChars / 2.5) + Math.ceil(otherChars / 4);
    
    // Add tokens for attachments
    if (attachments) {
      attachments.forEach(att => {
        if (att.type.startsWith('image/')) {
          tokens += 100 + 1200; // Claude uses more tokens for images
        } else if (att.type.includes('pdf')) {
          tokens += 500; // PDF processing overhead
        } else if (att.type.includes('text')) {
          tokens += 100;
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
      'claude-opus-4-1-20250805': {
        id: 'claude-opus-4-1-20250805',
        name: 'Claude Opus 4.1',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'pdf', 'artifacts', 'web-search', 'code-execution'],
        pricing: { input: 4.5, output: 22.5 }
      },
      'claude-opus-4-20250514': {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'pdf', 'artifacts', 'web-search'],
        pricing: { input: 4.5, output: 22.5 }
      },
      'claude-sonnet-4-20250514': {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'pdf', 'artifacts'],
        pricing: { input: 0.9, output: 4.5 }
      },
      'claude-3-7-sonnet-20250219': {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude Sonnet 3.7',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision', 'pdf', 'artifacts'],
        pricing: { input: 0.9, output: 4.5 }
      },
      'claude-3-5-haiku-20241022': {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude Haiku 3.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 4096,
        supportedFeatures: ['text', 'vision'],
        pricing: { input: 0.24, output: 1.2 }
      }
    };
    
    return modelInfoMap[this.model] || modelInfoMap['claude-3-5-haiku-20241022'];
  }

  supportsFeature(feature: string): boolean {
    return this.getModelInfo().supportedFeatures.includes(feature);
  }
}

interface ClaudeChatProps extends ChatComponentProps {
  showArtifacts?: boolean;
}

const ClaudeChat: React.FC<ClaudeChatProps> = ({
  workspaceId,
  channelId,
  userId,
  model,
  onMessage,
  onError,
  onTokenUsage,
  showArtifacts = true
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const chatService = useRef(new ClaudeChatService(model));
  const streamingRef = useRef<string>('');

  const renderStructuredContent = (content: string | MessageContent[]) => {
    if (typeof content === 'string') {
      const html = marked.parse(content) as string;
      return (
        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    }
    
    // Handle structured MessageContent array with artifacts
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
            
            case 'artifact':
              const artifact = item.data as Artifact;
              return (
                <div key={index} className="border border-purple-700 rounded-lg p-4 bg-purple-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 className="text-sm font-medium text-purple-300">{artifact.title}</h4>
                      <span className="text-xs text-purple-400 bg-purple-800 px-2 py-1 rounded">
                        {artifact.type}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedArtifact(artifact);
                        setArtifacts(prev => [...prev, artifact]);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Open Artifact
                    </button>
                  </div>
                  
                  {/* Preview of artifact content */}
                  <div className="bg-gray-900 rounded p-3 mt-2 max-h-40 overflow-hidden">
                    <pre className="text-xs text-gray-400">
                      {artifact.content.substring(0, 200)}...
                    </pre>
                  </div>
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

  // Artifact viewer sidebar
  const renderArtifactViewer = () => {
    if (!selectedArtifact || !showArtifacts) return null;
    
    return (
      <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-900 border-l border-purple-700 shadow-lg z-50">
        <div className="flex items-center justify-between p-4 border-b border-purple-700 bg-purple-900/30">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">{selectedArtifact.title}</h3>
            <span className="text-xs text-purple-400 bg-purple-800 px-2 py-1 rounded">
              {selectedArtifact.type}
            </span>
          </div>
          <button
            onClick={() => setSelectedArtifact(null)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 h-full overflow-auto">
          {/* Artifact tabs */}
          <div className="flex space-x-2 mb-4 border-b border-gray-700">
            <button className="px-3 py-2 text-sm text-white border-b-2 border-purple-500">
              Preview
            </button>
            <button className="px-3 py-2 text-sm text-gray-400 hover:text-white">
              Code
            </button>
            <button className="px-3 py-2 text-sm text-gray-400 hover:text-white">
              Edit
            </button>
          </div>
          
          {/* Artifact content */}
          <div className="bg-gray-800 rounded-lg p-4">
            {selectedArtifact.type === 'code' && (
              <pre className="overflow-x-auto">
                <code className={`language-${selectedArtifact.language || 'text'}`}>
                  {selectedArtifact.content}
                </code>
              </pre>
            )}
            
            {selectedArtifact.type === 'html' && (
              <div className="bg-white rounded p-4">
                <iframe
                  srcDoc={selectedArtifact.content}
                  className="w-full h-96 border-0"
                  title={selectedArtifact.title}
                />
              </div>
            )}
            
            {selectedArtifact.type === 'react' && (
              <div>
                <div className="mb-4 flex space-x-2">
                  <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                    Run Component
                  </button>
                  <button className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600">
                    Export
                  </button>
                </div>
                <pre className="overflow-x-auto">
                  <code className="language-jsx">
                    {selectedArtifact.content}
                  </code>
                </pre>
              </div>
            )}
            
            {selectedArtifact.type === 'document' && (
              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: marked.parse(selectedArtifact.content) as string }} />
              </div>
            )}
          </div>
        </div>
        
        {/* Artifact history */}
        {artifacts.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-800 border-t border-gray-700">
            <h4 className="text-sm text-gray-400 mb-2">Artifact History</h4>
            <div className="flex space-x-2 overflow-x-auto">
              {artifacts.map((artifact, index) => (
                <button
                  key={artifact.id}
                  onClick={() => setSelectedArtifact(artifact)}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedArtifact?.id === artifact.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {artifact.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white text-center py-1 text-sm">
          Claude is thinking...
        </div>
      )}
      
      {/* Current streaming message */}
      {currentMessage && (
        <div className="p-4 bg-gray-800 rounded-lg mb-4">
          {renderStructuredContent(currentMessage)}
        </div>
      )}
      
      {/* Artifact viewer sidebar */}
      {renderArtifactViewer()}
    </div>
  );
};

export default ClaudeChat;
export { ClaudeChatService };