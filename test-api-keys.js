// API 키 테스트 스크립트
const dotenv = require('dotenv');
dotenv.config();

console.log('=== API Keys Test ===\n');

// OpenAI API 키 확인
const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
console.log('OpenAI API Key:', openaiKey ? `✅ Loaded (${openaiKey.slice(0, 10)}...)` : '❌ Missing');

// Anthropic API 키 확인
const anthropicKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
console.log('Anthropic API Key:', anthropicKey ? `✅ Loaded (${anthropicKey.slice(0, 10)}...)` : '❌ Missing');

// OpenAI API 테스트
async function testOpenAI() {
  if (!openaiKey) {
    console.log('\n❌ OpenAI: Cannot test - API key missing');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`
      }
    });
    
    if (response.ok) {
      console.log('\n✅ OpenAI: API key is valid');
    } else {
      const error = await response.text();
      console.log('\n❌ OpenAI: API key is invalid', response.status, error.slice(0, 100));
    }
  } catch (error) {
    console.log('\n❌ OpenAI: Test failed', error.message);
  }
}

// Anthropic API 테스트
async function testAnthropic() {
  if (!anthropicKey) {
    console.log('\n❌ Anthropic: Cannot test - API key missing');
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{role: 'user', content: 'Hi'}],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      console.log('\n✅ Anthropic: API key is valid');
    } else {
      const error = await response.text();
      console.log('\n❌ Anthropic: API key is invalid', response.status, error.slice(0, 100));
    }
  } catch (error) {
    console.log('\n❌ Anthropic: Test failed', error.message);
  }
}

// 테스트 실행
(async () => {
  await testOpenAI();
  await testAnthropic();
  console.log('\n=== Test Complete ===');
})();