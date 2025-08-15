import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import { generateQRData } from '../utils/qrService';

export default function QRGenerator({ onClose }) {
    const { user } = useAuth();
    const userId = user?.userId || user?.uid;
    const qrData = generateQRData(userId);

    if (!userId) {
        return (
            <View className="flex-1 justify-center items-center bg-white p-6">
                <Text style={{ fontSize: hp(2) }} className="text-center text-red-600">
                    User not loaded. Please try again.
                </Text>
                <TouchableOpacity
                    onPress={onClose}
                    style={{ height: hp(6), width: '60%' }}
                    className="bg-purple-950 justify-center items-center rounded-2xl mt-8"
                >
                    <Text style={{ fontSize: hp(2) }} className="text-white font-bold">
                        Close
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 justify-center items-center bg-white p-6">
            <Text style={{ fontSize: hp(3) }} className="font-bold text-center mb-8 text-neutral-800">
                My QR Code
            </Text>

            <Text style={{ fontSize: hp(1.8) }} className="text-center mb-6 text-neutral-600">
                Let others scan this code to connect with you
            </Text>

            <View className="p-6 bg-white rounded-2xl shadow-lg">
                <QRCode
                    value={qrData}
                    size={250}
                    backgroundColor="white"
                    color="black"
                />
            </View>

            <Text style={{ fontSize: hp(1.6) }} className="text-center mt-4 text-neutral-500">
                {user?.username}
            </Text>

            <TouchableOpacity
                onPress={onClose}
                style={{ height: hp(6), width: '60%' }}
                className="bg-purple-950 justify-center items-center rounded-2xl mt-8"
            >
                <Text style={{ fontSize: hp(2) }} className="text-white font-bold">
                    Close
                </Text>
            </TouchableOpacity>
        </View>
    );
}
