import AsyncStorage from '@react-native-async-storage/async-storage';
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

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'QTalk Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        // For standalone apps, use the project ID from app.json
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'd29ff267-ab16-4791-b0ad-a56364f397cb'
        });
        
        token = tokenData.data;
        this.expoPushToken = token;
        console.log('✅ Push token obtained:', token);
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('expoPushToken', token);
        
        return token;
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        
        // Fallback: try getting device push token for standalone apps
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          console.log('🔄 Using device push token as fallback:', deviceToken);
          this.expoPushToken = deviceToken.data;
          await AsyncStorage.setItem('expoPushToken', deviceToken.data);
          return deviceToken.data;
        } catch (fallbackError) {
          console.error('❌ Fallback token also failed:', fallbackError);
          return null;
        }
      }
    } else {
      console.log('Must use physical device for Push Notifications');
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
    // Enhanced data for standalone app compatibility
    const enhancedData = {
      ...data,
      url: `qtalk://chat/${data.roomId || 'default'}`,
      experienceId: '@anonymous/qtalk-d29ff267-ab16-4791-b0ad-a56364f397cb',
      scopeKey: '@anonymous/qtalk-d29ff267-ab16-4791-b0ad-a56364f397cb',
    };

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: enhancedData,
      priority: 'high',
      channelId: 'default',
      // Additional properties for better standalone app support
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
      console.log('✅ Push notification sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  // Send message notification to specific user
  async sendMessageNotification(recipientToken, senderName, message, chatData = {}) {
    if (!recipientToken) {
      console.log('⚠️ No push token available for recipient');
      return;
    }

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
      await this.sendPushNotification(recipientToken, title, body, notificationData);
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners(router) {
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      // You can handle in-app notifications here
    });

    // Listener for user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      if (data.type === 'message') {
        // Add a small delay to ensure the app is fully loaded
        setTimeout(() => {
          this.handleMessageNotificationTap(data, router);
        }, 500);
      }
    });
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
