import { Entypo, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function ChatRoomHeader({ user, router }) {
    console.log('=== ChatRoomHeader Debug ===');
    console.log('Username:', user?.username);
    console.log('ProfileUrl:', user?.profileUrl);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false
                }}
            />

            {/* Telegram-style Header */}
            <View
                style={{
                    paddingTop: hp(6.5),
                    backgroundColor: '#0088CC',
                    paddingBottom: hp(1.2),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                }}
            >
                <View className="flex-row items-center px-4">
                    {/* Left side - Back button and user info */}
                    <View className="flex-row items-center flex-1">
                        <TouchableOpacity 
                            onPress={() => router.back()}
                            className="mr-3 p-1"
                            style={{ marginLeft: -4 }}
                        >
                            <Entypo name="chevron-left" size={hp(3.2)} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View className="flex-row items-center flex-1 gap-3">
                            {/* User Avatar */}
                            <View
                                style={{
                                    height: hp(4.2),
                                    width: hp(4.2),
                                    borderRadius: hp(2.1),
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    overflow: 'hidden'
                                }}
                            >
                                <Image
                                    source={
                                        user?.profileUrl && typeof user.profileUrl === 'string'
                                            ? { uri: user.profileUrl }
                                            : require('../assets/images/user.jpg')
                                    }
                                    style={{
                                        height: '100%',
                                        width: '100%'
                                    }}
                                    contentFit="cover"
                                />
                            </View>

                            {/* User Info */}
                            <View className="flex-1">
                                <Text
                                    style={{ fontSize: hp(2.1) }}
                                    className="text-white font-medium"
                                    numberOfLines={1}
                                >
                                    {user?.username || user?.displayName || user?.name || 'Chat User'}
                                </Text>
                                <Text
                                    style={{ fontSize: hp(1.4) }}
                                    className="text-white/80"
                                    numberOfLines={1}
                                >
                                    online
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right side - Action buttons */}
                    <View className="flex-row items-center gap-5">
                        <TouchableOpacity className="p-1">
                            <Ionicons name="call" size={hp(2.4)} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-1">
                            <Ionicons name="videocam" size={hp(2.4)} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-1">
                            <Ionicons name="ellipsis-vertical" size={hp(2.4)} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </>
    )
}