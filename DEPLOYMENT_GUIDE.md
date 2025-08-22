# TeamPulse 배포 가이드 - 완전한 프로덕션 환경 구축

## 🔴 현재 상황

### 문제점:
1. **백엔드가 로컬에서만 실행됨** (localhost:5001)
2. **Redis가 로컬 Docker에 의존**
3. **Firebase Hosting은 정적 파일(React)만 호스팅**
4. **API 서버가 없어서 AI 채팅, DB 작업 불가능**

### 현재 배포된 것:
- ✅ 프론트엔드 (React): https://teampulse-61474.web.app
- ❌ 백엔드 API: 없음 (로컬에서만 실행)
- ❌ Redis: 없음 (로컬 Docker)

## ✅ 완전한 프로덕션 배포 솔루션

### 옵션 1: Firebase Functions (추천) 🌟

**구조:**
```
Firebase Hosting (React) 
    ↓
Firebase Functions (API)
    ↓
Firestore + Firebase Cache
```

**장점:**
- 서버 관리 불필요
- 자동 스케일링
- 사용량 기반 과금
- Firebase와 완벽 통합

**설정 방법:**
```bash
# 1. Firebase Functions 초기화
firebase init functions

# 2. Functions 배포
firebase deploy --only functions

# 3. 프론트엔드 API URL 변경
# .env.production
REACT_APP_API_URL=https://us-central1-teampulse-61474.cloudfunctions.net/api
```

### 옵션 2: Google Cloud Run + Memorystore

**구조:**
```
Firebase Hosting (React)
    ↓
Cloud Run (백엔드 컨테이너)
    ↓
Memorystore (관리형 Redis) + Firestore
```

**장점:**
- 현재 코드 그대로 사용
- Redis 지원
- 컨테이너 기반 배포

**설정 방법:**
```bash
# 1. Dockerfile 생성
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
EXPOSE 8080
CMD ["npm", "start"]

# 2. Cloud Run 배포
gcloud run deploy teampulse-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated

# 3. Memorystore Redis 생성
gcloud redis instances create teampulse-cache \
  --size=1 \
  --region=us-central1

# 4. 환경 변수 설정
gcloud run services update teampulse-api \
  --set-env-vars REDIS_URL=redis://[REDIS_IP]:6379
```

### 옵션 3: Vercel/Netlify Functions + Upstash Redis

**구조:**
```
Vercel/Netlify (React + API Functions)
    ↓
Upstash Redis (서버리스 Redis) + Firestore
```

**장점:**
- 간단한 배포
- 서버리스 Redis 지원
- 무료 티어 제공

**설정 방법:**
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. API 폴더 구조 생성
mkdir api
cp -r backend/src/* api/

# 3. vercel.json 설정
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  }
}

# 4. 배포
vercel --prod
```

## 🎯 즉시 적용 가능한 솔루션: Firebase Functions

### Step 1: Functions 설정
```bash
cd /Users/pablokim/teampulse
firebase init functions
# JavaScript 선택
# ESLint Yes
# Install dependencies Yes
```

### Step 2: package.json 수정
```json
{
  "name": "functions",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.28.0"
  }
}
```

### Step 3: 백엔드 코드 복사
```bash
# Routes 복사
cp -r backend/src/routes functions/
# Services 복사
cp -r backend/src/services functions/
# Utils 복사
cp -r backend/src/utils functions/
```

### Step 4: Functions 배포
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 5: 프론트엔드 API URL 업데이트
```javascript
// src/config/firebase.js
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-teampulse-61474.cloudfunctions.net/api'
  : 'http://localhost:5001/api';
```

## 💰 비용 비교

| 옵션 | 월 예상 비용 | 장점 | 단점 |
|------|------------|------|------|
| Firebase Functions | $0-50 | 서버리스, 자동 스케일링 | Cold start, Redis 없음 |
| Cloud Run + Memorystore | $30-100 | Redis 지원, 빠른 응답 | 설정 복잡 |
| Vercel + Upstash | $0-20 | 간단한 배포, Redis 지원 | 벤더 종속 |
| VPS (DigitalOcean) | $20-40 | 완전한 제어 | 서버 관리 필요 |

## 🚀 권장 마이그레이션 경로

### Phase 1: Firebase Functions (즉시)
- 현재 백엔드를 Functions로 마이그레이션
- Firestore 캐시 사용
- 비용: 거의 무료

### Phase 2: Cloud Run (성장기)
- 사용자 증가 시 Cloud Run으로 전환
- Memorystore Redis 추가
- 비용: $30-50/월

### Phase 3: Kubernetes (대규모)
- GKE로 전체 마이그레이션
- 마이크로서비스 아키텍처
- 비용: $100+/월

## ⚡ 빠른 시작 (5분 안에 배포)

```bash
# 1. Firebase Functions 초기화
firebase init functions

# 2. 간단한 API 엔드포인트 생성
echo "exports.api = require('./backend/src/index');" > functions/index.js

# 3. 배포
firebase deploy --only functions

# 4. 테스트
curl https://us-central1-teampulse-61474.cloudfunctions.net/api/health
```

## 📱 프론트엔드 수정 사항

```javascript
// src/services/api.js
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-teampulse-61474.cloudfunctions.net/api'
  : 'http://localhost:5001/api';

// AI 채팅 API 호출 예시
const sendAIMessage = async (message) => {
  const response = await fetch(`${API_BASE}/ai-chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  return response.json();
};
```

## 🔧 환경 변수 설정

### Firebase Functions 환경 변수:
```bash
firebase functions:config:set \
  openai.key1="sk-..." \
  openai.key2="sk-..." \
  anthropic.key1="sk-ant-..." \
  anthropic.key2="sk-ant-..."
```

### 프로덕션 환경 변수:
```env
# .env.production
REACT_APP_API_URL=https://us-central1-teampulse-61474.cloudfunctions.net/api
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
```

## ✅ 체크리스트

- [ ] Firebase Functions 초기화
- [ ] 백엔드 코드를 Functions로 마이그레이션
- [ ] 환경 변수 설정
- [ ] Functions 배포
- [ ] 프론트엔드 API URL 업데이트
- [ ] 프론트엔드 재배포
- [ ] 엔드투엔드 테스트
- [ ] 모니터링 설정

## 🎉 완료 후 상태

- ✅ 프론트엔드: https://teampulse-61474.web.app
- ✅ 백엔드 API: https://us-central1-teampulse-61474.cloudfunctions.net/api
- ✅ 데이터베이스: Firestore
- ✅ 캐시: Firestore Cache / Memorystore
- ✅ 파일 저장소: Firebase Storage
- ✅ 인증: Firebase Auth

이제 컴퓨터를 꺼도 서비스가 24/7 동작합니다! 🚀