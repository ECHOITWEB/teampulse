import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import hqService, { HQMember } from '../services/hqService';

export const useHQPermissions = () => {
  const { user } = useAuth();
  const { currentCompany } = useWorkspace();
  const [hqMember, setHQMember] = useState<HQMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHQPermissions = async () => {
      if (!user || !currentCompany) {
        setHQMember(null);
        setIsLoading(false);
        return;
      }

      try {
        const member = await hqService.getHQMember(currentCompany.id, user.firebase_uid);
        setHQMember(member);
      } catch (error) {
        console.error('Error checking HQ permissions:', error);
        setHQMember(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkHQPermissions();
  }, [user, currentCompany]);

  return {
    isHQMember: !!hqMember,
    hqRole: hqMember?.role,
    permissions: hqMember?.permissions || {
      manage_workspaces: false,
      manage_billing: false,
      manage_members: false,
      manage_company_objectives: false,
      view_all_objectives: false,
      approve_workspace_creation: false
    },
    canManageCompanyObjectives: hqMember?.permissions?.manage_company_objectives || false,
    canViewAllObjectives: hqMember?.permissions?.view_all_objectives || false,
    isLoading
  };
};