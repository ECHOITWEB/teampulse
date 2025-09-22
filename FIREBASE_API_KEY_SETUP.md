# Firebase API Key Setup Guide

## 🔐 보안 알림
Google Cloud Platform에서 GitHub에 노출된 API 키를 감지했습니다. 
이제 Firebase 설정이 환경 변수를 사용하도록 변경되었습니다.

## 📋 새 API 키 생성 방법

### 1. Firebase Console에서 새 API 키 생성

1. [Firebase Console](https://console.firebase.google.com/)에 로그인
2. TeamPulse 프로젝트 선택 (teampulse-61474)
3. 프로젝트 설정 > 일반 탭으로 이동
4. 아래로 스크롤하여 "내 앱" 섹션 확인
5. 웹 앱 섹션에서 API 키 확인

### 2. Google Cloud Console에서 이전 키 비활성화

1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인
2. TeamPulse 프로젝트 선택
3. APIs & Services > Credentials로 이동
4. 노출된 키 (AIzaSyDntelxrvxbDGP7eWASajYPtJJUwveQ7FQ) 찾기
5. 해당 키 클릭 > "삭제" 또는 "비활성화"

### 3. 새 API 키 생성 (필요한 경우)

Google Cloud Console에서:
1. APIs & Services > Credentials
2. "+ CREATE CREDENTIALS" > "API key" 클릭
3. 새 키 생성 후 즉시 제한 설정

### 4. API 키 제한 설정 (중요!)

1. 생성된 API 키 클릭
2. "Application restrictions" 섹션:
   - "HTTP referrers" 선택
   - 다음 도메인 추가:
     - `https://teampulse-61474.firebaseapp.com/*`
     - `https://teampulse-61474.web.app/*`
     - `http://localhost:3000/*` (개발용)
3. "API restrictions" 섹션:
   - "Restrict key" 선택
   - 다음 API만 선택:
     - Firebase Auth API
     - Cloud Firestore API
     - Firebase Realtime Database API
     - Cloud Storage API
4. "SAVE" 클릭

## 🔧 로컬 환경 설정

1. 프로젝트 루트에 `.env` 파일 생성 (이미 있다면 수정)
2. 다음 내용 추가:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=여기에_새_API_키_입력
REACT_APP_FIREBASE_AUTH_DOMAIN=teampulse-61474.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=teampulse-61474
REACT_APP_FIREBASE_STORAGE_BUCKET=teampulse-61474.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=96569153819
REACT_APP_FIREBASE_APP_ID=1:96569153819:web:e488999f9d9c2cab295bbe
REACT_APP_FIREBASE_MEASUREMENT_ID=G-C5P674RG81
```

3. 앱 재시작:
```bash
npm start
```

## 📱 프로덕션 환경 설정

Firebase Hosting 환경 변수 설정:
```bash
firebase functions:config:set firebase.api_key="새_API_키"
firebase deploy --only functions
```

## ✅ 변경사항 확인

- `src/config/firebase.ts` 파일이 이제 환경 변수를 사용합니다
- API 키가 더 이상 소스 코드에 하드코딩되어 있지 않습니다
- `.gitignore`에 `.env` 파일이 포함되어 있어 git에 커밋되지 않습니다

## 🚨 주의사항

- **절대로** `.env` 파일을 git에 커밋하지 마세요
- API 키는 항상 환경 변수로 관리하세요
- 프로덕션 환경에서는 반드시 API 키 제한을 설정하세요
- 정기적으로 키를 교체하는 것을 권장합니다

## 📞 문제 발생 시

Firebase Console > Project Settings에서 웹 앱 구성을 다시 확인하거나,
Google Cloud Console > APIs & Services > Credentials에서 API 키 설정을 검토하세요.