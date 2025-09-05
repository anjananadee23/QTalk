import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';

/**
 * Comprehensive notification troubleshooting utility
 */
export class NotificationTroubleshoot {
  static async runAdvancedDiagnostic(userId) {
    console.log('🔧 Running advanced notification diagnostic...');
    
    const results = {
      timestamp: new Date().toISOString(),
      device: {},
      permissions: {},
      tokens: {},
      channels: {},
      firestore: {},
      connectivity: {},
      issues: [],
      fixes: [],
      success: false
    };

    // 1. Device and Environment Check
    console.log('📱 Checking device environment...');
    results.device = {
      isDevice: Device.isDevice,
      isRealDevice: Device.isDevice && !Device.isDevice.includes('simulator'),
      platform: Platform.OS,
      osVersion: Platform.Version,
      isExpoGo: Constants?.executionEnvironment !== 'standalone',
      appOwnership: Constants?.appOwnership || 'unknown',
      projectId: Constants?.expoConfig?.extra?.eas?.projectId,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      deviceYearClass: Device.deviceYearClass
    };

    // Check for common device issues
    if (!Device.isDevice) {
      results.issues.push('SIMULATOR_DETECTED');
      results.fixes.push('Use a physical device - simulators cannot receive push notifications');
    }

    // 2. Notification Permissions Deep Check
    console.log('🔔 Deep checking notification permissions...');
    try {
      const permissionDetails = await Notifications.getPermissionsAsync();
      results.permissions.current = permissionDetails;
      
      // Check if permissions are properly granted
      if (permissionDetails.status !== 'granted') {
        results.issues.push('PERMISSIONS_NOT_GRANTED');
        
        // Try to request permissions
        console.log('🔄 Requesting notification permissions...');
        const requestResult = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
            allowProvisional: true
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true
          }
        });
        
        results.permissions.requested = requestResult;
        
