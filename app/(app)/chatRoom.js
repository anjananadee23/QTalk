import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatRoomHeader from '../../components/ChatRoomHeader';
import CustomKeyboardView from '../../components/CustomKeyboardView';
import MessageList from '../../components/MessageList';
import TempChatBanner from '../../components/TempChatBanner';
import { useAuth } from '../../context/authContext';
import { db } from '../../firebaseConfig';
import { useOfflineMessages } from '../../hooks/useOfflineMessages';
import { getRoomId } from '../../utils/common';
import { deleteEntireChatData } from '../../utils/qrService';

export default function ChatRoom() {
    const item = useLocalSearchParams(); // second user
    const { user } = useAuth(); // logged in user
    const router = useRouter();
    const [firebaseMessages, setFirebaseMessages] = useState([]);
    const textRef = useRef('');
    const inputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Check if this is a temporary chat
    const isTemporary = item?.isTemporary === 'true';
    const tempChatId = item?.tempChatId;
    const roomId = getRoomId(user?.userId, item?.userId);

    // Use our offline messages hook
    const {
        messages,
        isConnected,
        saveMessageLocally,
        saveUnsentMessage,
        getUnsentMessages,
        markMessageAsSynced
    } = useOfflineMessages(roomId, firebaseMessages);

    console.log('=== ChatRoom Debug ===');
    console.log('Room ID:', roomId);
    console.log('Is Connected:', isConnected);
    console.log('Messages count:', messages.length);
    console.log('Is temporary chat:', isTemporary);
    console.log('====================');

    // Firebase listener for real-time messages (when online)
    useEffect(() => {
        if (!isConnected) {
            console.log('📱 Offline mode - using local messages');
            return;
        }

        const createRoomIfNotExists = async () => {
            console.log('Creating room with ID:', roomId);

            try {
                const roomData = {
                    roomId,
                    createdAt: Timestamp.fromDate(new Date())
                };

                // Add temporary chat data if this is a temporary chat
                if (isTemporary && tempChatId) {
                    roomData.isTemporary = true;
                    roomData.tempChatId = tempChatId;
                }

                await setDoc(doc(db, "rooms", roomId), roomData);
                console.log('✅ Room created successfully:', roomId);
            } catch (error) {
                console.log('❌ Error creating room:', error);
            }
        }

        createRoomIfNotExists();

        // Set up Firebase listener
        const docRef = doc(db, "rooms", roomId);
        const messagesRef = collection(docRef, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        let unsub = onSnapshot(q, (snapshot) => {
            let allMessages = snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
            
            console.log('🔥 Firebase messages loaded:', allMessages.length);
            setFirebaseMessages([...allMessages]);
        }, (error) => {
            console.log('❌ Firebase listener error:', error);
        });

        const KeyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow', updateScrollView
        );

        return () => {
            unsub();
            KeyboardDidShowListener.remove();
        }

    }, [roomId, isConnected, isTemporary, tempChatId]);

    // Sync unsent messages when coming back online
    useEffect(() => {
        if (!isConnected) return;

        const syncUnsentMessages = async () => {
            try {
                const unsentMessages = await getUnsentMessages();
                console.log('📤 Syncing unsent messages:', unsentMessages.length);

                for (const msg of unsentMessages) {
                    try {
                        const docRef = doc(db, "rooms", roomId);
                        const messagesRef = collection(docRef, "messages");
                        
                        const newDoc = await addDoc(messagesRef, {
                            userId: msg.userId,
                            text: msg.text,
                            profileUrl: msg.profileUrl,
                            senderName: msg.senderName,
                            createdAt: Timestamp.fromDate(new Date())
                        });

                        // Mark as synced
                        await markMessageAsSynced(msg.id);
                        console.log('✅ Message synced:', newDoc.id);
                    } catch (error) {
                        console.log('❌ Error syncing message:', error);
                    }
                }
            } catch (error) {
                console.log('❌ Error during sync:', error);
            }
        }

        syncUnsentMessages();
    }, [isConnected, getUnsentMessages, markMessageAsSynced, roomId]);

    useEffect(() => {
        updateScrollView();
    }, [messages]);

    const updateScrollView = () => {
        setTimeout(() => {
            scrollViewRef?.current?.scrollToEnd({ animated: true })
        }, 100)
    }

    const handleSendMessage = async () => {
        let message = textRef.current.trim();
        if (!message) return;

        const messageData = {
            userId: user?.userId,
            text: message,
            profileUrl: user?.profileUrl,
            senderName: user?.username,
            createdAt: Timestamp.fromDate(new Date())
        };

        // Clear input immediately
        textRef.current = "";
        if (inputRef) inputRef?.current.clear();

        try {
            if (isConnected) {
                // Online: Send to Firebase
                const docRef = doc(db, "rooms", roomId);
                const messagesRef = collection(docRef, "messages");
                
                const newDoc = await addDoc(messagesRef, messageData);
                console.log('✅ Message sent to Firebase:', newDoc.id);
                
                // Also save locally for offline access
                await saveMessageLocally({ ...messageData, id: newDoc.id });
            } else {
                // Offline: Save to local database with unsent flag
                console.log('📱 Offline - saving message locally');
                await saveUnsentMessage(messageData);
                
                Alert.alert(
                    'Offline Mode', 
                    'Message saved locally. It will be sent when you\'re back online.',
                    [{ text: 'OK' }]
                );
            }
        } catch (err) {
            console.log('❌ Error sending message:', err);
            Alert.alert('Error', 'Failed to send message. Please try again.');
            
            // Restore message text
            textRef.current = message;
            if (inputRef?.current) {
                inputRef.current.setNativeProps({ text: message });
            }
        }
    }

    const handleContactSaved = () => {
        // Navigate back to home and refresh
        router.replace('/(app)/home');
    };

    const handleChatLeft = async () => {
        console.log('Leave chat button clicked - starting comprehensive deletion');

        // Clean up ALL chat data when leaving temporary chat
        try {
            // Use comprehensive deletion that removes everything
            await deleteEntireChatData(user?.userId, item?.userId, tempChatId);
            console.log('All chat data deleted successfully');
            router.replace('/(app)/home');
        } catch (error) {
            console.error('Error during chat deletion:', error);
            // Even if deletion fails, still navigate away
            router.replace('/(app)/home');
        }
    };

    // console.log('messages:', messages);

    return (
        <CustomKeyboardView inChat={true}>
            <View className="flex-1 bg-white">
                <StatusBar style="dark" />
                <ChatRoomHeader user={item} router={router} />

                {/* Show temporary chat banner if this is a temporary chat */}
                {isTemporary && (
                    <TempChatBanner
                        tempChatId={tempChatId}
                        otherUserId={item?.userId}
                        onContactSaved={handleContactSaved}
                        onChatLeft={handleChatLeft}
                    />
                )}

                {/* Connection Status Indicator */}
                {!isConnected && (
                    <View className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
                        <Text className="text-yellow-800 text-center text-sm">
                            📱 You&apos;re offline. Messages will sync when connection returns.
                        </Text>
                    </View>
                )}

                <View className="flex-1 justify-between bg-telegram-light overflow-visible">
                    <View className="flex-1">
                        <MessageList scrollViewRef={scrollViewRef} messages={messages} currentUser={user} />
                    </View>
                    <View style={{ marginBottom: hp(5.5) }} className="pt-3 px-4">
                        <View 
                            className="flex-row items-center bg-white rounded-3xl px-4 py-3"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 3,
                                elevation: 3,
                                borderWidth: 1,
                                borderColor: 'rgba(0, 136, 204, 0.1)'
                            }}
                        >
                            <TextInput
                                ref={inputRef}
                                onChangeText={value => textRef.current = value}
                                placeholder='Message'
                                style={{
                                    fontSize: hp(1.9),
                                    flex: 1,
                                    paddingVertical: hp(0.5),
                                    maxHeight: hp(12),
                                    color: '#000000'
                                }}
                                placeholderTextColor={'#999999'}
                                multiline
                                textAlignVertical="center"
                            />
                            <TouchableOpacity 
                                onPress={handleSendMessage} 
                                className="bg-telegram-primary p-2 rounded-full ml-3"
                                style={{
                                    width: hp(4.5),
                                    height: hp(4.5),
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <Feather name="send" size={hp(2)} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </CustomKeyboardView>
    )
}