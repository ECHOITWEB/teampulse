#!/bin/bash

# TeamPulse Deployment Script
# This script ensures deployment happens with the correct Google account
# Account: echoitplanning1@gmail.com
# Project: teampulse-61474

echo "🚀 TeamPulse Deployment Script"
echo "==============================="
echo "Target Account: echoitplanning1@gmail.com"
echo "Target Project: teampulse-61474"
echo ""

# Check if .firebase-account-config exists
if [ ! -f ".firebase-account-config" ]; then
    echo "❌ Error: .firebase-account-config file not found!"
    echo "Creating configuration file..."
    cat > .firebase-account-config << EOF
# Firebase Account Configuration for TeamPulse
# This project is linked to: echoitplanning1@gmail.com
# Project ID: teampulse-61474

FIREBASE_ACCOUNT=echoitplanning1@gmail.com
FIREBASE_PROJECT_ID=teampulse-61474
EOF
fi

# Read configuration
source .firebase-account-config

# Check current Firebase login
echo "📋 Checking current Firebase login status..."
CURRENT_ACCOUNT=$(firebase login:list 2>&1 | grep "Logged in as" | awk '{print $4}')

if [ "$CURRENT_ACCOUNT" != "$FIREBASE_ACCOUNT" ]; then
    echo "⚠️  Warning: Currently logged in as: $CURRENT_ACCOUNT"
    echo "❗ You need to be logged in as: $FIREBASE_ACCOUNT"
    echo ""
    echo "Please run the following commands:"
    echo "1. firebase logout"
    echo "2. firebase login"
    echo "   (Select $FIREBASE_ACCOUNT when browser opens)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Logged in as correct account: $FIREBASE_ACCOUNT"

# Verify .firebaserc has correct project
echo "📋 Checking Firebase project configuration..."
if ! grep -q "teampulse-61474" .firebaserc; then
    echo "⚠️  Fixing .firebaserc to use correct project..."
    cat > .firebaserc << EOF
{
  "projects": {
    "default": "teampulse-61474"
  }
}
EOF
    echo "✅ Fixed .firebaserc"
fi

# Build the project
echo ""
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Firebase
echo ""
echo "🚀 Deploying to Firebase..."
echo "Project: $FIREBASE_PROJECT_ID"
firebase deploy --only hosting --project $FIREBASE_PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Your app is live at:"
    echo "   https://teampulse-61474.web.app"
    echo "   https://teampulse-61474.firebaseapp.com"
else
    echo "❌ Deployment failed!"
    exit 1
fi