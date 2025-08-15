import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AntDesign from '@expo/vector-icons/AntDesign';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/authContext';
import { blurhash } from '../utils/common';
import { MenuItem } from './CustomMenuItems';

const android = Platform.OS === 'android';
export default function HomeHeader() {
    const { user, logout } = useAuth();
    const { top } = useSafeAreaInsets();

    const handleProfile = () => {

    }

    const handleLogout = async () => {
        await logout();
    }

    return (
        <View style={{ paddingTop: android ? top + 30 : top }} className="flex-row justify-between px-5 bg-purple-950 pb-4 shadow">
            <View>
                <Text className="text-white font-bold" style={{ fontSize: 24 }}>Chats</Text>
            </View>

            <View>
                <Menu>
                    <MenuTrigger customStyles={{
                        triggerWrapper: {
                            padding: 0,
                            margin: 0,
                            borderRadius: 100,
                            overflow: 'hidden',
                        }
                    }}>
                        <Image
                            style={{ height: hp(4.3), aspectRatio: 1, borderRadius: 100 }}
                            source={{ uri: user?.profileUrl || "https://picsum.photos/seed/696/300/300" }}
                            placeholder={{ blurhash }}
                            contentFit="cover"
                            transition={500}
                        />
                    </MenuTrigger>
                    <MenuOptions
                        customStyles={{
                            optionsContainer: {
                                borderRadius: 10,
                                borderCurve: 'continuous',
                                marginTop: 40,
                                marginLeft: -30,
                                backgroundColor: 'white',
                                shadowOpacity: 0.2,
                                shadowOffset: { width: 0, height: 0 },
                                width: 150,
                            }
                        }}>
                        <MenuItem
                            text="Profile"
                            action={handleProfile}
                            value={null}
                            icon={<Feather name="user" size={hp(2.5)} color="#737373" />}
                        />
                        <Divider />
                        <MenuItem
                            text="Logout"
                            action={handleLogout}
                            value={null}
                            icon={<AntDesign name="logout" size={hp(2.5)} color="#737373" />}
                        />
                    </MenuOptions>
                </Menu>

            </View>
        </View>
    );
}

const Divider = () => {
    return(
        <View className="p-[1px] w-full bg-neutral-200" />
    )
}