import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import notificationService from '../utils/notificationService';

export default function NotificationTest() {
    const { user } = useAuth();

    const handleTestNotification = async () => {
        try {
            // Test local notification
            await notificationService.scheduleLocalNotification(
                'Test Notification',
                'This is a test notification from QTalk!',
                1
            );
            
            Alert.alert('Success', 'Test notification scheduled for 1 second!');
        } catch (error) {
            console.error('Error scheduling test notification:', error);
            Alert.alert('Error', 'Failed to schedule test notification');
        }
    };

    const handleCheckPermissions = async () => {
        try {
            const status = await notificationService.getNotificationPermissionsStatus();
            Alert.alert('Notification Permissions', `Current status: ${status}`);
        } catch (error) {
            console.error('Error checking permissions:', error);
            Alert.alert('Error', 'Failed to check notification permissions');
        }
    };

    const handleGetToken = async () => {
        try {
            const token = await notificationService.getStoredPushToken();
            if (token) {
                Alert.alert('Push Token', `Token available: ${token.substring(0, 50)}...`);
            } else {
                Alert.alert('Push Token', 'No push token found');
            }
        } catch (error) {
            console.error('Error getting token:', error);
            Alert.alert('Error', 'Failed to get push token');
        }
    };

    const handleRegisterToken = async () => {
        try {
            const token = await notificationService.registerForPushNotificationsAsync();
            if (token) {
                Alert.alert('Success', `Push token registered: ${token.substring(0, 50)}...`);
                if (user?.uid) {
                    await notificationService.updateUserPushToken(user.uid, token);
                    Alert.alert('Updated', 'Token updated in Firestore!');
                }
            } else {
                Alert.alert('Failed', 'Could not get push token');
            }
        } catch (error) {
            console.error('Error registering token:', error);
            Alert.alert('Error', 'Failed to register push token: ' + error.message);
        }
    };

    return (
        <View className="p-4 border border-gray-300 rounded-lg m-4 bg-white">
            <Text 
                className="text-lg font-semibold mb-3 text-center" 
                style={{ fontSize: hp(2.2) }}
            >
                🔔 Notification Test Panel
            </Text>
            
            <TouchableOpacity
                onPress={handleTestNotification}
                className="bg-blue-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    Send Test Notification
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleCheckPermissions}
                className="bg-green-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    Check Permissions
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleGetToken}
                className="bg-purple-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    Check Push Token
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleRegisterToken}
                className="bg-orange-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    Register New Token
                </Text>
            </TouchableOpacity>

            <Text 
                className="text-xs text-gray-600 text-center mt-2"
                style={{ fontSize: hp(1.4) }}
            >
                User ID: {user?.userId || 'Not logged in'}
            </Text>
        </View>
    );
}
