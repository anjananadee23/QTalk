import LottieView from 'lottie-react-native';
import React from 'react';
import { View } from 'react-native';

export default function Loading({ size = 50 }) {
    return (
        <View style={{ height: size, width: size }}>
            <LottieView
                style={{ width: size, height: size }}
                source={require('../assets/animations/loading.json')}
                autoPlay
                loop
                resizeMode="contain"
            />
        </View>
    );
}