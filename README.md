# WhatsApp Backup - Secure Web Application

A secure web application for backing up WhatsApp chats with Google OAuth authentication and real-time progress tracking.

## Features

✅ **Google OAuth Login** - Secure authentication using Google accounts  
✅ **Real-time Progress Tracking** - Live dashboard showing backup progress  
✅ **User-specific Backups** - Each user has isolated backups  
✅ **Media Download Support** - Downloads images, videos, and documents  
✅ **Error Recovery** - Graceful error handling continues backup on failures  
✅ **Beautiful UI** - Modern, responsive dashboard interface  

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Google Cloud Project (for OAuth credentials)

## Installation

### 1. Clone and Install Dependencies

```bash
cd d:\projects\wa-backup
npm install
```

### 2. Set Up Google OAuth

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Google+ API"

#### Step 2: Create OAuth 2.0 Credentials

1. Go to **Credentials** in the left sidebar
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **Web application**
4. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google/callback`
   - `http://yourdomain.com/auth/google/callback` (for production)

5. Copy your **Client ID** and **Client Secret**

#### Step 3: Configure Environment Variables

Create/update `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PORT=3000
SESSION_SECRET=your-random-secret-key-here
NODE_ENV=development
```

### 3. Run the Application

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The application will be available at: **http://localhost:3000**

## Usage

### First Time Setup

1. **Visit the Login Page**: Go to `http://localhost:3000`
2. **Click "Continue with Google"**: You'll be redirected to Google's login
3. **Authorize the Application**: Grant permission to access your profile
4. **Access the Dashboard**: You'll be redirected to your backup dashboard

### Starting a Backup

1. Click the **"Start Backup"** button
2. A WhatsApp QR code will appear (scan with your phone within 1 minute)
3. Watch real-time progress:
   - Total chats found
   - Chats being processed
   - Messages downloaded
   - Media files saved
4. View detailed logs of the backup process

### Backup Data Storage

User backups are stored in:
```
backups/
├── user@gmail.com/
│   ├── backup_gamar.csv
│   ├── backup_tripple_tee_hiking_group.csv
│   └── media/
│       ├── message_id_1.jpg
│       ├── message_id_2.mp4
│       └── ...
└── another_user@gmail.com/
    └── ...
```

## File Structure

```
wa-backup/
├── server.js                 # Express server & auth logic
├── backup.js                 # Legacy CLI backup (kept for reference)
├── package.json              # Dependencies
├── .env                       # Environment variables
├── public/
│   ├── login.html            # Login page
│   └── dashboard.html        # Dashboard with progress UI
├── backups/                  # User backups (auto-created)
└── downloaded_media/         # Legacy media folder
```

## Security Considerations

🔒 **Session Security**
- Sessions stored in memory (use Redis for production)
- HTTPS required for production
- Secure HTTP-only cookies

🔒 **User Data**
- Each user's backups stored separately
- Google OAuth handles authentication
- Session timeout after 24 hours

🔒 **Production Deployment**
- Use environment variables for secrets
- Enable HTTPS
- Use external session store (Redis/MongoDB)
- Add rate limiting
- Enable CORS properly

## Troubleshooting

### "Invalid Client ID" Error
- Verify `GOOGLE_CLIENT_ID` in `.env`
- Check project is active in Google Cloud Console
- Ensure redirect URI is exact match

### WhatsApp QR Code Not Appearing
- Check browser console for errors
- Ensure WhatsApp Web is not logged in elsewhere
- Clear browser cache and try again

### Backups Not Saving
- Verify `backups/` directory has write permissions
- Check disk space available
- Review server logs for errors

### Session Lost After Refresh
- Session may have expired (24-hour timeout)
- Log back in with Google OAuth
- Consider using persistent session store for production

## Production Deployment

### On Windows Server / IIS

1. Install Node.js on the server
2. Set environment variables in system settings
3. Use PM2 or similar for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

### Using Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
SESSION_SECRET=generate_a_strong_random_key_here
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/login` | ❌ | Login page |
| GET | `/auth/google` | ❌ | Start Google OAuth |
| GET | `/auth/google/callback` | ❌ | OAuth callback |
| GET | `/logout` | ✅ | Logout user |
| GET | `/dashboard` | ✅ | Dashboard page |
| GET | `/api/user` | ✅ | Get current user |
| POST | `/api/backup/start` | ✅ | Start backup process |
| GET | `/api/backup/progress` | ✅ | Get backup progress |

## Performance Tips

⚡ **For Large Backups**
- Reduce message limit in server.js (default: 1000)
- Increase timeout values if needed
- Run during off-peak hours
- Monitor server resource usage

⚡ **Memory Management**
- Clear old backups periodically
- Compress archived backups
- Monitor disk space

## Support & Troubleshooting

For issues:
1. Check the activity logs in the dashboard
2. Review server console output
3. Check `.env` configuration
4. Verify Google OAuth credentials
5. Ensure WhatsApp Web session is valid

## License

MIT License - Feel free to modify and distribute

## Security Warning

⚠️ **Before Production Deployment**:
- Change `SESSION_SECRET` to a strong random value
- Use HTTPS only
- Implement proper rate limiting
- Add backup encryption
- Set up monitoring and logging
- Regular security audits

---

**Version**: 2.0.0  
**Last Updated**: 2026-06-23
