import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

const InviteAcceptance: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!code) {
        setError('유효하지 않은 초대 링크입니다.');
        setLoading(false);
        return;
      }

      console.log('Loading invitation with code:', code);

      try {
        // First try without status filter to see if invitation exists
        const invitationQuery = query(
          collection(db, 'workspace_invitations'),
          where('invite_code', '==', code)
        );
        
        const snapshot = await getDocs(invitationQuery);
        console.log('Found invitations:', snapshot.size);
        
        if (snapshot.empty) {
          setError('초대 링크를 찾을 수 없습니다. 링크를 다시 확인해주세요.');
          setLoading(false);
          return;
        }
        
        const inviteData: any = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        
        console.log('Invitation data:', inviteData);
        
        // Check if already used
        if (inviteData.status === 'accepted') {
          setError('이미 사용된 초대 링크입니다.');
          setLoading(false);
          return;
        }
        
        if (inviteData.status === 'cancelled') {
          setError('취소된 초대 링크입니다.');
          setLoading(false);
          return;
        }
        
        // Check if invitation is expired
        if (inviteData.expires_at) {
          const expiryDate = inviteData.expires_at.toDate ? inviteData.expires_at.toDate() : new Date(inviteData.expires_at);
          if (expiryDate < new Date()) {
            setError('초대가 만료되었습니다.');
            setLoading(false);
            return;
          }
        }
        
        setInvitation(inviteData);
      } catch (error: any) {
        console.error('Error loading invitation:', error);
        console.error('Error details:', error.message, error.code);
        setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [code]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Save the invitation code to sessionStorage for after login
      sessionStorage.setItem('pendingInvitationCode', code || '');
      navigate('/login', { state: { from: `/invite/${code}` } });
      return;
    }
    
    if (!invitation) return;
    
    setAccepting(true);
    try {
      // Check if user's email matches the invitation (if email-specific)
      if (invitation.email && invitation.email !== user.email) {
        alert(`이 초대는 ${invitation.email} 이메일로 제한되어 있습니다.\n현재 로그인: ${user.email}`);
        setAccepting(false);
        return;
      }
      
      // Check if user is already a member
      const memberQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', invitation.workspace_id),
        where('user_id', '==', user.firebase_uid)
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        alert('이미 이 워크스페이스의 멤버입니다.');
        navigate(`/workspaces/${invitation.workspace_id}/team-chat`);
        return;
      }
      
      // Add user as member
      await addDoc(collection(db, 'members'), {
        workspace_id: invitation.workspace_id,
        user_id: user.firebase_uid,
        workspace_role: invitation.role || 'member',
        user_email: user.email,
        user_name: user.displayName || user.email,
        permissions: {
          can_create_objectives: true,
          can_edit_all_objectives: invitation.role === 'admin',
          can_delete_objectives: invitation.role === 'admin',
          can_manage_members: invitation.role === 'admin',
          can_manage_settings: invitation.role === 'admin',
          can_view_analytics: invitation.role === 'admin'
        },
        status: 'active',
        joined_at: serverTimestamp(),
        last_active: serverTimestamp(),
        workspace_profile: {
          display_name: user.displayName || user.email,
          department: '',
          position: '',
          team: ''
        },
        invited_by: invitation.invited_by,
        invitation_id: invitation.id
      });
      
      // Update invitation status
      await updateDoc(doc(db, 'workspace_invitations', invitation.id), {
        status: 'accepted',
        accepted_by: user.firebase_uid,
        accepted_at: serverTimestamp()
      });
      
      // Clear the pending invitation from sessionStorage
      sessionStorage.removeItem('pendingInvitationCode');
      
      alert(`${invitation.workspace_name} 워크스페이스에 성공적으로 가입했습니다!`);
      navigate(`/workspaces`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('초대 수락 중 오류가 발생했습니다.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">초대 오류</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            워크스페이스로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Show invitation details even when not logged in
  if (!user && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">워크스페이스 초대</h2>
          <p className="text-gray-600 text-center mb-6">
            {invitation?.invited_by_name}님이 당신을 초대했습니다
          </p>
          
          <div className="p-6 bg-gray-50 rounded-xl mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{invitation?.workspace_name}</h3>
            <div className="space-y-2 text-sm">
              {invitation?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">초대된 이메일:</span>
                  <span className="text-gray-900 font-medium">{invitation.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">역할:</span>
                <span className="text-gray-900 font-medium">
                  {invitation?.role === 'admin' ? '관리자' : '멤버'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                sessionStorage.setItem('pendingInvitationCode', code || '');
                navigate('/login', { state: { from: `/invite/${code}` } });
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하고 수락하기
            </button>
            <div className="text-center text-sm text-gray-500">
              계정이 없으신가요?
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem('pendingInvitationCode', code || '');
                navigate('/login', { state: { from: `/invite/${code}`, isSignup: true } });
              }}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              회원가입하고 수락하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if no invitation loaded yet (but not logged in)
  if (!user && !invitation && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">초대를 확인하려면 먼저 로그인해주세요.</p>
          <button
            onClick={() => {
              sessionStorage.setItem('pendingInvitationCode', code || '');
              navigate('/login', { state: { from: `/invite/${code}` } });
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // Show invitation details when logged in
  if (user && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">워크스페이스 초대</h2>
          <p className="text-gray-600 text-center mb-6">
            {invitation?.invited_by_name}님이 당신을 초대했습니다
          </p>
          
          <div className="p-6 bg-gray-50 rounded-xl mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{invitation?.workspace_name}</h3>
            <div className="space-y-2 text-sm">
              {invitation?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">초대된 이메일:</span>
                  <span className="text-gray-900 font-medium">{invitation.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">역할:</span>
                <span className="text-gray-900 font-medium">
                  {invitation?.role === 'admin' ? '관리자' : '멤버'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/workspaces')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {accepting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  수락 중...
                </span>
              ) : (
                '초대 수락'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default return (should not reach here)
  return null;
};

export default InviteAcceptance;