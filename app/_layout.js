import { AuthContextProvider, useAuth } from '@/context/authContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import '../global.css';

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // check if user is authenticated
    if (typeof isAuthenticated === 'undefined') return;
    const inApp = segments[0] === '(app)';

    if (isAuthenticated && !inApp) {
      // redirect to home
      router.replace('/(app)/home');
    } else if (isAuthenticated === false) {
      router.replace('/signIn');
    }
  }, [isAuthenticated])

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