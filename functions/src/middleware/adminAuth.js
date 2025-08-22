const { adminAuth, adminDb } = require('../config/firebase-admin');

/**
 * Firebase ID 토큰 검증 및 사용자 권한 확인 미들웨어
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Firebase ID 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * 워크스페이스 오너 권한 확인 미들웨어
 */
const verifyWorkspaceOwner = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.uid;
    
    // 워크스페이스 멤버 정보 조회
    const membersQuery = await adminDb
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    if (membersQuery.empty) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    
    const memberData = membersQuery.docs[0].data();
    
    if (memberData.role !== 'owner' && memberData.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }
    
    req.user.role = memberData.role;
    req.user.workspaceId = workspaceId;
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

module.exports = {
  verifyAdmin,
  verifyWorkspaceOwner
};