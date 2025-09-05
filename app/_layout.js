import { AuthContextProvider, useAuth } from '@/context/authContext';
import * as Linking from 'expo-linking';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import '../global.css';
import databaseService from '../utils/database';
import notificationService from '../utils/notificationService';
import syncService from '../utils/syncService';

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize database and sync service for standalone APK
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing app for standalone APK...');
        
        // Initialize database first
        await databaseService.init();
        console.log('✅ Database initialized');
        
        // Initialize sync service
        await syncService.initialize();
        console.log('✅ Sync service initialized');
        
        // If user is authenticated, perform initial data sync
        if (isAuthenticated && isAuthenticated.userId) {
          console.log('🔄 Starting initial sync for offline access...');
          // This will ensure all past messages are available offline
          await syncService.fullSyncForUser(isAuthenticated.userId);
          console.log('✅ Initial sync completed');
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        // Continue even if sync fails to ensure app works offline
      }
    };

    initializeApp();
  }, [isAuthenticated]);

  useEffect(() => {
    // check if user is authenticated
    if (typeof isAuthenticated === 'undefined') return;
    const inApp = segments[0] === '(app)';
    const onAuthPages = segments[0] === 'signIn' || segments[0] === 'signUp';

    console.log('Auth redirect check:', { isAuthenticated, inApp, segments, onAuthPages });

    if (isAuthenticated && !inApp) {
      // redirect to home
      console.log('Redirecting authenticated user to home');
      router.replace('/(app)/home');
    } else if (isAuthenticated === false && !onAuthPages) {
      // Only redirect to signIn if user is not already on auth pages
      console.log('Redirecting unauthenticated user to signIn');
      router.replace('/signIn');
    }
  }, [isAuthenticated, router, segments])

  useEffect(() => {
    // Set up notification listeners when component mounts
    if (isAuthenticated) {
      console.log('🔔 Setting up notification listeners for authenticated user...');
      notificationService.setupNotificationListeners(router);
      
      // Enhanced notification initialization for standalone apps
      const initializeNotificationsOnAppStart = async () => {
        try {
          console.log('🔄 Initializing notifications for standalone app...');
          
          // Force re-registration of push token for standalone apps
          const token = await notificationService.registerForPushNotificationsAsync();
          if (token && isAuthenticated.uid) {
            await notificationService.updateUserPushToken(isAuthenticated.uid, token);
            console.log('✅ Push token initialized on app start');
          } else if (!token) {
            console.log('⚠️ No push token obtained on app start');
            
            // Retry after a delay for standalone apps
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying push token registration...');
                const retryToken = await notificationService.registerForPushNotificationsAsync();
                if (retryToken && isAuthenticated.uid) {
                  await notificationService.updateUserPushToken(isAuthenticated.uid, retryToken);
                  console.log('✅ Push token obtained on retry');
                }
              } catch (retryError) {
                console.error('❌ Push token retry failed:', retryError);
              }
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Error initializing notifications on app start:', error);
        }
      };
      
      initializeNotificationsOnAppStart();
    }

    // Cleanup listeners when component unmounts
    return () => {
      console.log('🧹 Cleaning up notification listeners...');
      notificationService.cleanup();
    };
  }, [isAuthenticated, router]);

  // Handle deep links from notifications
  useEffect(() => {
    const handleDeepLink = (url) => {
      console.log('🔗 Deep link received:', url);
      
      if (url && isAuthenticated) {
        // Parse the URL to extract route information
        const parsedUrl = Linking.parse(url);
        console.log('🔗 Parsed URL:', parsedUrl);
        
        // Handle qtalk:// scheme
        if (parsedUrl.scheme === 'qtalk') {
          if (parsedUrl.path && parsedUrl.path.startsWith('/chat/')) {
            const roomId = parsedUrl.path.replace('/chat/', '');
            // You can extract more parameters from the URL if needed
            console.log('🔗 Navigating to chat room:', roomId);
            
            // Navigate to the specific chat room
            // You'll need to implement logic to get user details from roomId
            // For now, we'll navigate to home and let the notification handler take over
            router.push('/(app)/home');
          }
        }
      }
    };

    // Get the initial URL when the app starts
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Listen for incoming links when the app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Only get initial URL if user is authenticated
    if (isAuthenticated) {
      getInitialURL();
    }

    return () => {
      linkingSubscription.remove();
    };
  }, [isAuthenticated, router]);

  return <Slot />
}

export default function RootLayout() {
  return (
    <MenuProvider>
      <AuthContextProvider>
        <MainLayout />
      </AuthContextProvider>
    </MenuProvider>
  )
}