# 📊 TeamPulse Firebase 데이터 구조 문서

## 🗂️ Firestore 컬렉션 구조

### 1. channels (채널)
```javascript
channels/{channelId}
{
  id: string,                    // 채널 고유 ID
  workspace_id: string,          // 워크스페이스 ID
  name: string,                  // 채널명 (예: "general", "marketing")
  description?: string,          // 채널 설명
  type: 'public' | 'private',    // 채널 유형
  members: string[],             // 멤버 ID 배열
  owner_id: string,              // 채널 소유자 ID
  ai_enabled: boolean,           // AI 활성화 여부
  ai_config?: {                  // AI 설정 (ai_enabled가 true일 때)
    provider: 'openai' | 'anthropic',
    model: string,               // 모델명 (예: "gpt-4", "claude-3-opus")
    temperature?: number,
    max_tokens?: number
  },
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### 2. chat_messages (채팅 메시지)
```javascript
chat_messages/{messageId}
{
  id: string,                    // 메시지 고유 ID
  channel_id: string,            // 채널 ID (일반 채널 또는 DM 채널)
  workspace_id: string,          // 워크스페이스 ID
  user_id: string,               // 발신자 ID
  user_name: string,             // 발신자 이름
  user_avatar?: string,          // 발신자 아바타 URL
  content: string,               // 메시지 내용
  type: 'text' | 'system' | 'ai' | 'image' | 'file' | 'code',
  ai_model?: string,             // AI 메시지인 경우 사용된 모델
  
  // 멀티모달 관련 필드
  attachments?: [{
    type: 'image' | 'file' | 'document',
    url: string,                 // Firebase Storage URL
    name: string,                // 파일명
    size?: number,               // 파일 크기 (bytes)
    mime_type?: string,          // MIME 타입
    preview?: string,            // 미리보기 URL (이미지)
    metadata?: {                 // 추가 메타데이터
      width?: number,
      height?: number,
      duration?: number,         // 비디오/오디오 길이
      pages?: number            // 문서 페이지 수
    }
  }],
  
  // 메시지 상태
  edited?: boolean,              // 수정 여부
  edited_at?: Timestamp,         // 수정 시간
  deleted?: boolean,             // 삭제 여부
  deleted_at?: Timestamp,        // 삭제 시간
  
  // 반응 및 스레드
  reactions?: [{
    emoji: string,
    users: string[]              // 반응한 사용자 ID 배열
  }],
  thread_id?: string,            // 스레드 ID (답글인 경우)
  thread_count?: number,         // 답글 수
  
  created_at: Timestamp,
  updated_at?: Timestamp
}
```

### 3. workspaces (워크스페이스)
```javascript
workspaces/{workspaceId}
{
  id: string,
  company_id: string,
  company_name: string,
  name: string,
  description?: string,
  type: 'headquarters' | 'team' | 'project' | 'subsidiary',
  is_main: boolean,
  owner_id: string,
  admin_ids: string[],
  plan: 'free' | 'starter' | 'pro',
  settings: {
    okr_cycle: 'quarterly' | 'annual' | 'monthly',
    allow_individual_okrs: boolean,
    require_approval: boolean,
    features: {
      ai_enabled: boolean,
      chat_enabled: boolean,
      meetings_enabled: boolean
    }
  },
  created_at: Timestamp,
  created_by: string,
  updated_at: Timestamp,
  stats: {
    member_count: number,
    active_objectives: number,
    completion_rate: number,
    last_activity: Timestamp
  }
}
```

### 4. members (멤버)
```javascript
members/{memberId}
{
  id: string,
  user_id: string,
  company_id: string,
  workspace_id: string,
  company_role: 'owner' | 'admin' | 'member',
  workspace_role: 'owner' | 'admin' | 'member',
  permissions: {
    can_create_objectives: boolean,
    can_edit_all_objectives: boolean,
    can_delete_objectives: boolean,
    can_manage_members: boolean,
    can_manage_settings: boolean,
    can_view_analytics: boolean
  },
  status: 'active' | 'inactive' | 'suspended',
  joined_at: Timestamp,
  last_active: Timestamp,
  workspace_profile: {
    display_name?: string,
    department?: string,
    position?: string,
    team?: string
  }
}
```

### 5. users (사용자)
```javascript
users/{userId}
{
  firebase_uid: string,
  email: string,
  name: string,
  avatar_url?: string,
  phone?: string,
  created_at: Timestamp,
  updated_at: Timestamp,
  preferences?: {
    language: string,
    timezone: string,
    notifications: {
      email: boolean,
      push: boolean,
      sms: boolean
    }
  }
}
```

## 🔄 실시간 구독 패턴

### 채널 메시지 구독
```javascript
// chatService.ts의 subscribeToChannelMessages
const q = query(
  collection(db, 'chat_messages'),
  where('channel_id', '==', channelId),
  orderBy('created_at', 'asc')
);

onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  callback(messages);
});
```

### DM (다이렉트 메시지) 구조
DM은 특별한 채널 ID 패턴을 사용:
```javascript
const dmChannelId = `dm-${sortedUserId1}-${sortedUserId2}`;
// 예: "dm-user123-user456"
```

## 📁 Firebase Storage 구조

### 파일 업로드 경로
```
/workspaces/{workspaceId}/
  /channels/{channelId}/
    /attachments/
      /{timestamp}_{filename}    // 일반 파일
    /images/
      /{timestamp}_{filename}    // 이미지 파일
      /thumbnails/              // 썸네일
        /{timestamp}_{filename}_thumb
```

## 🔐 보안 규칙 (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 접근
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 워크스페이스 멤버인지 확인
    function isWorkspaceMember(workspaceId) {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/members/$(request.auth.uid + '_' + workspaceId));
    }
    
    // 채널 접근 권한
    match /channels/{channelId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow write: if isWorkspaceMember(resource.data.workspace_id) && 
        (resource.data.type == 'public' || 
         request.auth.uid in resource.data.members);
    }
    
    // 메시지 접근 권한
    match /chat_messages/{messageId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow create: if isAuthenticated() && 
        request.auth.uid == request.resource.data.user_id;
      allow update: if isAuthenticated() && 
        (request.auth.uid == resource.data.user_id || 
         isAdmin(resource.data.workspace_id));
      allow delete: if isAuthenticated() && 
        (request.auth.uid == resource.data.user_id || 
         isAdmin(resource.data.workspace_id));
    }
  }
}
```

## 📈 인덱스 설정

### 복합 인덱스
1. **chat_messages**
   - channel_id (ASC) + created_at (ASC)
   - workspace_id (ASC) + created_at (DESC)
   - user_id (ASC) + created_at (DESC)

2. **channels**
   - workspace_id (ASC) + type (ASC)
   - workspace_id (ASC) + created_at (DESC)

3. **members**
   - user_id (ASC) + workspace_id (ASC)
   - workspace_id (ASC) + status (ASC)

## 🎯 쿼리 최적화 팁

### 1. 페이지네이션
```javascript
// 최근 50개 메시지만 로드
const q = query(
  collection(db, 'chat_messages'),
  where('channel_id', '==', channelId),
  orderBy('created_at', 'desc'),
  limit(50)
);
```

### 2. 실시간 업데이트
```javascript
// docChanges()를 사용하여 변경된 문서만 처리
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // 새 메시지 추가
    } else if (change.type === 'modified') {
      // 메시지 수정
    } else if (change.type === 'removed') {
      // 메시지 삭제
    }
  });
});
```

### 3. 오프라인 지원
```javascript
// 오프라인 지속성 활성화
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // 여러 탭이 열려있을 때
  } else if (err.code === 'unimplemented') {
    // 브라우저가 지원하지 않을 때
  }
});
```

## 📊 데이터 통계

### 예상 데이터 크기
- 평균 메시지 크기: ~500 bytes
- 평균 채널당 메시지: ~10,000개/월
- 평균 워크스페이스당 채널: ~20개
- 평균 워크스페이스당 멤버: ~50명

### 비용 예측 (Firebase 무료 티어)
- Firestore 읽기: 50,000/일 무료
- Firestore 쓰기: 20,000/일 무료
- Storage: 5GB 무료
- 대역폭: 10GB/월 무료

---

*이 문서는 TeamPulse의 Firebase 데이터 구조를 상세히 설명합니다.*
*최종 업데이트: 2024년 12월*