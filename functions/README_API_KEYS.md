# Firebase Functions API Key Configuration

## API 키 설정 방법

Firebase Functions에서 API 키를 안전하게 관리하기 위해 환경 변수를 사용합니다.

### 1. OpenAI API Keys 설정

```bash
firebase functions:config:set \
  openai.key1="sk-proj-YOUR_NEW_OPENAI_KEY1" \
  openai.key2="sk-proj-YOUR_NEW_OPENAI_KEY2" \
  openai.key3="sk-proj-YOUR_NEW_OPENAI_KEY3"
```

### 2. Anthropic API Keys 설정

```bash
firebase functions:config:set \
  anthropic.key1="sk-ant-api03-YOUR_NEW_ANTHROPIC_KEY1" \
  anthropic.key2="sk-ant-api03-YOUR_NEW_ANTHROPIC_KEY2" \
  anthropic.key3="sk-ant-api03-YOUR_NEW_ANTHROPIC_KEY3"
```

### 3. 설정 확인

```bash
firebase functions:config:get
```

### 4. Functions 재배포

```bash
firebase deploy --only functions
```

## 중요 사항

- **절대로** API 키를 코드에 하드코딩하지 마세요
- 모든 API 키는 Firebase Functions config를 통해 관리되어야 합니다
- 키는 3개씩 로테이션되도록 설정되어 있습니다
- 키가 노출되었거나 비활성화된 경우 즉시 새로 발급받아 설정해야 합니다

## API Key Manager 동작 방식

`apiKeyManager.js`는 다음과 같이 동작합니다:

1. Firebase Functions config에서 키를 읽어옵니다
2. 키가 없으면 경고 메시지를 출력합니다
3. 여러 키를 로테이션하며 사용합니다
4. 키 오류 발생 시 자동으로 다른 키로 전환합니다
5. 키 상태를 추적하여 문제가 있는 키는 일시적으로 비활성화합니다

## 키 발급 방법

### OpenAI API Keys
1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. "Create new secret key" 클릭
3. 키 이름 설정 (예: teampulse-1, teampulse-2, teampulse-3)
4. 생성된 키 복사

### Anthropic API Keys
1. [Anthropic Console](https://console.anthropic.com/settings/keys) 접속
2. "Create Key" 클릭
3. 키 이름 설정 (예: teampulse-1, teampulse-2, teampulse-3)
4. 생성된 키 복사

## 보안 권장사항

1. **키 권한 제한**: 필요한 최소한의 권한만 부여
2. **IP 제한**: 가능하면 Firebase Functions의 IP 범위로 제한
3. **정기 교체**: 3-6개월마다 키 교체
4. **모니터링**: 사용량과 비정상적인 활동 모니터링
5. **즉시 조치**: 노출 시 즉시 키 비활성화 및 교체