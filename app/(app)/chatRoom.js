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
import { getRoomId } from '../../utils/common';
import databaseService from '../../utils/database';
import { deleteEntireChatData } from '../../utils/qrService';
import syncService from '../../utils/syncService';

export default function ChatRoom() {
    const item = useLocalSearchParams(); // second user
    const { user } = useAuth(); // logged in user
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [duplicateWarning, setDuplicateWarning] = useState('');
    const textRef = useRef('');
    const inputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Check if this is a temporary chat
    const isTemporary = item?.isTemporary === 'true';
    const tempChatId = item?.tempChatId;
    const roomId = getRoomId(user?.userId, item?.userId);

    console.log('=== ChatRoom Debug ===');
    console.log('Room ID:', roomId);
    console.log('Messages count:', messages.length);
    console.log('Is temporary chat:', isTemporary);
    console.log('====================');

    // Load messages from SQLite and sync with Firebase
    useEffect(() => {
        const loadMessages = async () => {
            try {
                // Ensure database is initialized first
                await databaseService.ensureInitialized();
                
                // First, load messages from SQLite for immediate display
                const localMessages = await databaseService.getMessages(roomId);
                console.log('📱 SQLite messages loaded:', localMessages.length);
                
                // Remove duplicates from local messages
                const uniqueLocalMessages = [];
                const seenLocalMessages = new Set();
                
                for (const msg of localMessages) {
                    const messageKey = `${msg.userId}-${msg.text}-${Math.floor(new Date(msg.createdAt).getTime() / 1000)}`;
                    
                    if (!seenLocalMessages.has(msg.id) && !seenLocalMessages.has(messageKey)) {
                        seenLocalMessages.add(msg.id);
                        seenLocalMessages.add(messageKey);
                        uniqueLocalMessages.push(msg);
                    }
                }
                
                // Convert SQLite messages to the format expected by the UI
                const formattedMessages = uniqueLocalMessages.map(msg => ({
                    id: msg.id,
                    userId: msg.userId,
                    text: msg.text,
                    profileUrl: msg.profileUrl,
                    senderName: msg.senderName,
                    createdAt: msg.createdAt
                }));
                
                console.log(`📊 Initial load: Total ${localMessages.length}, Unique ${uniqueLocalMessages.length}`);
                setMessages(formattedMessages);

                // Then sync with Firebase for real-time updates
                try {
                    await syncService.syncMessagesFromFirestore(roomId);
                    
                    // Reload messages after sync with deduplication
                    const updatedMessages = await databaseService.getMessages(roomId);
                    
                    // Remove duplicates
                    const uniqueUpdatedMessages = [];
                    const seenUpdatedMessages = new Set();
                    
                    for (const msg of updatedMessages) {
                        const messageKey = `${msg.userId}-${msg.text}-${Math.floor(new Date(msg.createdAt).getTime() / 1000)}`;
                        
                        if (!seenUpdatedMessages.has(msg.id) && !seenUpdatedMessages.has(messageKey)) {
                            seenUpdatedMessages.add(msg.id);
                            seenUpdatedMessages.add(messageKey);
                            uniqueUpdatedMessages.push(msg);
                        }
                    }
                    
                    const updatedFormattedMessages = uniqueUpdatedMessages.map(msg => ({
                        id: msg.id,
                        userId: msg.userId,
                        text: msg.text,
                        profileUrl: msg.profileUrl,
                        senderName: msg.senderName,
                        createdAt: msg.createdAt
                    }));
                    
                    console.log(`📊 After sync: Total ${updatedMessages.length}, Unique ${uniqueUpdatedMessages.length}`);
                    setMessages(updatedFormattedMessages);
                } catch (syncError) {
                    console.error('❌ Error syncing with Firestore (non-critical):', syncError);
                    // Continue with local messages even if sync fails
                }
            } catch (error) {
                console.error('❌ Error loading messages:', error);
                // Set empty messages array if all else fails
                setMessages([]);
            }
        };

        const createRoomIfNotExists = async () => {
            console.log('Creating room with ID:', roomId);

            try {
                // Ensure database is initialized first
                await databaseService.ensureInitialized();
                
                // Save room to SQLite
                await databaseService.saveRoom({
                    id: roomId,
                    roomId,
                    isTemporary,
                    tempChatId
                });

                const roomData = {
                    roomId,
                    createdAt: Timestamp.fromDate(new Date())
                };

                // Add temporary chat data if this is a temporary chat
                if (isTemporary && tempChatId) {
                    roomData.isTemporary = true;
                    roomData.tempChatId = tempChatId;
                }

                // Save room to Firestore
                try {
                    await setDoc(doc(db, 'rooms', roomId), roomData, { merge: true });
                    console.log('✅ Room created in Firestore:', roomId);
                } catch (firestoreError) {
                    console.error('❌ Error creating room in Firestore (non-critical):', firestoreError);
                    // Continue even if Firestore fails
                }
            } catch (error) {
                console.error('❌ Error creating room:', error);
            }
        };


        const initializeRoom = async () => {
            await createRoomIfNotExists();
            
            // Clean up any existing duplicate messages
            await databaseService.removeDuplicateMessages(roomId);
            
            await loadMessages();
        };

        initializeRoom();

        // Set up Firebase listener for real-time updates
        const docRef = doc(db, "rooms", roomId);
        const messagesRef = collection(docRef, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        let unsub = onSnapshot(q, async (snapshot) => {
            // When Firebase updates, sync to SQLite and update local state
            for (const doc of snapshot.docs) {
                const messageData = doc.data();
                const messageId = doc.id;
                
                // Check if message already exists using comprehensive check
                const messageExists = await databaseService.messageExists(
                    roomId,
                    messageId,
                    messageData.userId,
                    messageData.text,
                    messageData.createdAt?.toDate?.()?.toISOString()
                );
                
                if (!messageExists) {
                    await databaseService.saveMessage({
                        id: messageId,
                        roomId: roomId,
                        userId: messageData.userId,
                        text: messageData.text,
                        profileUrl: messageData.profileUrl,
                        senderName: messageData.senderName,
                        createdAt: messageData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        synced: true
                    });
                    console.log('✅ New message saved from Firebase:', messageId);
                } else {
                    console.log('⚠️ Duplicate message from Firebase ignored:', messageId);
                }
            }
            
            // Reload messages from SQLite with deduplication
            const updatedMessages = await databaseService.getMessages(roomId);
            
            // Remove duplicates based on ID, or if same user+text+time within 1 second
            const uniqueMessages = [];
            const seenMessages = new Set();
            
            for (const msg of updatedMessages) {
                // Create a unique key for the message
                const messageKey = `${msg.userId}-${msg.text}-${Math.floor(new Date(msg.createdAt).getTime() / 1000)}`;
                
                if (!seenMessages.has(msg.id) && !seenMessages.has(messageKey)) {
                    seenMessages.add(msg.id);
                    seenMessages.add(messageKey);
                    uniqueMessages.push(msg);
                } else {
                    console.log('🔍 Filtered duplicate message:', msg.text, 'by', msg.senderName);
                }
            }
            
            const formattedMessages = uniqueMessages.map(msg => ({
                id: msg.id,
                userId: msg.userId,
                text: msg.text,
                profileUrl: msg.profileUrl,
                senderName: msg.senderName,
                createdAt: msg.createdAt
            }));
            
            console.log(`📊 Messages: Total ${updatedMessages.length}, Unique ${uniqueMessages.length}`);
            setMessages(formattedMessages);
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

    }, [roomId, isTemporary, tempChatId]);

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

        try {
            // Check for duplicate message from this user
            const isDuplicateFromUser = await databaseService.isDuplicateMessage(
                roomId, 
                user?.userId, 
                message, 
                30000 // 30 seconds window for same user
            );

            // Also check for duplicate message from any user in the room
            const isDuplicateInRoom = await databaseService.isDuplicateMessageInRoom(
                roomId, 
                message, 
                10000 // 10 seconds window for any user in room
            );

            if (isDuplicateFromUser || isDuplicateInRoom) {
                console.log('⚠️ Duplicate message detected, not sending');
                
                // Determine the type of duplicate for better user feedback
                let warningMessage = '⚠️ Duplicate message - not sent';
                if (isDuplicateFromUser) {
                    warningMessage = '⚠️ You already sent this message recently';
                } else if (isDuplicateInRoom) {
                    warningMessage = '⚠️ This message was sent recently in this chat';
                }
                
                // Show brief visual feedback
                setDuplicateWarning(warningMessage);
                setTimeout(() => setDuplicateWarning(''), 3000);
                
                // Clear input but don't send message
                textRef.current = "";
                if (inputRef) inputRef?.current.clear();
                return;
            }

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();
            
            const messageData = {
                id: messageId,
                userId: user?.userId,
                text: message,
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: now
            };

            // Clear input immediately
            textRef.current = "";
            if (inputRef) inputRef?.current.clear();

            // Save message to SQLite first for immediate display
            await databaseService.saveMessage({
                ...messageData,
                roomId,
                synced: false
            });

            // Update local state immediately with deduplication check
            setMessages(prev => {
                // Check if this message already exists
                const messageExists = prev.some(msg => 
                    msg.id === messageData.id || 
                    (msg.userId === messageData.userId && 
                     msg.text === messageData.text && 
                     Math.abs(new Date(msg.createdAt).getTime() - new Date(messageData.createdAt).getTime()) < 2000)
                );
                
                if (messageExists) {
                    console.log('⚠️ Duplicate message prevented in UI state');
                    return prev;
                }
                
                return [...prev, messageData];
            });

            // Try to send to Firebase
            try {
                const docRef = doc(db, "rooms", roomId);
                const messagesRef = collection(docRef, "messages");
                
                const firebaseMessageData = {
                    userId: user?.userId,
                    text: message,
                    profileUrl: user?.profileUrl,
                    senderName: user?.username,
                    createdAt: Timestamp.fromDate(new Date())
                };
                
                const newDoc = await addDoc(messagesRef, firebaseMessageData);
                
                // Mark as synced in SQLite
                await databaseService.markMessageAsSynced(messageId);
                console.log('✅ Message sent to Firebase:', newDoc.id);
            } catch (firebaseError) {
                console.log('❌ Firebase error, message saved locally:', firebaseError);
                // Message is already saved in SQLite, will sync later
            }
        } catch (err) {
            console.log('❌ Error saving message:', err);
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

                <View className="flex-1 justify-between bg-telegram-light overflow-visible">
                    <View className="flex-1">
                        <MessageList scrollViewRef={scrollViewRef} messages={messages} currentUser={user} />
                    </View>
                    
                    {/* Duplicate Message Warning */}
                    {duplicateWarning && (
                        <View 
                            className="absolute top-4 left-4 right-4 bg-orange-100 border border-orange-300 rounded-lg px-4 py-2 z-10"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 4,
                                elevation: 5,
                            }}
                        >
                            <Text 
                                className="text-orange-800 text-center font-medium"
                                style={{ fontSize: hp(1.6) }}
                            >
                                {duplicateWarning}
                            </Text>
                        </View>
                    )}
                    
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