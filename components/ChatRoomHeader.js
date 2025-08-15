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

            {/* Custom Header */}
            <View
                style={{
                    paddingTop: hp(6),
                    backgroundColor: 'white',
                    paddingBottom: hp(1),
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e5e5'
                }}
            >
                <View className="flex-row items-center justify-between px-4">
                    {/* Left side - Back button and user info */}
                    <View className="flex-row items-center gap-4 flex-1">
                        <TouchableOpacity onPress={() => router.back()}>
                            <Entypo name="chevron-left" size={hp(4)} color="#737373" />
                        </TouchableOpacity>

                        <View className="flex-row items-center gap-3 flex-1">
                            {/* User Avatar */}
                            <View
                                style={{
                                    height: hp(5),
                                    width: hp(5),
                                    borderRadius: hp(2.5),
                                    backgroundColor: '#e5e5e5',
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

                            {/* User Name */}
                            <Text
                                style={{ fontSize: hp(2.5) }}
                                className="text-neutral-700 font-semibold"
                                numberOfLines={1}
                            >
                                {user?.username || user?.displayName || user?.name || 'Chat User'}
                            </Text>
                        </View>
                    </View>

                    {/* Right side - Call buttons */}
                    <View className="flex-row items-center gap-6">
                        <TouchableOpacity>
                            <Ionicons name="call" size={hp(2.8)} color="#737373" />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Ionicons name="videocam" size={hp(2.8)} color="#737373" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </>
    )
}