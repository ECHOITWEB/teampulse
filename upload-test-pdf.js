const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize admin
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'teampulse-61474.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadFile() {
  const localFilePath = '/Users/pablokim/teampulse/docs/here/Receipt-2216-0082.pdf';
  const remoteFileName = 'test-cors/Receipt-2216-0082.pdf';
  
  try {
    // Upload the file
    const [file] = await bucket.upload(localFilePath, {
      destination: remoteFileName,
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Make it publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    
    console.log('File uploaded successfully!');
    console.log('Public URL:', publicUrl);
    
    // Also get the Firebase Storage URL
    const [metadata] = await file.getMetadata();
    const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
    
    console.log('Firebase Storage URL:', firebaseUrl);
    
    // Test with curl command
    console.log('\nTest with this curl command:');
    console.log(`curl -X POST https://us-central1-teampulse-61474.cloudfunctions.net/processDocumentHttp \\
  -H "Origin: http://localhost:3001" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileUrl": "${firebaseUrl}",
    "fileType": "application/pdf",
    "fileName": "Receipt-2216-0082.pdf"
  }' \\
  -i`);
  
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

uploadFile();