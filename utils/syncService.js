import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, roomRef, usersRef } from '../firebaseConfig';
import databaseService from './database';

class SyncService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
  }

  // Check network connectivity
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    console.log('🌐 Network status changed:', isOnline ? 'Online' : 'Offline');
  }

  // Sync user data from Firestore to SQLite
  async syncUserFromFirestore(userId) {
    try {
      console.log('🔄 Syncing user from Firestore:', userId);
      
      // Ensure database is initialized first
      await databaseService.ensureInitialized();
      
      const userDoc = await getDocs(query(usersRef, where('userId', '==', userId)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        await databaseService.saveUser({
          id: userData.userId,
          username: userData.username,
          profileUrl: userData.profileUrl,
          email: userData.email || null
        });
        
        console.log('✅ User synced to SQLite:', userId);
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error syncing user from Firestore:', error);
      return null;
    }
  }

  // Sync user data from SQLite to Firestore
  async syncUserToFirestore(userData) {
    if (!this.isOnline) {
      console.log('📱 Offline: User data will be synced when online');
      return false;
    }

    try {
      console.log('🔄 Syncing user to Firestore:', userData.id);
      
      await setDoc(doc(db, 'users', userData.id), {
        username: userData.username,
        profileUrl: userData.profileUrl,
        userId: userData.id,
        email: userData.email
      });
      
      console.log('✅ User synced to Firestore:', userData.id);
      return true;
    } catch (error) {
      console.error('❌ Error syncing user to Firestore:', error);
      return false;
    }
  }

  // Sync messages from Firestore to SQLite
  async syncMessagesFromFirestore(roomId) {
    try {
      console.log('🔄 Syncing messages from Firestore for room:', roomId);
      
      // Ensure database is initialized first
      await databaseService.ensureInitialized();
      
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        try {
          await databaseService.saveMessage({
            id: messageDoc.id,
            roomId: roomId,
            userId: messageData.userId,
            text: messageData.text,
            profileUrl: messageData.profileUrl,
            senderName: messageData.senderName,
            createdAt: messageData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            synced: true
          });
        } catch (error) {
          console.error('❌ Error saving individual message:', error);
          // Continue with next message instead of failing completely
        }
      }
      
      console.log(`✅ ${messagesSnapshot.docs.length} messages synced to SQLite for room:`, roomId);
    } catch (error) {
      console.error('❌ Error syncing messages from Firestore:', error);
    }
  }

  // Sync messages from SQLite to Firestore
  async syncMessagesToFirestore() {
    if (!this.isOnline) {
      console.log('📱 Offline: Messages will be synced when online');
      return;
    }

    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      console.log('🔄 Syncing unsynced messages to Firestore...');
      
      // Ensure database is initialized first
      await databaseService.ensureInitialized();
      
      const unsyncedMessages = await databaseService.getUnsyncedMessages();
      
      for (const message of unsyncedMessages) {
        try {
          const messagesRef = collection(db, 'rooms', message.roomId, 'messages');
          await addDoc(messagesRef, {
            userId: message.userId,
            text: message.text,
            profileUrl: message.profileUrl,
            senderName: message.senderName,
            createdAt: new Date(message.createdAt)
          });
          
          await databaseService.markMessageAsSynced(message.id);
          console.log('✅ Message synced to Firestore:', message.id);
        } catch (error) {
          console.error('❌ Error syncing individual message:', error);
          // Continue with next message instead of failing completely
        }
      }
      
      console.log(`✅ ${unsyncedMessages.length} messages synced to Firestore`);
    } catch (error) {
      console.error('❌ Error syncing messages to Firestore:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync room data
  async syncRoomFromFirestore(roomId) {
    try {
      console.log('🔄 Syncing room from Firestore:', roomId);
      
      const roomDoc = await getDocs(query(roomRef, where('roomId', '==', roomId)));
      
      if (!roomDoc.empty) {
        const roomData = roomDoc.docs[0].data();
        await databaseService.saveRoom({
          id: roomData.roomId,
          roomId: roomData.roomId,
          isTemporary: roomData.isTemporary || false,
          tempChatId: roomData.tempChatId || null
        });
        
        console.log('✅ Room synced to SQLite:', roomId);
        return roomData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error syncing room from Firestore:', error);
      return null;
    }
  }

  // Sync saved contacts
  async syncSavedContactsFromFirestore(userId) {
    try {
      console.log('🔄 Syncing saved contacts from Firestore for user:', userId);
      
      // Ensure database is initialized first
      await databaseService.ensureInitialized();
      
      const savedContactsRef = collection(db, 'savedContacts');
      const contactsQuery = query(savedContactsRef, where('userId', '==', userId));
      const contactsSnapshot = await getDocs(contactsQuery);
      
      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();
        try {
          await databaseService.saveContact(userId, contactData.contactUserId);
        } catch (error) {
          console.error('❌ Error saving individual contact:', error);
          // Continue with next contact instead of failing completely
        }
      }
      
      console.log(`✅ ${contactsSnapshot.docs.length} contacts synced to SQLite`);
    } catch (error) {
      console.error('❌ Error syncing saved contacts from Firestore:', error);
    }
  }

  // Full sync for a user - Enhanced for standalone APK
  async fullSyncForUser(userId) {
    try {
      console.log('🔄 Starting enhanced full sync for user:', userId);
      
      // Ensure database is initialized first
      await databaseService.ensureInitialized();
      
      if (!this.isOnline) {
        console.log('📱 Offline: Loading messages from SQLite only');
        // Even offline, we can show stats about local data
        const dbSize = await databaseService.getDatabaseSize();
        console.log('📊 Local database content:', dbSize);
        return;
      }

      // Sync user data
      await this.syncUserFromFirestore(userId);
      
      // Sync saved contacts
      await this.syncSavedContactsFromFirestore(userId);
      
      // Enhanced room and message syncing
      try {
        // First, get all rooms that this user is part of from Firestore
        const allRoomsQuery = query(
          collection(db, 'rooms'),
          where('roomId', '>=', userId),
          where('roomId', '<=', userId + '\uf8ff')
        );
        const roomsSnapshot = await getDocs(allRoomsQuery);
        
        console.log(`🔄 Found ${roomsSnapshot.docs.length} rooms for user in Firestore`);
        
        for (const roomDoc of roomsSnapshot.docs) {
          const roomData = roomDoc.data();
          const roomId = roomData.roomId;
          
          try {
            // Save room to SQLite
            await databaseService.saveRoom({
              id: roomId,
              roomId: roomId,
              isTemporary: roomData.isTemporary || false,
              tempChatId: roomData.tempChatId || null
            });
            
            // Sync all messages for this room
            await this.syncMessagesFromFirestore(roomId);
            console.log(`✅ Synced room: ${roomId}`);
          } catch (roomError) {
            console.error(`❌ Error syncing room ${roomId}:`, roomError);
            // Continue with next room
          }
        }
        
        // Also sync rooms that might have the user as the second participant
        const alternateRoomsQuery = query(
          collection(db, 'rooms'),
          where('roomId', '>=', ''),
          where('roomId', '<=', '\uf8ff')
        );
        const allRoomsSnapshot = await getDocs(alternateRoomsQuery);
        
        for (const roomDoc of allRoomsSnapshot.docs) {
          const roomData = roomDoc.data();
          const roomId = roomData.roomId;
          
          // Check if this room involves the current user
          if (roomId.includes(userId) && !roomId.startsWith(userId)) {
            try {
              await databaseService.saveRoom({
                id: roomId,
                roomId: roomId,
                isTemporary: roomData.isTemporary || false,
                tempChatId: roomData.tempChatId || null
              });
              
              await this.syncMessagesFromFirestore(roomId);
              console.log(`✅ Synced alternate room: ${roomId}`);
            } catch (roomError) {
              console.error(`❌ Error syncing alternate room ${roomId}:`, roomError);
            }
          }
        }
        
      } catch (roomSyncError) {
        console.error('❌ Error during room sync:', roomSyncError);
        // Continue with local rooms if Firestore sync fails
      }
      
      // Get all local rooms and try to sync their messages
      const localRooms = await databaseService.getAllRooms();
      console.log(`📱 Found ${localRooms.length} local rooms`);
      
      for (const room of localRooms) {
        if (room.roomId.includes(userId)) {
          try {
            await this.syncMessagesFromFirestore(room.roomId);
          } catch (error) {
            console.error(`❌ Error syncing messages for local room ${room.roomId}:`, error);
          }
        }
      }
      
      // Sync any unsynced messages to Firestore
      await this.syncMessagesToFirestore();
      
      // Show final statistics
      const dbSize = await databaseService.getDatabaseSize();
      console.log('📊 Final database content after sync:', dbSize);
      console.log('✅ Enhanced full sync completed for user:', userId);
      
    } catch (error) {
      console.error('❌ Error during enhanced full sync:', error);
      // Even if sync fails, ensure user can access local data
      try {
        const dbSize = await databaseService.getDatabaseSize();
        console.log('📊 Local database content (fallback):', dbSize);
      } catch (dbError) {
        console.error('❌ Error accessing local database:', dbError);
      }
    }
  }

  // Initialize sync service
  async initialize() {
    try {
      console.log('🔄 Initializing sync service...');
      await databaseService.init();
      console.log('✅ Sync service initialized');
    } catch (error) {
      console.error('❌ Error initializing sync service:', error);
      throw error;
    }
  }

  // Cleanup
  async cleanup() {
    try {
      await databaseService.close();
      console.log('✅ Sync service cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up sync service:', error);
    }
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
