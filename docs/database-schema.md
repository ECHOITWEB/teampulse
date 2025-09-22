# TeamPulse Database Schema

## Overview
Firebase Firestore NoSQL database with hierarchical structure for multi-tenant OKR management.

## Collections

### 1. companies
Top-level organizational entity containing multiple workspaces.

```typescript
interface Company {
  id: string;                          // Auto-generated
  name_ko: string;                      // Korean company name
  name_en: string;                      // English company name
  domain?: string;                      // Company domain (e.g., "echoit.com")
  industry?: string;                    // Industry type
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_type: 'company' | 'workspace';
  
  // Timestamps
  created_at: Timestamp;
  created_by: string;                   // User ID who created
  updated_at: Timestamp;
  
  // Settings
  settings: {
    allow_workspace_creation: boolean;
    require_admin_approval: boolean;
    default_workspace_plan: string;
    okr_visibility: 'public' | 'private' | 'workspace';
    features: {
      ai_enabled: boolean;
      analytics_enabled: boolean;
      custom_fields: boolean;
    };
  };
  
  // Statistics
  stats: {
    total_workspaces: number;
    total_members: number;
    active_members_30d: number;
    total_objectives: number;
    completion_rate: number;
  };
}
```

### 2. workspaces
Operational units within a company where actual work happens.

```typescript
interface Workspace {
  id: string;                          // Auto-generated
  company_id: string;                   // Reference to parent company
  company_name: string;                 // Denormalized for quick access
  name: string;                         // Workspace name
  description?: string;
  type: 'headquarters' | 'team' | 'project' | 'subsidiary';
  is_main: boolean;                     // Main workspace for company
  
  // Access control
  owner_id: string;                     // Workspace owner user ID
  admin_ids: string[];                  // Admin user IDs
  
  // Settings
  plan?: 'free' | 'starter' | 'pro';   // Can override company plan
  settings: {
    okr_cycle: 'quarterly' | 'annual' | 'monthly';
    allow_individual_okrs: boolean;
    require_approval: boolean;
    features: {
      ai_enabled: boolean;
      chat_enabled: boolean;
      meetings_enabled: boolean;
    };
  };
  
  // Timestamps
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  
  // Statistics
  stats: {
    member_count: number;
    active_objectives: number;
    completion_rate: number;
    last_activity: Timestamp;
  };
}
```

### 3. members
Junction table for users' membership in workspaces and companies.

```typescript
interface Member {
  id: string;                          // Auto-generated
  user_id: string;                      // Reference to users collection
  company_id: string;                   // Reference to company
  workspace_id: string;                 // Reference to workspace
  
  // Roles and permissions
  company_role: 'owner' | 'admin' | 'member';
  workspace_role: 'owner' | 'admin' | 'member';
  
  permissions: {
    can_create_objectives: boolean;
    can_edit_all_objectives: boolean;
    can_delete_objectives: boolean;
    can_manage_members: boolean;
    can_manage_settings: boolean;
    can_view_analytics: boolean;
  };
  
  // Status
  status: 'active' | 'inactive' | 'suspended';
  joined_at: Timestamp;
  last_active: Timestamp;
  
  // Profile within workspace
  workspace_profile: {
    display_name?: string;
    department?: string;
    position?: string;
    team?: string;
  };
}
```

### 4. users
Global user accounts across all companies and workspaces.

```typescript
interface User {
  id: string;                          // Firebase Auth UID
  email: string;
  display_name: string;
  photo_url?: string;
  phone?: string;
  
  // Profile
  profile: {
    bio?: string;
    timezone?: string;
    language: 'ko' | 'en';
    notification_preferences: {
      email: boolean;
      push: boolean;
      okr_updates: boolean;
      mentions: boolean;
    };
  };
  
  // System
  created_at: Timestamp;
  last_login: Timestamp;
  email_verified: boolean;
  
  // Default workspace
  default_workspace_id?: string;
  recent_workspace_ids: string[];       // Last 5 visited workspaces
}
```

### 5. objectives
OKR objectives with hierarchical structure.

