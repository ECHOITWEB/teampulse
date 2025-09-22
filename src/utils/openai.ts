import OpenAI from 'openai';
import { z } from 'zod';
import { parsePDFLocally } from './pdfParser';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default openai;

export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string = 'gpt-4-turbo-preview',
  options?: {
    temperature?: number;
    response_format?: { type: 'json_object' };
  }
): Promise<string | null> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      ...(options?.response_format && { response_format: options.response_format })
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

export async function analyzeImage(
  imageData: string | File,
  prompt: string,
  model: string = 'gpt-4-vision-preview'
): Promise<string | null> {
  try {
    let imageUrl: string;
    
    if (imageData instanceof File) {
      // Convert File to base64 data URL
      const arrayBuffer = await imageData.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      imageUrl = `data:${imageData.type};base64,${base64}`;
    } else {
      imageUrl = imageData;
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ],
        },
      ],
      max_tokens: 4096
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Vision API Error:', error);
    throw error;
  }
}

export async function createEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI Embedding API Error:', error);
    throw error;
  }
}

// Structured output with Zod schema
export async function createStructuredCompletion<T>(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  schema: z.ZodSchema<T>,
  schemaName: string = 'response'
): Promise<T | null> {
  try {
    const systemMessage = `You must respond with valid JSON that matches this schema: ${JSON.stringify(schema._def)}.\nRespond only with the JSON object, no additional text.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Structured Completion Error:', error);
    throw error;
  }
}

// File analysis helper
export async function analyzeFile(
  file: File,
  prompt: string
): Promise<string> {
  try {
    if (file.type.startsWith('image/')) {
      const result = await analyzeImage(file, prompt);
      return result || '이미지를 분석할 수 없습니다.';
    } else if (file.type === 'application/pdf') {
      try {
        const pdfResult = await parsePDFLocally(file);
        const pdfText = pdfResult.text;
        const result = await createChatCompletion([
          { role: 'system', content: 'You are analyzing a PDF document. Provide insights and answer questions about the content in Korean.' },
          { role: 'user', content: `PDF Content (${file.name}):\n\n${pdfText.substring(0, 10000)}${pdfText.length > 10000 ? '\n\n[문서가 너무 길어 일부만 표시됩니다]' : ''}\n\nQuestion: ${prompt}` }
        ]);
        return result || 'PDF 파일을 분석할 수 없습니다.';
      } catch (error) {
        console.error('PDF processing error:', error);
        return `PDF 파일 처리 중 오류가 발생했습니다: ${file.name}`;
      }
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      const result = await createChatCompletion([
        { role: 'system', content: 'You are analyzing CSV data. Provide insights and answer questions about the data.' },
        { role: 'user', content: `CSV Data:\n${text}\n\nQuestion: ${prompt}` }
      ]);
      return result || 'CSV 파일을 분석할 수 없습니다.';
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      return `Excel file analysis for ${file.name}: ${prompt}\n[Note: Excel parsing requires additional libraries]`;
    } else {
      const text = await file.text();
      const result = await createChatCompletion([
        { role: 'user', content: `File content:\n${text}\n\nQuestion: ${prompt}` }
      ]);
      return result || '파일을 분석할 수 없습니다.';
    }
  } catch (error) {
    console.error('File Analysis Error:', error);
    return '파일 분석 중 오류가 발생했습니다.';
  }
}