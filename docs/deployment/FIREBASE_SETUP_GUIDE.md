# Firebase Setup Guide for TeamPulse

This guide will help you set up Firebase Authentication with Google Login for TeamPulse.

## Prerequisites

- Google account
- Node.js 18+ installed
- TeamPulse project cloned and dependencies installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: "TeamPulse" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Toggle **Enable** switch
4. Add a **Project support email**
5. Click **Save**

## Step 3: Configure Web App

1. In Firebase Console, click the gear icon → **Project settings**
2. Under "Your apps", click **</> (Web)** icon
3. Register app with nickname "TeamPulse Web"
4. Copy the Firebase configuration object

## Step 4: Set Up Frontend Environment

1. Create `.env` file in the root directory (copy from `.env.example`)
2. Add your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## Step 5: Set Up Backend Service Account

1. In Firebase Console, go to **Project settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the downloaded JSON file as `serviceAccountKey.json`
4. Place it in `backend/src/config/serviceAccountKey.json`
5. **IMPORTANT**: Add this file to `.gitignore` to keep it secure

## Step 6: Configure Backend Environment

1. Create `.env` file in the `backend` directory (copy from `backend/.env.example`)
2. Add your Firebase project ID:

```env
FIREBASE_PROJECT_ID=your-project-id
```

For production, encode the service account JSON as base64:
```bash
base64 -i serviceAccountKey.json -o serviceAccount.base64
```

Then add to environment:
```env
FIREBASE_SERVICE_ACCOUNT=<contents-of-serviceAccount.base64>
```

## Step 7: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen:
   - App name: TeamPulse
   - User support email: your-email@example.com
   - App logo: Upload TeamPulse logo (optional)
   - Application home page: http://localhost:3000 (for development)
   - Authorized domains: Add your production domain when ready
5. Save the configuration

## Step 8: Add Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings**
2. Under **Authorized domains**, add:
   - `localhost` (for development)
   - Your production domain (when deploying)

## Step 9: Apply Database Schema

1. Make sure MySQL is running
2. Run the workspace schema script:

```bash
cd backend/scripts
./apply-workspace-schema.sh
```

## Step 10: Start the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend:
```bash
cd ..
npm start
```

## Step 11: Test Authentication

1. Navigate to http://localhost:3000
2. You should be redirected to the login page
3. Click "Continue with Google"
4. Select your Google account
5. You should be logged in and redirected to the dashboard

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### "Failed to verify Firebase token"
- Check that the service account key is correctly placed
- Verify the Firebase project ID matches in both frontend and backend

### "CORS error"
- Ensure backend CORS is configured to allow your frontend URL
- Check that FRONTEND_URL in backend .env matches your React app URL

### Database connection issues
- Verify MySQL is running on the correct port
- Check database credentials in backend .env
- Ensure the workspace schema has been applied

## Security Best Practices

1. **Never commit sensitive files**:
   - `.env` files
   - `serviceAccountKey.json`
   - Any file containing API keys or secrets

2. **Use environment variables** for all sensitive configuration

3. **Restrict API keys** in production:
   - Firebase Console → Project settings → API keys
   - Add application restrictions (HTTP referrers)

4. **Enable Security Rules** for Firebase services you use

5. **Regular security audits**:
   - Review workspace member permissions
   - Check audit logs for suspicious activity
   - Update dependencies regularly

## Next Steps

1. **Set up email invitations**: Configure email service in backend .env
2. **Add Stripe billing**: Follow the STRIPE_SETUP_GUIDE.md (to be created)
3. **Deploy to production**: See DEPLOYMENT_GUIDE.md (to be created)
4. **Configure custom domain**: Update Firebase authorized domains

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the backend logs
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed (`npm install`)

For more help, consult the [Firebase Documentation](https://firebase.google.com/docs).