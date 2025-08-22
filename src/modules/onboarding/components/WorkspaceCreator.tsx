import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Building,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Briefcase,
  User,
  Hash,
  CreditCard,
  Loader2
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createWorkspaceAdmin } from '../../../services/adminApi';

interface WorkspaceData {
  companyName: string;
  workspaceName: string;
  userName: string;
  userNickname: string;
  userRole: string;
  teamSize: string;
  billingType: 'workspace' | 'company';
}

const roles = [
  { value: 'ceo', label: '대표' },
  { value: 'executive', label: '임원' },
  { value: 'pm', label: 'PM' },
  { value: 'po', label: 'PO' },
  { value: 'planner', label: '기획자' },
  { value: 'designer', label: '디자이너' },
  { value: 'marketer', label: '마케터' },
  { value: 'frontend', label: '프론트엔드 개발자' },
  { value: 'backend', label: '백엔드 개발자' },
  { value: 'operations', label: '운영 담당자' },
  { value: 'hr', label: '인사 담당자' },
  { value: 'finance', label: '재무 담당자' },
  { value: 'accounting', label: '회계 담당자' },
  { value: 'sales', label: '영업 담당자' },
  { value: 'other', label: '기타' }
];

const teamSizes = [
  { value: '1', label: '1명 (개인)' },
  { value: '2-10', label: '2-10명' },
  { value: '11-50', label: '11-50명' },
  { value: '51-200', label: '51-200명' },
  { value: '201-500', label: '201-500명' },
  { value: '500+', label: '500명 이상' }
];

const WorkspaceCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    companyName: '',
    workspaceName: '',
    userName: '',
    userNickname: '',
    userRole: '',
    teamSize: '',
    billingType: 'workspace'
  });
  
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [sameAsCompany, setSameAsCompany] = useState(false);

  // 회사명 중복 체크
  const checkCompanyDuplicate = async (companyName: string) => {
    if (!companyName) return;
    
    setIsCheckingDuplicate(true);
    setDuplicateError('');
    
    try {
      const q = query(
        collection(db, 'workspaces'),
        where('company_name', '==', companyName)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const workspaces = snapshot.docs.map(doc => doc.data().name);
        setExistingCompanies(workspaces);
        setDuplicateError(`이미 등록된 회사입니다. 기존 워크스페이스: ${workspaces.join(', ')}`);
      } else {
        setExistingCompanies([]);
        setDuplicateError('');
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // 워크스페이스명 중복 체크 및 가입 처리
  const checkWorkspaceDuplicate = async (companyName: string, workspaceName: string) => {
    if (!companyName || !workspaceName) return true;
    
    const fullName = `${companyName}-${workspaceName}`;
    
    try {
      // 정확한 매칭 검색
      const q = query(
        collection(db, 'workspaces'),
        where('company_name', '==', companyName),
        where('name', '==', workspaceName)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingWorkspace = snapshot.docs[0];
        const existingData = existingWorkspace.data();
        
        // 멤버 수 확인
        const membersQuery = query(
          collection(db, 'workspace_members'),
          where('workspace_id', '==', existingWorkspace.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        const memberCount = membersSnapshot.size;
        
        // 이미 멤버인지 확인
        const isMember = membersSnapshot.docs.some(
          doc => doc.data().user_id === user?.firebase_uid
        );
        
        if (isMember) {
          setDuplicateError('이미 이 워크스페이스의 멤버입니다.');
          const confirmGo = window.confirm(
            `이미 "${fullName}" 워크스페이스의 멤버입니다.\n지금 이동하시겠습니까?`
          );
          if (confirmGo) {
            navigate(`/workspaces/${existingWorkspace.id}/dashboard`);
          }
          return false;
        }
        
        // 가입 옵션 제공
        const confirmMessage = 
          `"${fullName}" 워크스페이스가 이미 존재합니다.\n\n` +
          `📊 현재 상태\n` +
          `• ${memberCount}명의 멤버\n` +
          `• ${existingData.plan || 'free'} 플랜\n` +
          `• ${existingData.is_public !== false ? '공개' : '비공개'} 워크스페이스\n\n` +
          `이 워크스페이스에 가입하시겠습니까?`;
        
        const shouldJoin = window.confirm(confirmMessage);
        
        if (shouldJoin) {
          await requestJoinExistingWorkspace(
            existingWorkspace.id,
            existingData,
            fullName
          );
          return false;
        } else {
          setDuplicateError('다른 워크스페이스 이름을 사용해주세요.');
          return false;
        }
      }
      
      setDuplicateError('');
      return true;
    } catch (error) {
      console.error('Error checking workspace duplicate:', error);
      return false;
    }
  };

  // 기존 워크스페이스 가입 요청
  const requestJoinExistingWorkspace = async (
    workspaceId: string,
    existingData: any,
    fullName: string
  ) => {
    if (!user) return;
    
    try {
      setIsCreating(true);
      
      // 공개 워크스페이스인 경우 바로 가입
      if (existingData.is_public !== false) {
        await addDoc(collection(db, 'workspace_members'), {
          workspace_id: workspaceId,
          user_id: user.firebase_uid,
          user_name: workspaceData.userName || user.displayName || user.email,
          user_email: user.email,
          user_nickname: workspaceData.userNickname || '',
          display_name: workspaceData.userNickname || workspaceData.userName || user.displayName,
          role: 'member',
          job_title: workspaceData.userRole || 'member',
          status: 'active',
          joined_at: serverTimestamp()
        });
        
        alert('워크스페이스에 성공적으로 가입되었습니다!');
        navigate(`/workspaces/${workspaceId}/dashboard`);
      } else {
        // 비공개 워크스페이스인 경우 가입 요청
        await addDoc(collection(db, 'workspace_join_requests'), {
          workspace_id: workspaceId,
          workspace_name: fullName,
          user_id: user.firebase_uid,
          user_name: workspaceData.userName || user.displayName || user.email,
          user_email: user.email,
          message: `${workspaceData.userRole || '멤버'}로 가입을 희망합니다.`,
          status: 'pending',
          requested_at: serverTimestamp()
        });
        
        alert(
          '가입 요청이 전송되었습니다!\n' +
          '워크스페이스 관리자의 승인 후 이용하실 수 있습니다.'
        );
        navigate('/workspaces');
      }
    } catch (error) {
      console.error('Error joining workspace:', error);
      alert('워크스페이스 가입 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 회사명 입력 시 디바운스 체크
  useEffect(() => {
    const timer = setTimeout(() => {
      if (workspaceData.companyName) {
        checkCompanyDuplicate(workspaceData.companyName);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [workspaceData.companyName]);

  // 동일 체크박스 처리
  useEffect(() => {
    if (sameAsCompany) {
      setWorkspaceData(prev => ({
        ...prev,
        workspaceName: prev.companyName
      }));
    }
  }, [sameAsCompany, workspaceData.companyName]);

  const handleNext = async () => {
    // 각 단계별 유효성 검사
    if (step === 1) {
      if (!workspaceData.companyName || !workspaceData.workspaceName) {
        alert('회사명과 워크스페이스 이름을 입력해주세요.');
        return;
      }
      
      const isValid = await checkWorkspaceDuplicate(
        workspaceData.companyName,
        workspaceData.workspaceName
      );
      
      if (!isValid) {
        return;
      }
    } else if (step === 2) {
      if (!workspaceData.userName || !workspaceData.userRole) {
        alert('이름과 역할을 입력해주세요.');
        return;
      }
    } else if (step === 3) {
      if (!workspaceData.teamSize) {
        alert('팀 규모를 선택해주세요.');
        return;
      }
    }
    
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreateWorkspace = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    console.log('🟢 Creating workspace directly with Firestore...');
    setIsCreating(true);
    
    try {
      // Firestore에 직접 워크스페이스 생성
      const fullName = `${workspaceData.companyName}-${workspaceData.workspaceName}`;
      
      // 1. 워크스페이스 생성
      const workspaceRef = await addDoc(collection(db, 'workspaces'), {
        company_name: workspaceData.companyName,
        name: workspaceData.workspaceName,
        full_name: fullName,
        owner_id: user.firebase_uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        team_size: workspaceData.teamSize,
        billing_type: workspaceData.billingType,
        is_public: true,
        allow_join_requests: true,
        plan: 'free',
        ai_usage_this_month: 0,
        members_count: 1
      });
      
      // 2. 워크스페이스 멤버로 자신을 추가
      const memberDocId = `${user.firebase_uid}_${workspaceRef.id}`;
      await setDoc(doc(db, 'workspace_members', memberDocId), {
        workspace_id: workspaceRef.id,
        workspace_name: fullName,
        user_id: user.firebase_uid,
        user_name: workspaceData.userName || user.displayName || user.email,
        user_email: user.email,
        user_nickname: workspaceData.userNickname || '',
        display_name: workspaceData.userNickname || workspaceData.userName || user.displayName,
        role: 'owner',
        job_title: workspaceData.userRole || 'owner',
        status: 'active',
        joined_at: serverTimestamp()
      });
      
      // 3. 워크스페이스 스토리지 초기화
      await setDoc(doc(db, 'workspaceStorage', workspaceRef.id), {
        workspaceId: workspaceRef.id,
        usedBytes: 0,
        maxBytes: 5368709120, // 5GB
        fileCount: 0
      });
      
      // 4. 기본 채널 생성
      await addDoc(collection(db, 'channels'), {
        name: 'general',
        type: 'public',
        workspaceId: workspaceRef.id,
        createdBy: user.firebase_uid,
        createdAt: serverTimestamp(),
        members: [user.firebase_uid],
        admins: [user.firebase_uid],
        lastActivity: serverTimestamp(),
        description: '모든 멤버가 참여하는 기본 채널입니다.'
      });
      
      console.log('🎆 Workspace created successfully:', workspaceRef.id);
      
      // 대시보드로 이동
      navigate(`/workspaces/${workspaceRef.id}/dashboard`);
    } catch (error) {
      console.error('🔴 Error creating workspace:', error);
      alert('워크스페이스 생성 중 오류가 발생했습니다.\n\n' + error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                워크스페이스를 생성해보세요
              </h2>
              <p className="text-gray-600">
                회사와 워크스페이스 정보를 입력해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline w-4 h-4 mr-1" />
                  회사 이름
                </label>
                <input
                  type="text"
                  value={workspaceData.companyName}
                  onChange={(e) => {
                    setWorkspaceData({ ...workspaceData, companyName: e.target.value });
                    if (sameAsCompany) {
                      setWorkspaceData(prev => ({ 
                        ...prev, 
                        companyName: e.target.value,
                        workspaceName: e.target.value 
                      }));
                    } else {
                      setWorkspaceData(prev => ({ ...prev, companyName: e.target.value }));
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 테크스타트업"
                />
                {isCheckingDuplicate && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    중복 확인 중...
                  </p>
                )}
                {existingCompanies.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <AlertCircle className="inline w-4 h-4 mr-1" />
                      이미 등록된 회사입니다. 기존 워크스페이스:
                    </p>
                    <ul className="mt-1 text-sm text-blue-700">
                      {existingCompanies.map((ws, idx) => (
                        <li key={idx}>• {ws}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="inline w-4 h-4 mr-1" />
                  워크스페이스 이름
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sameAsCompany}
                      onChange={(e) => setSameAsCompany(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">회사명과 동일</span>
                  </label>
                  <input
                    type="text"
                    value={workspaceData.workspaceName}
                    onChange={(e) => setWorkspaceData({ ...workspaceData, workspaceName: e.target.value })}
                    disabled={sameAsCompany}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="예: 마케팅팀, 개발팀, 전체"
                  />
                </div>
                {workspaceData.companyName && workspaceData.workspaceName && (
                  <p className="mt-2 text-sm text-gray-600">
                    최종 이름: <span className="font-medium">{workspaceData.companyName}-{workspaceData.workspaceName}</span>
                  </p>
                )}
                {duplicateError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {duplicateError}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                당신에 대해 알려주세요
              </h2>
              <p className="text-gray-600">
                팀에서 어떻게 불리길 원하시나요?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  내 이름
                </label>
                <input
                  type="text"
                  value={workspaceData.userName}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, userName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  닉네임 (선택사항)
                </label>
                <input
                  type="text"
                  value={workspaceData.userNickname}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, userNickname: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 길동, GD"
                />
                <p className="mt-1 text-sm text-gray-500">
                  닉네임 설정 시 닉네임이 우선으로 표시됩니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="inline w-4 h-4 mr-1" />
                  당신을 표현하세요
                </label>
                <select
                  value={workspaceData.userRole}
                  onChange={(e) => setWorkspaceData({ ...workspaceData, userRole: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">역할을 선택하세요</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                팀 규모를 알려주세요
              </h2>
              <p className="text-gray-600">
                적합한 기능과 가격을 추천해드립니다
              </p>
            </div>

            <div className="space-y-3">
              {teamSizes.map(size => (
                <button
                  key={size.value}
                  onClick={() => setWorkspaceData({ ...workspaceData, teamSize: size.value })}
                  className={`w-full p-4 text-left border rounded-lg transition-all ${
                    workspaceData.teamSize === size.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="font-medium">{size.label}</span>
                    </div>
                    {workspaceData.teamSize === size.value && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                과금 방식을 선택하세요
              </h2>
              <p className="text-gray-600">
                언제든지 변경 가능합니다
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setWorkspaceData({ ...workspaceData, billingType: 'workspace' })}
                className={`w-full p-4 text-left border rounded-lg transition-all ${
                  workspaceData.billingType === 'workspace'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="font-medium">워크스페이스별 과금</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      각 워크스페이스마다 독립적으로 과금됩니다
                    </p>
                  </div>
                  {workspaceData.billingType === 'workspace' && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setWorkspaceData({ ...workspaceData, billingType: 'company' })}
                className={`w-full p-4 text-left border rounded-lg transition-all ${
                  workspaceData.billingType === 'company'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <Building className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="font-medium">회사별 통합 과금</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      모든 워크스페이스를 하나로 통합 관리합니다
                    </p>
                  </div>
                  {workspaceData.billingType === 'company' && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">워크스페이스 정보 확인</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">회사명:</dt>
                  <dd className="font-medium">{workspaceData.companyName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">워크스페이스:</dt>
                  <dd className="font-medium">{workspaceData.workspaceName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">최종 이름:</dt>
                  <dd className="font-medium text-blue-600">
                    {workspaceData.companyName}-{workspaceData.workspaceName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">관리자:</dt>
                  <dd className="font-medium">
                    {workspaceData.userNickname || workspaceData.userName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">역할:</dt>
                  <dd className="font-medium">
                    {roles.find(r => r.value === workspaceData.userRole)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">팀 규모:</dt>
                  <dd className="font-medium">
                    {teamSizes.find(s => s.value === workspaceData.teamSize)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">과금 방식:</dt>
                  <dd className="font-medium">
                    {workspaceData.billingType === 'workspace' ? '워크스페이스별' : '회사 통합'}
                  </dd>
                </div>
              </dl>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Step {step} of 4</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              이전
            </button>
          )}
          
          <div className="ml-auto">
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg"
              >
                다음
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleCreateWorkspace}
                disabled={isCreating}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    워크스페이스 생성
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCreator;