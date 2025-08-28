import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState(true);
    const [networkType, setNetworkType] = useState('UNKNOWN');

    useEffect(() => {
        let isActive = true;

        const checkNetworkStatus = async () => {
            try {
                const networkState = await Network.getNetworkStateAsync();
                
                if (isActive) {
                    setIsConnected(networkState.isConnected && networkState.isInternetReachable);
                    setNetworkType(networkState.type);
                }
            } catch (error) {
                console.error('Error checking network status:', error);
                if (isActive) {
                    setIsConnected(false);
                }
            }
        };

        // Check immediately
        checkNetworkStatus();

        // Set up periodic checks
        const interval = setInterval(checkNetworkStatus, 5000);

        // Cleanup
        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, []);

    return { isConnected, networkType };
}
