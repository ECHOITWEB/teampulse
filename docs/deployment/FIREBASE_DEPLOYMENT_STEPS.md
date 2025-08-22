# Firebase 배포 가이드

## 현재 상황
- Firebase Tools 설치 완료 ✅
- 앱 빌드 완료 ✅
- Firebase 프로젝트 연결 필요 ❌

## 배포 단계

### 1. Firebase 프로젝트 확인
현재 로그인된 계정에 `teampulse-61474` 프로젝트가 없습니다.

다음 중 하나를 선택하세요:

#### 옵션 A: 기존 프로젝트 사용
```bash
# 다른 계정으로 로그인
firebase logout
firebase login

# 프로젝트 목록 확인
firebase projects:list
```

#### 옵션 B: 새 프로젝트 생성
```bash
# Firebase Console에서 프로젝트 생성
# https://console.firebase.google.com

# 또는 CLI로 생성
firebase projects:create teampulse-new --display-name "TeamPulse"
```

### 2. 프로젝트 설정 변경
`.firebaserc` 파일을 수정하여 사용 가능한 프로젝트로 변경:

```json
{
  "projects": {
    "default": "YOUR-PROJECT-ID"
  }
}
```

### 3. Firebase 초기화
```bash
# 프로젝트 초기화
firebase init hosting

# 다음 옵션 선택:
# - Use an existing project
# - What do you want to use as your public directory? build
# - Configure as a single-page app? Yes
# - Set up automatic builds and deploys with GitHub? No
```

### 4. 배포
```bash
# 호스팅 배포
firebase deploy --only hosting
```

## 대안: 다른 프로젝트 사용

현재 사용 가능한 프로젝트:
- `nwitter-8e81b`
- `seedbasket-342ca`

이 중 하나를 사용하려면:
```bash
# .firebaserc 파일 수정
echo '{
  "projects": {
    "default": "nwitter-8e81b"
  }
}' > .firebaserc

# 배포
firebase deploy --only hosting
```

## 배포 후 URL
배포가 완료되면 다음과 같은 URL에서 접속 가능:
- https://YOUR-PROJECT-ID.web.app
- https://YOUR-PROJECT-ID.firebaseapp.com