const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK 초기화
let serviceAccount;

// 서비스 계정 키 파일 찾기
try {
  // 프로덕션 환경: 환경 변수에서 가져오기
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // 개발 환경: 로컬 파일에서 가져오기
    try {
      serviceAccount = require('./serviceAccountKey.json');
    } catch (e) {
      // Fallback to parent directory
      serviceAccount = require('../../teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');
    }
  }
} catch (error) {
  console.error('Firebase Admin SDK 서비스 계정 키를 찾을 수 없습니다.');
  console.error('1. Firebase Console에서 서비스 계정 키를 다운로드하세요.');
  console.error('2. backend/serviceAccountKey.json 으로 저장하세요.');
  console.error('3. 또는 FIREBASE_SERVICE_ACCOUNT 환경 변수를 설정하세요.');
  process.exit(1);
}

// Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  
  console.log('✅ Firebase Admin SDK 초기화 완료');
}

// Firestore 인스턴스
const adminDb = admin.firestore();

// Auth 인스턴스
const adminAuth = admin.auth();

module.exports = {
  admin,
  adminDb,
  adminAuth
};