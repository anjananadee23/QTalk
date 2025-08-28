import { db } from '@/firebaseConfig';
import { blurhash, formatDate, getRoomId } from '@/utils/common';
import { Image } from 'expo-image';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function ChatItem({ item, router, noBorder, currentUser }) {

    const [lastMessage, setLastMessage] = useState(undefined);
    useEffect(() => {

        let roomId = getRoomId(currentUser?.userId, item?.userId);
        const docRef = doc(db, "rooms", roomId);
        const messagesRef = collection(docRef, "messages");
        const q = query(messagesRef, orderBy("createdAt", "desc"));

        let unsub = onSnapshot(q, (snapshot) => {
            let allMessages = snapshot.docs.map(doc => {
                return doc.data();
            });
            setLastMessage(allMessages[0] ? allMessages[0] : null);
        });

        return unsub;

    }, [currentUser?.userId, item?.userId]);

    // console.log('Last message:', lastMessage);

    const openChatRoom = () => {
        router.push({ pathname: '/(app)/chatRoom', params: item });
    }

    const renderTime = () => {
        if (lastMessage) {
            let date = lastMessage?.createdAt;
            return formatDate(new Date(date?.seconds * 1000));
        }
    }

    const renderLastMessage = () => {
        if (typeof lastMessage === 'undefined') return 'Loading...';
        if (lastMessage) {
            if (currentUser?.userId === lastMessage?.userId) return "You: " + lastMessage?.text;
            return lastMessage?.text;
        } else {
            return 'Tap to start messaging';
        }
    }

    return (
        <TouchableOpacity 
            onPress={openChatRoom} 
            className={`flex-row items-center gap-4 mx-4 py-3 ${noBorder ? '' : 'border-b border-telegram-separator'}`}
            style={{ backgroundColor: 'transparent' }}
        >
            {/* Profile Image */}
            <View className="relative">
                <Image
                    source={{ uri: item?.profileUrl }}
                    placeholder={blurhash}
                    transition={500}
                    style={{ 
                        height: hp(6.5), 
                        width: hp(6.5), 
                        borderRadius: hp(3.25),
                        backgroundColor: '#E0E0E0' 
                    }}
                />
            </View>

            {/* Chat content */}
            <View className="flex-1 gap-1">
                <View className="flex-row justify-between items-center">
                    <Text 
                        style={{ fontSize: hp(2) }} 
                        className="font-medium text-telegram-text"
                        numberOfLines={1}
                    >
                        {item?.username}
                    </Text>
                    <Text 
                        style={{ fontSize: hp(1.5) }} 
                        className="text-telegram-textLight"
                    >
                        {renderTime()}
                    </Text>
                </View>
                <Text 
                    style={{ fontSize: hp(1.7) }} 
                    className="text-telegram-textLight"
                    numberOfLines={1}
                >
                    {renderLastMessage()}
                </Text>
            </View>
        </TouchableOpacity>
    );
}