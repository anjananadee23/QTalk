import { Stack } from 'expo-router'
import React from 'react'
import HomeHeader from './../../components/HomeHeader'

export default function _layout() {
  return (
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
  )
}