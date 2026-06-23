# Quick Start Guide - Google OAuth Setup

## 5-Minute Setup Instructions

### Step 1: Get Google OAuth Credentials (5 minutes)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a Project** (if you don't have one)
   - Click on the project dropdown at the top
   - Click "NEW PROJECT"
   - Name: "WhatsApp Backup" 
   - Click "CREATE"

3. **Enable Google+ API**
   - In the top search bar, type "Google+ API"
   - Click on "Google+ API"
   - Click "ENABLE"

4. **Create OAuth 2.0 Credentials**
   - Go to Credentials (sidebar → APIs & Services → Credentials)
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted for consent screen, click "Configure Consent Screen"
     - Choose "External"
     - Fill in: App name = "WhatsApp Backup"
     - Add your email
     - Save and continue
   - Back to Create Credentials:
     - Application type: **Web application**
     - Name: "WhatsApp Backup Web"
     - Authorized redirect URIs:
       ```
       http://localhost:3000/auth/google/callback
       ```
     - Click "CREATE"

5. **Copy Your Credentials**
   - You'll see: Client ID and Client Secret
   - Copy both values

### Step 2: Configure Environment (2 minutes)

1. **Open `.env` file** in the project root
2. **Paste your credentials**:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_from_google.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_from_google
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   PORT=3000
   SESSION_SECRET=MySecretKey2024!
   NODE_ENV=development
   ```

3. **Save the file**

### Step 3: Install & Run (3 minutes)

1. **Open Terminal/PowerShell** in project directory:
   ```bash
   cd d:\projects\wa-backup
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open your browser**:
   - Go to: http://localhost:3000
   - Click "Continue with Google"
   - Authorize the app
   - You're in! 🎉

## Common Issues

### ❌ "Invalid Client ID" Error
- **Fix**: Double-check you copied the Client ID correctly
- Make sure there are no extra spaces

### ❌ "Redirect URI mismatch"
- **Fix**: Ensure your `.env` has exactly:
  ```
  GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
  ```
- And Google Console has exactly the same URI

### ❌ "This site can't be reached"
- **Fix**: Make sure the server is running
- Terminal should show: "🚀 Server running on http://localhost:3000"

### ❌ npm install fails
- **Fix**: Make sure you have Node.js 16+ installed
- Run: `node --version`
- If needed, download from: https://nodejs.org/

## Production Deployment

### For Hosting (AWS, Azure, Heroku, etc.)

1. **Update `.env`**:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   NODE_ENV=production
   ```

2. **Add New Redirect URI to Google Console**:
   - Go back to Google Cloud Console
   - Credentials → OAuth 2.0 Client ID
   - Add: `https://yourdomain.com/auth/google/callback`
   - Save

3. **Deploy your app** to your hosting provider

## Next Steps

✅ **Application is ready!**

- Visit: http://localhost:3000
- Login with your Google account
- Click "Start Backup"
- Watch real-time progress
- Backups saved in `backups/` folder

---

Need help? Check the full README.md for detailed documentation.
