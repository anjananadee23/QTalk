import { Entypo, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import NetworkStatus from './NetworkStatus';

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

            {/* Network Status */}
            <NetworkStatus />

            {/* Telegram-style Header */}
            <View
                style={{
                    paddingTop: hp(6.5),
                    backgroundColor: '#0088CC',
                    paddingBottom: hp(1.5),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 8,
                }}
            >
                <View className="flex-row items-center px-4">
                    {/* Left side - Back button and user info */}
                    <View className="flex-row items-center flex-1">
                        <TouchableOpacity 
                            onPress={() => router.back()}
                            style={{ 
                                marginLeft: -4,
                                padding: 8,
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}
                            activeOpacity={0.7}
                        >
                            <Entypo name="chevron-left" size={hp(2.8)} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View className="flex-row items-center flex-1 gap-3 ml-2">
                            {/* User Avatar */}
                            <View
                                style={{
                                    height: hp(4.5),
                                    width: hp(4.5),
                                    borderRadius: hp(2.25),
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    overflow: 'hidden',
                                    borderWidth: 2,
                                    borderColor: 'rgba(255,255,255,0.2)'
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
                                    style={{ 
                                        fontSize: hp(2.1),
                                        fontWeight: '600',
                                        letterSpacing: 0.3
                                    }}
                                    className="text-white"
                                    numberOfLines={1}
                                >
                                    {user?.username || user?.displayName || user?.name || 'Chat User'}
                                </Text>
                                <Text
                                    style={{ 
                                        fontSize: hp(1.4),
                                        fontWeight: '400',
                                        marginTop: 1
                                    }}
                                    className="text-white/80"
                                    numberOfLines={1}
                                >
                                    last seen recently
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right side - Action buttons */}
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity 
                            style={{ 
                                padding: 8, 
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call" size={hp(2.2)} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ 
                                padding: 8, 
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="videocam" size={hp(2.4)} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ 
                                padding: 8, 
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="ellipsis-vertical" size={hp(2.2)} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </>
    )
}