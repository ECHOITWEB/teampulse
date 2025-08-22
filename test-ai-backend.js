// Test script for backend AI functionality
const fetch = require('node-fetch');

const API_URL = 'https://api-wuaopczwva-uc.a.run.app'; // Your Firebase Functions URL
const TEST_TOKEN = 'test-token'; // You'll need to get a real token from the app

const testCases = [
  {
    name: 'Test GPT-5 with default settings',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Write a haiku about code',
      model: 'gpt-5',
      workspaceId: 'test-workspace',
      channelId: 'test-channel'
    }
  },
  {
    name: 'Test GPT-5-mini with low verbosity',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Quick answer: What is 2+2?',
      model: 'gpt-5-mini',
      workspaceId: 'test-workspace',
      channelId: 'test-channel',
      reasoningEffort: 'low',
      textVerbosity: 'low'
    }
  },
  {
    name: 'Test GPT-5-nano',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Hello, how are you?',
      model: 'gpt-5-nano',
      workspaceId: 'test-workspace',
      channelId: 'test-channel'
    }
  },
  {
    name: 'Test Claude Opus 4.1',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Explain quantum computing in simple terms',
      model: 'claude-opus-4-1-20250805',
      workspaceId: 'test-workspace',
      channelId: 'test-channel'
    }
  },
  {
    name: 'Test Claude Sonnet',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'What are the benefits of TypeScript?',
      model: 'claude-sonnet-4-20250514',
      workspaceId: 'test-workspace',
      channelId: 'test-channel'
    }
  },
  {
    name: 'Test GPT-4o (fallback)',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Describe the weather today',
      model: 'gpt-4o',
      workspaceId: 'test-workspace',
      channelId: 'test-channel'
    }
  },
  {
    name: 'Test high reasoning effort',
    endpoint: '/api/chat/ai',
    method: 'POST',
    body: {
      command: 'ai',
      prompt: 'Find the bug in this code: function factorial(n) { if (n = 0) return 1; return n * factorial(n - 1); }',
      model: 'gpt-5',
      workspaceId: 'test-workspace',
      channelId: 'test-channel',
      reasoningEffort: 'high'
    }
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`   Model: ${testCase.body.model}`);
  console.log(`   Prompt: ${testCase.body.prompt}`);
  
  try {
    const response = await fetch(`${API_URL}${testCase.endpoint}`, {
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(testCase.body)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success!`);
      console.log(`   Response: ${result.data?.content?.substring(0, 100)}...`);
      console.log(`   Tokens: Input=${result.data?.usage?.inputTokens}, Output=${result.data?.usage?.outputTokens}`);
      console.log(`   Cost: $${result.data?.usage?.cost?.toFixed(4) || 'N/A'}`);
      return { success: true, testCase, result };
    } else {
      console.log(`   ❌ Failed: ${response.status} - ${result.error || result.message}`);
      return { success: false, testCase, error: result };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, testCase, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Backend AI Tests');
  console.log('================================');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n📊 Test Summary');
  console.log('================================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.testCase.name}: ${r.error?.message || JSON.stringify(r.error)}`);
    });
  }
  
  console.log('\n🏁 Testing Complete!');
}

// Run tests
runAllTests().catch(console.error);