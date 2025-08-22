# TeamPulse Deployment Guide

## Account Configuration

This project is configured to deploy to:
- **Google Account**: echoitplanning1@gmail.com
- **Firebase Project**: teampulse-61474
- **Live URLs**: 
  - https://teampulse-61474.web.app
  - https://teampulse-61474.firebaseapp.com

## Quick Deploy

```bash
npm run deploy
```

This command will:
1. Check if you're logged in with the correct account
2. Verify project configuration
3. Build the project
4. Deploy to Firebase Hosting

## Manual Deployment Steps

### 1. Check Current Login
```bash
npm run deploy:check
```

### 2. Login with Correct Account (if needed)
```bash
firebase logout
firebase login
# Select echoitplanning1@gmail.com in browser
```

### 3. Deploy
```bash
npm run deploy
```

## Configuration Files

### `.firebase-account-config`
Contains the account and project configuration:
```
FIREBASE_ACCOUNT=echoitplanning1@gmail.com
FIREBASE_PROJECT_ID=teampulse-61474
```

### `.firebaserc`
Firebase project configuration:
```json
{
  "projects": {
    "default": "teampulse-61474"
  }
}
```

## Troubleshooting

### Wrong Account Error
If you see "Currently logged in as: [different-email]":
1. Run `firebase logout`
2. Run `firebase login`
3. Select `echoitplanning1@gmail.com` in the browser
4. Run `npm run deploy` again

### Multiple Google Accounts
If you have multiple Google accounts logged in your browser:
- Use incognito/private mode for cleaner login
- Or ensure you select `echoitplanning1@gmail.com` when prompted

### Build Errors
If the build fails:
1. Check for TypeScript errors: `npm run typecheck`
2. Check for linting errors: `npm run lint`
3. Fix any errors and run `npm run deploy` again

## Security Notes

- Never commit Firebase service account keys to public repositories
- The `.firebase-account-config` file is for local reference only
- Ensure proper Firebase security rules are configured in the Firebase Console