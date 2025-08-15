import { View, Text, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import React from 'react'

const android = Platform.OS === 'android';
export default function CustomKeyboardView({ children, inChat }) {
    let kevConfig = {};
    let ScrollViewConfig = {};

    if(inChat){
        kevConfig = {keyboardVerticalOffset: 60};
        ScrollViewConfig = {contentContainerStyle: {flex: 1}};
    }
    return (
        <KeyboardAvoidingView
            behavior={android ? 'height' : 'padding'}
            keyboardVerticalOffset={60}
            style={{ flex: 1 }}
            {...kevConfig}
        >
            <ScrollView
                style={{ flex: 1 }}
                bounces={false}
                showsVerticalScrollIndicator={false}
                {...ScrollViewConfig}
            >
                {
                    children
                }
            </ScrollView>
        </KeyboardAvoidingView>
    )
}