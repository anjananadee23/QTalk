import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import ChatRoomHeader from '../../components/ChatRoomHeader';
import CustomKeyboardView from '../../components/CustomKeyboardView';
import MessageList from '../../components/MessageList';
import TempChatBanner from '../../components/TempChatBanner';
import { useAuth } from '../../context/authContext';
import { db } from '../../firebaseConfig';
import { getRoomId } from '../../utils/common';
import { deleteEntireChatData } from '../../utils/qrService';

export default function ChatRoom() {
    const item = useLocalSearchParams(); // second user
    const { user } = useAuth(); // logged in user
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const textRef = useRef('');
    const inputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Check if this is a temporary chat
    const isTemporary = item?.isTemporary === 'true';
    const tempChatId = item?.tempChatId;

    console.log('=== ChatRoom Debug ===');
    console.log('ChatRoom item params:', JSON.stringify(item, null, 2));
    console.log('Item keys:', item ? Object.keys(item) : 'item is null/undefined');
    console.log('Current logged in user:', {
        userId: user?.userId,
        username: user?.username,
        uid: user?.uid
    });
    console.log('Chat partner:', {
        userId: item?.userId,
        username: item?.username
    });
    console.log('Generated Room ID:', getRoomId(user?.userId, item?.userId));
    console.log('Is temporary chat:', isTemporary);
    console.log('====================');

    useEffect(() => {
        createRoomIfNotExists();

        let roomId = getRoomId(user?.userId, item?.userId);
        const docRef = doc(db, "rooms", roomId);
        const messagesRef = collection(docRef, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        let unsub = onSnapshot(q, (snapshot) => {
            let allMessages = snapshot.docs.map(doc => {
                return doc.data();
            });
            console.log('=== Messages Debug ===');
            console.log('Total messages loaded:', allMessages.length);
            console.log('Current user ID:', user?.userId);
            allMessages.forEach((msg, index) => {
                console.log(`Message ${index}:`, {
                    text: msg.text,
                    userId: msg.userId,
                    senderName: msg.senderName,
                    isCurrentUser: user?.userId === msg.userId
                });
            });
            console.log('==================');
            setMessages([...allMessages]);
        });

        const KeyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow', updateScrollView
        )

        return () => {
            unsub();
            KeyboardDidShowListener.remove();
        }

    }, []);

    useEffect(() => {
        updateScrollView();
    }, [messages])

    const updateScrollView = () => {
        setTimeout(() => {
            scrollViewRef?.current?.scrollToEnd({ animated: true })
        }, 100)
    }

    const createRoomIfNotExists = async () => {
        // roomid
        let roomId = getRoomId(user?.userId, item?.userId);
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
            console.log('Room created successfully:', roomId);
        } catch (error) {
            console.log('Error creating room:', error);
        }
    }

    const handleSendMessage = async () => {
        let message = textRef.current.trim();
        if (!message) return;

        try {
            let roomId = getRoomId(user?.userId, item?.userId);
            const docRef = doc(db, "rooms", roomId);
            const messagesRef = collection(docRef, "messages");
            textRef.current = "";
            if (inputRef) inputRef?.current.clear();

            const newDoc = await addDoc(messagesRef, {
                userId: user?.userId,
                text: message,
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: Timestamp.fromDate(new Date())
            });

            console.log('Message sent:', newDoc.id);

        } catch (err) {
            console.log('Error sending message:', err);
            Alert.alert('Message', err.message);
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

                <View className="flex-1 justify-between bg-neutral-100 overflow-visible">
                    <View className="flex-1">
                        <MessageList scrollViewRef={scrollViewRef} messages={messages} currentUser={user} />
                    </View>
                    <View style={{ marginBottom: hp(5.5) }} className="pt-2 px-4">
                        <View className="flex-row items-center bg-white border border-neutral-300 rounded-full px-4 py-2">
                            <TextInput
                                ref={inputRef}
                                onChangeText={value => textRef.current = value}
                                placeholder='Type a message...'
                                style={{
                                    fontSize: hp(2),
                                    flex: 1,
                                    paddingVertical: hp(1),
                                    maxHeight: hp(12)
                                }}
                                className="text-neutral-700"
                                multiline
                                textAlignVertical="center"
                            />
                            <TouchableOpacity onPress={handleSendMessage} className="bg-purple-600 p-2 rounded-full ml-2">
                                <Feather name="send" size={hp(2.2)} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </CustomKeyboardView>
    )
}