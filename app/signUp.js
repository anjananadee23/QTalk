import { useAuth } from '@/context/authContext';
import { Feather, Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import CustomKeyboardView from '../components/CustomKeyboardView';
import Loading from '../components/Loading';

export default function SignUp() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  // Use state instead of refs for better control
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState('');

  // Test function to populate fields for testing (remove in production)
  const fillTestData = () => {
    const randomNum = Math.floor(Math.random() * 1000);
    setEmail(`testuser${randomNum}@qtalk.com`);
    setPassword('test123456');
    setUsername(`testuser${randomNum}`);
    setProfileUrl(''); // Leave empty to test default avatar generation
  };

  const handleRegister = async () => {
    console.log('📝 handleRegister function called');
    console.log('📋 Current form values:', { 
      email: email, 
      username: username, 
      password: password ? '***' : 'empty', 
      profileUrl: profileUrl
    });

    // Get current values and validate
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();
    const trimmedUsername = username?.trim();
    const trimmedProfileUrl = profileUrl?.trim() || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username?.trim() || 'User') + '&background=0088CC&color=fff&size=200';

    console.log('Attempting to register with:', { 
      email: trimmedEmail, 
      username: trimmedUsername, 
      hasPassword: !!trimmedPassword, 
      profileUrl: trimmedProfileUrl 
    });

    // Validate required fields (profileUrl is now optional with default)
    if (!trimmedEmail || !trimmedPassword || !trimmedUsername) {
      Alert.alert('Sign Up', "Please fill all the required fields!");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Sign Up', "Please enter a valid email address!");
      return;
    }

    // Validate password strength
    if (trimmedPassword.length < 6) {
      Alert.alert('Sign Up', "Password must be at least 6 characters long!");
      return;
    }

    // Validate username
    if (trimmedUsername.length < 3) {
      Alert.alert('Sign Up', "Username must be at least 3 characters long!");
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Starting registration process...');
      let response = await register(trimmedEmail, trimmedPassword, trimmedUsername, trimmedProfileUrl);
      setLoading(false);

      console.log('📋 Registration result: ', response);
      if (!response.success) {
        console.error('❌ Registration failed:', response.msg);
        Alert.alert('Sign Up Failed', response.msg || 'Unknown error occurred');
      } else {
        console.log('✅ Registration successful!');
        Alert.alert(
          'Welcome to QTalk! 🎉', 
          'Your account has been created successfully. You can now sign in and start chatting!', 
          [
            { 
              text: 'Sign In Now', 
              onPress: () => {
                // Clear the form
                setEmail('');
                setPassword('');
                setUsername('');
                setProfileUrl('');
                // Navigate to sign in
                router.push('/signIn');
              }
            }
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('❌ Unexpected registration error:', error);
      Alert.alert(
        'Sign Up Failed', 
        'An unexpected error occurred. Please check your internet connection and try again.\n\nError: ' + (error.message || 'Unknown error')
      );
    }
  }
  return (
    <CustomKeyboardView>
      <StatusBar style="dark" />

      <View style={{ paddingTop: hp(6), paddingHorizontal: wp(5) }} className="flex-1 gap-8" 
            backgroundColor="#f8f9fa">
        {/* Logo */}
        <View className="items-center">
          <View 
            style={{
              width: hp(16),
              height: hp(16),
              borderRadius: hp(8),
              backgroundColor: 'rgba(0, 136, 204, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <Image style={{ height: hp(10) }} resizeMode="contain" source={require('../assets/images/qtalk-logo.png')} />
          </View>
          <Text 
            style={{ 
              fontSize: hp(2), 
              color: '#6c757d', 
              fontWeight: '500',
              textAlign: 'center',
              letterSpacing: 0.3
            }}
          >
            Create your QTalk account
          </Text>
        </View>

        <View className="gap-8">
          <Text 
            style={{ 
              fontSize: hp(3), 
              fontWeight: '700', 
              textAlign: 'center', 
              color: '#2c3e50',
              letterSpacing: 0.3
            }}
          >
            Sign Up
          </Text>
          
          <Text 
            style={{ 
              fontSize: hp(1.6), 
              color: '#6c757d', 
              textAlign: 'center',
              marginTop: -16,
              lineHeight: hp(2.2)
            }}
          >
            Join QTalk and start connecting with people instantly
          </Text>
          
          {/* Inputs */}
          <View className="gap-4">
            {/* Username */}
            <View 
              style={{ 
                height: hp(6.8),
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
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0, 136, 204, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Feather name="user" size={hp(2)} color="#0088CC" />
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={{ 
                  fontSize: hp(1.8), 
                  flex: 1, 
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
                placeholder="Choose a username"
                placeholderTextColor={'#95a5a6'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Email */}
            <View 
              style={{ 
                height: hp(6.8),
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
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0, 136, 204, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Octicons name="mail" size={hp(2)} color="#0088CC" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={{ 
                  fontSize: hp(1.8), 
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

            {/* Password */}
            <View 
              style={{ 
                height: hp(6.8),
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
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0, 136, 204, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Octicons name="lock" size={hp(2)} color="#0088CC" />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={{ 
                  fontSize: hp(1.8), 
                  flex: 1, 
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
                placeholder="Create a secure password"
                placeholderTextColor={'#95a5a6'}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Profile URL */}
            <View 
              style={{ 
                height: hp(6.8),
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
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0, 136, 204, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Feather name="image" size={hp(2)} color="#0088CC" />
              </View>
              <TextInput
                value={profileUrl}
                onChangeText={setProfileUrl}
                style={{ 
                  fontSize: hp(1.8), 
                  flex: 1, 
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
                placeholder="Profile picture URL (optional)"
                placeholderTextColor={'#95a5a6'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Test Data Button - for development */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={fillTestData}
                style={{
                  height: hp(4),
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: '#6c757d',
                  justifyContent: 'center',
                  alignItems: 'center',
                  alignSelf: 'center',
                  marginTop: 8
                }}
                activeOpacity={0.8}
              >
                <Text 
                  style={{ 
                    fontSize: hp(1.5), 
                    color: 'white', 
                    fontWeight: '600'
                  }}
                >
                  Fill Test Data
                </Text>
              </TouchableOpacity>
            )}

            {/* Sign Up Button */}
            <View className="items-center" style={{ position: 'relative', marginTop: 16 }}>
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
                onPress={() => {
                  console.log('🚀 Sign Up button pressed!');
                  Alert.alert('Debug', 'Button pressed!');
                  handleRegister();
                }}
                style={{
                  height: hp(6.5),
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
                  opacity: loading ? 0.5 : 1
                }}
                activeOpacity={0.9}
                disabled={loading}
              >
                <Text 
                  style={{ 
                    fontSize: hp(2), 
                    color: 'white', 
                    fontWeight: '700',
                    letterSpacing: 0.5
                  }}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Sign In text */}
            <View className="items-center" style={{ marginTop: hp(2) }}>
              <View className="flex-row justify-center items-center">
                <Text 
                  style={{ 
                    fontSize: hp(1.7), 
                    fontWeight: '500', 
                    color: '#6c757d'
                  }}
                >
                  Already have an account? 
                </Text>
                <Pressable 
                  onPress={() => {
                    console.log('🔵 Sign In button pressed - navigating to /signIn');
                    try {
                      router.push('/signIn');
                      console.log('✅ Navigation to /signIn initiated');
                    } catch (error) {
                      console.error('❌ Navigation error:', error);
                    }
                  }} 
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  android_ripple={{ color: 'rgba(0, 136, 204, 0.1)' }}
                >
                  <Text 
                    style={{ 
                      fontSize: hp(1.7), 
                      fontWeight: '700', 
                      color: '#0088CC'
                    }}
                  >
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  );
}