// LangChain을 사용한 AI 서비스
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatMessage } from './chatService';
import usageTrackerService, { TokenUsage } from './usageTrackerService';
import { auth } from '../config/firebase';

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProcessMessageOptions {
  systemPrompt?: string;
  webSearch?: boolean;
  imageAnalysis?: boolean;
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
    file?: File;
  }>;
  workspaceId?: string;
  channelId?: string;
  conversationId?: string;
}

class LangChainService {
  private openaiApiKey: string = '';
  private anthropicApiKey: string = '';

  constructor() {
    // API keys from environment
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.anthropicApiKey = process.env.REACT_APP_ANTHROPIC_API_KEY || '';
    
    // Debug: API 키 확인
    console.log('OpenAI API Key loaded:', this.openaiApiKey ? '✅ (exists)' : '❌ (missing)');
    console.log('Anthropic API Key loaded:', this.anthropicApiKey ? '✅ (exists)' : '❌ (missing)');
  }

  // Convert image URL to base64 data URL
  async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      // If already a data URL, return as is
      if (imageUrl.startsWith('data:')) {
        return imageUrl;
      }

      // Try client-side conversion first
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Convert to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (clientError) {
        console.log('Client-side conversion failed, trying server-side conversion');
        
        // If client-side fails (CORS), use Firebase Function
        const { httpsCallable } = await import('firebase/functions');
        const firebase = await import('../config/firebase');
        
        const convertImageFn = httpsCallable(firebase.functions, 'convertImageToBase64');
        const result = await convertImageFn({ imageUrl });
        
        const data = result.data as any;
        if (data.success && data.dataUrl) {
          return data.dataUrl;
        }
        
        throw new Error('Server-side conversion failed');
      }
    } catch (error) {
      console.error('Error converting image to base64:', error);
      // Return the original URL if conversion fails
      return imageUrl;
    }
  }

  // Process documents - try client-side first, then Firebase Functions
  async processDocument(fileUrl: string, fileType: string, fileName: string, file?: File): Promise<{ text: string; summary: any }> {
    console.log('🔍 Processing document:', { fileName, fileType, fileUrl });
    
    // Try client-side parsing first if we have the File object
    if (file) {
      // Check if file type is supported for client-side parsing
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/csv',
        'text/plain'
      ];
      
      if (supportedTypes.includes(fileType)) {
        try {
          console.log('📄 Attempting client-side document parsing...');
          const { parseDocumentLocally } = await import('../utils/pdfParser');
          const result = await parseDocumentLocally(file);
          console.log('✅ Document parsed successfully (client-side)');
          return result;
        } catch (clientError) {
          console.log('Client-side parsing failed, falling back to server-side...', clientError);
        }
      }
    }
    
    // Fallback to Firebase Functions
    try {
      // Try the HTTP version with better CORS handling
      try {
        console.log('📤 Calling Firebase Function: processDocumentHttp');
        
        const response = await fetch('https://us-central1-teampulse-61474.cloudfunctions.net/processDocumentHttp', {
          method: 'POST',
          mode: 'cors', // Explicitly set CORS mode
          credentials: 'omit', // Don't send credentials to avoid CORS issues
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ fileUrl, fileType, fileName })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.data && result.data.success) {
          console.log('✅ Document processed successfully (HTTP):', result.data);
          return {
            text: result.data.text,
            summary: result.data.summary
          };
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (httpError) {
        console.log('HTTP version failed, trying onCall version...');
        
        // Fallback to onCall version
        const { httpsCallable } = await import('firebase/functions');
        const firebase = await import('../config/firebase');
        
        console.log('📤 Calling Firebase Function: processDocument (onCall)');
        const processDocumentFn = httpsCallable(firebase.functions, 'processDocument');
        const result = await processDocumentFn({ fileUrl, fileType, fileName });
        
        console.log('✅ Document processed successfully (onCall):', result.data);
        return result.data as { text: string; summary: any };
      }
    } catch (error: any) {
      console.error('❌ Error processing document:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      // Return a fallback response if Firebase Function fails
      return {
        text: `[Unable to extract text from ${fileName}. The document processing service encountered an error.]`,
        summary: { error: true, message: error.message }
      };
    }
  }

  // Analyze document with AI using Firebase Functions
  async analyzeDocumentWithAI(text: string, query: string, provider: string, model: string): Promise<string> {
    try {
      // Import Firebase Functions
      const { httpsCallable } = await import('firebase/functions');
      const firebase = await import('../config/firebase');
      
      // Call the analyzeDocumentWithAI function
      const analyzeDocumentFn = httpsCallable(firebase.functions, 'analyzeDocumentWithAI');
      const result = await analyzeDocumentFn({ text, query, provider, model });
      
      return (result.data as any).response;
    } catch (error) {
      console.error('Error analyzing document with AI:', error);
      throw error;
    }
  }

  // Check if message is asking for simple date/time
  private checkSimpleDateTimeQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const year = koreanTime.getFullYear();
    const month = koreanTime.getMonth() + 1;
    const day = koreanTime.getDate();
    const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][koreanTime.getDay()];
    const hours = koreanTime.getHours();
    const minutes = koreanTime.getMinutes();
    
    // Check for date queries
    if (lowerMessage.includes('오늘') && (lowerMessage.includes('날짜') || lowerMessage.includes('며칠'))) {
      return `오늘은 ${year}년 ${month}월 ${day}일 ${dayOfWeek}입니다.`;
    }
    
    if (lowerMessage.includes('지금') && (lowerMessage.includes('시간') || lowerMessage.includes('몇시'))) {
      return `현재 시간은 ${hours}시 ${minutes}분입니다.`;
    }
    
    if (lowerMessage.includes('무슨 요일')) {
      return `오늘은 ${dayOfWeek}입니다.`;
    }
    
    // English queries
    if (lowerMessage.includes('today') && lowerMessage.includes('date')) {
      return `Today is ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][koreanTime.getDay()]}).`;
    }
    
    if ((lowerMessage.includes('current') || lowerMessage.includes('now')) && lowerMessage.includes('time')) {
      return `The current time is ${hours}:${String(minutes).padStart(2, '0')}.`;
    }
    
    return null;
  }
  
  // Process chat message with AI using LangChain
  async processMessage(
    message: string,
    context: ChatMessage[],
    config: AIConfig,
    options?: ProcessMessageOptions
  ): Promise<AIResponse> {
    try {
      // Check if it's a simple date/time query first
      const simpleResponse = this.checkSimpleDateTimeQuery(message);
      if (simpleResponse) {
        return {
          content: simpleResponse,
          model: config.model,
          provider: config.provider,
        };
      }
      const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt(config.provider, config.model);
      
      // Build messages array
      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt)
      ];

      // Add context messages (last 10)
      const recentContext = context.slice(-10);
      for (const msg of recentContext) {
        if (msg.type === 'ai') {
          messages.push(new AIMessage(msg.content));
        } else if (msg.type !== 'system') {
          messages.push(new HumanMessage(`${msg.user_name}: ${msg.content}`));
        }
      }

      // Check if we need two-stage processing for file analysis
      const hasAttachments = options?.attachments && options.attachments.length > 0;
      const needsFileAnalysis = hasAttachments && (
        message.toLowerCase().includes('분석') || 
        message.toLowerCase().includes('읽어') ||
        message.toLowerCase().includes('analyze') ||
        message.toLowerCase().includes('read') ||
        message.toLowerCase().includes('뭔지') ||
        message.toLowerCase().includes('what')
      );

      // Add current message with attachments if present
      if (hasAttachments) {
        console.log('📎 Processing attachments:', options.attachments!.map(a => ({ name: a.name, type: a.type })));
        
        // For multimodal models, create a message with image content
        const messageContent: any = [
          { type: 'text', text: message }
        ];
        
        // Add context about attachments
        const attachmentDescriptions: string[] = [];
        
        for (const attachment of options.attachments!) {
          if (attachment.type.startsWith('image/')) {
            console.log('🖼️ Processing image:', attachment.name);
            
            // Convert image to base64 for better compatibility
            let imageUrl = attachment.url;
            
            // Convert to base64 if it's not already a data URL
            if (!imageUrl.startsWith('data:')) {
              console.log('📸 Converting image to base64...');
              imageUrl = await this.imageUrlToBase64(imageUrl);
              console.log('✅ Image converted to base64 format');
            }
            
            // Add image to message content for vision models
            messageContent.push({
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'auto'
              }
            });
            attachmentDescriptions.push(`Image: ${attachment.name || 'image'}`);
          } else if (attachment.type === 'application/pdf' || 
                     attachment.type === 'text/html' ||
                     attachment.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     attachment.type === 'application/vnd.ms-excel' ||
                     attachment.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     attachment.type === 'application/msword' ||
                     attachment.type === 'text/plain' ||
                     attachment.type === 'text/csv') {
            // For document files, try to extract text content
            try {
              console.log(`Processing document: ${attachment.name} (${attachment.type})`);
              const { text, summary } = await this.processDocument(
                attachment.url, 
                attachment.type, 
                attachment.name || 'document',
                attachment.file  // Pass the file object for client-side parsing
              );
              
              // Add description for tracking
              const fileTypeNames: Record<string, string> = {
                'application/pdf': 'PDF document',
                'text/html': 'HTML file',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet',
                'application/vnd.ms-excel': 'Excel spreadsheet',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
                'application/msword': 'Word document',
                'text/plain': 'Text file',
                'text/csv': 'CSV file'
              };
              
              const typeName = fileTypeNames[attachment.type] || 'Document';
              attachmentDescriptions.push(`${typeName}: ${attachment.name || 'document'}`);
              
              // Add extracted text to message content (truncated if too long)
              const maxTextLength = 5000;
              const textToInclude = text.length > maxTextLength 
                ? text.substring(0, maxTextLength) + '...\n[Content truncated]'
                : text;
                
              messageContent.push({
                type: 'text',
                text: `[Attached ${typeName}: ${attachment.name || 'document'}]\n\nExtracted content:\n${textToInclude}`
              });
              
              console.log(`Successfully extracted ${text.length} characters from ${attachment.name}`);
            } catch (error) {
              console.error(`Failed to process document ${attachment.name}:`, error);
              // Fallback to simple description if processing fails
              attachmentDescriptions.push(`Document: ${attachment.name || 'document'}`);
              messageContent.push({
                type: 'text',
                text: `[Attached document: ${attachment.name || 'document'} - Unable to extract content]`
              });
            }
          } else {
            // For other files
            attachmentDescriptions.push(`File: ${attachment.name || 'file'}`);
            messageContent.push({
              type: 'text',
              text: `[Attached file: ${attachment.name || 'file'} (${attachment.type})]`
            });
          }
        }
        
        // Add a summary of attachments if multiple
        if (attachmentDescriptions.length > 1) {
          messageContent.unshift({
            type: 'text',
            text: `Analyzing ${attachmentDescriptions.length} attachments: ${attachmentDescriptions.join(', ')}. `
          });
        }
        
        // For multimodal content, pass as structured content
        messages.push(new HumanMessage({ content: messageContent }));
      } else {
        messages.push(new HumanMessage(message));
      }

      // Two-stage processing for file analysis requests
      if (needsFileAnalysis) {
        console.log('🔄 Two-stage processing: Using multimodal model for file analysis');
        
        // Stage 1: Use multimodal model to read/analyze files
        let fileAnalysisLLM;
        let fileAnalysisContent = '';
        
        // Select the best multimodal model for file analysis
        if (config.provider === 'openai') {
          const apiKey = config.apiKey || this.openaiApiKey;
          if (!apiKey) {
            throw new Error('OpenAI API key is missing. Please check your .env file.');
          }
          
          console.log('📊 Stage 1: Using GPT-4o for file analysis');
          fileAnalysisLLM = new ChatOpenAI({
            modelName: 'gpt-4o', // Best multimodal model for OpenAI
            apiKey: apiKey,
            temperature: 0.3, // Lower temperature for accurate analysis
            maxTokens: 2000,
          });
        } else {
          const apiKey = config.apiKey || this.anthropicApiKey;
          if (!apiKey) {
            throw new Error('Anthropic API key is missing. Please check your .env file.');
          }
          
          console.log('📊 Stage 1: Using Claude 3.5 Sonnet for file analysis');
          fileAnalysisLLM = new ChatAnthropic({
            modelName: 'claude-3-5-sonnet-20241022', // Latest multimodal model for Anthropic
            apiKey: apiKey,
            temperature: 0.3,
            maxTokens: 2000,
          });
        }
        
        // Process with multimodal model
        const outputParser = new StringOutputParser();
        const analysisChain = fileAnalysisLLM.pipe(outputParser);
        const analysisResult = await analysisChain.invoke(messages);
        
        // Extract content and usage from the result
        let analysisUsage: any = undefined;
        if (typeof analysisResult === 'object' && analysisResult !== null && 'content' in analysisResult) {
          fileAnalysisContent = (analysisResult as any).content;
          analysisUsage = (analysisResult as any).usage;
        } else {
          fileAnalysisContent = analysisResult;
        }
        
        // Track Stage 1 usage if available
        if (analysisUsage && auth.currentUser && options?.workspaceId) {
          const stage1Model = config.provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022';
          await this.recordUsage(
            stage1Model,
            analysisUsage,
            options.workspaceId,
            options.channelId,
            options.conversationId,
            'file_analysis'
          );
        }
        
        console.log('✅ Stage 1 complete: File analyzed with multimodal model');
        
        // Stage 2: Use user's selected model to generate final response
        console.log(`📝 Stage 2: Using user's selected model (${config.model}) for final response`);
        
        // Create new messages with analysis result
        const finalMessages: BaseMessage[] = [
          new SystemMessage(systemPrompt),
          new HumanMessage(`Based on the following file analysis, please provide a helpful response to the user's question: "${message}"

File Analysis Result:
${fileAnalysisContent}

Please provide a natural, conversational response in Korean if the user wrote in Korean, otherwise in English.`)
        ];
        
        // Use user's originally selected model for final response
        let finalLLM;
        if (config.provider === 'openai') {
          const apiKey = config.apiKey || this.openaiApiKey;
          let modelName = config.model === 'gpt-5' ? 'gpt-4' : config.model;
          
          finalLLM = new ChatOpenAI({
            modelName: modelName,
            apiKey: apiKey,
            temperature: 0.7,
            maxTokens: 2000,
          });
        } else {
          const apiKey = config.apiKey || this.anthropicApiKey;
          
          finalLLM = new ChatAnthropic({
            modelName: config.model,
            apiKey: apiKey,
            temperature: 0.7,
            maxTokens: 2000,
          });
        }
        
        const finalChain = finalLLM.pipe(outputParser);
        const finalResult = await finalChain.invoke(finalMessages);
        
        // Extract content and usage
        let finalContent: string;
        let finalUsage: any = undefined;
        if (typeof finalResult === 'object' && finalResult !== null && 'content' in finalResult) {
          finalContent = (finalResult as any).content;
          finalUsage = (finalResult as any).usage;
        } else {
          finalContent = finalResult;
        }
        
        // Track Stage 2 usage if available
        if (finalUsage && auth.currentUser && options?.workspaceId) {
          await this.recordUsage(
            config.model,
            finalUsage,
            options.workspaceId,
            options.channelId,
            options.conversationId,
            'response_generation'
          );
        }
        
        console.log('✅ Stage 2 complete: Final response generated with user\'s model');
        
        return {
          content: finalContent,
          model: config.model,
          provider: config.provider,
          usage: finalUsage ? {
            promptTokens: finalUsage.input_tokens || finalUsage.prompt_tokens || 0,
            completionTokens: finalUsage.output_tokens || finalUsage.completion_tokens || 0,
            totalTokens: finalUsage.total_tokens || 0
          } : undefined
        };
      }

      // Original single-stage processing for non-file-analysis requests
      let llm;
      if (config.provider === 'openai') {
        const apiKey = config.apiKey || this.openaiApiKey;
        if (!apiKey) {
          throw new Error('OpenAI API key is missing. Please check your .env file.');
        }
        
        // Check if we have images and need vision model
        const hasImages = options?.attachments?.some(a => a.type.startsWith('image/'));
        let modelName = config.model === 'gpt-5' ? 'gpt-4' : config.model;
        
        // Force vision model for images (only for direct image processing, not file analysis)
        if (hasImages && !needsFileAnalysis) {
          // Use GPT-4 Vision or GPT-4o for image processing
          if (!modelName.includes('vision') && !modelName.includes('4o') && !modelName.includes('gpt-4-turbo')) {
            console.log('🔄 Switching to vision model for image processing');
            modelName = 'gpt-4o'; // Use GPT-4o which has native vision support
          }
        }
        
        console.log(`🤖 Using OpenAI model: ${modelName} (hasImages: ${hasImages})`);
        
        llm = new ChatOpenAI({
          modelName: modelName,
          apiKey: apiKey,  // 'apiKey' instead of 'openAIApiKey'
          temperature: 0.7,
          maxTokens: 2000,
        });
      } else {
        const apiKey = config.apiKey || this.anthropicApiKey;
        if (!apiKey) {
          throw new Error('Anthropic API key is missing. Please check your .env file.');
        }
        
        // Check if we have images and select appropriate Claude model
        const hasImages = options?.attachments?.some(a => a.type.startsWith('image/'));
        let modelName = config.model;
        
        // Claude 3 models support vision natively (only for direct image processing, not file analysis)
        if (hasImages && !needsFileAnalysis && !modelName.includes('claude-3')) {
          console.log('🔄 Switching to Claude 3 for image processing');
          modelName = 'claude-3-opus-20240229'; // Use Claude 3 Opus for best vision performance
        }
        
        console.log(`🤖 Using Anthropic model: ${modelName} (hasImages: ${hasImages})`);
        
        llm = new ChatAnthropic({
          modelName: modelName,
          apiKey: apiKey,  // 'apiKey' instead of 'anthropicApiKey'
          temperature: 0.7,
          maxTokens: 2000,
        });
      }

      // Create output parser
      const outputParser = new StringOutputParser();

      // Create chain and invoke with callback for usage tracking
      const chain = llm.pipe(outputParser);
      const result = await chain.invoke(messages);
      
      // Extract content and usage from the result
      let content: string;
      let usage: any = undefined;
      
      if (typeof result === 'object' && result !== null && 'content' in result) {
        content = (result as any).content;
        usage = (result as any).usage || (result as any).response_metadata?.usage;
      } else {
        content = result;
      }
      
      // Try to get usage from the LLM instance if not in result
      if (!usage) {
        try {
          // For OpenAI
          if (config.provider === 'openai' && (llm as any).client?.usage) {
            usage = (llm as any).client.usage;
          }
          // For Anthropic
          else if (config.provider === 'anthropic' && (llm as any).usage) {
            usage = (llm as any).usage;
          }
        } catch (e) {
          console.log('Could not extract usage metadata');
        }
      }
      
      // Track usage if available
      if (usage && auth.currentUser && options?.workspaceId) {
        await this.recordUsage(
          config.model,
          usage,
          options.workspaceId,
          options.channelId,
          options.conversationId,
          'chat_message'
        );
      }

      return {
        content,
        model: config.model,
        provider: config.provider,
        usage: usage ? {
          promptTokens: usage.input_tokens || usage.prompt_tokens || 0,
          completionTokens: usage.output_tokens || usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        } : undefined
      };
    } catch (error) {
      console.error('Error processing AI message:', error);
      throw error;
    }
  }

  // Stream chat response using LangChain
  async streamMessage(
    message: string,
    context: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void,
    options?: {
      systemPrompt?: string;
      webSearch?: boolean;
    }
  ): Promise<AIResponse> {
    try {
      const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt(config.provider, config.model);
      
      // Build messages array
      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt)
      ];

      // Add context messages
      const recentContext = context.slice(-10);
      for (const msg of recentContext) {
        if (msg.type === 'ai') {
          messages.push(new AIMessage(msg.content));
        } else if (msg.type !== 'system') {
          messages.push(new HumanMessage(`${msg.user_name}: ${msg.content}`));
        }
      }

      // Add current message
      messages.push(new HumanMessage(message));

      // Select the appropriate LLM with streaming
      let llm;
      if (config.provider === 'openai') {
        const apiKey = config.apiKey || this.openaiApiKey;
        if (!apiKey) {
          throw new Error('OpenAI API key is missing. Please check your .env file.');
        }
        llm = new ChatOpenAI({
          modelName: config.model === 'gpt-5' ? 'gpt-4' : config.model,
          apiKey: apiKey,  // 'apiKey' instead of 'openAIApiKey'
          temperature: 0.7,
          maxTokens: 2000,
          streaming: true,
        });
      } else {
        const apiKey = config.apiKey || this.anthropicApiKey;
        if (!apiKey) {
          throw new Error('Anthropic API key is missing. Please check your .env file.');
        }
        llm = new ChatAnthropic({
          modelName: config.model,
          apiKey: apiKey,  // 'apiKey' instead of 'anthropicApiKey'
          temperature: 0.7,
          maxTokens: 2000,
          streaming: true,
        });
      }

      // Stream the response
      let fullContent = '';
      const stream = await llm.stream(messages);
      
      for await (const chunk of stream) {
        const chunkText = chunk.content.toString();
        fullContent += chunkText;
        onChunk(chunkText);
      }

      return {
        content: fullContent,
        model: config.model,
        provider: config.provider,
      };
    } catch (error) {
      console.error('Error streaming AI message:', error);
      throw error;
    }
  }

  // Helper method to record API usage
  private async recordUsage(
    model: string,
    usage: any,
    workspaceId: string,
    channelId?: string,
    conversationId?: string,
    messageType?: string
  ): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('No authenticated user for usage tracking');
        return;
      }

      // Convert different usage format to our standard format
      const tokenUsage: TokenUsage = {
        input_tokens: usage.input_tokens || usage.prompt_tokens || 0,
        output_tokens: usage.output_tokens || usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 
          (usage.input_tokens || usage.prompt_tokens || 0) + 
          (usage.output_tokens || usage.completion_tokens || 0),
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
      };

      await usageTrackerService.recordUsage({
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Unknown',
        workspaceId,
        model,
        usage: tokenUsage,
        metadata: {
          channelId,
          conversationId,
          messageType
        }
      });
    } catch (error) {
      console.error('Error recording usage:', error);
      // Don't throw - usage tracking failure shouldn't break the main flow
    }
  }

  // Process image with AI using LangChain (for multimodal models)
  async processImageMessage(
    message: string,
    imageUrl: string,
    config: AIConfig
  ): Promise<AIResponse> {
    try {
      // All GPT-4 variants and Claude models now support vision
      const visionModels = [
        'gpt-4.1', 'gpt-4o', 'gpt-4-turbo', 'gpt-4',
        'claude-opus', 'claude-sonnet', 'claude-haiku'
      ];
      const modelSupportsVision = visionModels.some(m => 
        config.model.toLowerCase().includes(m.toLowerCase())
      );
      
      if (!modelSupportsVision) {
        throw new Error('Selected model does not support image analysis');
      }

      // Create a message with image content
      const imageMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: message,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      });

      // Select the appropriate vision model
      let llm;
      if (config.provider === 'openai') {
        llm = new ChatOpenAI({
          modelName: config.model,
          apiKey: config.apiKey || this.openaiApiKey,  // 'apiKey' instead of 'openAIApiKey'
          maxTokens: 2000,
        });
      } else {
        llm = new ChatAnthropic({
          modelName: config.model,
          apiKey: config.apiKey || this.anthropicApiKey,  // 'apiKey' instead of 'anthropicApiKey'
          maxTokens: 2000,
        });
      }

      // Process the image message
      const response = await llm.invoke([imageMessage]);
      
      return {
        content: response.content.toString(),
        model: config.model,
        provider: config.provider,
      };
    } catch (error) {
      console.error('Error processing image with AI:', error);
      throw error;
    }
  }

  // Generate image with AI using LangChain
  async generateImage(
    prompt: string,
    config: AIConfig
  ): Promise<{ url: string }> {
    if (config.model !== 'gpt-image-1' && !config.model.includes('dall-e')) {
      throw new Error('Image generation is only available with DALL-E models');
    }

    try {
      // For image generation, we'll use OpenAI's DALL-E directly
      // LangChain doesn't have a built-in DALL-E integration yet
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate image');
      }

      return {
        url: data.data[0].url
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  // Web search with AI using LangChain
  async searchWeb(
    query: string,
    config: AIConfig
  ): Promise<AIResponse> {
    try {
      // Enhanced web search prompt for GPT-4.1 and Claude 4 models
      const searchPrompt = `You are an AI assistant with web search capabilities.
You have access to real-time information up to ${new Date().toLocaleDateString('ko-KR')}.

Search Query: ${query}

Please provide:
1. Current and accurate information
2. Multiple perspectives if relevant
3. Cite sources when possible
4. Include recent developments
5. Highlight important updates

Format your response clearly with sections if needed.`;
      
      // For advanced models, add search simulation
      const messages: BaseMessage[] = [
        new SystemMessage(searchPrompt),
        new HumanMessage(query)
      ];

      // Select the appropriate LLM
      let llm;
      if (config.provider === 'openai') {
        llm = new ChatOpenAI({
          modelName: config.model,
          apiKey: config.apiKey || this.openaiApiKey,
          temperature: 0.3, // Lower temperature for factual search results
          maxTokens: 2000,
        });
      } else {
        llm = new ChatAnthropic({
          modelName: config.model,
          apiKey: config.apiKey || this.anthropicApiKey,
          temperature: 0.3,
          maxTokens: 2000,
        });
      }

      const outputParser = new StringOutputParser();
      const chain = llm.pipe(outputParser);
      const response = await chain.invoke(messages);

      return {
        content: `🔍 웹 검색 결과:\n\n${response}`,
        model: config.model,
        provider: config.provider,
      };
    } catch (error) {
      console.error('Error in web search:', error);
      throw error;
    }
  }

  // Get meeting information from Firebase
  async getMeetingData(workspaceId: string, query: string): Promise<string> {
    try {
      // Import meeting service
      const { default: meetingService } = await import('./meetingService');
      
      const queryLower = query.toLowerCase();
      let response = '';
      
      // Check for today's meetings
      if (queryLower.includes('오늘') || queryLower.includes('today')) {
        const todayMeetings = await meetingService.getTodayMeetings(workspaceId);
        if (todayMeetings.length > 0) {
          response = '📅 오늘 예정된 회의:\n\n';
          for (const meeting of todayMeetings) {
            const startTime = meeting.start_time.toDate().toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const endTime = meeting.end_time.toDate().toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            response += `🔹 **${meeting.title}**\n`;
            response += `   시간: ${startTime} - ${endTime}\n`;
            response += `   참석자: ${meeting.attendees.map(a => a.name).join(', ')}\n`;
            if (meeting.location) response += `   장소: ${meeting.location}\n`;
            if (meeting.meeting_link) response += `   회의 링크: ${meeting.meeting_link}\n`;
            if (meeting.description) response += `   설명: ${meeting.description}\n`;
            response += `   상태: ${this.getMeetingStatusText(meeting.status)}\n`;
            response += '\n';
          }
        } else {
          response = '오늘은 예정된 회의가 없습니다.';
        }
      }
      // Check for this week's meetings
      else if (queryLower.includes('이번 주') || queryLower.includes('this week') || queryLower.includes('주간')) {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        const weekMeetings = await meetingService.getWorkspaceMeetings(workspaceId, startOfWeek, endOfWeek);
        if (weekMeetings.length > 0) {
          response = '📅 이번 주 회의 일정:\n\n';
          const meetingsByDay: { [key: string]: typeof weekMeetings } = {};
          
          for (const meeting of weekMeetings) {
            const date = meeting.start_time.toDate().toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            });
            
            if (!meetingsByDay[date]) {
              meetingsByDay[date] = [];
            }
            meetingsByDay[date].push(meeting);
          }
          
          for (const [date, meetings] of Object.entries(meetingsByDay)) {
            response += `**${date}**\n`;
            for (const meeting of meetings) {
              const startTime = meeting.start_time.toDate().toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              response += `  • ${startTime} - ${meeting.title} (${meeting.attendees.length}명 참석)\n`;
            }
            response += '\n';
          }
        } else {
          response = '이번 주는 예정된 회의가 없습니다.';
        }
      }
      // Check for upcoming meetings
      else if (queryLower.includes('다음') || queryLower.includes('예정') || queryLower.includes('upcoming')) {
        const upcomingMeetings = await meetingService.getUpcomingMeetings(workspaceId, 5);
        if (upcomingMeetings.length > 0) {
          response = '📅 다가오는 회의 일정:\n\n';
          for (const meeting of upcomingMeetings) {
            const dateTime = meeting.start_time.toDate().toLocaleString('ko-KR', { 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            response += `🔹 **${meeting.title}**\n`;
            response += `   일시: ${dateTime}\n`;
            response += `   참석자: ${meeting.attendees.length}명\n`;
            response += '\n';
          }
        } else {
          response = '예정된 회의가 없습니다.';
        }
      }
      // Get action items
      else if (queryLower.includes('액션') || queryLower.includes('action') || queryLower.includes('할 일')) {
        const actionItems = await meetingService.getActionItems(undefined, workspaceId);
        const pendingItems = actionItems.filter(item => 
          item.status === 'pending' || item.status === 'in_progress'
        );
        
        if (pendingItems.length > 0) {
          response = '📋 진행 중인 액션 아이템:\n\n';
          for (const item of pendingItems) {
            response += `☐ **${item.title}**\n`;
            response += `   담당자: ${item.assignee_name}\n`;
            response += `   우선순위: ${this.getPriorityText(item.priority)}\n`;
            if (item.due_date) {
              const dueDate = item.due_date.toDate().toLocaleDateString('ko-KR');
              response += `   기한: ${dueDate}\n`;
            }
            response += `   상태: ${this.getActionStatusText(item.status)}\n`;
            response += '\n';
          }
        } else {
          response = '진행 중인 액션 아이템이 없습니다.';
        }
      }
      // General meeting list
      else {
        const meetings = await meetingService.getUpcomingMeetings(workspaceId, 10);
        if (meetings.length > 0) {
          response = '📅 회의 일정:\n\n';
          for (const meeting of meetings) {
            const dateTime = meeting.start_time.toDate().toLocaleString('ko-KR', { 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            response += `• ${dateTime} - ${meeting.title}\n`;
          }
        } else {
          response = '현재 예정된 회의가 없습니다.';
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error getting meeting data:', error);
      return '회의 정보를 가져오는 중 오류가 발생했습니다.';
    }
  }
  
  getMeetingStatusText(status: string): string {
    switch (status) {
      case 'scheduled': return '예정';
      case 'ongoing': return '진행 중';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  }
  
  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '중간';
      case 'low': return '낮음';
      default: return priority;
    }
  }
  
  getActionStatusText(status: string): string {
    switch (status) {
      case 'pending': return '대기 중';
      case 'in_progress': return '진행 중';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  }

  // Get default system prompt
  private getDefaultSystemPrompt(provider: string, model: string): string {
    // Get current date and time in Korean timezone
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const year = koreanTime.getFullYear();
    const month = koreanTime.getMonth() + 1;
    const day = koreanTime.getDate();
    const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][koreanTime.getDay()];
    const hours = koreanTime.getHours();
    const minutes = koreanTime.getMinutes();
    
    const basePrompt = `You are Pulse AI, a helpful assistant in TeamPulse workspace chat.

현재 시간 정보 (한국 시간 기준):
- 오늘 날짜: ${year}년 ${month}월 ${day}일 ${dayOfWeek}
- 현재 시각: ${hours}시 ${minutes}분

이 정보를 바탕으로 사용자가 날짜나 시간 관련 질문을 할 때 정확하게 답변해주세요.

You can help with various tasks including scheduling, code review, creating polls, and answering questions.
Be concise, friendly, and professional. When users mention you with @AI, respond helpfully.`;

    if (model.includes('gpt-5')) {
      return `${basePrompt}
You have advanced capabilities. When users ask for current information, provide the best answer based on your knowledge.`;
    }

    if (model.includes('claude')) {
      return `${basePrompt}
You are Claude, an AI assistant created by Anthropic. You excel at detailed analysis, creative tasks, and thoughtful responses.`;
    }

    if (model === 'gpt-image-1' || model.includes('dall-e')) {
      return `${basePrompt}
You can generate images based on text descriptions. When users ask for image creation, describe what you'll generate and provide the result.`;
    }

    return basePrompt;
  }

  // Set API keys
  setApiKeys(openaiKey: string, anthropicKey: string) {
    this.openaiApiKey = openaiKey;
    this.anthropicApiKey = anthropicKey;
  }
}

const langchainService = new LangChainService();
export default langchainService;