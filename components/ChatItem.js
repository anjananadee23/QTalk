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

        // Use Firebase real-time listener
        const docRef = doc(db, "rooms", roomId);
        const messagesRef = collection(docRef, "messages");
        const q = query(messagesRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let allMessages = snapshot.docs.map(doc => {
                return doc.data();
            });
            setLastMessage(allMessages[0] ? allMessages[0] : null);
        }, (error) => {
            console.log('ChatItem Firebase listener error:', error);
            setLastMessage(null);
        });

        return () => {
            unsubscribe();
        };

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
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                marginHorizontal: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.04)'
            }}
            activeOpacity={0.9}
        >
            {/* Profile Image */}
            <View style={{ position: 'relative' }}>
                <View
                    style={{
                        width: hp(6.8),
                        height: hp(6.8),
                        borderRadius: hp(3.4),
                        backgroundColor: '#e3f2fd',
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: 'rgba(0, 136, 204, 0.1)'
                    }}
                >
                    <Image
                        source={{ uri: item?.profileUrl }}
                        placeholder={blurhash}
                        transition={500}
                        style={{ 
                            width: '100%',
                            height: '100%'
                        }}
                    />
                </View>
                
                {/* Online indicator */}
                <View
                    style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        width: hp(1.8),
                        height: hp(1.8),
                        borderRadius: hp(0.9),
                        backgroundColor: '#4CAF50',
                        borderWidth: 2,
                        borderColor: 'white'
                    }}
                />
            </View>

            {/* Chat content */}
            <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
                <View className="flex-row justify-between items-center">
                    <Text 
                        style={{ 
                            fontSize: hp(2), 
                            fontWeight: '600',
                            color: '#2c3e50',
                            letterSpacing: 0.2
                        }}
                        numberOfLines={1}
                    >
                        {item?.username}
                    </Text>
                    <Text 
                        style={{ 
                            fontSize: hp(1.4), 
                            color: '#95a5a6',
                            fontWeight: '500'
                        }}
                    >
                        {renderTime()}
                    </Text>
                </View>
                <Text 
                    style={{ 
                        fontSize: hp(1.6), 
                        color: '#6c757d',
                        fontWeight: '400',
                        lineHeight: hp(2.2)
                    }}
                    numberOfLines={1}
                >
                    {renderLastMessage()}
                </Text>
            </View>

            {/* Unread indicator (optional - you can add logic for unread count) */}
            {lastMessage && lastMessage.userId !== currentUser?.userId && (
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#0088CC',
                        marginLeft: 8
                    }}
                />
            )}
        </TouchableOpacity>
    );
}