import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { AppState, Platform } from 'react-native';
import { db } from '../firebaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.currentChatRoomId = null; // Track current chat room to avoid duplicate notifications
    this.appState = AppState.currentState; // Track app state
    this.setupAppStateListener();
  }

  // Set up app state listener to track when app goes to background/foreground
  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      console.log('🔄 App state changed:', this.appState, '->', nextAppState);
      this.appState = nextAppState;
    });
  }

  // Set current chat room ID to prevent notifications when user is in that chat
  setCurrentChatRoom(roomId) {
    this.currentChatRoomId = roomId;
  }

  // Clear current chat room
  clearCurrentChatRoom() {
    this.currentChatRoomId = null;
  }

  // Request permissions and get push token
  async registerForPushNotificationsAsync() {
    let token;

    console.log('🔄 Starting push token registration...');

    if (Platform.OS === 'android') {
      console.log('📱 Setting up Android notification channels...');
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
        bypassDnd: false, // Don't bypass Do Not Disturb by default
      });
      
      // Create additional channel for high priority messages
      await Notifications.setNotificationChannelAsync('high_priority', {
        name: 'QTalk High Priority',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        bypassDnd: false,
      });
      
      console.log('✅ Android notification channels configured');
    }

    if (Device.isDevice) {
      console.log('📱 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('🔔 Current permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: false, // Don't request critical alerts unless needed
            allowProvisional: false,   // Use explicit permission request
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          }
        });
        finalStatus = status;
        console.log('🔔 New permission status:', finalStatus);
        
        if (finalStatus !== 'granted') {
          console.log('❌ Notification permission request result:', finalStatus);
        }
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permissions denied');
        return null;
      }
      
      try {
        console.log('🔄 Getting Expo push token...');
        
        // Check if we're in Expo Go or standalone app
        const isExpoGo = Constants?.executionEnvironment === 'standalone' ? false : true;
        
        let tokenData;
        if (isExpoGo) {
          // For Expo Go development
          console.log('📱 Running in Expo Go - using development token');
          tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb'
          });
        } else {
          // For standalone apps
          console.log('📱 Running in standalone app');
          try {
            // Try Expo push token first
            tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb',
              applicationId: 'com.malith.qtalk'
            });
          } catch (expoError) {
            console.log('⚠️ Expo push token failed, trying device token:', expoError.message);
            // Use device push token for standalone
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            tokenData = { data: deviceToken.data };
          }
        }
        
        token = tokenData.data;
        this.expoPushToken = token;
        console.log('✅ Push token obtained:', token ? `${token.substring(0, 50)}...` : 'null');
        
        // Validate token format
        if (token) {
          const isValidExpoToken = token.startsWith('ExponentPushToken[');
          const isValidFCMToken = token.length > 100; // FCM tokens are typically longer
          
          if (!isValidExpoToken && !isValidFCMToken) {
            console.log('⚠️ Token format might be invalid:', token.substring(0, 20));
          }
          
          // Store token in AsyncStorage with timestamp
          await AsyncStorage.setItem('expoPushToken', token);
          await AsyncStorage.setItem('tokenTimestamp', new Date().toISOString());
          console.log('✅ Push token stored in AsyncStorage with timestamp');
        }
        
        return token;
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        console.error('Error details:', error.code, error.message);
        
        // Enhanced fallback for standalone apps
        try {
          console.log('🔄 Trying device push token as fallback...');
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          
          if (deviceToken && deviceToken.data) {
            console.log('✅ Device push token obtained:', deviceToken.data.substring(0, 50) + '...');
            this.expoPushToken = deviceToken.data;
            await AsyncStorage.setItem('expoPushToken', deviceToken.data);
            return deviceToken.data;
          } else {
            console.log('❌ Device token is null or invalid');
            return null;
          }
        } catch (fallbackError) {
          console.error('❌ Device token fallback also failed:', fallbackError);
          return null;
        }
      }
    } else {
      console.log('❌ Must use physical device for Push Notifications');
      return null;
    }
  }

  // Update user's push token in Firestore
  async updateUserPushToken(userId, token) {
    try {
      if (!token) return;
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: token,
        lastTokenUpdate: new Date().toISOString()
      });
      
      console.log('✅ Push token updated in Firestore for user:', userId);
    } catch (error) {
      console.error('❌ Error updating push token in Firestore:', error);
    }
  }

  // Get stored push token
  async getStoredPushToken() {
    try {
      const token = await AsyncStorage.getItem('expoPushToken');
      this.expoPushToken = token;
      return token;
    } catch (error) {
      console.error('❌ Error getting stored push token:', error);
      return null;
    }
  }

  // Send push notification
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    if (!expoPushToken) {
      console.error('❌ No push token provided for notification');
      return null;
    }

    console.log('🔔 Preparing push notification:', {
      token: expoPushToken.substring(0, 50) + '...',
      title,
      body: body.substring(0, 50) + '...',
      data
    });

    // Check if this is an Expo push token or device token
    const isExpoToken = expoPushToken.startsWith('ExponentPushToken[');
    
    // Enhanced data for better compatibility
    const enhancedData = {
      ...data,
      url: `qtalk://chat/${data.roomId || 'default'}`,
      timestamp: new Date().toISOString(),
    };

    // Different message format based on token type
    const message = isExpoToken ? {
      // Expo push token format
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: enhancedData,
      priority: 'high',
      channelId: 'default',
      badge: 1,
      android: {
        channelId: 'default',
        sound: 'default',
        priority: 'max',
        vibrate: [0, 250, 250, 250],
      },
      ios: {
        sound: 'default',
        badge: 1,
      },
    } : {
      // Device token format (for standalone apps)
      to: expoPushToken,
      notification: {
        title: title,
        body: body,
        sound: 'default',
      },
      data: enhancedData,
      priority: 'high',
      android: {
        notification: {
          channelId: 'default',
          sound: 'default',
          priority: 'max',
          vibrate: [0, 250, 250, 250],
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          }
        }
      }
    };

    try {
      console.log('🔔 Sending notification with message format:', isExpoToken ? 'Expo' : 'FCM');
      
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
      
      if (response.ok) {
        console.log('✅ Push notification sent successfully:', result);
        
        // Check for any errors in the response
        if (result.data && Array.isArray(result.data)) {
          const errorResult = result.data.find(item => item.status === 'error');
          if (errorResult) {
            console.error('❌ Notification error:', errorResult.message, errorResult.details);
          }
        }
      } else {
        console.error('❌ Push notification failed:', response.status, result);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      
      // Try alternative FCM endpoint for device tokens
      if (!isExpoToken) {
        try {
          console.log('🔄 Retrying with alternative endpoint...');
          // You can add FCM direct API call here if needed
          console.log('⚠️ Alternative endpoint not implemented yet');
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
        }
      }
      
      throw error;
    }
  }

  // Send message notification to specific user
  async sendMessageNotification(recipientToken, senderName, message, chatData = {}) {
    if (!recipientToken) {
      console.log('⚠️ No push token available for recipient');
      return;
    }

    // Check if user is currently in this chat room and app is in foreground
    if (this.currentChatRoomId === chatData.roomId && this.appState === 'active') {
      console.log('🔇 User is in current chat room, skipping notification');
      return;
    }

    console.log('🔔 Preparing to send message notification:');
    console.log('  - Recipient token:', recipientToken.substring(0, 50) + '...');
    console.log('  - Sender:', senderName);
    console.log('  - Message preview:', message.substring(0, 30) + '...');
    console.log('  - Chat data:', chatData);
    console.log('  - Current chat room:', this.currentChatRoomId);
    console.log('  - App state:', this.appState);

    const title = `New message from ${senderName}`;
    const body = message.length > 50 ? message.substring(0, 47) + '...' : message;
    
    const notificationData = {
      type: 'message',
      senderId: chatData.senderId,
      senderName: senderName,
      roomId: chatData.roomId,
      userId: chatData.userId, // recipient's user ID
      isTemporary: chatData.isTemporary || false,
      tempChatId: chatData.tempChatId || null,
      timestamp: new Date().toISOString()
    };

    try {
      console.log('🔔 Sending push notification...');
      const result = await this.sendPushNotification(recipientToken, title, body, notificationData);
      console.log('✅ Message notification sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
      throw error;
    }
  }

  // Set up notification listeners
  setupNotificationListeners(router) {
    console.log('🔔 Setting up notification listeners...');
    
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received while app is running:', notification);
      // You can handle in-app notifications here
      // For example, show a banner or update the UI
    });

    // Listener for user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped by user:', response);
      
      const data = response.notification.request.content.data;
      
      if (data.type === 'message') {
        // Add a small delay to ensure the app is fully loaded
        setTimeout(() => {
          this.handleMessageNotificationTap(data, router);
        }, 500);
      }
    });
    
    console.log('✅ Notification listeners set up successfully');
  }

  // Handle when user taps on a message notification
  handleMessageNotificationTap(data, router) {
    try {
      console.log('📱 Handling message notification tap:', data);
      
      // Navigate to the specific chat room
      const chatParams = {
        userId: data.senderId,
        username: data.senderName,
      };

      // Add profile URL if available
      if (data.senderProfileUrl) {
        chatParams.profileUrl = data.senderProfileUrl;
      }

      // If it's a temporary chat, include temp chat data
      if (data.isTemporary && data.tempChatId) {
        chatParams.isTemporary = 'true';
        chatParams.tempChatId = data.tempChatId;
      }

      // Navigate to chat room using Expo Router
      router.push({
        pathname: '/(app)/chatRoom',
        params: chatParams
      });
      
    } catch (error) {
      console.error('❌ Error handling notification tap:', error);
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Schedule local notification (for testing)
  async scheduleLocalNotification(title, body, seconds = 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { type: 'local' },
      },
      trigger: { seconds: seconds },
    });
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get notification permissions status
  async getNotificationPermissionsStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
