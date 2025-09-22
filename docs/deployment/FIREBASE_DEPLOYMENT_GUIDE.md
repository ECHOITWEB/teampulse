# Firebase 배포 가이드

## 현재 상태
- ✅ Firebase Tools 설치 완료
- ✅ firebase.json 설정 완료
- ✅ 프론트엔드 빌드 완료
- ⏳ Firebase 로그인 필요
- ⏳ Firebase Functions 설정 필요

## 배포 단계

### 1. Firebase 로그인
터미널에서 다음 명령어 실행:
```bash
firebase login
```
브라우저가 열리면 Google 계정으로 로그인

### 2. 프론트엔드만 먼저 배포 (권장)
```bash
# Firebase Hosting에 프론트엔드만 배포
firebase deploy --only hosting
```

배포 후 제공되는 URL로 접속 가능:
- https://teampulse-61474.web.app
- https://teampulse-61474.firebaseapp.com

### 3. 백엔드 배포 옵션

#### 옵션 1: Firebase Functions (서버리스)
백엔드를 Firebase Functions로 변환하여 배포
- 장점: 서버 관리 불필요, 자동 스케일링
- 단점: 코드 수정 필요, Cold start 이슈

#### 옵션 2: Google Cloud Run
현재 Express 서버를 그대로 사용
- 장점: 코드 수정 최소화
- 단점: 별도 설정 필요

#### 옵션 3: 외부 서버 (Heroku, AWS, etc.)
별도의 서버에 백엔드 배포
- 장점: 완전한 제어
- 단점: 서버 관리 필요

### 4. 환경 변수 설정

#### 프론트엔드 환경 변수
`.env.production` 파일 생성:
```env
REACT_APP_API_URL=https://your-backend-url.com/api
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=teampulse-61474.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=teampulse-61474
```

#### 백엔드 환경 변수 (Firebase Functions 사용 시)
```bash
firebase functions:config:set \
  db.host="your-mysql-host" \
  db.user="your-mysql-user" \
  db.password="your-mysql-password" \
  jwt.secret="your-jwt-secret"
```

### 5. 데이터베이스 설정
프로덕션 MySQL 데이터베이스 필요:
- Google Cloud SQL (권장)
- PlanetScale
- AWS RDS
- 기타 MySQL 호스팅

### 6. 도메인 설정 (선택사항)
커스텀 도메인 연결:
```bash
firebase hosting:channel:deploy production
```

Firebase Console > Hosting > 도메인 추가

## 빠른 시작 (프론트엔드만)

1. Firebase 로그인
```bash
firebase login
```

2. 프론트엔드 배포
```bash
firebase deploy --only hosting
```

3. 배포된 URL 확인 및 테스트

## 주의사항
- 프로덕션 환경에서는 실제 데이터베이스 사용 필요
- CORS 설정 업데이트 필요 (백엔드)
- 환경 변수를 프로덕션 값으로 변경
- SSL 인증서는 Firebase Hosting이 자동 제공

## 백엔드 배포 관련
백엔드는 별도의 서버나 클라우드 서비스에 배포해야 합니다.
Firebase Functions로 변환하려면 추가 작업이 필요합니다.