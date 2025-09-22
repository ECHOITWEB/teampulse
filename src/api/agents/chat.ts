import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { calculateOpenAICost, calculateAnthropicCost } from '../../config/apiPricing';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Agent configurations with enhanced capabilities
const agentConfigs = {
  planner: {
    name: 'Planning Agent',
    systemPrompt: `You are an expert project planner and strategist. Your role is to:
    - Break down complex goals into actionable tasks
    - Create detailed project timelines and milestones
    - Identify dependencies and potential blockers
    - Suggest resource allocation and priorities
    - Use frameworks like OKRs, SMART goals, and Agile methodologies
    - Provide risk assessment and mitigation strategies
    
    Always structure your responses with clear headings, bullet points, and actionable next steps.
    Respond in Korean unless otherwise specified.`,
    tools: ['task_decomposition', 'timeline_generation', 'dependency_mapping']
  },
  researcher: {
    name: 'Research Agent',
    systemPrompt: `You are an expert researcher and market analyst. Your role is to:
    - Conduct thorough market research and competitive analysis
    - Identify trends, opportunities, and threats
    - Analyze customer needs and behaviors
    - Provide data-driven insights and recommendations
    - Use SWOT, Porter's Five Forces, and other analytical frameworks
    - Summarize findings with key takeaways and action items
    
    Provide evidence-based analysis with sources when possible.
    Respond in Korean unless otherwise specified.`,
    tools: ['web_search', 'data_analysis', 'trend_identification']
  },
  analyst: {
    name: 'Data Analyst',
    systemPrompt: `You are a data analysis expert. Your role is to:
    - Analyze data patterns and trends
    - Create meaningful visualizations and dashboards
    - Perform statistical analysis and forecasting
    - Identify key metrics and KPIs
    - Provide actionable business insights
    - Suggest data-driven optimizations
    
    Present findings with clear explanations and visual descriptions.
    Respond in Korean unless otherwise specified.`,
    tools: ['data_processing', 'visualization', 'statistical_analysis']
  },
  executor: {
    name: 'Execution Assistant',
    systemPrompt: `You are an execution specialist and productivity expert. Your role is to:
    - Create detailed checklists and standard operating procedures
    - Automate repetitive tasks and workflows
    - Track progress and identify bottlenecks
    - Optimize processes for efficiency
    - Provide templates and frameworks for common tasks
    - Ensure accountability and follow-through
    
    Focus on practical, immediately actionable recommendations.
    Respond in Korean unless otherwise specified.`,
    tools: ['checklist_generation', 'workflow_automation', 'progress_tracking']
  },
  writer: {
    name: 'Document Writer',
    systemPrompt: `You are a professional technical and business writer. Your role is to:
    - Create clear, concise, and compelling documents
    - Write reports, proposals, and presentations
    - Develop technical documentation and user guides
    - Craft marketing content and communications
    - Ensure consistent tone and style
    - Optimize content for different audiences
    
    Deliver well-structured, professional documents.
    Respond in Korean unless otherwise specified.`,
    tools: ['document_generation', 'content_optimization', 'style_formatting']
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, agentId, systemPrompt, model = 'gpt-4o', sessionId, workspaceId } = req.body;

  if (!message || !agentId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Get agent configuration
    const agentConfig = agentConfigs[agentId as keyof typeof agentConfigs];
    const finalSystemPrompt = systemPrompt || agentConfig?.systemPrompt || 'You are a helpful assistant.';

    let response: string = '';
    let usage: any = {};
    let cost: number = 0;

    // Determine which AI provider to use based on model
    if (model.includes('claude')) {
      // Use Anthropic Claude
      const completion = await anthropic.messages.create({
        model: model,
        max_tokens: 4096,
        system: finalSystemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      });

      response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      
      // Calculate usage and cost for Claude
      const inputTokens = completion.usage?.input_tokens || 0;
      const outputTokens = completion.usage?.output_tokens || 0;
      
      usage = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens
      };
      
      cost = calculateAnthropicCost(
        model,
        inputTokens,
        outputTokens
      );
    } else {
      // Use OpenAI
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: finalSystemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      response = completion.choices[0]?.message?.content || '';
      
      // Calculate usage and cost for OpenAI
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      
      usage = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: completion.usage?.total_tokens || 0
      };
      
      cost = calculateOpenAICost(
        model,
        inputTokens,
        outputTokens
      );
    }

    // Log usage for analytics (you can save this to database)
    console.log(`Agent: ${agentId}, Model: ${model}, Tokens: ${usage.total_tokens}, Cost: $${cost.toFixed(4)}`);

    return res.status(200).json({
      response,
      usage: {
        ...usage,
        cost
      },
      agentId,
      model,
      sessionId
    });
  } catch (error: any) {
    console.error('Error in agent chat:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}