import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import { blurhash } from '../utils/common';
import { generateQRData } from '../utils/qrService';

export default function QRGenerator({ onClose }) {
    const { user } = useAuth();
    const userId = user?.userId || user?.uid;
    const qrData = generateQRData(userId);

    if (!userId) {
        return (
            <View className="flex-1 justify-center items-center bg-telegram-lighter p-6">
                <Text style={{ fontSize: hp(2) }} className="text-center text-telegram-error">
                    User not loaded. Please try again.
                </Text>
                <TouchableOpacity
                    onPress={onClose}
                    style={{ height: hp(6), paddingHorizontal: 24, borderRadius: 12 }}
                    className="bg-telegram-primary justify-center items-center mt-8"
                >
                    <Text style={{ fontSize: hp(1.9) }} className="text-white font-medium">
                        Close
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 justify-center items-center bg-telegram-lighter p-6">
            <Text style={{ fontSize: hp(3) }} className="font-medium text-center mb-6 text-telegram-text">
                My QR Code
            </Text>

            <Text style={{ fontSize: hp(1.8) }} className="text-center mb-8 text-telegram-textLight leading-6">
                Let others scan this code to connect with you instantly
            </Text>

            {/* Profile Section */}
            <View className="items-center mb-6">
                <View 
                    style={{
                        width: hp(8),
                        height: hp(8),
                        borderRadius: hp(4),
                        backgroundColor: 'rgba(0, 136, 204, 0.1)',
                        overflow: 'hidden',
                        marginBottom: hp(2)
                    }}
                >
                    <Image
                        source={{ 
                            uri: user?.profileUrl || "https://picsum.photos/seed/696/300/300" 
                        }}
                        placeholder={{ blurhash }}
                        contentFit="cover"
                        transition={500}
                        style={{ width: '100%', height: '100%' }}
                    />
                </View>
                <Text style={{ fontSize: hp(2.2) }} className="font-medium text-telegram-text">
                    {user?.username}
                </Text>
                <Text style={{ fontSize: hp(1.6) }} className="text-telegram-textLight">
                    @{user?.username?.toLowerCase().replace(/\s+/g, '') || 'username'}
                </Text>
            </View>

            {/* QR Code */}
            <View 
                className="p-8 bg-white rounded-3xl"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                <QRCode
                    value={qrData}
                    size={220}
                    backgroundColor="white"
                    color="black"
                    logoSize={40}
                    logoBackgroundColor="white"
                />
            </View>

            <TouchableOpacity
                onPress={onClose}
                style={{ 
                    height: hp(6), 
                    paddingHorizontal: 32,
                    borderRadius: 24,
                    marginTop: hp(4)
                }}
                className="bg-telegram-primary justify-center items-center"
            >
                <Text style={{ fontSize: hp(1.9) }} className="text-white font-medium">
                    Done
                </Text>
            </TouchableOpacity>
        </View>
    );
}
