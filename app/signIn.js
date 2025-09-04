import { useAuth } from '@/context/authContext';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Loading from '../components/Loading';

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Use state instead of refs for better control
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Sign In', "Please fill all the fields!");
      return;
    }

    setLoading(true);
    try {
      const response = await login(trimmedEmail, trimmedPassword);
      setLoading(false);
      
      console.log('Sign in response:', response);
      if (!response.success) {
        Alert.alert('Sign In Failed', response.msg || 'Login failed');
      }
      // Success is handled by auth state change
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      Alert.alert('Sign In Failed', 'An unexpected error occurred. Please try again.');
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8f9fa' }}>
      <StatusBar style="dark" />

      <View style={{ paddingTop: hp(8), paddingHorizontal: wp(5) }} className="flex-1 gap-12">
        {/* Logo */}
        <View className="items-center">
          <View 
            style={{
              width: hp(18),
              height: hp(18),
              borderRadius: hp(9),
              backgroundColor: 'rgba(0, 136, 204, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <Image style={{ height: hp(12) }} resizeMode="contain" source={require('../assets/images/qtalk-logo.png')} />
          </View>
          <Text 
            style={{ 
              fontSize: hp(2.2), 
              color: '#6c757d', 
              fontWeight: '500',
              textAlign: 'center',
              letterSpacing: 0.5
            }}
          >
            Welcome back to QTalk
          </Text>
        </View>

        <View className="gap-10">
          <Text 
            style={{ 
              fontSize: hp(3.2), 
              fontWeight: '700', 
              textAlign: 'center', 
              color: '#2c3e50',
              letterSpacing: 0.3
            }}
          >
            Sign In
          </Text>
          
          {/* Inputs */}
          <View className="gap-5">
            <View 
              style={{ 
                height: hp(7.2),
                backgroundColor: 'white',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: 'rgba(0, 136, 204, 0.1)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 3,
              }} 
              className="flex-row gap-4 px-4 items-center"
            >
              <View 
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0, 136, 204, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Octicons name="mail" size={hp(2.2)} color="#0088CC" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={{ 
                  fontSize: hp(1.9), 
                  flex: 1, 
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
                placeholder="Enter your email address"
                placeholderTextColor={'#95a5a6'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="gap-4">
              <View 
                style={{ 
                  height: hp(7.2),
                  backgroundColor: 'white',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: 'rgba(0, 136, 204, 0.1)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 3,
                }} 
                className="flex-row gap-4 px-4 items-center"
              >
                <View 
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(0, 136, 204, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Octicons name="lock" size={hp(2.2)} color="#0088CC" />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={{ 
                    fontSize: hp(1.9), 
                    flex: 1, 
                    color: '#2c3e50',
                    fontWeight: '500'
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={'#95a5a6'}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity 
                style={{ alignSelf: 'flex-end', padding: 4 }}
                activeOpacity={0.7}
              >
                <Text 
                  style={{ 
                    fontSize: hp(1.7), 
                    fontWeight: '600', 
                    color: '#0088CC'
                  }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <View className="items-center" style={{ position: 'relative', marginTop: 12 }}>
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
                  height: hp(6.8),
                  paddingHorizontal: 48,
                  borderRadius: 18,
                  backgroundColor: '#0088CC',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#0088CC',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                  opacity: loading ? 0 : 1
                }}
                activeOpacity={0.9}
              >
                <Text 
                  style={{ 
                    fontSize: hp(2.1), 
                    color: 'white', 
                    fontWeight: '700',
                    letterSpacing: 0.5
                  }}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Sign Up text */}
            <View className="items-center" style={{ marginTop: hp(3) }}>
              <View className="flex-row justify-center items-center">
                <Text 
                  style={{ 
                    fontSize: hp(1.8), 
                    fontWeight: '500', 
                    color: '#6c757d'
                  }}
                >
                  Don&apos;t have an account? 
                </Text>
                <Pressable 
                  onPress={() => {
                    console.log('🔴 Sign Up button pressed - navigating to /signUp');
                    try {
                      router.push('/signUp');
                      console.log('✅ Navigation to /signUp initiated');
                    } catch (error) {
                      console.error('❌ Navigation error:', error);
                    }
                  }} 
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  android_ripple={{ color: 'rgba(0, 136, 204, 0.1)' }}
                >
                  <Text 
                    style={{ 
                      fontSize: hp(1.8), 
                      fontWeight: '700', 
                      color: '#0088CC'
                    }}
                  >
                    Sign Up
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}