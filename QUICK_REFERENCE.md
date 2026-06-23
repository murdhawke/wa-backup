# 🎯 Quick Reference Card

## Getting Started (Copy-Paste Friendly)

### 1️⃣ Get Google OAuth Credentials

```
1. Go to: https://console.cloud.google.com/
2. Create OAuth 2.0 Web application
3. Redirect URI: http://localhost:3000/auth/google/callback
4. Copy: Client ID and Client Secret
```

### 2️⃣ Configure .env File

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PORT=3000
SESSION_SECRET=MySecretKey2024!
NODE_ENV=development
```

### 3️⃣ Start Application

```bash
cd d:\projects\wa-backup
npm start
```

### 4️⃣ Open in Browser

```
http://localhost:3000
```

---

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| Server | `server.js` | Main backend |
| Login UI | `public/login.html` | Login page |
| Dashboard | `public/dashboard.html` | Progress UI |
| Config | `.env` | Settings |
| Backups | `backups/email@gmail.com/` | User data |

---

## Terminal Commands

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start with auto-reload (development)
npm run dev

# Run legacy CLI backup
npm run old-cli

# Check Node version
node --version

# Check if server is running
curl http://localhost:3000
```

---

## API Quick Reference

```javascript
// Start backup
POST /api/backup/start

// Get progress
GET /api/backup/progress

// Get user info
GET /api/user

// Logout
GET /logout
```

---

## Directory Structure

```
d:\projects\wa-backup/
├── server.js              (Backend)
├── .env                   (Config - EDIT THIS!)
├── package.json           (Dependencies)
├── public/
│   ├── login.html         (Login page)
│   └── dashboard.html     (Dashboard)
└── backups/
    └── email@gmail.com/   (Your backups)
```

---

## Default Ports

| Service | Port |
|---------|------|
| Web App | 3000 |
| Google OAuth | 443 |

---

## Backup File Locations

```
backups/
├── user1@gmail.com/
│   ├── backup_chat1.csv
│   ├── backup_chat2.csv
│   └── media/
│       ├── img1.jpg
│       └── video1.mp4
│
└── user2@gmail.com/
    └── backup_chat3.csv
```

---

## Troubleshooting One-Liners

```bash
# Check if Node is installed
node --version

# Check if npm is working
npm --version

# Reinstall all packages
npm install

# Start in verbose mode
npm start

# Clear npm cache
npm cache clean --force

# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## Environment Variables Explained

```env
GOOGLE_CLIENT_ID        # From Google Cloud Console
GOOGLE_CLIENT_SECRET    # Keep this SECRET! Never commit!
GOOGLE_CALLBACK_URL     # Must match Google Console exactly
PORT                    # Which port to run on
SESSION_SECRET          # Random key for session encryption
NODE_ENV                # development or production
```

---

## Progress Dashboard Stats

| Stat | Meaning |
|------|---------|
| Total Chats | All chats WhatsApp found |
| Processed | Successfully backed up |
| Messages Downloaded | Total messages saved |
| Failed | Chats with errors (backup continues) |

---

## Common Error Messages

| Error | Solution |
|-------|----------|
| `Cannot find module` | Run `npm install` |
| `ENOENT: no such file` | Check `.env` exists |
| `Invalid Client ID` | Check Google credentials |
| `Redirect URI mismatch` | Verify `.env` matches Google Console |
| `Port already in use` | Kill process on port 3000 |

---

## Important Notes

⚠️ **Never commit to Git**:
- `.env` file
- `backups/` directory
- `node_modules/` folder

✅ **Always use**:
- HTTPS in production
- Strong SESSION_SECRET
- Environment variables for secrets

---

## Useful Links

| Resource | URL |
|----------|-----|
| Google Cloud | https://console.cloud.google.com/ |
| Node.js Docs | https://nodejs.org/en/docs/ |
| Express.js | https://expressjs.com/ |
| OAuth 2.0 | https://oauth.net/2/ |

---

## Next: From Development to Production

```
1. Get SSL certificate (HTTPS)
2. Update Google OAuth redirect to your domain
3. Deploy to cloud server
4. Set up Redis for sessions
5. Enable monitoring & logging
6. Set NODE_ENV=production
```

---

## Support Files

- 📖 **Full Docs**: README.md
- ⚡ **Quick Start**: START_HERE.md  
- 🔐 **OAuth Setup**: SETUP.md
- 🏗️ **Architecture**: ARCHITECTURE.md
- ✅ **This Summary**: COMPLETION_SUMMARY.md

---

**Everything is ready!** 🚀

1. Update `.env` with Google credentials
2. Run `npm start`
3. Visit http://localhost:3000
4. Click "Continue with Google"
5. Enjoy! 🎉

