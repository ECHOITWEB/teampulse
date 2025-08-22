const express = require('express');
const router = express.Router();
const { adminDb, admin } = require('../config/firebase-admin');
const { verifyAdmin, verifyWorkspaceOwner } = require('../middleware/adminAuth');

/**
 * 워크스페이스 생성 (Admin SDK 사용)
 */
router.post('/workspaces', verifyAdmin, async (req, res) => {
  try {
    const {
      companyName,
      workspaceName,
      userName,
      userNickname,
      userRole,
      teamSize,
      billingType
    } = req.body;
    
    const userId = req.user.uid;
    const fullName = `${companyName}-${workspaceName}`;
    
    // 트랜잭션으로 워크스페이스와 멤버 동시 생성
    const batch = adminDb.batch();
    
    // 1. 워크스페이스 생성
    const workspaceRef = adminDb.collection('workspaces').doc();
    batch.set(workspaceRef, {
      name: workspaceName,
      company_name: companyName,
      full_name: fullName,
      display_name: fullName,
      owner_id: userId,
      billing_type: billingType,
      team_size: teamSize,
      plan: 'free',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      settings: {
        allow_invites: true,
        require_2fa: false,
        data_retention_days: 90
      },
      ai_usage_this_month: 0,
      ai_usage_limit: 10000,
      is_public: true,
      allow_join_requests: true,
      member_count: 1
    });
    
    // 2. 사용자 프로필 업데이트
    const userRef = adminDb.collection('users').doc(userId);
    batch.set(userRef, {
      uid: userId,
      email: req.user.email,
      name: userName,
      nickname: userNickname,
      display_name: userNickname || userName,
      role: userRole,
      workspace_id: workspaceRef.id,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // 3. 워크스페이스 멤버 추가 (오너로)
    const memberRef = adminDb.collection('workspace_members').doc();
    batch.set(memberRef, {
      workspace_id: workspaceRef.id,
      user_id: userId,
      user_email: req.user.email,
      user_name: userName,
      user_nickname: userNickname,
      display_name: userNickname || userName,
      role: 'owner',
      job_title: userRole,
      status: 'active',
      joined_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 4. 기본 채널 생성
    const defaultChannels = ['general', 'random', 'announcements'];
    for (const channelName of defaultChannels) {
      const channelRef = adminDb.collection('channels').doc();
      batch.set(channelRef, {
        workspace_id: workspaceRef.id,
        name: channelName,
        description: `${channelName} 채널`,
        created_by: userId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        is_private: false,
        member_count: 1
      });
    }
    
    // 트랜잭션 실행
    await batch.commit();
    
    console.log(`✅ Workspace created: ${fullName} by ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      workspaceId: workspaceRef.id,
      message: 'Workspace created successfully'
    });
    
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

/**
 * 워크스페이스 삭제 (오너만 가능)
 */
router.delete('/workspaces/:workspaceId', verifyAdmin, verifyWorkspaceOwner, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // 트랜잭션으로 모든 관련 데이터 삭제
    const batch = adminDb.batch();
    
    // 1. 워크스페이스 삭제
    batch.delete(adminDb.collection('workspaces').doc(workspaceId));
    
    // 2. 모든 멤버 삭제
    const membersSnapshot = await adminDb
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .get();
    
    membersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 3. 모든 채널 삭제
    const channelsSnapshot = await adminDb
      .collection('channels')
      .where('workspace_id', '==', workspaceId)
      .get();
    
    channelsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 4. 모든 메시지 삭제
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('workspace_id', '==', workspaceId)
      .get();
    
    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 5. 가입 요청 삭제
    const requestsSnapshot = await adminDb
      .collection('workspace_join_requests')
      .where('workspace_id', '==', workspaceId)
      .get();
    
    requestsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 트랜잭션 실행
    await batch.commit();
    
    console.log(`✅ Workspace deleted: ${workspaceId} by ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

/**
 * 사용자 역할 변경 (오너/관리자만 가능)
 */
router.put('/workspaces/:workspaceId/members/:userId/role', verifyAdmin, verifyWorkspaceOwner, async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;
    
    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // 멤버 찾기
    const memberQuery = await adminDb
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .get();
    
    if (memberQuery.empty) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const memberDoc = memberQuery.docs[0];
    
    // 역할 업데이트
    await memberDoc.ref.update({
      role: role,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Role updated: ${userId} to ${role} in workspace ${workspaceId}`);
    
    res.json({
      success: true,
      message: 'Role updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * 가입 요청 승인/거절 (오너/관리자만 가능)
 */
router.post('/workspaces/:workspaceId/join-requests/:requestId/approve', verifyAdmin, verifyWorkspaceOwner, async (req, res) => {
  try {
    const { workspaceId, requestId } = req.params;
    
    // 가입 요청 조회
    const requestDoc = await adminDb
      .collection('workspace_join_requests')
      .doc(requestId)
      .get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const requestData = requestDoc.data();
    
    if (requestData.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    
    // 트랜잭션으로 처리
    const batch = adminDb.batch();
    
    // 1. 멤버 추가
    const memberRef = adminDb.collection('workspace_members').doc();
    batch.set(memberRef, {
      workspace_id: workspaceId,
      user_id: requestData.user_id,
      user_email: requestData.user_email,
      user_name: requestData.user_name,
      role: 'member',
      status: 'active',
      joined_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 2. 요청 상태 업데이트
    batch.update(requestDoc.ref, {
      status: 'approved',
      approved_by: req.user.uid,
      approved_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 3. 워크스페이스 멤버 수 증가
    const workspaceRef = adminDb.collection('workspaces').doc(workspaceId);
    batch.update(workspaceRef, {
      member_count: admin.firestore.FieldValue.increment(1)
    });
    
    await batch.commit();
    
    console.log(`✅ Join request approved: ${requestData.user_email} to workspace ${workspaceId}`);
    
    res.json({
      success: true,
      message: 'Join request approved'
    });
    
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

/**
 * AI 토큰 사용량 추적
 */
router.post('/workspaces/:workspaceId/ai-usage', verifyAdmin, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { model, tokensUsed, operation } = req.body;
    
    // 워크스페이스 AI 사용량 업데이트
    const workspaceRef = adminDb.collection('workspaces').doc(workspaceId);
    await workspaceRef.update({
      ai_usage_this_month: admin.firestore.FieldValue.increment(tokensUsed)
    });
    
    // AI 사용 로그 기록
    await adminDb.collection('ai_usage_logs').add({
      workspace_id: workspaceId,
      user_id: req.user.uid,
      model: model,
      tokens_used: tokensUsed,
      operation: operation,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ AI usage tracked: ${tokensUsed} tokens for workspace ${workspaceId}`);
    
    res.json({
      success: true,
      message: 'AI usage tracked'
    });
    
  } catch (error) {
    console.error('Error tracking AI usage:', error);
    res.status(500).json({ error: 'Failed to track AI usage' });
  }
});

module.exports = router;