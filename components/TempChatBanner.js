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
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to leave chat');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View 
            style={{
                backgroundColor: '#fff3cd',
                borderBottomWidth: 1,
                borderBottomColor: '#ffeaa7',
                paddingHorizontal: 16,
                paddingVertical: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
            }}
        >
            <Text 
                style={{ 
                    fontSize: hp(1.6), 
                    color: '#856404',
                    textAlign: 'center',
                    marginBottom: 12,
                    fontWeight: '500',
                    lineHeight: hp(2.2)
                }}
            >
                🔒 This is a temporary chat. Choose an option:
            </Text>

            <View className="flex-row justify-center gap-3">
                <TouchableOpacity
                    onPress={handleRemainForFuture}
                    style={{ 
                        height: hp(4.2), 
                        paddingHorizontal: 20,
                        backgroundColor: '#28a745',
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#28a745',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: hp(1.6), color: 'white', fontWeight: '600' }}>
                        💾 Save Contact
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleLeaveChat}
                    style={{ 
                        height: hp(4.2), 
                        paddingHorizontal: 20,
                        backgroundColor: '#dc3545',
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#dc3545',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: hp(1.6), color: 'white', fontWeight: '600' }}>
                        🚪 Leave Chat
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
