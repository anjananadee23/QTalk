import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatList from '../../components/ChatList';
import NotificationStatus from '../../components/NotificationStatus';
import NotificationTest from '../../components/NotificationTest';
import QRGenerator from '../../components/QRGenerator';
import QRScanner from '../../components/QRScanner';
import { useAuth } from '../../context/authContext';
import { db, usersRef } from '../../firebaseConfig';
import databaseService from '../../utils/database';
import notificationService from '../../utils/notificationService';
import { getSavedContacts } from '../../utils/qrService';

export default function Home() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQROptions, setShowQROptions] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // Initialize notifications when home loads
  useEffect(() => {
    const initializeNotifications = async () => {
      if (user?.uid) {
        try {
          console.log('🔔 Initializing notifications on home screen...');
          const pushToken = await notificationService.registerForPushNotificationsAsync();
          if (pushToken) {
            console.log('✅ Push token registered on home screen');
            await notificationService.updateUserPushToken(user.uid, pushToken);
            console.log('✅ Push token updated in Firestore from home screen');
          } else {
            console.log('⚠️ No push token obtained on home screen');
          }
        } catch (error) {
          console.error('❌ Error initializing notifications on home screen:', error);
        }
      }
    };

    initializeNotifications();
  }, [user?.uid]);

  const getSavedUsers = React.useCallback(async () => {
    // Enhanced function to get users from both Firebase and SQLite for offline access
    const getUsersWhoMessagedMe = async () => {
      try {
        const currentUserId = user.uid;
        let userIds = new Set();

        try {
          // First, try to get from Firebase (online)
          const roomsRef = collection(db, 'rooms');
          const roomsSnapshot = await getDocs(roomsRef);

          for (const roomDoc of roomsSnapshot.docs) {
            const roomId = roomDoc.id;

            // Check if current user is part of this room (room ID contains user ID)
            if (roomId.includes(currentUserId)) {
              // Get messages from this room
              const messagesRef = collection(db, 'rooms', roomId, 'messages');
              const messagesSnapshot = await getDocs(messagesRef);

              // Find messages not sent by current user
              messagesSnapshot.forEach(messageDoc => {
                const messageData = messageDoc.data();
                if (messageData.userId && messageData.userId !== currentUserId) {
                  userIds.add(messageData.userId);
                }
              });
            }
          }
          console.log('✅ Loaded users from Firebase:', userIds.size);
        } catch (_firebaseError) {
          console.log('❌ Firebase not available, using SQLite only');
        }

        // Also get users from local SQLite database for offline access
        try {
          await databaseService.ensureInitialized();
          
          // Get all rooms from SQLite that involve current user
          const localRooms = await databaseService.getAllRooms();
          
          for (const room of localRooms) {
            if (room.roomId.includes(currentUserId)) {
              // Get messages from this room in SQLite
              const localMessages = await databaseService.getMessages(room.roomId);
              
              // Find messages not sent by current user
              localMessages.forEach(message => {
                if (message.userId && message.userId !== currentUserId) {
                  userIds.add(message.userId);
                }
              });
            }
          }
          console.log('✅ Total users from Firebase + SQLite:', userIds.size);
        } catch (sqliteError) {
          console.error('❌ Error getting users from SQLite:', sqliteError);
        }

        return Array.from(userIds);
      } catch (error) {
        console.error('Error getting users who messaged me:', error);
        return [];
      }
    };

    try {
      setLoading(true);

      // Get saved contact IDs (try both Firebase and SQLite)
      let savedContactIds = [];
      try {
        savedContactIds = await getSavedContacts(user.uid);
      } catch (_contactsError) {
        console.log('❌ Error getting Firebase contacts, trying SQLite...');
        try {
          await databaseService.ensureInitialized();
          savedContactIds = await databaseService.getSavedContacts(user.uid);
        } catch (sqliteContactsError) {
          console.error('❌ Error getting SQLite contacts:', sqliteContactsError);
          savedContactIds = [];
        }
      }

      // Get users who have sent messages to current user (from rooms collection)
      const usersWhoMessagedMe = await getUsersWhoMessagedMe();

      // Combine saved contacts and users who messaged me (remove duplicates)
      const allContactIds = [...new Set([...savedContactIds, ...usersWhoMessagedMe])];

      if (allContactIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user details - try Firebase first, then SQLite
      let userData = [];
      
      try {
        // Try to get from Firebase
        const q = query(usersRef, where('userId', 'in', allContactIds));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
          userData.push({ ...doc.data() });
        });
        console.log('✅ Loaded user details from Firebase:', userData.length);
      } catch (_firebaseUserError) {
        console.log('❌ Firebase users not available, using SQLite...');
      }

      // Fill in missing users from SQLite
      const foundUserIds = userData.map(user => user.userId);
      const missingUserIds = allContactIds.filter(id => !foundUserIds.includes(id));
      
      if (missingUserIds.length > 0) {
        try {
          await databaseService.ensureInitialized();
          
          for (const userId of missingUserIds) {
            const localUser = await databaseService.getUser(userId);
            if (localUser) {
              userData.push({
                userId: localUser.id,
                username: localUser.username,
                profileUrl: localUser.profileUrl,
                email: localUser.email
              });
            }
          }
          console.log('✅ Added missing users from SQLite. Total users:', userData.length);
        } catch (sqliteUserError) {
          console.error('❌ Error getting users from SQLite:', sqliteUserError);
        }
      }

      // If still no users found, create basic user objects with available info
      if (userData.length === 0 && allContactIds.length > 0) {
        // As a fallback, get any available user info from messages
        try {
          await databaseService.ensureInitialized();
          
          for (const userId of allContactIds) {
            // Look for this user in any messages to get their name and profile
            const allLocalRooms = await databaseService.getAllRooms();
            
            for (const room of allLocalRooms) {
              const messages = await databaseService.getMessages(room.roomId);
              const userMessage = messages.find(msg => msg.userId === userId);
              
              if (userMessage) {
                userData.push({
                  userId: userId,
                  username: userMessage.senderName || 'Unknown User',
                  profileUrl: userMessage.profileUrl || null,
                  email: null
                });
                break; // Found user info, move to next user
              }
            }
          }
          console.log('✅ Created fallback user objects:', userData.length);
        } catch (fallbackError) {
          console.error('❌ Error creating fallback user objects:', fallbackError);
        }
      }

      setUsers(userData);
    } catch (error) {
      console.error('❌ Error getting users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    if (user?.uid) {
      getSavedUsers();
    }
  }, [user, getSavedUsers]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        getSavedUsers();
      }
    }, [user, getSavedUsers])
  );

  // Function to find users who have sent messages to the current user

  const handleQROptionPress = () => {
    setShowQROptions(true);
  };

  const handleScanQR = () => {
    setShowQROptions(false);
    setShowQRScanner(true);
  };

  const handleShowMyQR = () => {
    setShowQROptions(false);
    setShowQRGenerator(true);
  };
  return (
    <View className="flex-1" style={{ backgroundColor: '#f8f9fa' }}>
      <StatusBar style="light" />

      {loading ? (
        <View className="flex items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#0088CC" />
          <Text 
            style={{ 
              fontSize: hp(1.8), 
              marginTop: 12, 
              color: '#6c757d',
              fontWeight: '500' 
            }}
          >
            Loading your chats...
          </Text>
        </View>
      ) : users.length > 0 ? (
        <View className="flex-1">
          <NotificationStatus />
          <ChatList currentUser={user} users={users} />
        </View>
      ) : (
        <View className="flex items-center justify-center flex-1 px-8">
          <NotificationStatus />
          <NotificationTest />
          
          {/* Empty state illustration */}
          <View 
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: '#e3f2fd',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24
            }}
          >
            <Text style={{ fontSize: 48 }}>💬</Text>
          </View>
          
          <Text 
            style={{ 
              fontSize: hp(2.8), 
              fontWeight: '600',
              color: '#2c3e50',
              textAlign: 'center',
              marginBottom: 8
            }}
          >
            Welcome to QTalk
          </Text>
          <Text 
            style={{ 
              fontSize: hp(1.9), 
              color: '#6c757d', 
              textAlign: 'center', 
              marginBottom: 32,
              lineHeight: hp(2.6),
              maxWidth: 280
            }}
          >
            Connect instantly with anyone by scanning their QR code or sharing yours
          </Text>
          <TouchableOpacity
            onPress={handleQROptionPress}
            style={{ 
              height: hp(6.2), 
              paddingHorizontal: 36,
              borderRadius: 16,
              backgroundColor: '#0088CC',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#0088CC',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            activeOpacity={0.9}
          >
            <Text style={{ fontSize: hp(1.9), color: 'white', fontWeight: '600' }}>
              🚀 Start Messaging
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Telegram-style Floating Action Button */}
      <TouchableOpacity
        onPress={handleQROptionPress}
        style={{
          position: 'absolute',
          bottom: 28,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#0088CC',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#0088CC',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10,
        }}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={28} color="white" />
      </TouchableOpacity>

      {/* QR Options Modal */}
      <Modal
        visible={showQROptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQROptions(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View 
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 28,
              marginHorizontal: 24,
              width: '85%',
              maxWidth: 320,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              
              <Text 
                style={{ 
                  fontSize: hp(2.4), 
                  fontWeight: '600', 
                  color: '#2c3e50',
                  textAlign: 'center'
                }}
              >
                Connect via QR Code
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleScanQR}
              style={{ 
                height: hp(6),
                borderRadius: 14,
                backgroundColor: '#0088CC',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
                shadowColor: '#0088CC',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: hp(1.9), color: 'white', fontWeight: '600' }}>
                 Scan QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShowMyQR}
              style={{ 
                height: hp(6),
                borderRadius: 14,
                backgroundColor: '#40A7E3',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                shadowColor: '#40A7E3',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: hp(1.9), color: 'white', fontWeight: '600' }}>
                 Show My QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowQROptions(false)}
              style={{ height: hp(5), justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: hp(1.8), color: '#6c757d', fontWeight: '500' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner onClose={() => setShowQRScanner(false)} />
      </Modal>

      {/* QR Generator Modal */}
      <Modal
        visible={showQRGenerator}
        animationType="slide"
        onRequestClose={() => setShowQRGenerator(false)}
      >
        <QRGenerator onClose={() => setShowQRGenerator(false)} />
      </Modal>
    </View>
  );
}