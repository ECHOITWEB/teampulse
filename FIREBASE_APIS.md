# Firebase에 필요한 Google Cloud APIs

TeamPulse 프로젝트에서 활성화해야 할 API 목록입니다.

## 핵심 Firebase API (필수)

1. **Firebase Management API**
   - Firebase 프로젝트 관리
   - https://console.cloud.google.com/apis/library/firebase.googleapis.com

2. **Firebase Hosting API**
   - 웹 호스팅 서비스
   - https://console.cloud.google.com/apis/library/firebasehosting.googleapis.com

3. **Cloud Firestore API**
   - NoSQL 데이터베이스
   - https://console.cloud.google.com/apis/library/firestore.googleapis.com

4. **Firebase Authentication API** (Identity Toolkit API)
   - 사용자 인증
   - https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com

## 추가 API (선택)

5. **Cloud Storage API**
   - 파일 저장소
   - https://console.cloud.google.com/apis/library/storage-api.googleapis.com

6. **Firebase Cloud Messaging API**
   - 푸시 알림
   - https://console.cloud.google.com/apis/library/fcm.googleapis.com

7. **Firebase Functions API** (Cloud Functions API)
   - 서버리스 함수
   - https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com

## 활성화 방법

### 옵션 1: Google Cloud Console에서 직접 활성화
1. https://console.cloud.google.com 접속
2. TeamPulse 프로젝트 선택
3. 각 API 링크 클릭 → "사용" 버튼 클릭

### 옵션 2: gcloud CLI 사용
```bash
# gcloud 설치 후
gcloud config set project YOUR_PROJECT_ID

# API 활성화
gcloud services enable firebase.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
```

### 옵션 3: Firebase Console
Firebase Console에서 프로젝트를 추가하면 자동으로 필요한 API들이 활성화됩니다.