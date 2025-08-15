import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import { db } from '../firebaseConfig';
import { createTemporaryChat, parseQRData } from '../utils/qrService';

export default function QRScanner({ onClose }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return;

        setScanned(true);

        const scannedUserId = parseQRData(data);

        if (!scannedUserId) {
            Alert.alert('Invalid QR Code', 'This QR code is not valid for QTalk');
            setScanned(false);
            return;
        }

        // Check if current user ID is available
        const currentUserId = user?.userId || user?.uid;
        if (!currentUserId) {
            Alert.alert('Error', 'User not properly loaded. Please try again.');
            setScanned(false);
            return;
        }

        if (scannedUserId === currentUserId) {
            Alert.alert('Error', 'You cannot scan your own QR code');
            setScanned(false);
            return;
        }

        try {
            console.log('QR Scanner - Creating temporary chat...');
            console.log('Current user:', { uid: user?.uid, userId: user?.userId });
            console.log('Scanned user ID:', scannedUserId);

            const tempChatId = await createTemporaryChat(currentUserId, scannedUserId);

            // Fetch the scanned user's data from Firestore
            console.log('Fetching scanned user data...');
            const userDoc = await getDoc(doc(db, 'users', scannedUserId));
            let scannedUserData;

            if (userDoc.exists()) {
                scannedUserData = userDoc.data();
                console.log('Scanned user data found:', scannedUserData);
            } else {
                console.log('Scanned user not found, using fallback data');
                scannedUserData = {
                    userId: scannedUserId,
                    username: 'Unknown User',
                    profileUrl: require('../assets/images/user.jpg')
                };
            }

            onClose();

            // Navigate to regular chatRoom with temporary chat parameters
            router.push({
                pathname: '/(app)/chatRoom',
                params: {
                    ...scannedUserData, // Spread the user data
                    tempChatId,
                    isTemporary: 'true'
                }
            });

        } catch (error) {
            console.error('QR Scanner Error:', error);

            let errorMessage = 'Failed to create chat';
            if (error.message.includes('permissions')) {
                errorMessage = 'Permission denied. Please check if you are signed in and try again.';
            } else if (error.message.includes('network') || error.message.includes('transport')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else {
                errorMessage = `Failed to create chat: ${error.message}`;
            }

            Alert.alert('Error', errorMessage);
            setScanned(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />
            <View style={styles.overlay}>
                <View style={styles.scanArea} />
                <Text style={styles.scanText}>Scan QR Code to connect</Text>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanArea: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'transparent',
    },
    scanText: {
        color: 'white',
        fontSize: hp(2),
        marginTop: 20,
    },
    cancelButton: {
        backgroundColor: 'red',
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
    },
    cancelText: {
        color: 'white',
        fontSize: hp(2),
        fontWeight: 'bold',
    },
});
