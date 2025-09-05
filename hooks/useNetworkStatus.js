import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      setConnectionType(state.type || 'unknown');
      console.log('📶 Initial network state:', { connected, type: state.type });
    });

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      setConnectionType(state.type || 'unknown');
      
      console.log('📶 Network state changed:', { 
        connected, 
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable 
      });
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    connectionType,
    isOnline: isConnected,
    isOffline: !isConnected,
  };
}
