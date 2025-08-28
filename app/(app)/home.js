import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatList from '../../components/ChatList';
import ConnectionStatus from '../../components/ConnectionStatus';
import QRGenerator from '../../components/QRGenerator';
import QRScanner from '../../components/QRScanner';
import { useAuth } from '../../context/authContext';
import { db, usersRef } from '../../firebaseConfig';
import { useOfflineContacts } from '../../hooks/useOfflineContacts';
import { getSavedContacts } from '../../utils/qrService';

export default function Home() {
  const { user } = useAuth();
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQROptions, setShowQROptions] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // Use offline contacts hook
  const {
    contacts: users,
    isConnected
  } = useOfflineContacts(firebaseUsers);

  const getSavedUsers = React.useCallback(async () => {
    if (!isConnected) {
      console.log('📱 Offline - loading contacts from local storage');
      setLoading(false);
      return;
    }

    // Function to find users who have sent messages to the current user
    const getUsersWhoMessagedMe = async () => {
      try {
        const currentUserId = user.uid;
        const roomsRef = collection(db, 'rooms');

        // Get all rooms that include the current user
        const roomsSnapshot = await getDocs(roomsRef);
        const userIds = new Set();

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

        return Array.from(userIds);
      } catch (error) {
        console.error('Error getting users who messaged me:', error);
        return [];
      }
    };

    try {
      setLoading(true);

      // Get saved contact IDs
      const savedContactIds = await getSavedContacts(user.uid);

      // Get users who have sent messages to current user (from rooms collection)
      const usersWhoMessagedMe = await getUsersWhoMessagedMe();

      // Combine saved contacts and users who messaged me (remove duplicates)
      const allContactIds = [...new Set([...savedContactIds, ...usersWhoMessagedMe])];

      if (allContactIds.length === 0) {
        setFirebaseUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user details for all contacts
      const q = query(usersRef, where('userId', 'in', allContactIds));
      const querySnapshot = await getDocs(q);

      let data = [];
      querySnapshot.forEach(doc => {
        data.push({ ...doc.data() });
      });

      setFirebaseUsers(data);
    } catch (error) {
      console.error('Error getting users:', error);
      setFirebaseUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user.uid, isConnected]);

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
    <View className="flex-1 bg-telegram-lighter">
      <StatusBar style="light" />
      <ConnectionStatus />

      {loading ? (
        <View className="flex items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#0088CC" />
        </View>
      ) : users.length > 0 ? (
        <ChatList currentUser={user} users={users} />
      ) : (
        <View className="flex items-center justify-center flex-1 px-8">
          <Text style={{ fontSize: hp(2.5) }} className="text-telegram-text text-center mb-4 font-medium">
            No chats yet
          </Text>
          <Text style={{ fontSize: hp(1.8) }} className="text-telegram-textLight text-center mb-8 leading-6">
            Start a new conversation by scanning someone&apos;s QR code or share yours to get connected
          </Text>
          <TouchableOpacity
            onPress={handleQROptionPress}
            style={{ 
              height: hp(6), 
              paddingHorizontal: 32,
              borderRadius: 24,
            }}
            className="bg-telegram-primary justify-center items-center shadow-sm"
          >
            <Text style={{ fontSize: hp(1.9) }} className="text-white font-medium">
              Start Messaging
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Telegram-style Floating Action Button */}
      <TouchableOpacity
        onPress={handleQROptionPress}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        className="bg-telegram-primary justify-center items-center"
      >
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* QR Options Modal */}
      <Modal
        visible={showQROptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQROptions(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View 
            className="bg-white rounded-2xl p-6 mx-6 w-80"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 16,
            }}
          >
            <Text style={{ fontSize: hp(2.5) }} className="text-center font-medium text-telegram-text mb-6">
              Connect via QR Code
            </Text>

            <TouchableOpacity
              onPress={handleScanQR}
              style={{ 
                height: hp(6),
                borderRadius: 12,
              }}
              className="bg-telegram-primary justify-center items-center mb-3"
            >
              <Text style={{ fontSize: hp(1.9) }} className="text-white font-medium">
                Scan QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShowMyQR}
              style={{ 
                height: hp(6),
                borderRadius: 12,
              }}
              className="bg-telegram-secondary justify-center items-center mb-4"
            >
              <Text style={{ fontSize: hp(1.9) }} className="text-white font-medium">
                Show My QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowQROptions(false)}
              style={{ height: hp(5) }}
              className="justify-center items-center"
            >
              <Text style={{ fontSize: hp(1.8) }} className="text-telegram-textLight">
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