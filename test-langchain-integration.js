// LangChain 통합 테스트 스크립트
const dotenv = require('dotenv');
dotenv.config();

// API 키 확인
const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
const anthropicKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

console.log('=== LangChain Integration Test ===\n');
console.log('API Keys:');
console.log('OpenAI:', openaiKey ? `✅ Loaded (${openaiKey.slice(0, 10)}...)` : '❌ Missing');
console.log('Anthropic:', anthropicKey ? `✅ Loaded (${anthropicKey.slice(0, 10)}...)` : '❌ Missing');

// OpenAI 모델 테스트
async function testOpenAIModel(model) {
  console.log(`\nTesting OpenAI Model: ${model}`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are Pulse AI, a helpful assistant in TeamPulse.' },
          { role: 'user', content: '안녕하세요! 오늘 날씨가 어떤가요?' }
        ],
        max_tokens: 100
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${model} works!`);
      console.log(`Response: ${data.choices[0].message.content.slice(0, 100)}...`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${model} failed:`, response.status);
      if (error.includes('model_not_found')) {
        console.log('   Model not available or incorrect name');
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${model} error:`, error.message);
    return false;
  }
}

// Anthropic 모델 테스트
async function testAnthropicModel(model) {
  console.log(`\nTesting Anthropic Model: ${model}`);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: '안녕하세요! 오늘 날씨가 어떤가요?' }
        ],
        max_tokens: 100
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${model} works!`);
      console.log(`Response: ${data.content[0].text.slice(0, 100)}...`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${model} failed:`, response.status);
      if (error.includes('model_not_found')) {
        console.log('   Model not available or incorrect name');
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${model} error:`, error.message);
    return false;
  }
}

// 모든 모델 테스트
async function testAllModels() {
  console.log('\n=== Testing All Models ===');
  
  // OpenAI 모델들
  const openaiModels = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
  ];
  
  // Anthropic 모델들
  const anthropicModels = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  console.log('\n--- OpenAI Models ---');
  const openaiResults = [];
  for (const model of openaiModels) {
    const result = await testOpenAIModel(model);
    openaiResults.push({ model, success: result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n--- Anthropic Models ---');
  const anthropicResults = [];
  for (const model of anthropicModels) {
    const result = await testAnthropicModel(model);
    anthropicResults.push({ model, success: result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  // 결과 요약
  console.log('\n=== Test Results Summary ===');
  console.log('\nOpenAI Models:');
  openaiResults.forEach(r => {
    console.log(`  ${r.model}: ${r.success ? '✅ Working' : '❌ Failed'}`);
  });
  
  console.log('\nAnthropic Models:');
  anthropicResults.forEach(r => {
    console.log(`  ${r.model}: ${r.success ? '✅ Working' : '❌ Failed'}`);
  });

  // 추천 모델
  console.log('\n=== Recommended Models ===');
  const workingOpenAI = openaiResults.filter(r => r.success);
  const workingAnthropic = anthropicResults.filter(r => r.success);
  
  if (workingOpenAI.length > 0) {
    console.log(`OpenAI: Use "${workingOpenAI[0].model}"`);
  } else {
    console.log('OpenAI: No working models found');
  }
  
  if (workingAnthropic.length > 0) {
    console.log(`Anthropic: Use "${workingAnthropic[0].model}"`);
  } else {
    console.log('Anthropic: No working models found');
  }
}

// 테스트 실행
(async () => {
  await testAllModels();
  console.log('\n=== Test Complete ===');
})();