import * as SQLite from 'expo-sqlite';

class DatabaseService {
    constructor() {
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Open database
            this.db = await SQLite.openDatabaseAsync('chatApp.db');
            
            // Create tables if they don't exist
            await this.createTables();
            
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing database:', error);
        }
    }

    async createTables() {
        try {
            // Messages table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY NOT NULL,
                    roomId TEXT NOT NULL,
                    userId TEXT NOT NULL,
                    text TEXT NOT NULL,
                    senderName TEXT,
                    profileUrl TEXT,
                    createdAt INTEGER NOT NULL,
                    synced INTEGER DEFAULT 0
                );
            `);

            // Rooms table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS rooms (
                    roomId TEXT PRIMARY KEY NOT NULL,
                    lastMessage TEXT,
                    lastMessageTime INTEGER,
                    isTemporary INTEGER DEFAULT 0,
                    tempChatId TEXT,
                    createdAt INTEGER NOT NULL
                );
            `);

            // Contacts table
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS contacts (
                    userId TEXT PRIMARY KEY NOT NULL,
                    username TEXT NOT NULL,
                    email TEXT,
                    profileUrl TEXT,
                    lastSeen INTEGER,
                    createdAt INTEGER NOT NULL
                );
            `);

            console.log('✅ All tables created successfully');
        } catch (error) {
            console.error('❌ Error creating tables:', error);
        }
    }

    // Message operations
    async saveMessage(message) {
        try {
            await this.db.runAsync(
                `INSERT OR REPLACE INTO messages 
                 (id, roomId, userId, text, senderName, profileUrl, createdAt, synced) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    message.id || `${message.userId}_${Date.now()}`,
                    message.roomId,
                    message.userId,
                    message.text,
                    message.senderName,
                    message.profileUrl,
                    message.createdAt?.seconds ? message.createdAt.seconds * 1000 : Date.now(),
                    message.synced || 1
                ]
            );
        } catch (error) {
            console.error('❌ Error saving message:', error);
        }
    }

    async saveMessages(messages, roomId) {
        try {
            for (const message of messages) {
                await this.saveMessage({ ...message, roomId });
            }
            console.log(`✅ Saved ${messages.length} messages for room ${roomId}`);
        } catch (error) {
            console.error('❌ Error saving messages:', error);
        }
    }

    async getMessages(roomId) {
        try {
            const result = await this.db.getAllAsync(
                `SELECT * FROM messages 
                 WHERE roomId = ? 
                 ORDER BY createdAt ASC`,
                [roomId]
            );
            
            // Convert back to Firebase format
            return result.map(msg => ({
                ...msg,
                createdAt: {
                    seconds: Math.floor(msg.createdAt / 1000),
                    nanoseconds: 0
                }
            }));
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            return [];
        }
    }

    async deleteMessagesForRoom(roomId) {
        try {
            await this.db.runAsync(
                `DELETE FROM messages WHERE roomId = ?`,
                [roomId]
            );
            console.log(`✅ Deleted messages for room ${roomId}`);
        } catch (error) {
            console.error('❌ Error deleting messages:', error);
        }
    }

    // Room operations
    async saveRoom(roomData) {
        try {
            await this.db.runAsync(
                `INSERT OR REPLACE INTO rooms 
                 (roomId, lastMessage, lastMessageTime, isTemporary, tempChatId, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    roomData.roomId,
                    roomData.lastMessage || '',
                    roomData.lastMessageTime || Date.now(),
                    roomData.isTemporary ? 1 : 0,
                    roomData.tempChatId || null,
                    roomData.createdAt || Date.now()
                ]
            );
        } catch (error) {
            console.error('❌ Error saving room:', error);
        }
    }

    async deleteRoom(roomId) {
        try {
            // Delete room and its messages
            await this.db.runAsync(`DELETE FROM rooms WHERE roomId = ?`, [roomId]);
            await this.deleteMessagesForRoom(roomId);
            console.log(`✅ Deleted room ${roomId}`);
        } catch (error) {
            console.error('❌ Error deleting room:', error);
        }
    }

    // Contact operations
    async saveContact(contact) {
        try {
            await this.db.runAsync(
                `INSERT OR REPLACE INTO contacts 
                 (userId, username, email, profileUrl, lastSeen, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    contact.userId,
                    contact.username,
                    contact.email || '',
                    contact.profileUrl || '',
                    contact.lastSeen || Date.now(),
                    contact.createdAt || Date.now()
                ]
            );
        } catch (error) {
            console.error('❌ Error saving contact:', error);
        }
    }

    async getContacts() {
        try {
            const result = await this.db.getAllAsync(
                `SELECT * FROM contacts ORDER BY username ASC`
            );
            return result;
        } catch (error) {
            console.error('❌ Error getting contacts:', error);
            return [];
        }
    }

    // Utility functions
    async clearAllData() {
        try {
            await this.db.execAsync(`DELETE FROM messages`);
            await this.db.execAsync(`DELETE FROM rooms`);
            await this.db.execAsync(`DELETE FROM contacts`);
            console.log('✅ All local data cleared');
        } catch (error) {
            console.error('❌ Error clearing data:', error);
        }
    }

    async getStorageSize() {
        try {
            const messages = await this.db.getAllAsync(`SELECT COUNT(*) as count FROM messages`);
            const rooms = await this.db.getAllAsync(`SELECT COUNT(*) as count FROM rooms`);
            const contacts = await this.db.getAllAsync(`SELECT COUNT(*) as count FROM contacts`);
            
            return {
                messages: messages[0]?.count || 0,
                rooms: rooms[0]?.count || 0,
                contacts: contacts[0]?.count || 0
            };
        } catch (error) {
            console.error('❌ Error getting storage size:', error);
            return { messages: 0, rooms: 0, contacts: 0 };
        }
    }

    // Save unsent messages for offline mode
    async saveUnsentMessage(message) {
        try {
            await this.db.runAsync(
                `INSERT INTO messages 
                 (id, roomId, userId, text, senderName, profileUrl, createdAt, synced) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    `unsent_${Date.now()}_${Math.random()}`,
                    message.roomId,
                    message.userId,
                    message.text,
                    message.senderName,
                    message.profileUrl,
                    Date.now(),
                    0 // Not synced yet
                ]
            );
            console.log('✅ Unsent message saved locally');
        } catch (error) {
            console.error('❌ Error saving unsent message:', error);
        }
    }

    async getUnsentMessages() {
        try {
            const result = await this.db.getAllAsync(
                `SELECT * FROM messages WHERE synced = 0 ORDER BY createdAt ASC`
            );
            return result;
        } catch (error) {
            console.error('❌ Error getting unsent messages:', error);
            return [];
        }
    }

    async markMessageAsSynced(messageId) {
        try {
            await this.db.runAsync(
                `UPDATE messages SET synced = 1 WHERE id = ?`,
                [messageId]
            );
        } catch (error) {
            console.error('❌ Error marking message as synced:', error);
        }
    }
}

// Create and export singleton instance
const dbService = new DatabaseService();
export default dbService;
