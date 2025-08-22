# TeamPulse - AI 기반 팀 협업 플랫폼

TeamPulse는 AI 기술을 활용하여 팀의 생산성을 극대화하는 차세대 협업 플랫폼입니다.

## 🚀 주요 기능

### 💬 팀 채팅
- 실시간 메시징
- 채널 기반 커뮤니케이션
- 파일 공유 및 검색

### 🎯 목표 및 작업 관리
- OKR 기반 목표 설정
- 칸반 보드 작업 관리
- 진행 상황 실시간 추적

### 🤖 AI 도구
- Smart Meeting Assistant
- 문서 번역 및 검토
- 데이터 분석 도우미

### 👥 워크스페이스
- 멀티 테넌트 지원
- 역할 기반 접근 제어
- 사용량 기반 과금

## 🛠 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Functions)
- **AI**: OpenAI GPT-4
- **Hosting**: Firebase Hosting

## 🚦 시작하기

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn
- Firebase 계정

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 Firebase 및 OpenAI API 키 설정

# 개발 서버 실행
npm start
```

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# Firebase 배포
firebase deploy
```

## 📁 프로젝트 구조

```
teampulse/
├── src/                    # 소스 코드
│   ├── components/        # React 컴포넌트
│   ├── pages/            # 페이지 컴포넌트
│   ├── contexts/         # React Context
│   ├── hooks/            # 커스텀 훅
│   ├── services/         # API 및 서비스
│   ├── utils/            # 유틸리티 함수
│   └── types/            # TypeScript 타입
├── public/               # 정적 파일
├── docs/                 # 프로젝트 문서
│   ├── api/             # API 문서
│   ├── deployment/      # 배포 가이드
│   ├── features/        # 기능 명세
│   └── planning/        # 기획 문서
└── firebase/            # Firebase 설정
```

## 🔐 환경 변수

`.env` 파일에 다음 변수들을 설정하세요:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# OpenAI
REACT_APP_OPENAI_API_KEY=your-openai-api-key
```

## 📚 문서

- [API 문서](./docs/api/)
- [배포 가이드](./docs/deployment/)
- [기능 명세](./docs/features/)
- [개발 계획](./docs/planning/)

## 🤝 기여하기

기여를 환영합니다! 다음 절차를 따라주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 📞 연락처

문의사항이 있으시면 이슈를 생성해주세요.

---

Built with ❤️ by TeamPulse Team
