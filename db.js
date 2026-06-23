const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(DB_DIR, 'backup.db');

let db;

function openDb() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) return reject(err);
            resolve(db);
        });
    });
}

async function initDb() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    await openDb();

    const chatsSql = `CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at INTEGER,
        total_messages INTEGER
    )`;

    const messagesSql = `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        timestamp INTEGER,
        sender TEXT,
        sender_id TEXT,
        type TEXT,
        body TEXT,
        has_media INTEGER,
        media_path TEXT,
        FOREIGN KEY(chat_id) REFERENCES chats(id)
    )`;

    await run(chatsSql);
    await run(messagesSql);
}

function run(sql, params=[]) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function get(sql, params=[]) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params=[]) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function saveChat(chat) {
    const createdAt = Math.floor(Date.now() / 1000);
    const sql = `INSERT OR REPLACE INTO chats (id, name, created_at, total_messages) VALUES (?, ?, ?, ?)`;
    await run(sql, [chat.id, chat.name || null, createdAt, chat.totalMessages || 0]);
}

async function saveMessage(msg) {
    const sql = `INSERT OR REPLACE INTO messages (id, chat_id, timestamp, sender, sender_id, type, body, has_media, media_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await run(sql, [msg.id, msg.chatId, msg.timestamp || 0, msg.sender || null, msg.senderId || null, msg.type || null, msg.body || null, msg.hasMedia ? 1 : 0, msg.mediaPath || null]);
}

module.exports = {
    initDb,
    saveChat,
    saveMessage,
    run,
    get,
    all
};
