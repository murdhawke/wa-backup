# 🏗️ Application Architecture

## Overview

This is a **secure web application** that combines:
- **Backend**: Node.js + Express (REST API)
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Authentication**: Google OAuth 2.0
- **Session Management**: Express-session
- **Core Logic**: WhatsApp Web.js library + CSV Writer

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                             │
│  ┌──────────────┐     ┌────────────────┐                    │
│  │ Login Page   │     │   Dashboard    │                    │
│  │ (login.html) │────▶│(dashboard.html)│                    │
│  └──────────────┘     └────────────────┘                    │
│        │                      │                              │
│  Google OAuth         Real-time Progress                     │
│  Authentication       (Polls API every 1s)                   │
└──────────────┼─────────────────┼──────────────────────────────┘
               │                 │
               ▼                 ▼
        ┌─────────────────────────────────┐
        │   Express Server (server.js)    │
        └─────────────────────────────────┘
               │
        ┌──────┴──────┬──────────┐
        ▼             ▼          ▼
    ┌────────┐   ┌────────┐  ┌────────┐
    │ Google │   │ Session│  │ Backup │
    │ OAuth  │   │Manager │  │ Engine │
    │ Verify │   │        │  │        │
    └────────┘   └────────┘  └────────┘
                                 │
                    ┌────────────┴───────────────┐
                    ▼                           ▼
            ┌──────────────┐           ┌─────────────────┐
            │ WhatsApp Web │           │ CSV + Media     │
            │ .js Client   │           │ File Storage    │
            └──────────────┘           └─────────────────┘
                    │                           │
        WhatsApp Web Connection         User Backup Files
        (via puppeteer/chromium)       (backups/email@mail/)
```

## Request Flow

### 1. Initial Login Flow

```
User                Browser            Google OAuth         Express Server
 │                   │                     │                    │
 └──Visit Page───────▶│                     │                    │
 │                    │                     │                    │
 │                    │◀─────Login Page─────────────────────────│
 │                    │                     │                    │
 │─Click Google───────▶│                     │                    │
 │                     │────Auth Request────▶│                    │
 │                     │                     │                    │
 │                Browser Redirects to Google OAuth Login
 │
 │─Auth Code ◀────────────┐
 │                        │ Google OAuth Backend
 │─Exchange Code ────────▶│
 │                        │
 │                    ┌─Session Created─────────────────────────▶│
 │                    │                                           │
 │                    │◀──Redirect to Dashboard────────────────│
 │                    │                                           │
 └──Dashboard Loaded  │
```

### 2. Backup Execution Flow

```
User Clicks              Express Server          WhatsApp            File System
"Start Backup"               │                      │                     │
      │                      │                      │                     │
      │──POST /api/backup/start                     │                     │
      │                      │                      │                     │
      │                      ├─Initialize Client    │                     │
      │                      │                      │                     │
      │                      ├─Request QR Code      │                     │
      │◀─QR Code Displayed──┤◀─QR Code Generated──┤                     │
      │                      │                      │                     │
      │─Scan with Phone      │                      │                     │
      │                      │◀─Authentication─────┤                     │
      │                      │                      │                     │
      │                      ├─Fetch Chats          │                     │
      │                      │◀─Chat List ─────────┤                     │
      │                      │                      │                     │
      │                      ├─For Each Chat:       │                     │
      │ GET /api/progress    │  ├─Fetch Messages    │                     │
      │                      │  │◀─Messages────────┤                     │
      │◀─Progress Updates────┤  │                   │                     │
      │                      │  ├─Filter by Date    │                     │
      │                      │  ├─Download Media    │                     │
      │                      │  │◀─Media─ ─ ─ ─────┤                     │
      │                      │  │                   │                     │
      │                      │  └─Write to CSV     │                     │
      │                      │                      │     CSV + Media ───▶│
      │                      │                      │                     │
      │ GET /api/progress    │                      │                     │
      │◀─Final Status───────┤                      │                     │
      │                      │                      │                     │
```

## Component Breakdown

### Backend (server.js)

```javascript
server.js
├── Express App Setup
│   ├── Session Configuration
│   ├── Static File Serving
│   └── JSON Parser
│
├── Google OAuth Routes
│   ├── GET /auth/google           - Generate OAuth URL
│   ├── GET /auth/google/callback  - Handle OAuth callback
│   └── GET /logout                - Destroy session
│
├── Dashboard Routes
│   ├── GET /dashboard             - Serve dashboard page
│   └── GET /api/user              - Get current user info
│
├── Backup Routes
│   ├── POST /api/backup/start     - Initialize backup
│   └── GET /api/backup/progress   - Get real-time progress
│
└── Helper Functions
    ├── startBackup()              - Main backup logic
    ├── updateProgress()           - Update global progress state
    └── addMessage()               - Add log message
