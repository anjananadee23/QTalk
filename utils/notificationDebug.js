import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';

// Debug helper to test notifications step by step
class NotificationDebug {
  static async runFullDiagnostic(userId) {
    console.log('🔍 Starting comprehensive notification diagnostic...');
    const results = {
      deviceInfo: {},
      permissions: {},
      token: {},
      firestore: {},
      overall: 'UNKNOWN'
    };

    try {
      // 1. Check device info
      console.log('📱 Checking device information...');
      results.deviceInfo = {
        isDevice: Device.isDevice,
        platform: Platform.OS,
        osVersion: Platform.Version,
        isExpoGo: Constants?.executionEnvironment !== 'standalone',
        appOwnership: Constants?.appOwnership || 'unknown',
        projectId: Constants?.expoConfig?.extra?.eas?.projectId || 'unknown'
      };
      console.log('📱 Device info:', results.deviceInfo);

      // 2. Check permissions
      console.log('🔔 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      results.permissions.current = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting permissions...');
        const { status: requestedStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        results.permissions.requested = requestedStatus;
        results.permissions.final = requestedStatus;
      } else {
        results.permissions.final = existingStatus;
      }
      console.log('🔔 Permissions:', results.permissions);

      // 3. Try to get push token
      console.log('🔄 Attempting to get push token...');
      if (Device.isDevice && results.permissions.final === 'granted') {
        try {
          // Try Expo token first
          let tokenData;
          try {
            tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb'
            });
            results.token.expo = tokenData.data;
            results.token.method = 'expo';
          } catch (expoError) {
            console.log('⚠️ Expo token failed, trying device token...');
            results.token.expoError = expoError.message;
            
            try {
              const deviceToken = await Notifications.getDevicePushTokenAsync();
              results.token.device = deviceToken.data;
              results.token.method = 'device';
            } catch (deviceError) {
              results.token.deviceError = deviceError.message;
            }
          }
          
          const finalToken = results.token.expo || results.token.device;
          if (finalToken) {
            results.token.final = finalToken;
            results.token.preview = finalToken.substring(0, 50) + '...';
            console.log('✅ Token obtained:', results.token.preview);
            
            // Store token
            await AsyncStorage.setItem('expoPushToken', finalToken);
            results.token.stored = true;
          } else {
            results.token.final = null;
            console.log('❌ No token obtained');
          }
        } catch (tokenError) {
          results.token.error = tokenError.message;
          console.error('❌ Token error:', tokenError);
        }
      } else {
        results.token.skipped = 'No device or no permissions';
      }

      // 4. Test Firestore integration
      console.log('🔥 Testing Firestore integration...');
      if (userId && results.token.final) {
        try {
          const userRef = doc(db, 'users', userId);
          
          // Try to update user with token
          await setDoc(userRef, {
            expoPushToken: results.token.final,
            lastTokenUpdate: new Date().toISOString(),
            debugTest: true
          }, { merge: true });
          
          // Verify it was saved
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            results.firestore.tokenSaved = userData.expoPushToken === results.token.final;
            results.firestore.lastUpdate = userData.lastTokenUpdate;
          }
          
          results.firestore.success = true;
          console.log('✅ Firestore test passed');
        } catch (firestoreError) {
          results.firestore.error = firestoreError.message;
          console.error('❌ Firestore error:', firestoreError);
        }
      } else {
        results.firestore.skipped = 'No userId or token';
      }

      // 5. Test sending a notification to self
      console.log('🔔 Testing self notification...');
      if (results.token.final) {
        try {
          const testResult = await this.sendTestNotification(results.token.final);
          results.notification = testResult;
          console.log('✅ Test notification sent:', testResult);
        } catch (notificationError) {
          results.notification = { error: notificationError.message };
          console.error('❌ Test notification error:', notificationError);
        }
      } else {
        results.notification = { skipped: 'No token available' };
      }

      // 6. Overall assessment
      if (results.permissions.final === 'granted' && 
          results.token.final && 
          results.firestore.success) {
        results.overall = 'SUCCESS';
      } else if (results.permissions.final !== 'granted') {
        results.overall = 'PERMISSIONS_DENIED';
      } else if (!results.token.final) {
        results.overall = 'TOKEN_FAILED';
      } else if (!results.firestore.success) {
        results.overall = 'FIRESTORE_FAILED';
      } else {
        results.overall = 'PARTIAL_SUCCESS';
      }

      console.log('🏁 Diagnostic complete. Overall status:', results.overall);
      return results;

    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      results.overall = 'ERROR';
      results.error = error.message;
      return results;
    }
  }

  static async sendTestNotification(pushToken) {
    const message = {
      to: pushToken,
      sound: 'default',
      title: 'QTalk Debug Test',
      body: 'If you see this, notifications are working!',
      data: { 
        type: 'test',
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channelId: 'default',
    };

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
    return { status: response.status, result };
  }

  static async quickTokenCheck() {
    console.log('⚡ Quick token check...');
    
    try {
      // Check stored token
      const stored = await AsyncStorage.getItem('expoPushToken');
      if (stored) {
        console.log('✅ Stored token found:', stored.substring(0, 50) + '...');
        return stored;
      }

      // Try to get new token
      if (Device.isDevice) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb'
            });
            console.log('✅ New Expo token:', tokenData.data.substring(0, 50) + '...');
            await AsyncStorage.setItem('expoPushToken', tokenData.data);
            return tokenData.data;
          } catch (_expoError) {
            console.log('⚠️ Expo token failed, trying device token...');
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            console.log('✅ Device token:', deviceToken.data.substring(0, 50) + '...');
            await AsyncStorage.setItem('expoPushToken', deviceToken.data);
            return deviceToken.data;
          }
        }
      }
      
      console.log('❌ No token available');
      return null;
    } catch (error) {
      console.error('❌ Quick token check error:', error);
      return null;
    }
  }

  static logSystemInfo() {
    console.log('📊 System Information:');
    console.log('  Device:', Device.isDevice ? 'Physical' : 'Simulator');
    console.log('  Platform:', Platform.OS, Platform.Version);
    console.log('  Expo Go:', Constants?.executionEnvironment !== 'standalone');
    console.log('  App Ownership:', Constants?.appOwnership);
    console.log('  Project ID:', Constants?.expoConfig?.extra?.eas?.projectId);
  }
}

export default NotificationDebug;
