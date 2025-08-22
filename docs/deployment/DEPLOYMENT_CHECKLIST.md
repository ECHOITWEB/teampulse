# TeamPulse 배포 체크리스트

## 🔍 배포 전 확인사항

### 1. 코드 품질
- [x] TypeScript 컴파일 오류 없음
- [x] ESLint 경고 최소화
- [x] 빌드 성공 확인 (`npm run build`)

### 2. 환경 설정
- [x] `.env.production` 파일 설정 완료
  - API URL이 프로덕션 주소로 설정됨
  - Firebase 설정 정보 확인
- [x] Firebase 프로젝트 ID 확인 (`teampulse-61474`)

### 3. 최적화
- [x] 코드 스플리팅 구현 (App.lazy.tsx 사용 가능)
- [x] 이미지 최적화
- [x] CSS 최적화 (Tailwind purge 자동 적용)

### 4. 보안
- [x] 환경 변수에 민감한 정보 없음
- [x] API 키가 Firebase 보안 규칙으로 보호됨
- [x] HTTPS 사용 (Firebase Hosting 자동 제공)

### 5. 기능 테스트
- [ ] 로그인/로그아웃 기능
- [ ] 팀 채팅 기능
- [ ] 목표 관리 기능
- [ ] 업무 관리 기능
- [ ] AI 도구 기능
- [ ] 반응형 디자인 (모바일, 태블릿, 데스크톱)

## 🚀 배포 절차

### 1. 사전 준비
```bash
# Firebase 계정 확인
firebase login:list

# 올바른 계정으로 로그인 (echoitplanning1@gmail.com)
firebase logout
firebase login
```

### 2. 빌드
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la build/
```

### 3. 배포
```bash
# 배포 스크립트 실행
npm run deploy

# 또는 직접 배포
firebase deploy --only hosting --project teampulse-61474
```

### 4. 배포 후 확인
- [ ] https://teampulse-61474.web.app 접속 확인
- [ ] https://teampulse-61474.firebaseapp.com 접속 확인
- [ ] 주요 기능 동작 테스트
- [ ] 콘솔 오류 확인

## 📊 성능 모니터링

### Firebase Console에서 확인
1. [Firebase Console](https://console.firebase.google.com/project/teampulse-61474/overview) 접속
2. Hosting 섹션에서 배포 상태 확인
3. Analytics에서 사용자 활동 모니터링
4. Performance Monitoring에서 성능 지표 확인

## 🔧 문제 해결

### 일반적인 문제
1. **빌드 실패**: `rm -rf node_modules && npm install`
2. **배포 권한 오류**: Firebase 계정 재로그인
3. **404 오류**: `firebase.json`의 rewrites 설정 확인
4. **API 연결 실패**: `.env.production`의 API URL 확인

### 롤백 절차
```bash
# Firebase Console에서 이전 버전으로 롤백
# Hosting > Release History에서 이전 버전 선택 후 "Rollback" 클릭
```

## 📱 추가 최적화 제안

1. **이미지 최적화**
   - WebP 형식 사용
   - 적절한 크기로 리사이징
   - Lazy loading 구현

2. **번들 크기 줄이기**
   - 사용하지 않는 dependencies 제거
   - Tree shaking 활용
   - Dynamic imports 추가

3. **캐싱 전략**
   - Service Worker 구현
   - 정적 자산 캐싱
   - API 응답 캐싱

4. **성능 모니터링**
   - Lighthouse CI 설정
   - Web Vitals 모니터링
   - Error tracking 구현