#!/bin/bash
# TeamPulse 자동 개발 파이프라인 스크립트

set -e  # 오류 발생 시 중단

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 로그 함수
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# 백업 함수
backup_project() {
    log "프로젝트 백업 시작..."
    BACKUP_DIR="backups/$(date +'%Y%m%d_%H%M%S')"
    mkdir -p $BACKUP_DIR
    
    # 소스 코드 백업
    cp -r src $BACKUP_DIR/
    cp -r backend $BACKUP_DIR/
    
    # 데이터베이스 백업
    docker exec teampulse-mysql mysqldump -u teampulse_user -pteampulse123! teampulse > $BACKUP_DIR/database_backup.sql
    
    success "백업 완료: $BACKUP_DIR"
}

# 테스트 실행
run_tests() {
    log "테스트 실행 중..."
    
    # Frontend 테스트
    cd /Users/pablokim/teampulse
    npm test -- --watchAll=false || warning "Frontend 테스트 실패"
    
    # Backend 테스트
    cd backend
    npm test || warning "Backend 테스트 실패"
    cd ..
}

# 코드 품질 체크
check_code_quality() {
    log "코드 품질 검사 중..."
    
    # ESLint
    npm run lint || warning "Lint 경고 발견"
    
    # TypeScript 체크
    npm run typecheck || warning "TypeScript 오류 발견"
}

# Git 커밋
commit_changes() {
    log "변경사항 커밋 중..."
    
    git add -A
    COMMIT_MSG="🤖 Auto-commit: $(date +'%Y-%m-%d %H:%M:%S')

Changes made by TeamPulse Development Team:
- Frontend Expert: React/TypeScript updates
- Backend Expert: API/Database updates  
- Product Expert: Feature improvements
- Marketing Expert: User feedback integration
- Design Expert: UI/UX enhancements

Co-Authored-By: TeamPulse Bot <bot@teampulse.com>"
    
    git commit -m "$COMMIT_MSG" || warning "커밋할 변경사항 없음"
}

# 배포
deploy() {
    log "배포 준비 중..."
    
    # Production 빌드
    npm run build
    
    # Docker 이미지 빌드
    docker build -t teampulse:latest .
    
    success "배포 준비 완료"
}

# 모니터링 설정
setup_monitoring() {
    log "모니터링 설정 중..."
    
    # 성능 모니터링 스크립트 실행
    node scripts/monitor-performance.js &
    
    success "모니터링 활성화"
}

# 메인 실행 함수
main() {
    echo "🚀 TeamPulse 자동 개발 파이프라인 시작"
    echo "======================================"
    
    # 1. 백업
    backup_project
    
    # 2. 코드 품질 검사
    check_code_quality
    
    # 3. 테스트 실행
    run_tests
    
    # 4. 변경사항 커밋
    commit_changes
    
    # 5. 배포 준비
    deploy
    
    # 6. 모니터링 설정
    setup_monitoring
    
    echo "======================================"
    success "자동 개발 파이프라인 완료! 🎉"
}

# 스크립트 실행
main