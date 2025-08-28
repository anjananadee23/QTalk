import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function ConnectionStatus() {
    const { isConnected } = useNetworkStatus();

    if (isConnected) {
        return null; // Don't show anything when connected
    }

    return (
        <View 
            className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 flex-row items-center justify-center"
            style={{ 
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
            }}
        >
            <Ionicons name="cloud-offline" size={hp(2)} color="#D97706" />
            <Text 
                style={{ fontSize: hp(1.6) }} 
                className="text-yellow-800 ml-2 font-medium"
            >
                You&apos;re offline - showing cached data
            </Text>
        </View>
    );
}