```typescript
interface Objective {
  id: string;                          // Auto-generated
  
  // Hierarchy and ownership
  company_id: string;                   // Always required
  workspace_id?: string;                // Required for team/individual objectives
  user_id?: string;                     // Required for individual objectives
  parent_objective_id?: string;         // For cascaded objectives
  
  // Type and level
  type: 'company' | 'team' | 'individual';
  level: number;                        // 0=company, 1=team, 2=individual
  
  // Content
  title: string;
  description?: string;
  category?: 'growth' | 'revenue' | 'customer' | 'product' | 'operations' | 'people';
  
  // Period
  period: {
    year: number;
    quarter?: number;                   // 1-4, optional for annual objectives
    month?: number;                      // For monthly objectives
    start_date: Timestamp;
    end_date: Timestamp;
  };
  
  // Status
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;                      // 0-100, calculated from key results
  
  // Visibility
  visibility: 'public' | 'workspace' | 'private';
  
  // Metadata
  created_at: Timestamp;
  created_by: string;                   // User ID
  updated_at: Timestamp;
  updated_by: string;
  
  // Alignment
  aligned_with: string[];               // IDs of related objectives
  tags: string[];
}
```

### 6. keyResults
Measurable outcomes for objectives.

```typescript
interface KeyResult {
  id: string;                          // Auto-generated
  objective_id: string;                 // Parent objective
  company_id: string;                   // Denormalized for queries
  workspace_id?: string;                // Denormalized for queries
  
  // Content
  title: string;
  description?: string;
  
  // Measurement
  metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
  start_value: number;
  target_value: number;
  current_value: number;
  unit?: string;                        // e.g., "users", "USD", "%"
  
  // Status
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed' | 'missed';
  progress: number;                      // 0-100, calculated
  
  // Ownership
  owner_id: string;                     // User responsible
  contributor_ids: string[];            // Additional contributors
  
  // Tracking
  updates: {
    value: number;
    note?: string;
    updated_by: string;
    updated_at: Timestamp;
  }[];
  
  // Metadata
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  due_date?: Timestamp;
}
```

### 7. inviteCodes
Invitation codes for joining workspaces.

```typescript
interface InviteCode {
  id: string;                          // The actual invite code
  workspace_id: string;
  company_id: string;
  
  // Settings
  role: 'admin' | 'member';
  max_uses?: number;                    // Unlimited if not set
  uses_count: number;
  
  // Validity
  expires_at?: Timestamp;
  is_active: boolean;
  
  // Metadata
  created_by: string;
  created_at: Timestamp;
  
  // Usage tracking
  used_by: {
    user_id: string;
    used_at: Timestamp;
  }[];
}
```

### 8. usedInviteCodes (KEEP THIS)
Track which codes users have already used.

```typescript
interface UsedInviteCode {
  id: string;                          // {userId}_{codeId}
  user_id: string;
  code_id: string;
  workspace_id: string;
  used_at: Timestamp;
}
```

### 9. aiUsage
Track AI feature usage for billing and limits.

```typescript
interface AIUsage {
  id: string;                          // Auto-generated
  workspace_id: string;
  company_id: string;
  user_id: string;
  
  // Usage details
  feature: 'chat' | 'objectives' | 'analysis' | 'suggestions';
  model: string;                        // e.g., "gpt-4", "claude-3"
  
  // Metrics
  tokens_used: number;
  cost: number;                         // In cents
  response_time: number;                // In milliseconds
  
  // Context
  session_id?: string;
  request_type?: string;
  
  // Timestamp
  created_at: Timestamp;
}
```

### 10. chats
Team chat messages within workspaces.

```typescript
interface ChatMessage {
  id: string;                          // Auto-generated
  workspace_id: string;
  company_id: string;
  
  // Content
  message: string;
  type: 'text' | 'file' | 'image' | 'system';
  
  // Sender
  sender_id: string;                    // User ID or 'system'
  sender_name: string;                  // Denormalized for display
  sender_avatar?: string;
  
  // Threading
  thread_id?: string;                   // For threaded conversations
  reply_to?: string;                    // Message being replied to
  
  // Metadata
  created_at: Timestamp;
  edited_at?: Timestamp;
  is_edited: boolean;
  is_deleted: boolean;
  
  // Reactions
  reactions?: {
    [emoji: string]: string[];          // emoji -> user IDs
  };
  
  // Mentions
  mentions: string[];                   // User IDs mentioned
}
```

