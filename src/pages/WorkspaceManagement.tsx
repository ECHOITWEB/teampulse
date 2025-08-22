import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, query, where, getDocs, deleteDoc, doc, writeBatch, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Trash2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { deleteWorkspaceAdmin } from '../services/adminApi';

interface WorkspaceData {
  id: string;
  name: string;
  companyName: string;
  fullName: string;
  ownerId: string;
  memberCount: number;
  actualMemberCount: number;
  hasOwnerMember: boolean;
  createdAt: any;
}

const WorkspaceManagement: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 모든 워크스페이스 가져오기
      const workspacesSnapshot = await getDocs(collection(db, 'workspaces'));
      const workspaceData: WorkspaceData[] = [];
      
      for (const doc of workspacesSnapshot.docs) {
        const data = doc.data();
        
        // 실제 멤버 수 확인
        const membersQuery = query(
          collection(db, 'workspace_members'),
          where('workspace_id', '==', doc.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        // 오너 멤버 확인
        const ownerMember = membersSnapshot.docs.find(
          memberDoc => memberDoc.data().role === 'owner'
        );
        
        workspaceData.push({
          id: doc.id,
          name: data.name,
          companyName: data.company_name,
          fullName: data.full_name || `${data.company_name}-${data.name}`,
          ownerId: data.owner_id,
          memberCount: data.member_count || 0,
          actualMemberCount: membersSnapshot.size,
          hasOwnerMember: !!ownerMember,
          createdAt: data.created_at
        });
      }
      
      setWorkspaces(workspaceData);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkspace = async (workspace: WorkspaceData) => {
    if (!user) return;
    
    const confirmDelete = window.confirm(
      `정말로 "${workspace.fullName}" 워크스페이스를 삭제하시겠습니까?\n\n` +
      `이 작업은 되돌릴 수 없습니다.`
    );
    
    if (!confirmDelete) return;
    
    setDeleting(workspace.id);
    
    try {
      // Admin SDK를 사용한 워크스페이스 삭제 (오너 권한 확인 포함)
      await deleteWorkspaceAdmin(workspace.id);
      
      alert('워크스페이스가 삭제되었습니다.');
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      alert(`워크스페이스 삭제 중 오류가 발생했습니다.\n\n${error.message || error}`);
    } finally {
      setDeleting(null);
    }
  };

  const fixWorkspaceOwnership = async (workspace: WorkspaceData) => {
    if (!user) return;
    
    try {
      // 워크스페이스 멤버에 오너 추가
      const membersQuery = query(
        collection(db, 'workspace_members'),
        where('workspace_id', '==', workspace.id),
        where('user_id', '==', workspace.ownerId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (membersSnapshot.empty && workspace.ownerId) {
        // 오너 멤버가 없으면 추가
        await addDoc(collection(db, 'workspace_members'), {
          workspace_id: workspace.id,
          user_id: workspace.ownerId,
          role: 'owner',
          status: 'active',
          joined_at: serverTimestamp()
        });
        
        alert('오너 멤버십이 복구되었습니다.');
        await loadWorkspaces();
      }
    } catch (error) {
      console.error('Error fixing ownership:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">워크스페이스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">워크스페이스 관리</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  워크스페이스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  멤버 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workspaces.map(workspace => (
                <tr key={workspace.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {workspace.fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {workspace.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workspace.ownerId || 'No owner'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm ${
                        workspace.actualMemberCount === 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {workspace.actualMemberCount}명
                      </span>
                      {workspace.memberCount !== workspace.actualMemberCount && (
                        <span className="text-xs text-gray-500">
                          (DB: {workspace.memberCount})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {workspace.actualMemberCount === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3" />
                        멤버 없음
                      </span>
                    ) : !workspace.hasOwnerMember ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3" />
                        오너 없음
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        정상
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!workspace.hasOwnerMember && workspace.ownerId && (
                        <button
                          onClick={() => fixWorkspaceOwnership(workspace)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          오너 복구
                        </button>
                      )}
                      <button
                        onClick={() => deleteWorkspace(workspace)}
                        disabled={deleting === workspace.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting === workspace.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          총 {workspaces.length}개의 워크스페이스
        </div>
      </div>
    </div>
  );
};

export default WorkspaceManagement;