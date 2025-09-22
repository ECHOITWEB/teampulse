// OKR Type Definitions with Enhanced Structure

export type ObjectiveType = 'company' | 'team' | 'individual';
export type ObjectivePeriod = 'annual' | 'quarterly' | 'custom';
export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'archived';
export type ProgressStatus = 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';

export interface ObjectiveBase {
  id?: string;
  title: string;
  description: string;
  type: ObjectiveType;
  status: ObjectiveStatus;
  progress: number; // 0-100
  progressStatus: ProgressStatus;
  
  // Flexible date management
  period: ObjectivePeriod; // 'annual', 'quarterly', or 'custom'
  useCustomDates: boolean; // deprecated, use period === 'custom'
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  quarter?: string; // Q1, Q2, Q3, Q4 - only if period is 'quarterly'
  year?: string; // Year for annual or quarterly objectives
  
  // For annual objectives
  isAnnual?: boolean; // True if this is an annual objective
  
  // Ownership
  owner?: string; // Display name of owner
  
  // Key Results
  keyResults?: KeyResult[];
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy: string; // User ID who created
  updatedBy: string; // User ID who last updated
}

export interface CompanyObjective extends ObjectiveBase {
  type: 'company';
  companyId: string; // Company ID this objective belongs to
  visibility: 'all' | 'managers'; // Who can see this objective
  editableBy: string[]; // Array of user IDs who can edit (typically managers/admins)
}

export interface TeamObjective extends ObjectiveBase {
  type: 'team';
  workspaceId: string; // Workspace this objective belongs to
  teamLeadId?: string; // Team lead who can manage team members' objectives
  assignedTo?: string[]; // Team member IDs this objective is assigned to
}

export interface IndividualObjective extends ObjectiveBase {
  type: 'individual';
  workspaceId: string;
  userId: string; // User this objective belongs to
  userName: string; // User's display name
  userEmail: string; // User's email
  userPhotoURL?: string; // User's profile photo
  assignedBy?: string; // User ID who assigned this (if assigned by team lead)
  isPrivate: boolean; // Whether this objective is visible to team
}

export interface KeyResult {
  id?: string;
  objectiveId: string;
  title: string;
  description?: string;
  
  // Metrics
  currentValue: number;
  targetValue: number;
  startValue: number;
  unit: string; // %, users, revenue, etc.
  
  // Progress
  progress: number; // Calculated: (current - start) / (target - start) * 100
  status: ProgressStatus;
  trending?: 'up' | 'down' | 'stable'; // Trend indicator
  
  // Assignment
  owner: string; // Name of owner (for display)
  assignedTo?: string; // User ID responsible for this KR
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToPhotoURL?: string;
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
}

export interface ObjectiveUpdate {
  id?: string;
  objectiveId: string;
  keyResultId?: string;
  
  // Update details
  updateType: 'progress' | 'status' | 'comment' | 'edit';
  previousValue?: number;
  newValue?: number;
  comment: string;
  
  // User info
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL?: string;
  
  // Timestamp
  createdAt: any;
}

export interface OKRPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAll: boolean;
  canManageTeam: boolean;
  canManageCompany: boolean;
}

export interface OKRFilters {
  type?: ObjectiveType[];
  status?: ObjectiveStatus[];
  progressStatus?: ProgressStatus[];
  userId?: string;
  workspaceId?: string;
  companyId?: string;
  quarter?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface OKRViewSettings {
  viewType: 'card' | 'gantt' | 'list' | 'board';
  periodView: 'quarter' | 'year' | 'custom';
  groupBy?: 'type' | 'status' | 'user' | 'team';
  sortBy?: 'progress' | 'dueDate' | 'created' | 'updated' | 'title';
  sortOrder?: 'asc' | 'desc';
  showCompleted: boolean;
  showArchived: boolean;
}

// Helper type for unified objective handling
export type Objective = CompanyObjective | TeamObjective | IndividualObjective;

// Stats interface for dashboard
export interface OKRStats {
  total: number;
  byType: {
    company: number;
    team: number;
    individual: number;
  };
  byStatus: {
    draft: number;
    active: number;
    completed: number;
    archived: number;
  };
  byProgress: {
    notStarted: number;
    onTrack: number;
    atRisk: number;
    behind: number;
    completed: number;
  };
  averageProgress: number;
  upcomingDeadlines: number;
  recentUpdates: number;
}

// AI Insights for objectives
export interface AIInsight {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  type: 'risk' | 'recommendation' | 'trend' | 'opportunity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  createdAt: any;
}

// For creating objectives
export interface CreateObjectiveInput {
  title: string;
  description: string;
  type: ObjectiveType;
  
  // Period settings
  period: ObjectivePeriod;
  useCustomDates?: boolean; // deprecated
  startDate?: string;
  endDate?: string;
  quarter?: string;
  year?: string;
  
  // Type-specific fields
  companyId?: string; // For company objectives
  workspaceId?: string; // For team/individual objectives
  userId?: string; // For individual objectives
  assignedTo?: string[]; // For team objectives
  isPrivate?: boolean; // For individual objectives
  
  // Initial key results
  keyResults?: Omit<KeyResult, 'id' | 'objectiveId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>[];
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  
  // Date updates
  useCustomDates?: boolean;
  startDate?: string;
  endDate?: string;
  quarter?: string;
  year?: string;
  
  // Type-specific updates
  assignedTo?: string[];
  isPrivate?: boolean;
}