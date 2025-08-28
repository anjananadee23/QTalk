import { useAuth } from '@/context/authContext';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Loading from '../components/Loading';

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const emailRef = useRef("");
  const passwordRef = useRef("");

  const handleLogin = async () => {
    if (!emailRef.current || !passwordRef.current) {
      Alert.alert('Sign In', "Please fill all the fields!");
      return;
    }

    setLoading(true);
    const response = await login(emailRef.current, passwordRef.current);
    setLoading(false);
    console.log('sign in response:', response);
    if (!response.success) {
      Alert.alert('Sign In', response.msg);
      return;
    }
  }

  return (
    <View className="flex-1 bg-telegram-lighter">
      <StatusBar style="dark" />

      <View style={{ paddingTop: hp(8), paddingHorizontal: wp(5) }} className="flex-1 gap-12">
        {/* Logo */}
        <View className="items-center">
          <Image style={{ height: hp(15) }} resizeMode="contain" source={require('../assets/images/qtalk-logo.png')} />
        </View>

        <View className="gap-10">
          <Text style={{ fontSize: hp(4) }} className="font-medium tracking-wide text-center text-telegram-text">Sign In</Text>
          {/* Inputs */}
          <View className="gap-4">

            <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-white items-center rounded-xl border border-telegram-separator">
              <Octicons name="mail" size={hp(2.7)} color="#0088CC" />
              <TextInput
                onChangeText={value => emailRef.current = value}
                style={{ fontSize: hp(2) }}
                className="flex-1 font-medium text-telegram-text"
                placeholder="Email Address"
                placeholderTextColor={'#999999'}
              />
            </View>

            <View className="gap-4">
              <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-white items-center rounded-xl border border-telegram-separator">
                <Octicons name="lock" size={hp(2.7)} color="#0088CC" />
                <TextInput
                  onChangeText={value => passwordRef.current = value}
                  style={{ fontSize: hp(2) }}
                  className="flex-1 font-medium text-telegram-text"
                  placeholder="Password"
                  placeholderTextColor={'#999999'}
                  secureTextEntry
                />
              </View>
              <Text style={{ fontSize: hp(1.8) }} className="font-medium text-right text-telegram-textLight">Forgot Password?</Text>
            </View>

            {/* Sign In Button */}
            <View className="items-center" style={{ position: 'relative' }}>
              {
                loading ? (
                  <View style={{
                    position: 'absolute',
                    top: -hp(3),
                    zIndex: 10,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Loading size={hp(18)} />
                  </View>
                ) : null
              }
              <TouchableOpacity
                onPress={handleLogin}
                style={{
                  height: hp(6.5),
                  paddingHorizontal: 40,
                  borderRadius: 24,
                  opacity: loading ? 0 : 1
                }}
                className="bg-telegram-primary justify-center items-center"
              >
                <Text style={{ fontSize: hp(2.2) }} className="text-white font-medium tracking-wide">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
            <View className="items-center" style={{ marginBottom: hp(2) }}>

              {/* Sign Up text */}
              <View className="flex-row justify-center" style={{ marginTop: hp(2) }}>
                <Text style={{ fontSize: hp(1.8) }} className="font-medium text-telegram-textLight">Don&apos;t have an account? </Text>
                <Pressable onPress={() => router.push('/signUp')} style={{ paddingHorizontal: 4, paddingVertical: 2 }}>
                  <Text style={{ fontSize: hp(1.8) }} className="font-medium text-telegram-primary">Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}