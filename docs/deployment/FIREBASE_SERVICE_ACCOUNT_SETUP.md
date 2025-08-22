# Firebase Service Account 키 설정 가이드

## Service Account 키 파일 위치

Firebase Console에서 다운로드한 Service Account 키 파일은 다음 위치에 저장해야 합니다:

```
/Users/pablokim/teampulse/backend/src/config/serviceAccountKey.json
```

## 파일 생성 방법

1. [Firebase Console](https://console.firebase.google.com/project/teampulse-61474/settings/serviceaccounts/adminsdk)로 이동

2. "새 비공개 키 생성" 버튼 클릭

3. JSON 파일이 자동으로 다운로드됩니다

4. 다운로드된 파일을 위의 경로로 복사:
   ```bash
   # 예시 (다운로드 폴더에서)
   cp ~/Downloads/teampulse-61474-***.json /Users/pablokim/teampulse/backend/src/config/serviceAccountKey.json
   ```

## 보안 주의사항

- 이 파일은 매우 민감한 정보를 포함하고 있습니다
- 절대 Git에 커밋하지 마세요 (이미 .gitignore에 추가되어 있음)
- 프로덕션 환경에서는 환경 변수로 관리하는 것을 권장합니다

## 파일 구조 예시

```json
{
  "type": "service_account",
  "project_id": "teampulse-61474",
  "private_key_id": "키ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\n개인키\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@teampulse-61474.iam.gserviceaccount.com",
  "client_id": "클라이언트ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "인증서URL"
}
```

## 파일 설정 후

파일을 올바른 위치에 저장한 후:

```bash
cd /Users/pablokim/teampulse/backend
npm start
```

서버가 정상적으로 시작되면 "Firebase Admin SDK initialized successfully" 메시지가 표시됩니다.