        if (requestResult.status !== 'granted') {
          results.fixes.push('Enable notifications in device settings: Settings > Apps > QTalk > Notifications');
        }
      }
    } catch (error) {
      results.permissions.error = error.message;
      results.issues.push('PERMISSION_CHECK_FAILED');
    }

    // 3. Enhanced Token Retrieval
    console.log('🎫 Enhanced token retrieval...');
    if (Device.isDevice && results.permissions.current?.status === 'granted') {
      // Method 1: Try Expo Push Token
      try {
        console.log('🔄 Attempting Expo push token...');
        const expoTokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb'
        });
        
        results.tokens.expo = {
          success: true,
          token: expoTokenResult.data,
          preview: expoTokenResult.data?.substring(0, 50) + '...'
        };
        console.log('✅ Expo token successful:', results.tokens.expo.preview);
      } catch (expoError) {
        console.log('❌ Expo token failed:', expoError.message);
        results.tokens.expo = {
          success: false,
          error: expoError.message,
          code: expoError.code
        };
        results.issues.push('EXPO_TOKEN_FAILED');
      }

      // Method 2: Try Device Push Token
      try {
        console.log('🔄 Attempting device push token...');
        const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
        
        results.tokens.device = {
          success: true,
          token: deviceTokenResult.data,
          type: deviceTokenResult.type,
          preview: deviceTokenResult.data?.substring(0, 50) + '...'
        };
        console.log('✅ Device token successful:', results.tokens.device.preview);
      } catch (deviceError) {
        console.log('❌ Device token failed:', deviceError.message);
        results.tokens.device = {
          success: false,
          error: deviceError.message,
          code: deviceError.code
        };
        results.issues.push('DEVICE_TOKEN_FAILED');
      }

      // Determine best token to use
      const finalToken = results.tokens.expo?.token || results.tokens.device?.token;
      if (finalToken) {
        results.tokens.final = finalToken;
        results.tokens.finalPreview = finalToken.substring(0, 50) + '...';
        
        // Store the token
        try {
          await AsyncStorage.setItem('expoPushToken', finalToken);
          results.tokens.stored = true;
        } catch (storageError) {
          results.tokens.storageError = storageError.message;
          results.issues.push('TOKEN_STORAGE_FAILED');
        }
      } else {
        results.issues.push('NO_TOKEN_AVAILABLE');
        results.fixes.push('Check device connectivity and Firebase project configuration');
      }
    }

    // 4. Android Notification Channel Check
    if (Platform.OS === 'android') {
      console.log('📱 Checking Android notification channels...');
      try {
        // Check if default channel exists
        const channels = await Notifications.getNotificationChannelsAsync();
        results.channels.existing = channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          importance: ch.importance
        }));
        
        // Create/update channels with proper settings
        await Notifications.setNotificationChannelAsync('default', {
          name: 'QTalk Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true
        });

        await Notifications.setNotificationChannelAsync('high_priority', {
          name: 'QTalk High Priority',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true
        });

        const updatedChannels = await Notifications.getNotificationChannelsAsync();
        results.channels.updated = updatedChannels.map(ch => ({
          id: ch.id,
          name: ch.name,
          importance: ch.importance
        }));
        
        results.channels.success = true;
      } catch (channelError) {
        results.channels.error = channelError.message;
        results.issues.push('CHANNEL_SETUP_FAILED');
      }
    }

    // 5. Firestore Integration Test
    console.log('🔥 Testing Firestore integration...');
    if (userId && results.tokens.final) {
      try {
        const userRef = doc(db, 'users', userId);
        
        // Test write
        await setDoc(userRef, {
          expoPushToken: results.tokens.final,
          lastTokenUpdate: new Date().toISOString(),
          notificationTestPassed: true,
          deviceInfo: {
            platform: Platform.OS,
            manufacturer: Device.manufacturer,
            model: Device.modelName
          }
        }, { merge: true });
        
        // Test read
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          results.firestore = {
            success: true,
            tokenMatches: userData.expoPushToken === results.tokens.final,
            lastUpdate: userData.lastTokenUpdate,
            hasDeviceInfo: !!userData.deviceInfo
          };
        } else {
          results.issues.push('FIRESTORE_DOC_NOT_FOUND');
        }
      } catch (firestoreError) {
        results.firestore = {
          success: false,
          error: firestoreError.message,
          code: firestoreError.code
        };
        results.issues.push('FIRESTORE_CONNECTION_FAILED');
        results.fixes.push('Check internet connection and Firebase configuration');
      }
    }

    // 6. Network Connectivity Test
    console.log('🌐 Testing network connectivity...');
    try {
      const testUrl = 'https://exp.host/--/api/v2/push/send';
      const connectivityTest = await fetch(testUrl, {
        method: 'HEAD',
        timeout: 5000
      });
      
      results.connectivity = {
        expoService: connectivityTest.ok,
        status: connectivityTest.status
      };
      
      if (!connectivityTest.ok) {
        results.issues.push('EXPO_SERVICE_UNREACHABLE');
        results.fixes.push('Check internet connection and firewall settings');
      }
    } catch (networkError) {
      results.connectivity = {
        expoService: false,
        error: networkError.message
      };
      results.issues.push('NETWORK_ERROR');
    }

    // 7. Test Notification Send
    if (results.tokens.final && results.connectivity.expoService) {
      console.log('🔔 Testing notification send...');
      try {
        const testResult = await this.sendEnhancedTestNotification(results.tokens.final);
        results.testNotification = testResult;
        
        if (testResult.success) {
          console.log('✅ Test notification sent successfully');
        } else {
          results.issues.push('TEST_NOTIFICATION_FAILED');
          results.fixes.push('Check Expo push service status and token validity');
        }
      } catch (testError) {
        results.testNotification = {
          success: false,
          error: testError.message
        };
        results.issues.push('TEST_NOTIFICATION_ERROR');
      }
    }

    // 8. Schedule Local Test Notification
    try {
      console.log('📅 Scheduling local test notification...');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ QTalk Notification Test',
          body: 'Local notifications are working! You should see this in 3 seconds.',
          data: { type: 'local_test' },
          sound: 'default'
        },
        trigger: { seconds: 3 },
      });
      results.localNotification = { scheduled: true };
    } catch (localError) {
      results.localNotification = {
        scheduled: false,
        error: localError.message
      };
      results.issues.push('LOCAL_NOTIFICATION_FAILED');
    }

    // 9. Overall Assessment
    results.success = results.issues.length === 0;
    
    if (results.success) {
      console.log('🎉 All notification tests passed!');
    } else {
      console.log('⚠️ Issues found:', results.issues);
      console.log('🔧 Suggested fixes:', results.fixes);
    }

    return results;
  }

  static async sendEnhancedTestNotification(pushToken) {
    const message = {
      to: pushToken,
      sound: 'default',
      title: '🎉 QTalk Test Notification',
      body: 'Great! Push notifications are working correctly.',
      data: { 
        type: 'diagnostic_test',
        timestamp: new Date().toISOString(),
        source: 'troubleshoot'
      },
      priority: 'high',
      channelId: 'default',
      badge: 1,
      android: {
        channelId: 'default',
        sound: 'default',
        priority: 'max',
        vibrate: [0, 250, 250, 250]
      },
      ios: {
        sound: 'default',
        badge: 1
      }
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        result: result,
        hasErrors: result.data?.some(item => item.status === 'error')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Quick fixes for common issues
  static async applyCommonFixes() {
    console.log('🔧 Applying common notification fixes...');
    
    const fixes = [];
    
    try {
      // Fix 1: Clear notification cache
      await AsyncStorage.removeItem('expoPushToken');
      fixes.push('Cleared cached push token');
      
      // Fix 2: Cancel all pending notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      fixes.push('Cleared pending notifications');
      
      // Fix 3: Reset notification settings
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'QTalk Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        fixes.push('Reset Android notification channel');
      }
      
      // Fix 4: Request fresh permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true
        }
      });
      
      fixes.push(`Permission status: ${status}`);
      
      return { success: true, fixes };
    } catch (error) {
      return { success: false, error: error.message, fixes };
    }
  }
}

export default NotificationTroubleshoot;
