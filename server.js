const express = require('express');
const session = require('express-session');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_AUTH_BASE_DIR = process.env.WWEBJS_DATA_PATH || path.join(os.tmpdir(), '.wwebjs_auth');

fs.mkdirSync(WHATSAPP_AUTH_BASE_DIR, { recursive: true });
console.log('📁 WhatsApp auth directory ready:', WHATSAPP_AUTH_BASE_DIR);

// Configuration
const START_DATE = new Date('2026-01-01T00:00:00').getTime();
const END_DATE = new Date('2026-06-23T23:59:59').getTime();

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.json());
app.use(express.static('public'));

// Store WhatsApp client globally with persistent session
const whatsappClient = {
    instance: null,
    authenticated: false,
    qrCode: null,
    lastQr: null,
    backupProgress: null,
    created: false,
    initializing: false
};

// Initialize WhatsApp client once with persistent session
function initializeWhatsAppClient() {
    if (whatsappClient.created) {
        return whatsappClient.instance;
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'whatsapp_backup',
            dataPath: WHATSAPP_AUTH_BASE_DIR
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    });

    // Set up QR event listener
    client.on('qr', async (qr) => {
        try {
            if (whatsappClient.lastQr === qr) return;
            whatsappClient.lastQr = qr;
            const qrImage = await QRCode.toDataURL(qr);
            whatsappClient.qrCode = qrImage;
            console.log('📱 QR Code generated - scan with your phone');
        } catch (err) {
            console.error('QR code generation error:', err);
        }
    });

    // Set up ready event listener
    client.on('ready', () => {
        whatsappClient.authenticated = true;
        console.log('✅ WhatsApp authenticated and ready!');
    });

    // Handle auth failure
    client.on('auth_failure', (msg) => {
        console.error('WhatsApp auth failure:', msg);
        whatsappClient.authenticated = false;
    });

    // Handle disconnection
    client.on('disconnected', (reason) => {
        console.warn('WhatsApp disconnected:', reason);
        whatsappClient.authenticated = false;
    });

    client.on('error', (err) => {
        console.error('WhatsApp client error:', err);
    });

    whatsappClient.instance = client;
    whatsappClient.created = true;

    return client;
}

