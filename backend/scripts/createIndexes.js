const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function createIndexes() {
  console.log('🔨 Creating Firestore indexes...');
  
  // Note: Firestore composite indexes must be created through Firebase Console or CLI
  // This script documents the required indexes for optimal performance
  
  const requiredIndexes = [
    // Messages collection indexes
    {
      collection: 'messages',
      fields: [
        { field: 'channelId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For fetching channel messages in chronological order'
    },
    {
      collection: 'messages',
      fields: [
        { field: 'channelId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'ASCENDING' },
        { field: 'author', order: 'ASCENDING' }
      ],
      description: 'For analytics and user message queries'
    },
    {
      collection: 'messages',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For workspace-wide message queries'
    },
    
    // Channels collection indexes
    {
      collection: 'channels',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'type', order: 'ASCENDING' }
      ],
      description: 'For fetching workspace channels by type'
    },
    {
      collection: 'channels',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'lastActivity', order: 'DESCENDING' }
      ],
      description: 'For fetching active channels'
    },
    
    // Workspaces collection indexes
    {
      collection: 'workspaces',
      fields: [
        { field: 'members', mode: 'ARRAY_CONTAINS' },
        { field: 'createdAt', order: 'DESCENDING' }
      ],
      description: 'For user workspace queries'
    },
    {
      collection: 'workspaces',
      fields: [
        { field: 'owners', mode: 'ARRAY_CONTAINS' },
        { field: 'plan', order: 'ASCENDING' }
      ],
      description: 'For admin and billing queries'
    },
    
    // Users collection indexes
    {
      collection: 'users',
      fields: [
        { field: 'email', order: 'ASCENDING' }
      ],
      description: 'For user lookup by email'
    },
    {
      collection: 'users',
      fields: [
        { field: 'workspaces', mode: 'ARRAY_CONTAINS' },
        { field: 'lastActive', order: 'DESCENDING' }
      ],
      description: 'For active user queries'
    },
    
    // AI Usage collection indexes
    {
      collection: 'ai_usage',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For AI usage analytics'
    },
    {
      collection: 'ai_usage',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'provider', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For provider-specific usage queries'
    },
    {
      collection: 'ai_usage',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For user AI usage tracking'
    },
    
    // Analytics collection indexes
    {
      collection: 'analytics',
      fields: [
        { field: 'workspaceId', order: 'ASCENDING' },
        { field: 'date', order: 'DESCENDING' }
      ],
      description: 'For workspace analytics queries'
    },
    {
      collection: 'analytics',
      fields: [
        { field: 'channelId', order: 'ASCENDING' },
        { field: 'date', order: 'DESCENDING' }
      ],
      description: 'For channel analytics queries'
    },
    
    // Notifications collection indexes
    {
      collection: 'notifications',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'read', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ],
      description: 'For unread notifications queries'
    },
    
    // Read Status collection indexes
    {
      collection: 'readStatus',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'channelId', order: 'ASCENDING' },
        { field: 'lastRead', order: 'DESCENDING' }
      ],
      description: 'For tracking read status'
    }
  ];
  
  console.log('\n📋 Required Firestore Composite Indexes:\n');
  console.log('Please create these indexes in the Firebase Console or using the Firebase CLI:');
  console.log('https://console.firebase.google.com/project/[YOUR_PROJECT]/firestore/indexes\n');
  
  requiredIndexes.forEach((index, i) => {
    console.log(`${i + 1}. Collection: ${index.collection}`);
    console.log(`   Fields:`);
    index.fields.forEach(field => {
      if (field.mode) {
        console.log(`   - ${field.field} (${field.mode})`);
      } else {
        console.log(`   - ${field.field} (${field.order})`);
      }
    });
    console.log(`   Purpose: ${index.description}\n`);
  });
  
  // Create firestore.indexes.json file for Firebase CLI
  const indexesJson = {
    indexes: requiredIndexes.map(idx => ({
      collectionGroup: idx.collection,
      fields: idx.fields.map(field => ({
        fieldPath: field.field,
        order: field.order || undefined,
        arrayConfig: field.mode === 'ARRAY_CONTAINS' ? 'CONTAINS' : undefined
      }))
    }))
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const indexFilePath = path.join(__dirname, '..', 'firestore.indexes.json');
  fs.writeFileSync(indexFilePath, JSON.stringify(indexesJson, null, 2));
  
  console.log(`✅ Index configuration saved to: ${indexFilePath}`);
  console.log('\nTo deploy indexes using Firebase CLI, run:');
  console.log('firebase deploy --only firestore:indexes\n');
  
  // Create single-field indexes (these are automatic in Firestore but good to document)
  console.log('📌 Single-field indexes (automatically created by Firestore):');
  const singleFieldIndexes = [
    'messages.channelId',
    'messages.timestamp',
    'messages.author',
    'messages.workspaceId',
    'channels.workspaceId',
    'channels.type',
    'channels.lastActivity',
    'workspaces.members',
    'workspaces.owners',
    'workspaces.createdAt',
    'users.email',
    'users.workspaces',
    'users.lastActive',
    'ai_usage.workspaceId',
    'ai_usage.userId',
    'ai_usage.provider',
    'ai_usage.timestamp',
    'notifications.userId',
    'notifications.read',
    'notifications.timestamp'
  ];
  
  singleFieldIndexes.forEach(index => {
    console.log(`- ${index}`);
  });
  
  console.log('\n✅ Index documentation complete!');
}

// Run the script
createIndexes().catch(error => {
  console.error('Error creating indexes:', error);
  process.exit(1);
});