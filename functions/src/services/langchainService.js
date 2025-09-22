const { ChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { AgentExecutor, createOpenAIFunctionsAgent } = require('langchain/agents');
const { DynamicTool } = require('@langchain/core/tools');
const axios = require('axios');
const cheerio = require('cheerio');

class LangChainService {
  constructor() {
    this.model = null;
    this.tools = [];
    this.initializeTools();
  }

  initializeModel(apiKey, modelName = 'gpt-4o') {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: 0.7
    });
  }

  initializeTools() {
    // Web Search Tool
    const webSearchTool = new DynamicTool({
      name: 'web_search',
      description: 'Search the web for current information. Use this when asked about current events, weather, news, or any real-time data.',
      func: async (query) => {
        try {
          // Using Google Search API with Firebase config
          const functions = require('firebase-functions');
          const config = functions.config();
          const googleApiKey = config.google?.api_key || process.env.GOOGLE_API_KEY;
          const googleCseId = config.google?.cse_id || process.env.GOOGLE_CSE_ID;
          
          if (googleApiKey && googleCseId) {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(query)}`;
            const response = await axios.get(searchUrl);
          
          if (response.data.items && response.data.items.length > 0) {
            const results = response.data.items.slice(0, 3).map(item => ({
              title: item.title,
              snippet: item.snippet,
              link: item.link
            }));
            
            return JSON.stringify(results, null, 2);
          }
          }
          
          // Fallback to DuckDuckGo if Google API is not configured
          const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
          const ddgResponse = await axios.get(ddgUrl);
          
          if (ddgResponse.data.AbstractText) {
            return ddgResponse.data.AbstractText;
          }
          
          return "No search results found.";
        } catch (error) {
          console.error('Web search error:', error);
          return `Search failed: ${error.message}`;
        }
      }
    });

    // Weather Tool
    const weatherTool = new DynamicTool({
      name: 'get_weather',
      description: 'Get current weather information for a location. Use this when asked about weather.',
      func: async (location) => {
        try {
          const functions = require('firebase-functions');
          const config = functions.config();
          const apiKey = config.openweather?.api_key || process.env.OPENWEATHER_API_KEY || 'demo';
          const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=ko`;
          
          const response = await axios.get(url);
          const data = response.data;
          
          return `현재 ${location}의 날씨:
- 온도: ${data.main.temp}°C (체감: ${data.main.feels_like}°C)
- 날씨: ${data.weather[0].description}
- 습도: ${data.main.humidity}%
- 풍속: ${data.wind.speed}m/s`;
        } catch (error) {
          console.error('Weather API error:', error);
          return `날씨 정보를 가져올 수 없습니다: ${error.message}`;
        }
      }
    });

    // News Tool
    const newsTool = new DynamicTool({
      name: 'get_news',
      description: 'Get latest news articles. Use this when asked about current news or recent events.',
      func: async (query) => {
        try {
          const functions = require('firebase-functions');
          const config = functions.config();
          const apiKey = config.news?.api_key || process.env.NEWS_API_KEY;
          if (!apiKey) {
            return "News API key not configured.";
          }
          
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&language=ko&sortBy=publishedAt&pageSize=5`;
          const response = await axios.get(url);
          
          if (response.data.articles && response.data.articles.length > 0) {
            const articles = response.data.articles.map(article => ({
              title: article.title,
              description: article.description,
              source: article.source.name,
              publishedAt: article.publishedAt
            }));
            
            return JSON.stringify(articles, null, 2);
          }
          
          return "No news articles found.";
        } catch (error) {
          console.error('News API error:', error);
          return `뉴스를 가져올 수 없습니다: ${error.message}`;
        }
      }
    });

    // Calculator Tool
    const calculatorTool = new DynamicTool({
      name: 'calculator',
      description: 'Perform mathematical calculations. Input should be a mathematical expression.',
      func: async (expression) => {
        try {
          // Simple safe math evaluation
          const result = Function('"use strict"; return (' + expression + ')')();
          return `${expression} = ${result}`;
        } catch (error) {
          return `계산 오류: ${error.message}`;
        }
      }
    });

    // Date/Time Tool
    const dateTimeTool = new DynamicTool({
      name: 'get_datetime',
      description: 'Get current date and time information.',
      func: async () => {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        
        return `현재 한국 시간:
- 날짜: ${koreaTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
- 시간: ${koreaTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      }
    });

    this.tools = [
      webSearchTool,
      weatherTool,
      newsTool,
      calculatorTool,
      dateTimeTool
    ];
  }

  async processWithAgent(message, chatHistory = []) {
    if (!this.model) {
      throw new Error('Model not initialized. Please provide OpenAI API key.');
    }

    try {
      // Create prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', `You are Pulse AI, an advanced assistant for TeamPulse.
You have access to real-time information through various tools.
Always provide helpful, accurate, and up-to-date information.
When asked about current events, weather, or time-sensitive information, use the appropriate tools.
Respond in Korean unless specifically asked to use another language.`],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
        new MessagesPlaceholder('agent_scratchpad')
      ]);

      // Create agent
      const agent = await createOpenAIFunctionsAgent({
        llm: this.model,
        tools: this.tools,
        prompt
      });

      // Create executor
      const agentExecutor = new AgentExecutor({
        agent,
        tools: this.tools,
        verbose: true,
        maxIterations: 5
      });

      // Execute
      const result = await agentExecutor.invoke({
        input: message,
        chat_history: chatHistory
      });

      return {
        content: result.output,
        toolsUsed: result.intermediateSteps?.map(step => step.action.tool) || []
      };
    } catch (error) {
      console.error('Agent execution error:', error);
      throw error;
    }
  }

  async generateImage(prompt, apiKey) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data && response.data.data[0]) {
        return {
          url: response.data.data[0].url,
          revised_prompt: response.data.data[0].revised_prompt
        };
      }

      throw new Error('No image data received');
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  async analyzeImage(imageUrl, question, apiKey) {
    try {
      const model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-4o',
        maxTokens: 500
      });

      const response = await model.invoke([
        {
          type: 'human',
          content: [
            {
              type: 'text',
              text: question || 'What is in this image? Describe in detail.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ]);

      return response.content;
    } catch (error) {
      console.error('Image analysis error:', error);
      throw error;
    }
  }

  // Extract intent from message
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    const intents = {
      weather: /날씨|weather|기온|temperature|비|rain|눈|snow/i,
      news: /뉴스|news|소식|기사|article/i,
      time: /지금|현재|시간|time|날짜|date|오늘|today|내일|tomorrow/i,
      search: /검색|search|찾아|find|알려|tell me|정보|information/i,
      image_generation: /그려|draw|생성|generate|만들어|create|이미지|image|사진|photo|picture/i,
      calculation: /계산|calculate|더하기|빼기|곱하기|나누기|\+|\-|\*|\/|\d+\s*[\+\-\*\/]\s*\d+/i
    };

    const detectedIntents = [];
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(lowerMessage)) {
        detectedIntents.push(intent);
      }
    }

    return detectedIntents;
  }
}

module.exports = new LangChainService();