# TeamPulse Database Schema v2.0

## 🏗️ Database Architecture Overview

```
companies (최상위)
  └── workspaces (회사 내 팀/부서)
        └── members (워크스페이스 멤버)
        └── objectives (목표)
              └── keyResults (핵심 결과)
```

## 📊 Collections Schema

### 1. companies
회사 정보를 저장하는 최상위 컬렉션

```typescript
interface Company {
  id: string;                    // Auto-generated
  name_ko: string;               // 한글 회사명 (예: "에코아이티")
  name_en: string;               // 영문 회사명 (예: "ECHOIT")
  domain?: string;               // 회사 도메인 (예: "echoit.com")
  industry?: string;             // 산업 분야
  size?: string;                 // 회사 규모 (1-10, 11-50, 51-200, 201-500, 500+)
  logo_url?: string;             // 회사 로고 URL
  
  // Billing & Plan
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_type: 'company' | 'workspace';
  billing_email?: string;
  
  // Metadata
  created_at: Timestamp;
  created_by: string;            // User ID who created
  updated_at: Timestamp;
  
  // Settings
  settings: {
    allow_workspace_creation: boolean;
    require_admin_approval: boolean;
    default_workspace_plan: string;
  };
  
  // Statistics
  stats: {
    total_workspaces: number;
    total_members: number;
    active_members_30d: number;
  };
}
```

### 2. workspaces
회사 내 팀/부서 단위 워크스페이스

```typescript
interface Workspace {
  id: string;                    // Auto-generated
  company_id: string;            // Reference to companies.id
  
  // Basic Info
  name: string;                  // 워크스페이스명 (예: "개발팀", "마케팅팀")
  description?: string;
  type: 'headquarters' | 'team' | 'project' | 'subsidiary';
  
  // Hierarchy
  parent_workspace_id?: string;  // 상위 워크스페이스 (있을 경우)
  is_main: boolean;              // 본사/메인 워크스페이스 여부
  
  // Access Control
  visibility: 'public' | 'private' | 'company_only';
  allow_join_requests: boolean;
  require_approval: boolean;
  
  // Plan (workspace별 플랜 가능)
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  plan_inherited: boolean;       // 회사 플랜 상속 여부
  
  // Metadata
  created_at: Timestamp;
  created_by: string;            // User ID
  updated_at: Timestamp;
  owner_id: string;              // Current owner user ID
  
  // Settings
  settings: {
    features: {
      okr_enabled: boolean;
      meetings_enabled: boolean;
      ai_tools_enabled: boolean;
    };
    ai_usage_limit?: number;
    ai_usage_this_month: number;
  };
  
  // Statistics
  stats: {
    member_count: number;
    active_members_7d: number;
    total_objectives: number;
    completed_objectives: number;
  };
}
```

### 3. users
전체 사용자 정보 (Firebase Auth와 연동)

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  email: string;
  
  // Profile
  profile: {
    name: string;
    nickname?: string;
    avatar_url?: string;
    phone?: string;
    position?: string;           // 직책
    department?: string;         // 부서
    bio?: string;
  };
  
  // Preferences
  preferences: {
    language: 'ko' | 'en';
    timezone: string;
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      slack: boolean;
    };
  };
  
  // Metadata
  created_at: Timestamp;
  last_login: Timestamp;
  last_active: Timestamp;
  
  // Account Status
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
}
```

### 4. members
사용자와 워크스페이스/회사 간 관계 (Junction Table)

```typescript
interface Member {
  id: string;                    // Auto-generated
  user_id: string;               // Reference to users.id
  company_id: string;            // Reference to companies.id
  workspace_id: string;          // Reference to workspaces.id
  
  // Role & Permissions
  company_role: 'owner' | 'admin' | 'member';
  workspace_role: 'owner' | 'admin' | 'member';
  
  // Custom permissions
  permissions: {
    can_create_objectives: boolean;
    can_edit_all_objectives: boolean;
    can_delete_objectives: boolean;
    can_manage_members: boolean;
    can_manage_settings: boolean;
  };
  
  // Status
  status: 'active' | 'invited' | 'inactive';
  invite_token?: string;
  invited_by?: string;
  
  // Metadata
  joined_at: Timestamp;
  last_active: Timestamp;
  
  // Profile in this workspace
  workspace_profile: {
    display_name?: string;        // 워크스페이스 내 표시 이름
    position?: string;            // 워크스페이스 내 직책
    team?: string;               // 소속 팀
  };
}

// Compound Index: [user_id, company_id, workspace_id]
```

### 5. objectives
목표 관리 (계층 구조)

```typescript
interface Objective {
  id: string;                    // Auto-generated
  
  // Ownership & Scope
  company_id: string;            // Always required
  workspace_id?: string;         // Required for team/individual
  user_id?: string;              // Required for individual
  
  // Type & Level
  type: 'company' | 'team' | 'individual';
  level: number;                 // 0: company, 1: team, 2: individual
  
