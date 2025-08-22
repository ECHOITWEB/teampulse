# Firebase 올바른 계정으로 로그인 가이드

## 현재 상황
- 현재 로그아웃 상태
- `echoitplanning1@gmail.com` 계정으로 로그인 필요
- 이 계정에 `teampulse-61474` 프로젝트가 있음

## 로그인 및 배포 단계

### 1. Firebase 로그인
터미널에서 실행:
```bash
firebase login
```

브라우저가 열리면:
- `echoitplanning1@gmail.com` 계정 선택
- 권한 허용

### 2. 올바른 계정인지 확인
```bash
firebase login:list
```
현재 로그인된 계정이 `echoitplanning1@gmail.com`인지 확인

### 3. 프로젝트 목록 확인
```bash
firebase projects:list
```
`teampulse-61474` 프로젝트가 있는지 확인

### 4. TeamPulse 배포
```bash
firebase deploy --only hosting
```

## 배포 성공 시 URL
- https://teampulse-61474.web.app
- https://teampulse-61474.firebaseapp.com

## 주의사항
- 브라우저에서 여러 Google 계정이 로그인되어 있다면, 올바른 계정(`echoitplanning1@gmail.com`)을 선택하세요
- 기존에 다른 계정으로 로그인되어 있었다면, 브라우저 캐시를 지우거나 시크릿 모드를 사용하세요