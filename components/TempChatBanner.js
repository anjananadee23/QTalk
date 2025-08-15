import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import { deleteTemporaryChat, saveContactPermanently } from '../utils/qrService';

export default function TempChatBanner({ tempChatId, otherUserId, onContactSaved, onChatLeft }) {
    const { user } = useAuth();

    const handleRemainForFuture = async () => {
        try {
            const currentUserId = user?.userId || user?.uid;
            if (!currentUserId) {
                Alert.alert('Error', 'User not properly loaded');
                return;
            }
            await saveContactPermanently(currentUserId, otherUserId);
            Alert.alert('Success', 'Contact saved to your chat list!');
            onContactSaved?.();
        } catch (error) {
            console.error('Error saving contact:', error);
            Alert.alert('Error', 'Failed to save contact: ' + error.message);
        }
    };

    const handleLeaveChat = async () => {
        Alert.alert(
            'Leave Chat',
            'Are you sure you want to leave this chat? This will delete the conversation.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTemporaryChat(tempChatId);
                            onChatLeft?.();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave chat');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="bg-yellow-100 border-b border-yellow-300 px-4 py-3">
            <Text style={{ fontSize: hp(1.6) }} className="text-center text-yellow-800 mb-3">
                This is a temporary chat. Choose an option below:
            </Text>

            <View className="flex-row justify-center gap-3">
                <TouchableOpacity
                    onPress={handleRemainForFuture}
                    style={{ height: hp(4), paddingHorizontal: 16 }}
                    className="bg-green-600 justify-center items-center rounded-lg"
                >
                    <Text style={{ fontSize: hp(1.6) }} className="text-white font-semibold">
                        Remain for Future
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleLeaveChat}
                    style={{ height: hp(4), paddingHorizontal: 16 }}
                    className="bg-red-600 justify-center items-center rounded-lg"
                >
                    <Text style={{ fontSize: hp(1.6) }} className="text-white font-semibold">
                        Leave Chat
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