// Middleware to ensure WhatsApp is initialized
const ensureWhatsAppReady = async (req, res, next) => {
    try {
        const client = initializeWhatsAppClient();

        if (whatsappClient.authenticated) {
            return next();
        }

        if (!whatsappClient.initializing) {
            whatsappClient.initializing = true;
            try {
                await client.initialize();
            } finally {
                whatsappClient.initializing = false;
            }
        }

        return next();
    } catch (error) {
        console.error('WhatsApp initialization error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Redirect root to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ============ AUTHENTICATION ROUTES ============

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start WhatsApp and backup (combined flow)
app.post('/api/whatsapp/start', ensureWhatsAppReady, async (req, res) => {
    try {
        const client = whatsappClient.instance;

        if (whatsappClient.backupProgress?.status === 'running') {
            return res.status(400).json({ error: 'Backup already in progress' });
        }

        // Initialize backup progress
        whatsappClient.backupProgress = {
            status: 'running',
            totalChats: 0,
            processedChats: 0,
            totalMessages: 0,
            downloadedMessages: 0,
            failedChats: 0,
            currentChat: '',
            startTime: new Date(),
            messages: [],
            qrCode: null,
            authenticated: whatsappClient.authenticated
        };

        res.json({ 
            status: 'started',
            authenticated: whatsappClient.authenticated,
            qr: whatsappClient.qrCode,
            message: whatsappClient.authenticated ? 'Backup starting...' : 'Waiting for WhatsApp authentication...'
        });

        // Start backup asynchronously
        startBackup(client);
    } catch (error) {
        console.error('Start error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get QR code (only if not authenticated)
app.get('/api/whatsapp/qr', (req, res) => {
    res.json({ 
        qr: whatsappClient.qrCode,
        authenticated: whatsappClient.authenticated
    });
});

// Check authentication status
app.get('/api/whatsapp/status', (req, res) => {
    res.json({ 
        authenticated: whatsappClient.authenticated,
        initialized: whatsappClient.created,
        initializing: whatsappClient.initializing,
        qr: whatsappClient.qrCode
    });
});

// Get backup progress
app.get('/api/backup/progress', (req, res) => {
    res.json(whatsappClient.backupProgress || {});
});

async function clearWhatsAppSession() {
    const authPaths = [
        path.join(WHATSAPP_AUTH_BASE_DIR, 'session-whatsapp_backup'),
        path.join(__dirname, '.wwebjs_auth', 'whatsapp_backup'),
        path.join(__dirname, '.wwebjs_auth')
    ];

    if (whatsappClient.instance) {
        try {
            await whatsappClient.instance.logout();
        } catch (err) {
            console.warn('WhatsApp logout failed:', err.message || err);
        }
        try {
            await whatsappClient.instance.destroy();
        } catch (err) {
            console.warn('WhatsApp destroy failed:', err.message || err);
        }
    }

    whatsappClient.instance = null;
    whatsappClient.authenticated = false;
    whatsappClient.created = false;
    whatsappClient.qrCode = null;
    whatsappClient.lastQr = null;
    whatsappClient.initializing = false;
    whatsappClient.backupProgress = null;

    try {
        for (const authPath of authPaths) {
            if (fs.existsSync(authPath)) {
                await fs.promises.rm(authPath, { recursive: true, force: true });
                console.log('✅ WhatsApp LocalAuth session directory removed:', authPath);
            }
        }
        fs.mkdirSync(WHATSAPP_AUTH_BASE_DIR, { recursive: true });
    } catch (err) {
        console.error('Failed to remove WhatsApp session directory:', err);
    }
}

// Logout
app.get('/logout', async (req, res) => {
    try {
        await clearWhatsAppSession();
    } catch (err) {
        console.error('Logout error:', err);
    }
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/login');
    });
});

app.post('/api/whatsapp/clear-session', async (req, res) => {
    try {
        await clearWhatsAppSession();
        res.json({ success: true, message: 'WhatsApp session removed' });
    } catch (err) {
        console.error('Clear session error:', err);
        res.status(500).json({ error: err.message || 'Failed to clear session' });
    }
});

// Dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Get user info (WhatsApp number)
app.get('/api/user', async (req, res) => {
    try {
        if (!whatsappClient.authenticated) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const client = whatsappClient.instance;
        const info = await client.info;
        res.json({
            number: info.wid.user,
            platform: info.platform,
            pushname: info.pushname
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ HELPER FUNCTIONS ============

function updateProgress(update) {
    if (whatsappClient.backupProgress) {
        Object.assign(whatsappClient.backupProgress, update);
    }
}

function addMessage(message) {
    if (whatsappClient.backupProgress) {
        whatsappClient.backupProgress.messages.push({
            timestamp: new Date().toISOString(),
            text: message
        });
        // Keep only last 100 messages
        if (whatsappClient.backupProgress.messages.length > 100) {
            whatsappClient.backupProgress.messages.shift();
        }
    }
}

async function startBackup(client) {
    const BACKUP_DIR = path.join(__dirname, 'backups', 'session');
    const MEDIA_DIR = path.join(BACKUP_DIR, 'media');

    try {
        // Wait for authentication if not already authenticated
        if (!whatsappClient.authenticated) {
            addMessage('📱 Waiting for WhatsApp authentication...');
            addMessage('Scan the QR code when prompted');
            
            // Wait up to 2 minutes for authentication
            let waitTime = 0;
            while (!whatsappClient.authenticated && waitTime < 120000) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                waitTime += 1000;
                
                // Send QR code if available
                if (whatsappClient.qrCode && !whatsappClient.backupProgress.qrCode) {
                    whatsappClient.backupProgress.qrCode = whatsappClient.qrCode;
                }
            }

            if (!whatsappClient.authenticated) {
                addMessage('❌ Authentication timeout. Please try again.');
                updateProgress({ status: 'error', error: 'Authentication timeout' });
                return;
            }
        }

        // Create backup directories
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.mkdirSync(MEDIA_DIR, { recursive: true });

        updateProgress({ status: 'fetching_chats' });
        addMessage('📂 Fetching chats from WhatsApp...');

        const chats = await client.getChats();
        updateProgress({
            totalChats: chats.length,
            status: 'processing_chats'
        });
        addMessage(`📊 Found ${chats.length} chats. Starting backup...`);

        let processedCount = 0;
        let failedCount = 0;

        for (const chat of chats) {
            try {
                // Skip read-only chats (status, broadcasts)
                if (chat.isReadOnly) continue;

                const chatName = chat.name || chat.id._serialized;
                updateProgress({
                    currentChat: chatName,
                    processedChats: processedCount
                });
                addMessage(`📝 Processing: ${chatName}`);

                // Fetch messages from chat
                const messages = await chat.fetchMessages({ limit: 1000 });
                const filteredMessages = messages.filter(msg => {
                    const msgTimestampMs = msg.timestamp * 1000;
                    return msgTimestampMs >= START_DATE && msgTimestampMs <= END_DATE;
                });

                if (filteredMessages.length === 0) {
                    processedCount++;
                    continue;
                }

                // Set up CSV writer
                const sanitizedChatName = (chat.name || chat.id.user)
                    .replace(/[^a-z0-9]/gi, '_')
                    .toLowerCase();

                const csvWriter = createCsvWriter({
                    path: path.join(BACKUP_DIR, `backup_${sanitizedChatName}.csv`),
                    header: [
                        { id: 'id', title: 'Message_ID' },
                        { id: 'timestamp', title: 'Timestamp' },
                        { id: 'sender', title: 'Sender_Name' },
                        { id: 'senderId', title: 'Sender_ID' },
                        { id: 'type', title: 'Message_Type' },
                        { id: 'body', title: 'Text_Content' },
                        { id: 'hasMedia', title: 'Has_Media' },
                        { id: 'mediaPath', title: 'Media_Local_Path' }
                    ]
                });

                const csvRecords = [];

                // Process each message
                for (let i = 0; i < filteredMessages.length; i++) {
                    const msg = filteredMessages[i];
                    try {
                        let localMediaPath = 'NULL';

                        // Download media if present
                        if (msg.hasMedia) {
                            try {
                                const media = await msg.downloadMedia();
                                if (media) {
                                    const ext = media.mimetype.split('/')[1].split(';')[0];
                                    const filename = `${msg.id.id}.${ext}`;
                                    const fullPath = path.join(MEDIA_DIR, filename);
                                    fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
                                    localMediaPath = path.join('media', filename);
                                }
                            } catch (mediaErr) {
                                localMediaPath = 'ERROR_DOWNLOADING';
                            }
                        }

                        // Add record to CSV
                        if (msg.id && msg.id.id) {
                            csvRecords.push({
                                id: msg.id.id,
                                timestamp: new Date(msg.timestamp * 1000).toISOString(),
                                sender: msg._data?.notifyName || 'Unknown',
                                senderId: msg.from,
                                type: msg.type,
                                body: msg.hasMedia ? '' : (msg.body || ''),
                                hasMedia: msg.hasMedia ? 'TRUE' : 'FALSE',
                                mediaPath: localMediaPath
                            });

                            updateProgress({
                                downloadedMessages: csvRecords.length
                            });
                        }
                    } catch (msgErr) {
                        // Continue on message error
                    }
                }

                // Write CSV
                if (csvRecords.length > 0) {
                    await csvWriter.writeRecords(csvRecords);
                    addMessage(`💾 Saved ${csvRecords.length} messages from ${chatName}`);
                }

                processedCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (chatErr) {
                failedCount++;
                addMessage(`⚠️ Failed to process chat: ${chat.name || chat.id._serialized}`);
            }
        }

        updateProgress({
            status: 'completed',
            processedChats: processedCount,
            failedChats: failedCount
        });
        addMessage(`✅ Backup completed! Processed ${processedCount} chats.`);

    } catch (error) {
        console.error('Backup error:', error);
        addMessage(`❌ Backup failed: ${error.message}`);
        updateProgress({
            status: 'error',
            error: error.message
        });
    }
}

// ============ START SERVER ============

// Start server
(async () => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📝 WhatsApp Backup Service Ready`);
    });
})();
