import React from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

const android = Platform.OS === 'android';
const { height: screenHeight } = Dimensions.get('window');

export default function CustomKeyboardView({ children, inChat }) {
    // Responsive keyboard offset based on screen size
    const getKeyboardOffset = () => {
        if (android) {
            return 0; // Android handles this differently
        }
        
        // iOS: Calculate offset based on screen size and type
        if (screenHeight > 800) {
            // Large devices (iPhone 12 Pro Max, etc.)
            return hp(8);
        } else if (screenHeight > 700) {
            // Medium devices (iPhone 12, iPhone 11, etc.)
            return hp(7);
        } else {
            // Smaller devices (iPhone SE, etc.)
            return hp(6);
        }
    };

    let kevConfig = {};
    let ScrollViewConfig = {};

    if(inChat){
        kevConfig = {
            keyboardVerticalOffset: getKeyboardOffset()
        };
        ScrollViewConfig = {
            contentContainerStyle: {flex: 1},
            keyboardShouldPersistTaps: 'handled', // Better keyboard handling
            keyboardDismissMode: 'interactive' // Allow swipe to dismiss
        };
    }

    return (
        <KeyboardAvoidingView
            behavior={android ? 'height' : 'padding'}
            keyboardVerticalOffset={getKeyboardOffset()}
            style={{ flex: 1 }}
            enabled={true}
            {...kevConfig}
        >
            <ScrollView
                style={{ flex: 1 }}
                bounces={false}
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets={android ? false : true} // iOS keyboard handling
                keyboardShouldPersistTaps={inChat ? 'handled' : 'never'}
                {...ScrollViewConfig}
            >
                {
                    children
                }
            </ScrollView>
        </KeyboardAvoidingView>
    )
}