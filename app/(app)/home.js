import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatList from '../../components/ChatList';
import QRGenerator from '../../components/QRGenerator';
import QRScanner from '../../components/QRScanner';
import { useAuth } from '../../context/authContext';
import { db, usersRef } from '../../firebaseConfig';
import { getSavedContacts } from '../../utils/qrService';

export default function Home() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQROptions, setShowQROptions] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getSavedUsers();
    }
  }, [user]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        getSavedUsers();
      }
    }, [user])
  );

  const getSavedUsers = async () => {
    try {
      setLoading(true);

      // Get saved contact IDs
      const savedContactIds = await getSavedContacts(user.uid);

      // Get users who have sent messages to current user (from rooms collection)
      const usersWhoMessagedMe = await getUsersWhoMessagedMe();

      // Combine saved contacts and users who messaged me (remove duplicates)
      const allContactIds = [...new Set([...savedContactIds, ...usersWhoMessagedMe])];

      if (allContactIds.length === 0) {
        setUsers([]);
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

      setUsers(data);
    } catch (error) {
      console.error('Error getting users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Alternative function to show all recent chats (including unsaved contacts)
  const getAllRecentChats = async () => {
    try {
      setLoading(true);

      // First get saved contacts
      const savedContactIds = await getSavedContacts(user.uid);

      // Get all users that have been in contact (for now, just show saved contacts)
      // You could extend this to query the 'rooms' collection to find all users
      // that have exchanged messages with the current user

      if (savedContactIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const q = query(usersRef, where('userId', 'in', savedContactIds));
      const querySnapshot = await getDocs(q);

      let data = [];
      querySnapshot.forEach(doc => {
        data.push({ ...doc.data() });
      });

      setUsers(data);
    } catch (error) {
      console.error('Error getting recent chats:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

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
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {loading ? (
        <View className="flex items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : users.length > 0 ? (
        <ChatList currentUser={user} users={users} />
      ) : (
        <View className="flex items-center justify-center flex-1 px-6">
          <Text style={{ fontSize: hp(2.5) }} className="text-neutral-600 text-center mb-4">
            No saved contacts yet
          </Text>
          <Text style={{ fontSize: hp(1.8) }} className="text-neutral-500 text-center mb-8">
            Scan someone's QR code to start chatting
          </Text>
          <TouchableOpacity
            onPress={handleQROptionPress}
            style={{ height: hp(6), width: '60%' }}
            className="bg-purple-950 justify-center items-center rounded-2xl"
          >
            <Text style={{ fontSize: hp(2) }} className="text-white font-bold">
              Add Contact
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={handleQROptionPress}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          borderRadius: 30,
        }}
        className="bg-purple-950 justify-center items-center shadow-lg"
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
          <View className="bg-white rounded-2xl p-6 mx-6 w-80">
            <Text style={{ fontSize: hp(2.5) }} className="text-center font-bold text-neutral-800 mb-6">
              Connect via QR Code
            </Text>

            <TouchableOpacity
              onPress={handleScanQR}
              style={{ height: hp(6) }}
              className="bg-purple-950 justify-center items-center rounded-xl mb-4"
            >
              <Text style={{ fontSize: hp(2) }} className="text-white font-semibold">
                Scan QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShowMyQR}
              style={{ height: hp(6) }}
              className="bg-blue-600 justify-center items-center rounded-xl mb-4"
            >
              <Text style={{ fontSize: hp(2) }} className="text-white font-semibold">
                Show My QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowQROptions(false)}
              style={{ height: hp(5) }}
              className="justify-center items-center"
            >
              <Text style={{ fontSize: hp(1.8) }} className="text-neutral-500">
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