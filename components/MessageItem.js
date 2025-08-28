import { Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function MessageItem({ message, currentUser }) {
    console.log('MessageItem Debug:', {
        messageText: message?.text,
        messageUserId: message?.userId,
        currentUserId: currentUser?.userId,
        isCurrentUser: currentUser?.userId === message?.userId,
        senderName: message?.senderName
    });

    if (currentUser?.userId === message?.userId) {
        // Outgoing message (right side, green bubble like Telegram)
        return (
            <View className="flex-row justify-end mb-2 mr-3">
                <View style={{ maxWidth: wp(75) }}>
                    <View 
                        className="self-end px-4 py-3 rounded-2xl"
                        style={{
                            backgroundColor: '#DCF8C6',
                            borderBottomRightRadius: 6,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 2,
                        }}
                    >
                        <Text 
                            style={{ 
                                fontSize: hp(1.85),
                                lineHeight: hp(2.4),
                                color: '#000000'
                            }}
                        >
                            {message?.text}
                        </Text>
                        <View className="flex-row justify-end items-center mt-1">
                            <Text 
                                style={{ 
                                    fontSize: hp(1.3),
                                    color: '#666666'
                                }}
                            >
                                {new Date(message?.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        )
    } else {
        // Incoming message (left side, white bubble like Telegram)
        return (
            <View style={{ maxWidth: wp(75) }} className="ml-3 mb-2">
                <View 
                    className="self-start px-4 py-3 rounded-2xl"
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderBottomLeftRadius: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                    }}
                >
                    <Text 
                        style={{ 
                            fontSize: hp(1.85),
                            lineHeight: hp(2.4),
                            color: '#000000'
                        }}
                    >
                        {message?.text}
                    </Text>
                    <View className="flex-row justify-end items-center mt-1">
                        <Text 
                            style={{ 
                                fontSize: hp(1.3),
                                color: '#666666'
                            }}
                        >
                            {new Date(message?.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                </View>
            </View>
        )
    }
}