# Firebase 설정 완료 및 다음 단계

## ✅ 완료된 작업

1. **Frontend Firebase 설정**
   - Firebase SDK 설치 완료
   - Firebase 설정 파일 업데이트 완료 (firebase.ts)
   - Google Analytics 통합

2. **Backend Firebase Admin SDK**
   - Firebase Admin SDK 설치 완료
   - 인증 미들웨어 구현 완료

## 📋 다음 단계

### 1. Firebase Service Account 키 생성

1. [Firebase Console](https://console.firebase.google.com/project/teampulse-61474/settings/serviceaccounts/adminsdk)로 이동
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. 파일을 `backend/src/config/serviceAccountKey.json`으로 저장

### 2. Google 인증 활성화

1. [Firebase Console > Authentication](https://console.firebase.google.com/project/teampulse-61474/authentication/providers)로 이동
2. "로그인 방법" 탭 선택
3. "Google" 선택하고 활성화
4. 프로젝트 공개 이름 설정
5. 지원 이메일 선택
6. 저장

### 3. 환경변수 설정

```bash
# Backend (.env)
FIREBASE_PROJECT_ID=teampulse-61474

# Frontend (.env.local) - 이미 설정됨
# Firebase 설정이 하드코딩되어 있음
```

### 4. 데이터베이스 스키마 적용

```bash
cd backend
chmod +x apply-workspace-schema.sh
./apply-workspace-schema.sh
```

### 5. 애플리케이션 실행

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd ..
npm start
```

### 6. 테스트

1. http://localhost:3000 접속
2. "Sign in with Google" 클릭
3. Google 계정으로 로그인
4. 워크스페이스 생성 및 팀원 초대 테스트

## 🔐 보안 주의사항

- `serviceAccountKey.json` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 이미 추가되어 있지만 확인 필요
- 프로덕션에서는 환경변수로 관리하세요

## 🚀 추가 기능 (선택사항)

1. **이메일 인증**: Firebase Authentication에서 이메일/비밀번호 로그인 활성화
2. **소셜 로그인**: GitHub, Microsoft 등 추가 OAuth 제공자
3. **다중 인증**: 2FA (Two-Factor Authentication) 설정
4. **사용자 프로필**: Firestore에 추가 사용자 정보 저장