import React, { useState, useEffect } from 'react';
import { 
  Zap, Users, Shield, TrendingUp, Settings, 
  ChevronRight, AlertCircle, Check, X, Edit2,
  Package, Gauge, Lock
} from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import pulseService, { MODEL_TIERS } from '../../services/pulseService';

interface WorkspacePulseData {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  pulseAllocated: number;
  pulseUsed: number;
  pulseAvailable: number;
  modelTier: 'premium' | 'standard' | 'basic';
  allowedModels: string[];
  usagePercentage: number;
}

const PulseManagement: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspacePulseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspacePulseData | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState<'premium' | 'standard' | 'basic'>('standard');

  useEffect(() => {
    loadWorkspacesData();
  }, []);

  const loadWorkspacesData = async () => {
    try {
      setLoading(true);
      const workspacesSnapshot = await getDocs(collection(db, 'workspaces'));
      
      const workspaceDataPromises = workspacesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const pulseSummary = await pulseService.getWorkspacePulseSummary(doc.id);
        
        // Get member count
        const membersQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', doc.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        return {
          id: doc.id,
          name: data.name,
          type: data.type || 'team',
          memberCount: membersSnapshot.size,
          pulseAllocated: pulseSummary.allocated,
          pulseUsed: pulseSummary.used,
          pulseAvailable: pulseSummary.available,
          modelTier: pulseSummary.modelTier as 'premium' | 'standard' | 'basic',
          allowedModels: pulseSummary.allowedModels,
          usagePercentage: pulseSummary.usagePercentage
        };
      });
      
      const workspaceData = await Promise.all(workspaceDataPromises);
      setWorkspaces(workspaceData.sort((a, b) => b.pulseUsed - a.pulseUsed));
    } catch (error) {
      console.error('Error loading workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocatePulse = async () => {
    if (!selectedWorkspace || !allocationAmount) return;
    
    try {
      await pulseService.allocatePulses(
        selectedWorkspace.id,
        parseInt(allocationAmount),
        selectedWorkspace.modelTier
      );
      
      setShowAllocationModal(false);
      setAllocationAmount('');
      setSelectedWorkspace(null);
      loadWorkspacesData();
    } catch (error) {
      console.error('Error allocating Pulse:', error);
    }
  };

  const handleUpdateRestrictions = async () => {
    if (!selectedWorkspace) return;
    
    try {
      await pulseService.setModelRestrictions(
        selectedWorkspace.id,
        selectedTier
      );
      
      setShowRestrictionModal(false);
      setSelectedWorkspace(null);
      loadWorkspacesData();
    } catch (error) {
      console.error('Error updating restrictions:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'text-purple-600 bg-purple-50';
      case 'standard':
        return 'text-blue-600 bg-blue-50';
      case 'basic':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'premium':
        return '프리미엄';
      case 'standard':
        return '스탠다드';
      case 'basic':
        return '베이직';
      default:
        return tier;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pulse 관리</h2>
              <p className="text-sm text-gray-500">워크스페이스별 Pulse 할당 및 모델 제한 설정</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">총 Pulse 사용량</p>
              <p className="text-2xl font-bold text-gray-900">
                {workspaces.reduce((sum, w) => sum + w.pulseUsed, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          데이터를 불러오는 중...
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-4">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500">
                          {workspace.memberCount}명
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(workspace.modelTier)}`}>
                          {getTierLabel(workspace.modelTier)} 티어
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">사용량</p>
                      <p className="font-semibold text-gray-900">
                        {workspace.pulseUsed.toLocaleString()} / {workspace.pulseAllocated.toLocaleString()} Pulse
                      </p>
                      <div className="mt-1 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            workspace.usagePercentage > 80 
                              ? 'bg-red-500' 
                              : workspace.usagePercentage > 60 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(workspace.usagePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setShowAllocationModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Pulse 할당"
                      >
                        <Package className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setSelectedTier(workspace.modelTier);
                          setShowRestrictionModal(true);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="모델 제한"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pulse 할당 모달 */}
      {showAllocationModal && selectedWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pulse 할당
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedWorkspace.name} 워크스페이스에 추가로 할당할 Pulse를 입력하세요.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                할당할 Pulse 수량
              </label>
              <input
                type="number"
                value={allocationAmount}
                onChange={(e) => setAllocationAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 10000"
                min="0"
                step="1000"
              />
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p>현재 할당량: {selectedWorkspace.pulseAllocated.toLocaleString()} Pulse</p>
                  <p>사용량: {selectedWorkspace.pulseUsed.toLocaleString()} Pulse</p>
                  <p>잔여량: {selectedWorkspace.pulseAvailable.toLocaleString()} Pulse</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAllocationModal(false);
                  setAllocationAmount('');
                  setSelectedWorkspace(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAllocatePulse}
                disabled={!allocationAmount || parseInt(allocationAmount) <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                할당하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모델 제한 설정 모달 */}
      {showRestrictionModal && selectedWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              AI 모델 제한 설정
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedWorkspace.name} 워크스페이스에서 사용할 수 있는 AI 모델 티어를 선택하세요.
            </p>
            
            <div className="space-y-3 mb-4">
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="premium"
                  checked={selectedTier === 'premium'}
                  onChange={(e) => setSelectedTier(e.target.value as 'premium' | 'standard' | 'basic')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">프리미엄 티어</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">최고급</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    모든 AI 모델 사용 가능 (GPT-4, Claude-3-Opus 포함)
                  </p>
                </div>
              </label>
              
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="standard"
                  checked={selectedTier === 'standard'}
                  onChange={(e) => setSelectedTier(e.target.value as 'premium' | 'standard' | 'basic')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">스탠다드 티어</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">균형</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    중급 모델까지 사용 가능 (프리미엄 모델 제외)
                  </p>
                </div>
              </label>
              
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="basic"
                  checked={selectedTier === 'basic'}
                  onChange={(e) => setSelectedTier(e.target.value as 'premium' | 'standard' | 'basic')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">베이직 티어</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">경제적</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    기본 모델만 사용 가능 (GPT-3.5-Turbo, Claude-Haiku)
                  </p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestrictionModal(false);
                  setSelectedWorkspace(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateRestrictions}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                설정 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PulseManagement;