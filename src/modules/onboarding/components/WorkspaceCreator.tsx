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
  Loader2,
  Key,
  Shield
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { createWorkspaceAdmin } from '../../../services/adminApi';
import inviteCodeService from '../../../services/inviteCodeService';
import companyService from '../../../services/companyService';

interface WorkspaceData {
  inviteCode: string;
  companyNameKo: string;
  companyNameEn: string;
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
  const { loadWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // Start from step 0 (invite code)
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    inviteCode: '',
    companyNameKo: '',
    companyNameEn: '',
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
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidationError, setCodeValidationError] = useState('');

  // 회사명 중복 체크
  const checkCompanyDuplicate = async (companyNameKo: string) => {
    if (!companyNameKo) return;
    
    setIsCheckingDuplicate(true);
    setDuplicateError('');
    
    try {
      const existingCompany = await companyService.getCompanyByKoreanName(companyNameKo);
      
      if (existingCompany) {
        setDuplicateError(`이미 등록된 회사입니다.`);
        // 자동으로 영문명 채우기
        if (existingCompany.name_en && !workspaceData.companyNameEn) {
          setWorkspaceData(prev => ({ ...prev, companyNameEn: existingCompany.name_en }));
        }
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

  // 영문 회사명으로 한글명 자동완성
  const checkCompanyByEnglish = async (companyNameEn: string) => {
    if (!companyNameEn) return;
    
    try {
      const existingCompany = await companyService.getCompanyByEnglishName(companyNameEn);
      
      if (existingCompany) {
        // 자동으로 한글명 채우기
        if (existingCompany.name_ko && !workspaceData.companyNameKo) {
          setWorkspaceData(prev => ({ ...prev, companyNameKo: existingCompany.name_ko }));
          setDuplicateError(`이미 등록된 회사입니다.`);
        }
      }
    } catch (error) {
      console.error('Error checking company by English name:', error);
    }
  };

  // 워크스페이스명 중복 체크 및 가입 처리
  const checkWorkspaceDuplicate = async (companyNameKo: string, workspaceName: string) => {
    if (!companyNameKo || !workspaceName) return true;
    
    const fullName = `${companyNameKo}-${workspaceName}`;
    
    try {
      // 정확한 매칭 검색
      const q = query(
        collection(db, 'workspaces'),
        where('company_name', '==', companyNameKo),
        where('name', '==', workspaceName)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingWorkspace = snapshot.docs[0];
        const existingData = existingWorkspace.data();
        
        // 멤버 수 확인
        const membersQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', existingWorkspace.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        const memberCount = membersSnapshot.size;
        
        // members 컬렉션에서 멤버 확인
        const memberQuery = query(
          collection(db, 'members'),
          where('user_id', '==', user?.firebase_uid || ''),
          where('workspace_id', '==', existingWorkspace.id)
        );
        const memberSnapshot = await getDocs(memberQuery);
        const isMember = !memberSnapshot.empty;
        
        if (isMember) {
          setDuplicateError('이미 이 워크스페이스의 멤버입니다.');
          const confirmGo = window.confirm(
            `이미 "${fullName}" 워크스페이스의 멤버입니다.\n지금 이동하시겠습니까?`
          );
          if (confirmGo) {
            navigate(`/workspaces/${existingWorkspace.id}/team-chat`);
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
      
      // 모든 워크스페이스에 대해 가입 요청 시스템 적용
      // 기존 멤버인지 확인
      const memberQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', workspaceId),
        where('user_id', '==', user.firebase_uid)
      );
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        alert('이미 이 워크스페이스의 멤버입니다.');
        navigate(`/workspaces/${workspaceId}/team-chat`);
        return;
      }
      
      // 이미 요청한 상태인지 확인
      const requestQuery = query(
        collection(db, 'workspace_join_requests'),
        where('workspace_id', '==', workspaceId),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'pending')
      );
      const requestSnapshot = await getDocs(requestQuery);
      
      if (!requestSnapshot.empty) {
        alert('이미 가입 요청을 보낸 상태입니다.\n관리자의 승인을 기다려주세요.');
        navigate('/workspaces');
        return;
      }
      
      // 가입 요청 생성
      await addDoc(collection(db, 'workspace_join_requests'), {
        workspace_id: workspaceId,
        workspace_name: fullName,
        user_id: user.firebase_uid,
        user_name: workspaceData.userName || user.displayName || user.email,
        user_email: user.email,
        user_nickname: workspaceData.userNickname || workspaceData.userName || user.displayName || user.email?.split('@')[0] || 'User',
        user_role: workspaceData.userRole || 'member',
        message: `${workspaceData.userRole || '멤버'}로 가입을 희망합니다.`,
        status: 'pending',
        is_public_workspace: existingData.is_public !== false,
        requested_at: serverTimestamp()
      });
      
      alert(
        '가입 요청이 전송되었습니다!\n' +
        '워크스페이스 관리자의 승인 후 이용하실 수 있습니다.'
      );
      navigate('/workspaces');
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
      if (workspaceData.companyNameKo) {
        checkCompanyDuplicate(workspaceData.companyNameKo);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [workspaceData.companyNameKo]);

  // 영문 회사명 입력 시 디바운스 체크
  useEffect(() => {
    const timer = setTimeout(() => {
      if (workspaceData.companyNameEn) {
        checkCompanyByEnglish(workspaceData.companyNameEn);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [workspaceData.companyNameEn]);

  // 동일 체크박스 처리
  useEffect(() => {
    if (sameAsCompany) {
      setWorkspaceData(prev => ({
        ...prev,
        workspaceName: prev.companyNameKo
      }));
    }
  }, [sameAsCompany, workspaceData.companyNameKo]);

  const handleNext = async () => {
    // 각 단계별 유효성 검사
    if (step === 0) {
      // 인증 코드 검증
      if (!workspaceData.inviteCode) {
        setCodeValidationError('인증 코드를 입력해주세요.');
        return;
      }
      
      setIsValidatingCode(true);
      setCodeValidationError('');
      
      try {
        const result = await inviteCodeService.validateCode(workspaceData.inviteCode);
        if (!result.isValid) {
          setCodeValidationError(result.message);
          return;
        }
      } catch (error) {
        setCodeValidationError('인증 코드 확인 중 오류가 발생했습니다.');
        return;
      } finally {
        setIsValidatingCode(false);
      }
    } else if (step === 1) {
      if (!workspaceData.companyNameKo || !workspaceData.companyNameEn || !workspaceData.workspaceName) {
        alert('회사명(한글/영문)과 워크스페이스 이름을 모두 입력해주세요.');
        return;
      }
      
      const isValid = await checkWorkspaceDuplicate(
        workspaceData.companyNameKo,
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
    if (step > 0) setStep(step - 1);
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
      const fullName = `${workspaceData.companyNameKo}-${workspaceData.workspaceName}`;
      
      // 1. 먼저 회사 생성 또는 가져오기
      let companyId;
      const existingCompany = await companyService.getCompanyByKoreanName(workspaceData.companyNameKo);
      
      if (existingCompany) {
        companyId = existingCompany.id;
        // 영문명이 다르면 업데이트
        if (workspaceData.companyNameEn && existingCompany.name_en !== workspaceData.companyNameEn.toUpperCase()) {
          await companyService.updateCompany(companyId, {
            name_en: workspaceData.companyNameEn.toUpperCase()
          });
        }
      } else {
        // 새 회사 생성
        companyId = await companyService.createCompany({
          name_ko: workspaceData.companyNameKo,
          name_en: workspaceData.companyNameEn || workspaceData.companyNameKo.toUpperCase().replace(/\s+/g, '')
        });
      }
      
      // 2. 워크스페이스 생성
      const workspaceRef = await addDoc(collection(db, 'workspaces'), {
        company_id: companyId,
        company_name: workspaceData.companyNameKo,
        name: workspaceData.workspaceName,
        full_name: fullName,
        owner_id: user.firebase_uid,
        admin_ids: [user.firebase_uid],
        created_at: serverTimestamp(),
        created_by: user.firebase_uid,
        updated_at: serverTimestamp(),
        type: 'team',
        is_main: false,
        plan: 'free',
        settings: {
          okr_cycle: 'quarterly',
          allow_individual_okrs: true,
          require_approval: false,
          features: {
            ai_enabled: true,
            chat_enabled: true,
            meetings_enabled: true
          }
        },
        stats: {
          member_count: 1,
          active_objectives: 0,
          completion_rate: 0,
          last_activity: serverTimestamp()
        }
      });
      
      // 3. members 컬렉션에 멤버 추가
      await addDoc(collection(db, 'members'), {
        user_id: user.firebase_uid,
        company_id: companyId,
        workspace_id: workspaceRef.id,
        company_role: 'owner',
        workspace_role: 'owner',
        permissions: {
          can_create_objectives: true,
          can_edit_all_objectives: true,
          can_delete_objectives: true,
          can_manage_members: true,
          can_manage_settings: true,
          can_view_analytics: true
        },
        status: 'active',
        joined_at: serverTimestamp(),
        last_active: serverTimestamp(),
        workspace_profile: {
          display_name: workspaceData.userNickname || workspaceData.userName || user.displayName,
          department: '',
          position: workspaceData.userRole,
          team: ''
        }
      });
      
      // 4. users 컬렉션 업데이트 또는 생성
      await setDoc(doc(db, 'users', user.firebase_uid), {
        email: user.email,
        name: workspaceData.userNickname || workspaceData.userName || user.displayName || user.email?.split('@')[0] || 'User',
        display_name: workspaceData.userName || user.displayName || user.email,
        photo_url: '',
        profile: {
          bio: '',
          timezone: 'Asia/Seoul',
          language: 'ko',
          notification_preferences: {
            email: true,
            push: true,
            okr_updates: true,
            mentions: true
          }
        },
        created_at: serverTimestamp(),
        last_login: serverTimestamp(),
        email_verified: true,
        default_workspace_id: workspaceRef.id,
        recent_workspace_ids: [workspaceRef.id]
      }, { merge: true });
      
      // 5. 워크스페이스 스토리지 초기화
      await setDoc(doc(db, 'workspaceStorage', workspaceRef.id), {
        workspaceId: workspaceRef.id,
        usedBytes: 0,
        maxBytes: 5368709120, // 5GB
        fileCount: 0
      });
      
      // 4. 기본 채널 생성 (chat_channels 컬렉션 사용)
      // 먼저 general 채널이 이미 있는지 확인
      const channelsQuery = query(
        collection(db, 'chat_channels'),
        where('workspace_id', '==', workspaceRef.id),
        where('name', '==', 'general')
      );
      const channelsSnapshot = await getDocs(channelsQuery);
      
      // general 채널이 없을 때만 생성
      if (channelsSnapshot.empty) {
        await addDoc(collection(db, 'chat_channels'), {
          workspace_id: workspaceRef.id,
          name: 'general',
          description: '모든 멤버가 참여하는 기본 채널입니다.',
          type: 'public',
          members: [user.firebase_uid],
          owner_id: user.firebase_uid,
          ai_enabled: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
      
      // 5. 인증 코드를 사용된 것으로 마킹
      await inviteCodeService.markCodeAsUsed(
        workspaceData.inviteCode,
        user.firebase_uid,
        workspaceRef.id
      );
      
      console.log('🎆 Workspace created successfully:', workspaceRef.id);
      
      // Refresh workspace context to include the new workspace
      await loadWorkspaces();
      
      // 대시보드로 이동
      navigate(`/workspaces/${workspaceRef.id}/team-chat`);
    } catch (error) {
      console.error('🔴 Error creating workspace:', error);
      alert('워크스페이스 생성 중 오류가 발생했습니다.\n\n' + error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        // 인증 코드 입력 단계
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full">
                  <Shield className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                테스트 트라이얼 시작하기
              </h2>
              <p className="text-gray-600">
                TeamPulse 트라이얼을 시작하려면 인증 코드를 입력해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="inline w-4 h-4 mr-1" />
                  인증 코드
                </label>
                <input
                  type="text"
                  value={workspaceData.inviteCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setWorkspaceData({ ...workspaceData, inviteCode: value });
                    setCodeValidationError('');
                  }}
                  maxLength={6}
                  className="w-full p-4 text-center text-2xl font-mono tracking-wider border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="ABC123"
                  disabled={isValidatingCode}
                />
                <p className="mt-2 text-sm text-gray-500">
                  6자리 영문 대문자와 숫자 조합
                </p>
                {codeValidationError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {codeValidationError}
                  </p>
                )}
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">안내사항</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• 인증 코드는 관리자로부터 받으실 수 있습니다</li>
                  <li>• 한 번 사용된 코드는 재사용할 수 없습니다</li>
                  <li>• 문제가 있으시면 관리자에게 문의해주세요</li>
                </ul>
              </div>
            </div>
          </motion.div>
        );
        
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
                  회사 이름 (한글)
                </label>
                <input
                  type="text"
                  value={workspaceData.companyNameKo}
                  onChange={(e) => {
                    const value = e.target.value;
                    setWorkspaceData(prev => ({ ...prev, companyNameKo: value }));
                    if (sameAsCompany) {
                      setWorkspaceData(prev => ({ 
                        ...prev, 
                        companyNameKo: value,
                        workspaceName: value 
                      }));
                    }
                    // 한글명으로 중복 체크 및 영문명 자동완성
                    if (value.length > 1) {
                      checkCompanyDuplicate(value);
                    }
                  }}
                  onBlur={(e) => checkCompanyDuplicate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 에코아이티"
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
                  <Building className="inline w-4 h-4 mr-1" />
                  회사 이름 (영문)
                </label>
                <input
                  type="text"
                  value={workspaceData.companyNameEn}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWorkspaceData(prev => ({ ...prev, companyNameEn: value }));
                    // 영문명으로 한글명 자동완성 시도
                    if (value.length > 2) {
                      checkCompanyByEnglish(value);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: ECHOIT"
                />
                <p className="mt-1 text-sm text-gray-500">
                  영문 대문자로 입력해주세요 (공백 없이)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="inline w-4 h-4 mr-1" />
                  워크스페이스 이름
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsCompany}
                      onChange={(e) => setSameAsCompany(e.target.checked)}
                      className="w-4 h-4 mr-2 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-600 select-none">회사명과 동일</span>
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
                {workspaceData.companyNameKo && workspaceData.workspaceName && (
                  <p className="mt-2 text-sm text-gray-600">
                    최종 이름: <span className="font-medium">{workspaceData.companyNameKo}-{workspaceData.workspaceName}</span>
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
                  <dd className="font-medium">{workspaceData.companyNameKo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">워크스페이스:</dt>
                  <dd className="font-medium">{workspaceData.workspaceName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">최종 이름:</dt>
                  <dd className="font-medium text-blue-600">
                    {workspaceData.companyNameKo}-{workspaceData.workspaceName}
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
            <span className="text-sm text-gray-600">Step {step + 1} of 5</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 0 && (
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