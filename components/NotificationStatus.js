import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import notificationService from '../utils/notificationService';

export default function NotificationStatus() {
    const { user } = useAuth();
    const [notificationStatus, setNotificationStatus] = useState('checking');
    const [pushToken, setPushToken] = useState(null);

    const checkNotificationStatus = useCallback(async () => {
        try {
            // Check permission status
            const permissionStatus = await notificationService.getNotificationPermissionsStatus();
            
            // Get stored push token
            const storedToken = await notificationService.getStoredPushToken();
            
            setNotificationStatus(permissionStatus);
            setPushToken(storedToken);
            
            console.log('🔔 Notification Status:', {
                permission: permissionStatus,
                hasToken: !!storedToken,
                userId: user?.uid
            });
        } catch (error) {
            console.error('❌ Error checking notification status:', error);
            setNotificationStatus('error');
        }
    }, [user?.uid]);

    useEffect(() => {
        checkNotificationStatus();
    }, [checkNotificationStatus]);

    const getStatusColor = () => {
        switch (notificationStatus) {
            case 'granted':
                return pushToken ? '#10B981' : '#F59E0B';
            case 'denied':
                return '#EF4444';
            case 'undetermined':
                return '#6B7280';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = () => {
        if (notificationStatus === 'granted' && pushToken) {
            return '🔔 Notifications Ready';
        } else if (notificationStatus === 'granted' && !pushToken) {
            return '🔔 Permission OK, Getting Token...';
        } else if (notificationStatus === 'denied') {
            return '🔕 Notifications Disabled';
        } else if (notificationStatus === 'undetermined') {
            return '🔔 Notifications Not Set';
        } else {
            return '🔄 Checking Notifications...';
        }
    };

    // Only show in development or when there's an issue
    const shouldShow = __DEV__ || notificationStatus === 'denied' || (notificationStatus === 'granted' && !pushToken);

    if (!shouldShow) {
        return null;
    }

    return (
        <TouchableOpacity
            // onPress={checkNotificationStatus}
            // className="mx-4 mb-2 px-3 py-2 rounded-lg border border-gray-200"
            // style={{
            //     backgroundColor: 'white',
            //     shadowColor: '#000',
            //     shadowOffset: { width: 0, height: 1 },
            //     shadowOpacity: 0.1,
            //     shadowRadius: 2,
            //     elevation: 2,
            // }}
            // activeOpacity={0.7}
        >
            {/* <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <Text
                        style={{
                            fontSize: hp(1.6),
                            fontWeight: '600',
                            color: getStatusColor()
                        }}
                    >
                        {getStatusText()}
                    </Text>
                    {__DEV__ && (
                        <Text
                            style={{
                                fontSize: hp(1.3),
                                color: '#6B7280',
                                marginTop: 2
                            }}
                        >
                            Status: {notificationStatus} | Token: {pushToken ? '✓' : '✗'} | Dev Mode
                        </Text>
                    )}
                </View>
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: getStatusColor()
                    }}
                />
            </View> */}
        </TouchableOpacity>
    );
}
