import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Text, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatRoomHeader from '../../components/ChatRoomHeader';
import CustomKeyboardView from '../../components/CustomKeyboardView';
import FlexibleMessageInput from '../../components/FlexibleMessageInput';
import MessageList from '../../components/MessageList';
import TempChatBanner from '../../components/TempChatBanner';
import { useAuth } from '../../context/authContext';
import { db } from '../../firebaseConfig';
import { getRoomId } from '../../utils/common';
import databaseService from '../../utils/database';
import notificationService from '../../utils/notificationService';
import { deleteEntireChatData } from '../../utils/qrService';
import syncService from '../../utils/syncService';

export default function ChatRoom() {
    const item = useLocalSearchParams(); // second user
    const { user } = useAuth(); // logged in user
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [duplicateWarning, setDuplicateWarning] = useState('');
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

    // Load messages from SQLite and sync with Firebase - Enhanced for standalone APK
    useEffect(() => {
        // Set current chat room to prevent notifications for this chat
        notificationService.setCurrentChatRoom(roomId);

        const loadMessages = async () => {
            try {
                console.log('📱 Loading messages for standalone APK...');
                
                // Ensure database is initialized first
                await databaseService.ensureInitialized();
                
                // First, load messages from SQLite for immediate display (works offline)
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

                // If we have messages locally, we're good to go for offline use
                if (formattedMessages.length > 0) {
                    console.log('✅ Chat ready for offline use with', formattedMessages.length, 'messages');
                }

                // Then sync with Firebase for real-time updates (only if online)
                try {
                    await syncService.syncMessagesFromFirestore(roomId);
                    console.log('✅ Firebase sync completed');
                    
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
                    console.log('❌ Firebase sync failed (working offline):', syncError.message);
                    // Continue with local messages even if sync fails - this is key for offline functionality
                    console.log('📱 Continuing with offline messages:', formattedMessages.length);
                }
            } catch (error) {
                console.error('❌ Error loading messages:', error);
                // Even if there's an error, try to show something
                try {
                    // Last resort: try to get any messages from SQLite
                    const fallbackMessages = await databaseService.getMessages(roomId);
                    const fallbackFormatted = fallbackMessages.map(msg => ({
                        id: msg.id,
                        userId: msg.userId,
                        text: msg.text,
                        profileUrl: msg.profileUrl,
                        senderName: msg.senderName,
                        createdAt: msg.createdAt
                    }));
                    setMessages(fallbackFormatted);
                    console.log('📱 Fallback messages loaded:', fallbackFormatted.length);
                } catch (fallbackError) {
                    console.error('❌ Fallback message loading failed:', fallbackError);
                    setMessages([]);
                }
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
            // Clear current chat room when leaving
            notificationService.clearCurrentChatRoom();
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

    // Helper function to get recipient's push token from Firestore
    const getRecipientPushToken = async (recipientUserId) => {
        try {
            const userRef = doc(db, 'users', recipientUserId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                return userData.expoPushToken || null;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting recipient push token:', error);
            return null;
        }
    };

    const handleSendMessage = async (messageText) => {
        let message = messageText.trim();
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
                
                // Message not sent due to duplicate
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

                // Send push notification to recipient
                try {
                    console.log('🔔 Attempting to send push notification to recipient:', item?.userId);
                    const recipientToken = await getRecipientPushToken(item?.userId);
                    if (recipientToken) {
                        console.log('✅ Recipient push token found:', recipientToken.substring(0, 50) + '...');
                        
                        // Verify the token is valid before sending
                        if (recipientToken.startsWith('ExponentPushToken[') || 
                            recipientToken.startsWith('exp:') ||
                            recipientToken.length > 20) { // Basic token validation
                            
                            // Send notification with user info
                            const notificationResult = await notificationService.sendMessageNotification(
                                recipientToken,
                                user?.username || 'Someone',
                                message,
                                {
                                    senderId: user?.userId,
                                    senderName: user?.username,
                                    senderProfileUrl: user?.profileUrl,
                                    roomId: roomId,
                                    userId: item?.userId, // recipient's ID
                                    recipientUsername: item?.username,
                                    isTemporary: isTemporary,
                                    tempChatId: tempChatId
                                }
                            );
                            
                            if (notificationResult) {
                                console.log('✅ Push notification sent successfully to recipient');
                            } else {
                                console.log('⚠️ Push notification may have failed');
                            }
                        } else {
                            console.log('❌ Invalid push token format:', recipientToken.substring(0, 30) + '...');
                        }
                    } else {
                        console.log('⚠️ Recipient has no push token, notification not sent');
                        
                        // Try to refresh the recipient's token by checking again
                        setTimeout(async () => {
                            try {
                                console.log('🔄 Retrying to get recipient token after delay...');
                                const retryToken = await getRecipientPushToken(item?.userId);
                                if (retryToken && retryToken !== recipientToken) {
                                    console.log('✅ Found recipient token on retry, sending notification...');
                                    await notificationService.sendMessageNotification(
                                        retryToken,
                                        user?.username || 'Someone',
                                        message,
                                        {
                                            senderId: user?.userId,
                                            senderName: user?.username,
                                            senderProfileUrl: user?.profileUrl,
                                            roomId: roomId,
                                            userId: item?.userId,
                                            recipientUsername: item?.username,
                                            isTemporary: isTemporary,
                                            tempChatId: tempChatId
                                        }
                                    );
                                }
                            } catch (retryError) {
                                console.error('❌ Retry notification error:', retryError);
                            }
                        }, 2000);
                    }
                } catch (notificationError) {
                    console.error('❌ Error sending push notification:', notificationError);
                    console.error('Notification error details:', {
                        message: notificationError.message,
                        code: notificationError.code,
                        stack: notificationError.stack
                    });
                    // Don't fail the message sending if notification fails
                }
            } catch (firebaseError) {
                console.log('❌ Firebase error, message saved locally:', firebaseError);
                // Message is already saved in SQLite, will sync later
            }
        } catch (err) {
            console.log('❌ Error saving message:', err);
            Alert.alert('Error', 'Failed to send message. Please try again.');
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
            <View className="flex-1" style={{ backgroundColor: '#f7f8fc' }}>
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

                <View className="flex-1 justify-between overflow-visible">
                    {/* Messages Container */}
                    <View className="flex-1" style={{ backgroundColor: '#f7f8fc' }}>
                        <MessageList scrollViewRef={scrollViewRef} messages={messages} currentUser={user} />
                    </View>
                    
                    {/* Duplicate Message Warning - Enhanced */}
                    {duplicateWarning && (
                        <View 
                            className="absolute top-4 left-4 right-4 z-10"
                            style={{
                                backgroundColor: '#fff3cd',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                borderWidth: 1,
                                borderColor: '#ffeaa7',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <View className="flex-row items-center justify-center">
                                <View 
                                    style={{ 
                                        width: 20, 
                                        height: 20, 
                                        borderRadius: 10, 
                                        backgroundColor: '#f39c12', 
                                        marginRight: 8,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
                                </View>
                                <Text 
                                    className="text-center font-medium flex-1"
                                    style={{ 
                                        fontSize: hp(1.6), 
                                        color: '#8b6914',
                                        lineHeight: hp(2.2)
                                    }}
                                >
                                    {duplicateWarning}
                                </Text>
                            </View>
                        </View>
                    )}
                    
                    {/* Flexible Message Input - Responsive for All Devices */}
                    <FlexibleMessageInput 
                        onSendMessage={handleSendMessage}
                        placeholder="Type a message..."
                        disabled={false}
                    />
                </View>
            </View>
        </CustomKeyboardView>
    )
}