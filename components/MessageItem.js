import { Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

// Format message timestamp
const formatMessageTime = (createdAt) => {
    if (!createdAt) return '';
    
    let date;
    // Handle different timestamp formats
    if (createdAt?.seconds) {
        // Firebase timestamp format
        date = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === 'string') {
        // ISO string format
        date = new Date(createdAt);
    } else {
        // Already a Date object
        date = new Date(createdAt);
    }
    
    const now = new Date();
    const messageDate = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    const timeString = messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    if (messageDay.getTime() === today.getTime()) {
        // Today - show only time
        return timeString;
    } else if (messageDay.getTime() === yesterday.getTime()) {
        // Yesterday - show "Yesterday HH:MM"
        return `Yesterday ${timeString}`;
    } else if (messageDate.getFullYear() === now.getFullYear()) {
        // This year - show "Mon DD HH:MM"
        return messageDate.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric' 
        }) + ` ${timeString}`;
    } else {
        // Different year - show "MM/DD/YY HH:MM"
        return messageDate.toLocaleDateString([], { 
            month: '2-digit', 
            day: '2-digit', 
            year: '2-digit' 
        }) + ` ${timeString}`;
    }
};

export default function MessageItem({ message, currentUser }) {
    console.log('MessageItem Debug:', {
        messageText: message?.text,
        messageUserId: message?.userId,
        currentUserId: currentUser?.userId,
        isCurrentUser: currentUser?.userId === message?.userId,
        senderName: message?.senderName
    });

    if (currentUser?.userId === message?.userId) {
        // Outgoing message (right side, modern blue gradient bubble)
        return (
            <View className="flex-row justify-end mb-3 mr-4">
                <View style={{ maxWidth: wp(75) }}>
                    <View 
                        className="self-end px-4 py-3"
                        style={{
                            backgroundColor: '#0088CC',
                            borderRadius: 18,
                            borderBottomRightRadius: 6,
                            shadowColor: '#0088CC',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 6,
                            elevation: 4,
                        }}
                    >
                        <Text 
                            style={{ 
                                fontSize: hp(1.9),
                                lineHeight: hp(2.5),
                                color: '#FFFFFF',
                                fontWeight: '400'
                            }}
                        >
                            {message?.text}
                        </Text>
                        <View className="flex-row justify-end items-center mt-2">
                            <Text 
                                style={{ 
                                    fontSize: hp(1.2),
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontWeight: '300'
                                }}
                            >
                                {formatMessageTime(message?.createdAt)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        )
    } else {
        // Incoming message (left side, clean white bubble with subtle shadow)
        return (
            <View style={{ maxWidth: wp(75) }} className="ml-4 mb-3">
                <View 
                    className="self-start px-4 py-3"
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 18,
                        borderBottomLeftRadius: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                        borderWidth: 0.5,
                        borderColor: 'rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <Text 
                        style={{ 
                            fontSize: hp(1.9),
                            lineHeight: hp(2.5),
                            color: '#2c3e50',
                            fontWeight: '400'
                        }}
                    >
                        {message?.text}
                    </Text>
                    <View className="flex-row justify-end items-center mt-2">
                        <Text 
                            style={{ 
                                fontSize: hp(1.2),
                                color: '#7f8c8d',
                                fontWeight: '300'
                            }}
                        >
                            {formatMessageTime(message?.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        )
    }
}