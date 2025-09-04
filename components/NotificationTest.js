import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import NotificationDebug from '../utils/notificationDebug';
import notificationService from '../utils/notificationService';
import { NotificationTroubleshoot } from '../utils/notificationTroubleshoot';

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

    const handleRunDiagnostic = async () => {
        try {
            Alert.alert('Running Diagnostic', 'Please wait while we check your notification setup...');
            const results = await NotificationDebug.runFullDiagnostic(user?.uid);
            
            let message = `Overall Status: ${results.overall}\n\n`;
            message += `Device: ${results.deviceInfo.isDevice ? 'Physical' : 'Simulator'}\n`;
            message += `Platform: ${results.deviceInfo.platform}\n`;
            message += `Permissions: ${results.permissions.final}\n`;
            
            if (results.token.final) {
                message += `Token: ${results.token.preview}\n`;
            } else {
                message += `Token: Not available\n`;
            }
            
            if (results.firestore.success) {
                message += `Firestore: ✅ Connected\n`;
            } else {
                message += `Firestore: ❌ Error\n`;
            }
            
            Alert.alert('Notification Diagnostic', message);
            console.log('📊 Full diagnostic results:', results);
        } catch (error) {
            console.error('Error running diagnostic:', error);
            Alert.alert('Error', 'Failed to run diagnostic: ' + error.message);
        }
    };

    const handleQuickTokenCheck = async () => {
        try {
            const token = await NotificationDebug.quickTokenCheck();
            if (token) {
                Alert.alert('Token Check', `Token found: ${token.substring(0, 50)}...`);
            } else {
                Alert.alert('Token Check', 'No token available');
            }
        } catch (error) {
            console.error('Error checking token:', error);
            Alert.alert('Error', 'Failed to check token: ' + error.message);
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

    const handleAdvancedDiagnostic = async () => {
        try {
            Alert.alert('Advanced Diagnostic', 'Running comprehensive notification analysis...');
            const results = await NotificationTroubleshoot.runAdvancedDiagnostic(user?.uid);
            
            let message = `🔍 ADVANCED DIAGNOSTIC RESULTS\n\n`;
            message += `Overall Status: ${results.success ? '✅ SUCCESS' : '❌ ISSUES FOUND'}\n\n`;
            
            // Device info
            message += `📱 Device: ${results.device.manufacturer} ${results.device.modelName}\n`;
            message += `Platform: ${results.device.platform} ${results.device.osVersion}\n`;
            message += `Type: ${results.device.isDevice ? 'Physical' : 'Simulator'}\n\n`;
            
            // Permissions
            message += `🔔 Permissions: ${results.permissions.current?.status || 'unknown'}\n`;
            
            // Tokens
            if (results.tokens.final) {
                message += `🎫 Token: ✅ Available\n`;
            } else {
                message += `🎫 Token: ❌ Missing\n`;
            }
            
            // Issues and fixes
            if (results.issues.length > 0) {
                message += `\n⚠️ ISSUES (${results.issues.length}):\n`;
                results.issues.forEach(issue => {
                    message += `• ${issue.replace(/_/g, ' ')}\n`;
                });
            }
            
            if (results.fixes.length > 0) {
                message += `\n🔧 SUGGESTED FIXES:\n`;
                results.fixes.forEach(fix => {
                    message += `• ${fix}\n`;
                });
            }
            
            if (results.testNotification?.success) {
                message += `\n✅ Test notification sent successfully!`;
            }
            
            Alert.alert('Advanced Diagnostic Complete', message);
            console.log('📊 Advanced diagnostic results:', results);
        } catch (error) {
            console.error('Error running advanced diagnostic:', error);
            Alert.alert('Error', 'Advanced diagnostic failed: ' + error.message);
        }
    };

    const handleQuickFix = async () => {
        try {
            Alert.alert('Quick Fix', 'Applying common notification fixes...');
            const result = await NotificationTroubleshoot.applyCommonFixes();
            
            let message = result.success ? '✅ Quick fixes applied:\n\n' : '❌ Some fixes failed:\n\n';
            result.fixes.forEach(fix => {
                message += `• ${fix}\n`;
            });
            
            if (result.error) {
                message += `\nError: ${result.error}`;
            }
            
            message += '\n💡 Try testing notifications again!';
            Alert.alert('Quick Fix Complete', message);
        } catch (error) {
            console.error('Error applying quick fixes:', error);
            Alert.alert('Error', 'Quick fix failed: ' + error.message);
        }
    };

    return (
        <View className="p-4 border border-gray-300 rounded-lg m-4 bg-white">
            {/* <Text 
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
                onPress={handleRunDiagnostic}
                className="bg-red-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    🔍 Run Full Diagnostic
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleQuickTokenCheck}
                className="bg-yellow-500 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    ⚡ Quick Token Check
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

            <TouchableOpacity
                onPress={handleAdvancedDiagnostic}
                className="bg-indigo-600 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    🔧 Advanced Diagnostic
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleQuickFix}
                className="bg-green-600 px-4 py-3 rounded-lg mb-3"
            >
                <Text 
                    className="text-white text-center font-medium"
                    style={{ fontSize: hp(1.8) }}
                >
                    ⚡ Apply Quick Fixes
                </Text>
            </TouchableOpacity>

            <Text 
                className="text-xs text-gray-600 text-center mt-2"
                style={{ fontSize: hp(1.4) }}
            >
                User ID: {user?.userId || 'Not logged in'}
            </Text> */}
        </View>
    );
}
