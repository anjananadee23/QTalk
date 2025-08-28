import { Feather } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/authContext';
import { blurhash } from '../utils/common';
import { MenuItem } from './CustomMenuItems';
import Profile from './Profile';

const android = Platform.OS === 'android';
export default function HomeHeader() {
    const { user, logout } = useAuth();
    const { top } = useSafeAreaInsets();
    const [showProfile, setShowProfile] = useState(false);

    const handleProfile = () => {
        setShowProfile(true);
    }

    const handleLogout = async () => {
        await logout();
    }

    return (
        <>
            <View style={{ paddingTop: android ? top + 20 : top }} className="flex-row justify-between items-center px-5 bg-telegram-primary pb-4 shadow-sm">
                <View>
                    <Text className="text-white font-medium text-xl tracking-wide">QTalk</Text>
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
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    marginTop: 40,
                                    marginLeft: -30,
                                    backgroundColor: 'white',
                                    shadowOpacity: 0.15,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowRadius: 8,
                                    width: 160,
                                    elevation: 8,
                                }
                            }}>
                            <MenuItem
                                text="Profile"
                                action={handleProfile}
                                value={null}
                                icon={<Feather name="user" size={hp(2.2)} color="#0088CC" />}
                            />
                            <Divider />
                            <MenuItem
                                text="Sign Out"
                                action={handleLogout}
                                value={null}
                                icon={<AntDesign name="logout" size={hp(2.2)} color="#777777" />}
                            />
                        </MenuOptions>
                    </Menu>

                </View>
            </View>

            {/* Profile Modal */}
            <Profile 
                visible={showProfile}
                onClose={() => setShowProfile(false)}
            />
        </>
    );
}

const Divider = () => {
    return(
        <View className="p-[0.5px] w-full bg-telegram-separator" />
    )
}