### 11. meetings
Meeting records and summaries.

```typescript
interface Meeting {
  id: string;                          // Auto-generated
  workspace_id: string;
  company_id: string;
  
  // Details
  title: string;
  description?: string;
  type: 'standup' | 'planning' | 'review' | 'retrospective' | 'general';
  
  // Schedule
  scheduled_at: Timestamp;
  duration_minutes: number;
  ended_at?: Timestamp;
  
  // Participants
  organizer_id: string;
  participant_ids: string[];
  actual_participant_ids: string[];
  
  // Content
  agenda?: string;
  notes?: string;
  action_items?: {
    task: string;
    assignee_id: string;
    due_date?: Timestamp;
    completed: boolean;
  }[];
  
  // Recording
  recording_url?: string;
  transcript?: string;
  
  // AI features
  ai_summary?: string;
  ai_action_items?: string[];
  
  // Metadata
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
}
```

## Indexes

### Critical Performance Indexes

```
// Companies
- companies.domain (unique)
- companies.created_by

// Workspaces
- workspaces.company_id
- workspaces.owner_id
- workspaces.company_id + workspaces.is_main

// Members
- members.user_id + members.workspace_id (compound, unique)
- members.user_id + members.company_id
- members.workspace_id + members.status

// Objectives
- objectives.company_id + objectives.type + objectives.period.year + objectives.period.quarter
- objectives.workspace_id + objectives.type + objectives.status
- objectives.user_id + objectives.status
- objectives.parent_objective_id

// Key Results
- keyResults.objective_id
- keyResults.owner_id + keyResults.status

// Chats
- chats.workspace_id + chats.created_at (desc)
- chats.thread_id + chats.created_at

// AI Usage
- aiUsage.workspace_id + aiUsage.created_at
- aiUsage.company_id + aiUsage.created_at
```

## Security Rules

```javascript
// Simplified example - actual rules would be more complex
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isMemberOf(workspaceId) {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/members/$(request.auth.uid + '_' + workspaceId));
    }
    
    function isAdminOf(workspaceId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/members/$(request.auth.uid + '_' + workspaceId)).data.workspace_role in ['admin', 'owner'];
    }
    
    // Companies - read by members, write by owners
    match /companies/{companyId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
        request.auth.uid in resource.data.admin_ids;
    }
    
    // Workspaces - read by members, write by admins
    match /workspaces/{workspaceId} {
      allow read: if isMemberOf(workspaceId);
      allow write: if isAdminOf(workspaceId);
    }
    
    // Members - read by workspace members, write by admins
    match /members/{memberId} {
      allow read: if isAuthenticated() && 
        request.auth.uid == resource.data.user_id;
      allow write: if isAdminOf(resource.data.workspace_id);
    }
    
    // Objectives - visibility-based access
    match /objectives/{objectiveId} {
      allow read: if isAuthenticated() && (
        resource.data.visibility == 'public' ||
        (resource.data.visibility == 'workspace' && isMemberOf(resource.data.workspace_id)) ||
        (resource.data.visibility == 'private' && request.auth.uid == resource.data.user_id)
      );
      allow create: if isMemberOf(request.resource.data.workspace_id);
      allow update: if request.auth.uid == resource.data.created_by || 
        isAdminOf(resource.data.workspace_id);
      allow delete: if isAdminOf(resource.data.workspace_id);
    }
  }
}
```

## Migration Notes

### From Old Schema
1. `workspace_members` → `members` with enhanced structure
2. Objectives now require `company_id` always
3. Add `type` and `level` to all objectives
4. Normalize field names (camelCase → snake_case where appropriate)

### Data Integrity Rules
1. Every workspace must belong to a company
2. Every objective must have a company_id
3. Team objectives must have workspace_id
4. Individual objectives must have user_id
5. Members must have both company_id and workspace_id