```

### Frontend (login.html & dashboard.html)

```html
login.html
├── CSS Styles
│   ├── Gradient background
│   ├── Login card styling
│   └── Google button
└── JavaScript
    └── Redirect to /auth/google on button click

dashboard.html
├── Navigation Bar
│   ├── Logo
│   ├── User info
│   └── Logout button
│
├── CSS Styles
│   ├── Responsive grid layout
│   ├── Progress bar animations
│   ├── Dark mode logs
│   └── Status indicators
│
└── JavaScript
    ├── Load user info
    ├── Start backup (POST /api/backup/start)
    ├── Poll progress (GET /api/backup/progress every 1s)
    ├── Update UI with stats
    ├── Display real-time logs
    └── Calculate elapsed time
```

## Data Flow

### Progress Object Structure

```javascript
{
  status: 'downloading_chats',        // idle, initializing, downloading, completed, error
  totalChats: 210,                    // Total chats found
  processedChats: 45,                 // Chats backed up so far
  totalMessages: 0,                   // Not used in current version
  downloadedMessages: 12345,          // Messages saved to CSV
  failedChats: 2,                     // Chats that failed to process
  currentChat: 'Gamar',               // Currently processing chat
  startTime: '2026-06-23T12:00:00',  // Backup start time
  messages: [
    {
      timestamp: '2026-06-23T12:00:05',
      text: '📂 Processing: Gamar'
    },
    ...
  ]
}
```

### Session Data Structure

```javascript
req.session.user = {
  id: '123456789',                    // Google sub ID
  email: 'user@gmail.com',            // Email address
  name: 'John Doe',                   // Display name
  picture: 'https://google.com/...'   // Avatar URL
}
```

### Backup Directory Structure

```
backups/
└── user@gmail.com/
    ├── backup_gamar.csv
    │   ├── Message_ID
    │   ├── Timestamp
    │   ├── Sender_Name
    │   ├── Sender_ID
    │   ├── Message_Type
    │   ├── Text_Content
    │   ├── Has_Media
    │   └── Media_Local_Path
    │
    ├── backup_hiking_group.csv
    ├── backup_work_chat.csv
    └── media/
        ├── abc123.jpg
        ├── def456.mp4
        └── ghi789.pdf
```

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Server | Node.js + Express | REST API & authentication |
| Auth | Google OAuth 2.0 | Secure user authentication |
| Session | express-session | User session management |
| WhatsApp | whatsapp-web.js | Access WhatsApp messages |
| Browser | Puppeteer | Chromium browser automation |
| CSV | csv-writer | Export data to CSV files |
| Frontend | HTML/CSS/JS | User interface |

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. HTTPS/TLS                                            │
│    └─ Encrypts data in transit (production only)        │
│                                                          │
│ 2. Google OAuth 2.0                                     │
│    └─ Handles user authentication securely              │
│                                                          │
│ 3. Session Management                                   │
│    └─ HTTP-only cookies (cannot be accessed by JS)      │
│    └─ Session timeout: 24 hours                         │
│                                                          │
│ 4. User Isolation                                       │
│    └─ Each user's backups in separate directory         │
│    └─ No cross-user data access possible                │
│                                                          │
│ 5. Environment Variables                                │
│    └─ Secrets never hardcoded in source                 │
│    └─ Separate .env file (not in Git)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Strategy

```
User Action
    │
    ▼
  Try Block
    │
    ├─ Success ──▶ Update Progress ──▶ Continue
    │
    └─ Error ──▶ Catch Block
                    │
                    ├─ Log Error
                    ├─ Update Status to 'error'
                    ├─ Continue with Next Item
                    └─ Complete with partial results
```

**Key Feature**: One failed chat doesn't stop the entire backup. All errors are logged and processing continues.

## Performance Characteristics

- **Concurrent Users**: Limited by system resources
- **Message Processing**: ~1-2 seconds per chat (with 1000 messages)
- **Media Download**: Speed depends on file size and connection
- **Database**: In-memory progress (suitable for single instance)
- **Session Storage**: In-memory (use Redis for multiple instances)

## Deployment Readiness

✅ Ready for:
- Windows Server
- Linux servers (AWS, DigitalOcean, etc.)
- Docker containers
- Heroku / AWS Lambda (with modifications)

⚠️ For production, add:
- Redis for session storage
- HTTPS certificates
- Rate limiting middleware
- Error tracking (Sentry)
- Monitoring & logging
- Backup encryption
- Database for user data

---

**Version**: 2.0.0  
**Architecture Type**: Monolithic  
**Scaling**: Horizontal (with Redis session store)
