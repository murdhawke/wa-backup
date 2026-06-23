const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// --- CONFIGURATION ---
const START_DATE = new Date('2026-01-01T00:00:00').getTime();
const END_DATE = new Date('2026-06-23T23:59:59').getTime();
const MEDIA_DIR = path.join(__dirname, 'downloaded_media');

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR);
}

// Initialize WhatsApp Client with Local Session Persistence
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, // 1. Set to false so you can see the Chrome window pop up
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled' // 2. Hides the "automated bot" flag
        ],
        // 3. Force a modern, non-bot User Agent string
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
});

console.log('WhatsApp client instance created. Initializing...');

// Set a global timeout to prevent hanging (5 hours)
setTimeout(() => {
    console.warn('Script timeout reached. Exiting...');
    process.exit(0);
}, 18000000);

// Generate QR Code for Login
client.on('qr', (qr) => {
    console.log('Scan the QR code below using WhatsApp on your phone:');
    qrcode.generate(qr, { small: true });
});

// Client is authenticated and ready
client.on('ready', async () => {
    console.log('✅ WhatsApp Web Client is fully authenticated and ready!');
    
    try {
        console.log('Fetching active chats...');
        const chats = await client.getChats();
        console.log(`Found ${chats.length} chats. Starting historical backup pipeline...`);

        for (const chat of chats) {
            try {
                // Filter out status updates or broadcast lists if necessary
                if (chat.isReadOnly) continue; 

                console.log(`\nProcessing Chat: ${chat.name || chat.id._serialized}`);
                
                // Fetch messages (Adjust limit based on how deep you need to scroll back)
                const messages = await chat.fetchMessages({ limit: 1000 });
                
                // Filter messages by your selected date range
                const filteredMessages = messages.filter(msg => {
                    const msgTimestampMs = msg.timestamp * 1000;
                    return msgTimestampMs >= START_DATE && msgTimestampMs <= END_DATE;
                });

                if (filteredMessages.length === 0) {
                    console.log(`-> No messages found within the time range for this chat.`);
                    continue;
                }

                // Setup CSV Writer for this specific chat
                const sanitizedChatName = (chat.name || chat.id.user).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const csvWriter = createCsvWriter({
                    path: path.join(__dirname, `backup_${sanitizedChatName}.csv`),
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

                for (let i = 0; i < filteredMessages.length; i++) {
                    const msg = filteredMessages[i];
                    try {
                        console.log(`   Processing message ${i + 1}/${filteredMessages.length}...`);
                        let localMediaPath = 'NULL';

                        // Process and decrypt media if present
                        if (msg.hasMedia) {
                            try {
                                const media = await msg.downloadMedia();
                                if (media) {
                                    // Create unique filename based on msg ID or timestamp
                                    const ext = media.mimetype.split('/')[1].split(';')[0]; // simple extension parser
                                    const filename = `${msg.id.id}.${ext}`;
                                    const fullPath = path.join(MEDIA_DIR, filename);
                                    
                                    fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
                                    localMediaPath = path.join('downloaded_media', filename);
                                }
                            } catch (mediaErr) {
                                console.error(`   ❌ Failed to download media for msg ${msg.id?.id}:`, mediaErr.message);
                                localMediaPath = 'ERROR_DOWNLOADING';
                            }
                        }

                        // Push clean structured data into array
                        if (msg.id && msg.id.id) {
                            csvRecords.push({
                                id: msg.id.id,
                                timestamp: new Date(msg.timestamp * 1000).toISOString(),
                                sender: msg._data?.notifyName || 'Unknown',
                                senderId: msg.from,
                                type: msg.type,
                                body: msg.hasMedia ? '' : (msg.body || ''), // if it's media, the text payload is handled differently
                                hasMedia: msg.hasMedia ? 'TRUE' : 'FALSE',
                                mediaPath: localMediaPath
                            });
                        }
                    } catch (msgErr) {
                        console.error(`   ⚠️ Error processing message ${i + 1}:`, msgErr.message);
                        continue;
                    }
                }

                // Write all compiled records to the CSV file
                if (csvRecords.length > 0) {
                    try {
                        console.log(`   Writing ${csvRecords.length} records to CSV...`);
                        await csvWriter.writeRecords(csvRecords);
                        console.log(`   💾 Saved ${csvRecords.length} messages to backup_${sanitizedChatName}.csv`);
                    } catch (writeErr) {
                        console.error(`   ❌ Failed to write CSV file:`, writeErr.message);
                    }
                }
                
                // Rate-limiting delay to avoid WhatsApp flagging account activity
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (chatErr) {
                console.error(`   ❌ Error processing chat "${chat.name || chat.id._serialized}":`, chatErr.message);
                continue;
            }
        }

        console.log('\n🎉 Backup pipeline process completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('An error occurred during runtime extraction:', err);
        process.exit(1);
    }
});

// Catch authentication tracking failures
client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
});

// Handle general client errors
client.on('error', (err) => {
    console.error('Client error occurred:', err.message);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.warn('Client disconnected:', reason);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
});

try {
    client.initialize();
} catch (err) {
    console.error('Failed to initialize WhatsApp client:', err.message);
    process.exit(1);
}