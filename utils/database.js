import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  // Initialize database with proper error handling
  async init() {
    // If already initializing, wait for that promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.isInitialized && this.db) {
      return Promise.resolve();
    }

    // Start initialization
    this.initPromise = this._initializeDatabase();
    return this.initPromise;
  }

  async _initializeDatabase() {
    try {
      console.log('🔄 Initializing SQLite database...');
      this.db = await SQLite.openDatabaseAsync('qtalk.db');
      
      if (!this.db) {
        throw new Error('Failed to open database connection');
      }

      await this.createTables();
      this.isInitialized = true;
      console.log('✅ SQLite database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SQLite database:', error);
      this.isInitialized = false;
      this.db = null;
      this.initPromise = null;
      throw error;
    }
  }

  // Ensure database is initialized before any operation
  async ensureInitialized() {
    if (!this.isInitialized || !this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  // Create all necessary tables
  async createTables() {
    try {
      if (!this.db) {
        throw new Error('Database connection not available');
      }

      const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          profileUrl TEXT,
          email TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )`,
        
        // Rooms table
        `CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          roomId TEXT UNIQUE NOT NULL,
          isTemporary INTEGER DEFAULT 0,
          tempChatId TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )`,
        
        // Messages table
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          userId TEXT NOT NULL,
          text TEXT NOT NULL,
          profileUrl TEXT,
          senderName TEXT,
          createdAt TEXT,
          synced INTEGER DEFAULT 0,
          FOREIGN KEY (roomId) REFERENCES rooms (roomId)
        )`,
        
        // Saved contacts table
        `CREATE TABLE IF NOT EXISTS saved_contacts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          contactUserId TEXT NOT NULL,
          savedAt TEXT,
          UNIQUE(userId, contactUserId)
        )`,
        
        // Temporary chats table
        `CREATE TABLE IF NOT EXISTS temporary_chats (
          id TEXT PRIMARY KEY,
          tempChatId TEXT UNIQUE NOT NULL,
          participants TEXT NOT NULL,
          createdBy TEXT NOT NULL,
          createdAt TEXT,
          isTemporary INTEGER DEFAULT 1
        )`
      ];

      for (const table of tables) {
        await this.db.execAsync(table);
      }
      
      console.log('✅ All SQLite tables created successfully');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  // User operations
  async saveUser(userData) {
    try {
      await this.ensureInitialized();
      
      const { id, username, profileUrl, email } = userData;
      const now = new Date().toISOString();
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO users (id, username, profileUrl, email, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, username, profileUrl, email, now, now]
      );
      
      console.log('✅ User saved to SQLite:', id);
    } catch (error) {
      console.error('❌ Error saving user to SQLite:', error);
      throw error;
    }
  }

  async getUser(userId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Error getting user from SQLite:', error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync('SELECT * FROM users ORDER BY updatedAt DESC');
      return result || [];
    } catch (error) {
      console.error('❌ Error getting all users from SQLite:', error);
      return [];
    }
  }

  // Room operations
  async saveRoom(roomData) {
    try {
      await this.ensureInitialized();
      
      const { id, roomId, isTemporary = false, tempChatId } = roomData;
      const now = new Date().toISOString();
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO rooms (id, roomId, isTemporary, tempChatId, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, roomId, isTemporary ? 1 : 0, tempChatId, now, now]
      );
      
      console.log('✅ Room saved to SQLite:', roomId);
    } catch (error) {
      console.error('❌ Error saving room to SQLite:', error);
      throw error;
    }
  }

  async getRoom(roomId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getFirstAsync(
        'SELECT * FROM rooms WHERE roomId = ?',
        [roomId]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Error getting room from SQLite:', error);
      return null;
    }
  }

  async getAllRooms() {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync('SELECT * FROM rooms ORDER BY updatedAt DESC');
      return result || [];
    } catch (error) {
      console.error('❌ Error getting all rooms from SQLite:', error);
      return [];
    }
  }

  // Message operations
  async saveMessage(messageData) {
    try {
      await this.ensureInitialized();
      
      const { id, roomId, userId, text, profileUrl, senderName, createdAt, synced = false } = messageData;
      
      // Check if this exact message already exists (by ID first)
      const existingById = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM messages WHERE id = ?',
        [id]
      );
      
      if (existingById && existingById.count > 0) {
        console.log('⚠️ Message with same ID already exists, skipping:', id);
        return;
      }
      
      // Check for duplicate content (same user, same text, within 2 seconds)
      const messageTime = new Date(createdAt);
      const windowStart = new Date(messageTime.getTime() - 2000).toISOString();
      const windowEnd = new Date(messageTime.getTime() + 2000).toISOString();
      
      const existingByContent = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM messages 
         WHERE roomId = ? AND userId = ? AND text = ? AND createdAt BETWEEN ? AND ?`,
        [roomId, userId, text, windowStart, windowEnd]
      );
      
      if (existingByContent && existingByContent.count > 0) {
        console.log('⚠️ Duplicate message content detected, skipping:', text.substring(0, 20) + '...');
        return;
      }
      
      await this.db.runAsync(
        `INSERT INTO messages (id, roomId, userId, text, profileUrl, senderName, createdAt, synced) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, roomId, userId, text, profileUrl, senderName, createdAt, synced ? 1 : 0]
      );
      
      console.log('✅ Message saved to SQLite:', id);
    } catch (error) {
      console.error('❌ Error saving message to SQLite:', error);
      throw error;
    }
  }

  // Check for duplicate messages within a time window (30 seconds)
  async isDuplicateMessage(roomId, userId, text, timeWindow = 30000) {
    try {
      await this.ensureInitialized();
      
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow).toISOString();
      
      const result = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM messages 
         WHERE roomId = ? AND userId = ? AND text = ? AND createdAt > ?`,
        [roomId, userId, text, windowStart]
      );
      
      return result && result.count > 0;
    } catch (error) {
      console.error('❌ Error checking for duplicate message:', error);
      return false; // If error occurs, allow the message to prevent blocking
    }
  }

  // Check for duplicate messages from any user in the room (both sender and receiver)
  async isDuplicateMessageInRoom(roomId, text, timeWindow = 10000) {
    try {
      await this.ensureInitialized();
      
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow).toISOString();
      
      const result = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM messages 
         WHERE roomId = ? AND text = ? AND createdAt > ?`,
        [roomId, text, windowStart]
      );
      
      return result && result.count > 0;
    } catch (error) {
      console.error('❌ Error checking for duplicate message in room:', error);
      return false; // If error occurs, allow the message to prevent blocking
    }
  }

  // Check if message already exists by ID or similar content
  async messageExists(roomId, messageId, userId, text, createdAt) {
    try {
      await this.ensureInitialized();
      
      // First check by ID
      let result = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM messages WHERE id = ?',
        [messageId]
      );
      
      if (result && result.count > 0) {
        return true;
      }
      
      // Then check for similar message (same user, same text, within 5 seconds)
      if (createdAt) {
        const messageTime = new Date(createdAt).getTime();
        const windowStart = new Date(messageTime - 5000).toISOString();
        const windowEnd = new Date(messageTime + 5000).toISOString();
        
        result = await this.db.getFirstAsync(
          `SELECT COUNT(*) as count FROM messages 
           WHERE roomId = ? AND userId = ? AND text = ? AND createdAt BETWEEN ? AND ?`,
          [roomId, userId, text, windowStart, windowEnd]
        );
        
        return result && result.count > 0;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error checking if message exists:', error);
      return false;
    }
  }

  async getMessages(roomId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync(
        'SELECT * FROM messages WHERE roomId = ? ORDER BY createdAt ASC',
        [roomId]
      );
      
      return result || [];
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      return [];
    }
  }

  async getUnsyncedMessages() {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync(
        'SELECT * FROM messages WHERE synced = 0 ORDER BY createdAt ASC'
      );
      
      return result || [];
    } catch (error) {
      console.error('❌ Error getting unsynced messages:', error);
      return [];
    }
  }

  // Clean up duplicate messages from database
  async removeDuplicateMessages(roomId) {
    try {
      await this.ensureInitialized();
      
      console.log('🧹 Starting duplicate cleanup for room:', roomId);
      
      // Get all messages for this room ordered by creation time
      const allMessages = await this.db.getAllAsync(
        'SELECT * FROM messages WHERE roomId = ? ORDER BY createdAt ASC',
        [roomId]
      );
      
      const seenMessages = new Set();
      const duplicateIds = [];
      
      for (const msg of allMessages) {
        // Create a unique key: userId + text + rounded timestamp (to nearest second)
        const messageTime = Math.floor(new Date(msg.createdAt).getTime() / 1000);
        const messageKey = `${msg.userId}-${msg.text}-${messageTime}`;
        
        if (seenMessages.has(messageKey)) {
          duplicateIds.push(msg.id);
          console.log('🗑️ Found duplicate:', msg.text.substring(0, 20) + '...');
        } else {
          seenMessages.add(messageKey);
        }
      }
      
      // Delete duplicates
      if (duplicateIds.length > 0) {
        for (const id of duplicateIds) {
          await this.db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
        }
        console.log(`✅ Removed ${duplicateIds.length} duplicate messages`);
      } else {
        console.log('✅ No duplicates found');
      }
      
      return duplicateIds.length;
    } catch (error) {
      console.error('❌ Error removing duplicate messages:', error);
      return 0;
    }
  }

  async markMessageAsSynced(messageId) {
    try {
      await this.ensureInitialized();
      
      await this.db.runAsync(
        'UPDATE messages SET synced = 1 WHERE id = ?',
        [messageId]
      );
      
      console.log('✅ Message marked as synced:', messageId);
    } catch (error) {
      console.error('❌ Error marking message as synced:', error);
      throw error;
    }
  }

  // Contact operations
  async saveContact(userId, contactUserId) {
    try {
      await this.ensureInitialized();
      
      const id = `${userId}_${contactUserId}`;
      const savedAt = new Date().toISOString();
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO saved_contacts (id, userId, contactUserId, savedAt) 
         VALUES (?, ?, ?, ?)`,
        [id, userId, contactUserId, savedAt]
      );
      
      console.log('✅ Contact saved to SQLite:', id);
    } catch (error) {
      console.error('❌ Error saving contact to SQLite:', error);
      throw error;
    }
  }

  async getSavedContacts(userId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync(
        'SELECT contactUserId FROM saved_contacts WHERE userId = ?',
        [userId]
      );
      
      return result ? result.map(row => row.contactUserId) : [];
    } catch (error) {
      console.error('❌ Error getting saved contacts:', error);
      return [];
    }
  }

  async removeContact(userId, contactUserId) {
    try {
      await this.ensureInitialized();
      
      await this.db.runAsync(
        'DELETE FROM saved_contacts WHERE userId = ? AND contactUserId = ?',
        [userId, contactUserId]
      );
      
      console.log('✅ Contact removed from SQLite');
    } catch (error) {
      console.error('❌ Error removing contact from SQLite:', error);
      throw error;
    }
  }

  // Temporary chat operations
  async saveTemporaryChat(tempChatData) {
    try {
      await this.ensureInitialized();
      
      const { id, tempChatId, participants, createdBy, createdAt } = tempChatData;
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO temporary_chats (id, tempChatId, participants, createdBy, createdAt, isTemporary) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tempChatId, JSON.stringify(participants), createdBy, createdAt, 1]
      );
      
      console.log('✅ Temporary chat saved to SQLite:', tempChatId);
    } catch (error) {
      console.error('❌ Error saving temporary chat to SQLite:', error);
      throw error;
    }
  }

  async getTemporaryChat(tempChatId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getFirstAsync(
        'SELECT * FROM temporary_chats WHERE tempChatId = ?',
        [tempChatId]
      );
      
      if (result) {
        try {
          result.participants = JSON.parse(result.participants);
        } catch (e) {
          console.error('❌ Error parsing participants JSON:', e);
          result.participants = [];
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error getting temporary chat from SQLite:', error);
      return null;
    }
  }

  async deleteTemporaryChat(tempChatId) {
    try {
      await this.ensureInitialized();
      
      await this.db.runAsync(
        'DELETE FROM temporary_chats WHERE tempChatId = ?',
        [tempChatId]
      );
      
      console.log('✅ Temporary chat deleted from SQLite:', tempChatId);
    } catch (error) {
      console.error('❌ Error deleting temporary chat from SQLite:', error);
      throw error;
    }
  }

  // Cleanup operations
  async deleteRoom(roomId) {
    try {
      await this.ensureInitialized();
      
      // Delete all messages in the room first
      await this.db.runAsync('DELETE FROM messages WHERE roomId = ?', [roomId]);
      
      // Delete the room
      await this.db.runAsync('DELETE FROM rooms WHERE roomId = ?', [roomId]);
      
      console.log('✅ Room and messages deleted from SQLite:', roomId);
    } catch (error) {
      console.error('❌ Error deleting room from SQLite:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      await this.ensureInitialized();
      
      const tables = ['messages', 'rooms', 'saved_contacts', 'temporary_chats', 'users'];
      
      for (const table of tables) {
        await this.db.runAsync(`DELETE FROM ${table}`);
      }
      
      console.log('✅ All SQLite data cleared');
    } catch (error) {
      console.error('❌ Error clearing all SQLite data:', error);
      throw error;
    }
  }

  // Utility methods
  async getDatabaseSize() {
    try {
      await this.ensureInitialized();
      
      const tables = ['users', 'rooms', 'messages', 'saved_contacts', 'temporary_chats'];
      const sizes = {};
      
      for (const table of tables) {
        try {
          const result = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
          sizes[table] = result ? result.count : 0;
        } catch (error) {
          console.error(`❌ Error getting count for table ${table}:`, error);
          sizes[table] = 0;
        }
      }
      
      return sizes;
    } catch (error) {
      console.error('❌ Error getting database size:', error);
      return {};
    }
  }

  async close() {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.isInitialized = false;
        this.db = null;
        this.initPromise = null;
        console.log('✅ SQLite database closed');
      }
    } catch (error) {
      console.error('❌ Error closing SQLite database:', error);
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
