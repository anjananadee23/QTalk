import { Stack } from 'expo-router'
import React from 'react'
import { View } from 'react-native'
import HomeHeader from './../../components/HomeHeader'
import NetworkStatus from './../../components/NetworkStatus'

export default function _layout() {
  return (
    <View style={{ flex: 1 }}>
      <NetworkStatus />
      <Stack>
        <Stack.Screen
          name="home"
          options={{
            header: () => <HomeHeader />
          }}
        />
        <Stack.Screen
          name="chatRoom"
          options={{
            headerShown: false
          }}
        />
      </Stack>
    </View>
  )
}