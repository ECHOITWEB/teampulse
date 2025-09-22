export interface Company {
  id: string;
  name: string; // 영문명 (정식)
  nameKo?: string; // 한글명
  aliases: string[]; // 별칭들 (에코아이티, echoit, ECHO IT 등)
  superAdminId: string; // 회사 총 관리자 ID
  superAdminEmail: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    allowWorkspaceCreation: boolean;
    requireAdminApproval: boolean;
    maxWorkspaces?: number;
  };
}

export interface CompanyObjective {
  id?: string;
  companyId: string; // 회사 ID (워크스페이스가 아닌)
  title: string;
  description: string;
  quarter: string;
  year: number;
  owner: string;
  ownerId: string;
  type: 'company'; // 회사 전체 목표
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind';
  keyResults?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceRequest {
  id?: string;
  companyId: string;
  workspaceName: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyMembership {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  companyName: string;
  role: 'super_admin' | 'admin' | 'member';
  workspaces: string[]; // 소속 워크스페이스 ID들
  joinedAt: Date;
  updatedAt: Date;
}