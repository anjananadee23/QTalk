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
        return (
            <View className="flex-row justify-end mb-3 mr-3">
                <View style={{ width: wp(80) }}>
                    <View className="flex self-end p-3 rounded-2xl bg-white border border-neutral-200">
                        <Text style={{ fontSize: hp(1.9) }}>
                            {message?.text}
                        </Text>
                    </View>
                </View>
            </View>
        )
    } else {
        return (
            <View style={{ width: wp(80) }} className="ml-3 mb-3">
                <View className="flex self-start p-3 px-4 rounded-2xl bg-purple-950">
                    <Text style={{ fontSize: hp(1.9), color: 'white' }}>
                        {message?.text}
                    </Text>
                </View>
            </View>
        )
    }
}