  // Basic Info
  title: string;
  description?: string;
  
  // Period
  period_type: 'quarter' | 'custom';
  quarter?: string;              // Q1, Q2, Q3, Q4
  year?: number;
  start_date?: Timestamp;
  end_date?: Timestamp;
  
  // Progress
  progress: number;              // 0-100
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  
  // Visibility
  visibility: 'public' | 'team' | 'private';
  
  // Alignment (상위 목표와 연결)
  parent_objective_id?: string;  // 상위 목표 ID
  aligned_objectives: string[];  // 연관된 목표 IDs
  
  // Metadata
  created_at: Timestamp;
  created_by: string;            // User ID
  updated_at: Timestamp;
  updated_by: string;
  
  // Assignments
  owner_id: string;              // Primary owner
  collaborators: string[];       // Additional collaborators
  
  // Tags & Categories
  tags: string[];
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Indexes:
// - [company_id, type, quarter, year]
// - [workspace_id, type, status]
// - [user_id, visibility]
```

### 6. keyResults
핵심 결과 (목표의 하위)

```typescript
interface KeyResult {
  id: string;                    // Auto-generated
  objective_id: string;          // Reference to objectives.id
  
  // Basic Info
  title: string;
  description?: string;
  
  // Measurement
  metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
  unit: string;                  // 개, %, 원, $, etc.
  
  // Values
  start_value: number;
  current_value: number;
  target_value: number;
  
  // Progress
  progress: number;              // 0-100 (calculated)
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  
  // Tracking
  check_in_frequency: 'daily' | 'weekly' | 'monthly';
  last_check_in?: Timestamp;
  
  // Metadata
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  updated_by: string;
  
  // Assignment
  owner_id: string;
  
  // History (for tracking changes)
  history: Array<{
    date: Timestamp;
    value: number;
    note?: string;
    updated_by: string;
  }>;
}

// Index: [objective_id, status]
```

### 7. objective_updates
목표 업데이트 히스토리 (댓글, 체크인)

```typescript
interface ObjectiveUpdate {
  id: string;
  objective_id: string;
  key_result_id?: string;        // If update is for specific KR
  
  type: 'comment' | 'check_in' | 'status_change' | 'edit';
  
  // Content
  content?: string;              // Comment or note
  old_value?: any;              // For edits
  new_value?: any;              // For edits
  
  // Metadata
  created_at: Timestamp;
  created_by: string;
  
  // Mentions
  mentioned_users: string[];
}
```

## 🔐 Security Rules Structure

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Companies
    match /companies/{companyId} {
      allow read: if isCompanyMember(companyId);
      allow create: if request.auth != null;
      allow update: if isCompanyAdmin(companyId);
      allow delete: if isCompanyOwner(companyId);
    }
    
    // Workspaces
    match /workspaces/{workspaceId} {
      allow read: if isWorkspaceMember(workspaceId) || 
                     (resource.data.visibility == 'public');
      allow create: if isCompanyMember(resource.data.company_id);
      allow update: if isWorkspaceAdmin(workspaceId);
      allow delete: if isWorkspaceOwner(workspaceId);
    }
    
    // Members
    match /members/{memberId} {
      allow read: if request.auth.uid == resource.data.user_id ||
                     isWorkspaceMember(resource.data.workspace_id);
      allow create: if isWorkspaceAdmin(resource.data.workspace_id);
      allow update: if isWorkspaceAdmin(resource.data.workspace_id) ||
                       request.auth.uid == resource.data.user_id;
      allow delete: if isWorkspaceOwner(resource.data.workspace_id);
    }
    
    // Objectives
    match /objectives/{objectiveId} {
      allow read: if canViewObjective(objectiveId);
      allow create: if canCreateObjective();
      allow update: if canEditObjective(objectiveId);
      allow delete: if canDeleteObjective(objectiveId);
    }
  }
}
```

## 🔄 Migration Plan

### Phase 1: Create New Collections
1. Create `companies` collection
2. Migrate existing workspace data to proper structure
3. Create proper `members` collection

### Phase 2: Update Relationships
1. Link workspaces to companies
2. Link users to members
3. Update objectives with proper company_id/workspace_id

### Phase 3: Update Application Code
1. Update all services to use new schema
2. Update queries and filters
3. Update UI components

### Phase 4: Data Cleanup
1. Remove old/duplicate data
2. Validate all relationships
3. Set up proper indexes

## 📈 Benefits of New Schema

1. **Clear Hierarchy**: Companies → Workspaces → Members/Objectives
2. **Multi-tenancy**: Users can belong to multiple companies/workspaces
3. **Proper Isolation**: Data properly scoped and isolated
4. **Scalability**: Can handle enterprise-level organizations
5. **Flexibility**: Supports various organization structures
6. **Performance**: Proper indexes for common queries
7. **Security**: Clear permission boundaries