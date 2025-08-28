import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useAuth } from '../context/authContext';
import { blurhash } from '../utils/common';
import Loading from './Loading';

export default function Profile({ visible, onClose }) {
    const { user, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const usernameRef = useRef(user?.username || "");
    const profileUrlRef = useRef(user?.profileUrl || "");
    const passwordRef = useRef("");
    const confirmPasswordRef = useRef("");

    // Responsive dimensions
    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;
    const isSmallScreen = screenHeight < 700;
    const isNarrowScreen = screenWidth < 350;
    
    // Dynamic sizing based on screen size
    const headerHeight = isSmallScreen ? hp(8) : hp(10);
    const profileImageSize = isSmallScreen ? hp(12) : isNarrowScreen ? hp(10) : hp(15);
    const inputHeight = isSmallScreen ? hp(6) : hp(6);
    const fontSize = isSmallScreen ? hp(1.6) : hp(1.9);
    const paddingHorizontal = isNarrowScreen ? wp(4) : wp(6);

    const handleSave = async () => {
        if (!usernameRef.current.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        if (passwordRef.current && passwordRef.current !== confirmPasswordRef.current) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (passwordRef.current && passwordRef.current.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        
        const updateData = {
            username: usernameRef.current.trim(),
            profileUrl: profileUrlRef.current.trim()
        };

        if (passwordRef.current) {
            updateData.password = passwordRef.current;
        }

        try {
            const result = await updateProfile(updateData);
            if (result.success) {
                Alert.alert('Success', 'Profile updated successfully');
                setEditMode(false);
                passwordRef.current = "";
                confirmPasswordRef.current = "";
            } else {
                Alert.alert('Error', result.msg || 'Failed to update profile');
            }
        } catch (_error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        usernameRef.current = user?.username || "";
        profileUrlRef.current = user?.profileUrl || "";
        passwordRef.current = "";
        confirmPasswordRef.current = "";
        setEditMode(false);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-telegram-lighter">
                <StatusBar barStyle="light-content" backgroundColor="#0088CC" />
                
                {/* Header */}
                <View 
                    style={{ 
                        paddingTop: Platform.OS === 'ios' ? hp(6.5) : hp(4),
                        paddingBottom: hp(1.5),
                        backgroundColor: '#0088CC',
                        minHeight: headerHeight,
                        paddingHorizontal
                    }}
                    className="justify-end"
                >
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity 
                            onPress={onClose} 
                            className="p-2"
                            style={{ minWidth: wp(10), minHeight: wp(10) }}
                        >
                            <Ionicons name="close" size={isSmallScreen ? hp(2.5) : hp(3)} color="white" />
                        </TouchableOpacity>
                        
                        <Text 
                            className="text-white font-medium text-center flex-1"
                            style={{ fontSize: isSmallScreen ? hp(2) : hp(2.2) }}
                        >
                            Profile
                        </Text>
                        
                        {editMode ? (
                            <View className="flex-row items-center" style={{ minWidth: wp(20) }}>
                                <TouchableOpacity 
                                    onPress={handleCancel} 
                                    className="p-2 mr-2"
                                    style={{ minHeight: wp(10) }}
                                >
                                    <Text 
                                        className="text-white font-medium"
                                        style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={handleSave} 
                                    className="p-2"
                                    style={{ minHeight: wp(10) }}
                                >
                                    <Text 
                                        className="text-white font-medium"
                                        style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                    >
                                        Save
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                onPress={() => setEditMode(true)} 
                                className="p-2"
                                style={{ minWidth: wp(10), minHeight: wp(10) }}
                            >
                                <Feather 
                                    name="edit-3" 
                                    size={isSmallScreen ? hp(2) : hp(2.5)} 
                                    color="white" 
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Scrollable Content */}
                <ScrollView 
                    className="flex-1" 
                    style={{ paddingHorizontal }}
                    contentContainerStyle={{ 
                        paddingVertical: isSmallScreen ? hp(3) : hp(4),
                        paddingBottom: hp(10) // Extra bottom padding for keyboard
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Profile Picture */}
                    <View className="items-center" style={{ marginBottom: isSmallScreen ? hp(4) : hp(6) }}>
                        <View 
                            style={{
                                width: profileImageSize,
                                height: profileImageSize,
                                borderRadius: profileImageSize / 2,
                                backgroundColor: 'rgba(0, 136, 204, 0.1)',
                                overflow: 'hidden',
                                marginBottom: hp(2),
                                elevation: 3,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                            }}
                        >
                            <Image
                                source={{ 
                                    uri: (editMode ? profileUrlRef.current : user?.profileUrl) || 
                                         "https://picsum.photos/seed/696/300/300" 
                                }}
                                placeholder={{ blurhash }}
                                contentFit="cover"
                                transition={500}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </View>
                        
                        {editMode && (
                            <TouchableOpacity 
                                className="bg-telegram-primary rounded-full"
                                style={{ 
                                    paddingHorizontal: wp(6), 
                                    paddingVertical: hp(1),
                                    minHeight: hp(4.5)
                                }}
                                onPress={() => Alert.alert('Feature Coming Soon', 'Image picker functionality will be added')}
                            >
                                <Text 
                                    className="text-white font-medium text-center"
                                    style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                >
                                    Change Photo
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Profile Fields */}
                    <View style={{ gap: isSmallScreen ? hp(3) : hp(4) }}>
                        {/* Username */}
                        <View>
                            <Text 
                                className="text-telegram-textLight mb-2 font-medium"
                                style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                            >
                                Username
                            </Text>
                            {editMode ? (
                                <TextInput
                                    defaultValue={user?.username}
                                    onChangeText={value => usernameRef.current = value}
                                    style={{ 
                                        height: inputHeight,
                                        fontSize,
                                        borderRadius: 12,
                                        paddingHorizontal: wp(4),
                                        backgroundColor: '#F8F9FA',
                                        borderWidth: 1,
                                        borderColor: '#E9ECEF',
                                        textAlignVertical: 'center'
                                    }}
                                    className="text-telegram-text"
                                    placeholder="Enter username"
                                />
                            ) : (
                                <View 
                                    style={{ 
                                        height: inputHeight,
                                        justifyContent: 'center',
                                        paddingHorizontal: wp(4),
                                        backgroundColor: '#F8F9FA',
                                        borderRadius: 12
                                    }}
                                >
                                    <Text style={{ fontSize }} className="text-telegram-text">
                                        {user?.username || 'Not set'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Email */}
                        <View>
                            <Text 
                                className="text-telegram-textLight mb-2 font-medium"
                                style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                            >
                                Email
                            </Text>
                            <View 
                                style={{ 
                                    height: inputHeight,
                                    justifyContent: 'center',
                                    paddingHorizontal: wp(4),
                                    backgroundColor: '#F8F9FA',
                                    borderRadius: 12
                                }}
                            >
                                <Text style={{ fontSize }} className="text-telegram-textLight">
                                    {user?.email || 'Not available'}
                                </Text>
                            </View>
                        </View>

                        {/* Profile URL */}
                        {editMode && (
                            <View>
                                <Text 
                                    className="text-telegram-textLight mb-2 font-medium"
                                    style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                >
                                    Profile Picture URL
                                </Text>
                                <TextInput
                                    defaultValue={user?.profileUrl}
                                    onChangeText={value => profileUrlRef.current = value}
                                    style={{ 
                                        height: inputHeight,
                                        fontSize,
                                        borderRadius: 12,
                                        paddingHorizontal: wp(4),
                                        backgroundColor: '#F8F9FA',
                                        borderWidth: 1,
                                        borderColor: '#E9ECEF',
                                        textAlignVertical: 'center'
                                    }}
                                    className="text-telegram-text"
                                    placeholder="Enter image URL"
                                    multiline={false}
                                />
                            </View>
                        )}

                        {/* Password Change */}
                        {editMode && (
                            <>
                                <View>
                                    <Text 
                                        className="text-telegram-textLight mb-2 font-medium"
                                        style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                    >
                                        New Password (Optional)
                                    </Text>
                                    <TextInput
                                        onChangeText={value => passwordRef.current = value}
                                        style={{ 
                                            height: inputHeight,
                                            fontSize,
                                            borderRadius: 12,
                                            paddingHorizontal: wp(4),
                                            backgroundColor: '#F8F9FA',
                                            borderWidth: 1,
                                            borderColor: '#E9ECEF',
                                            textAlignVertical: 'center'
                                        }}
                                        className="text-telegram-text"
                                        placeholder="Enter new password"
                                        secureTextEntry
                                    />
                                </View>

                                <View>
                                    <Text 
                                        className="text-telegram-textLight mb-2 font-medium"
                                        style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                                    >
                                        Confirm New Password
                                    </Text>
                                    <TextInput
                                        onChangeText={value => confirmPasswordRef.current = value}
                                        style={{ 
                                            height: inputHeight,
                                            fontSize,
                                            borderRadius: 12,
                                            paddingHorizontal: wp(4),
                                            backgroundColor: '#F8F9FA',
                                            borderWidth: 1,
                                            borderColor: '#E9ECEF',
                                            textAlignVertical: 'center'
                                        }}
                                        className="text-telegram-text"
                                        placeholder="Confirm new password"
                                        secureTextEntry
                                    />
                                </View>
                            </>
                        )}
                    </View>

                    {/* User Info */}
                    {!editMode && (
                        <View 
                            className="border-t border-telegram-separator"
                            style={{ 
                                marginTop: isSmallScreen ? hp(4) : hp(6), 
                                paddingTop: isSmallScreen ? hp(3) : hp(4) 
                            }}
                        >
                            {/* <Text 
                                className="text-telegram-textLight mb-4 font-medium"
                                style={{ fontSize: isSmallScreen ? hp(1.6) : hp(1.8) }}
                            >
                                Account Information
                            </Text> */}
                            {/* <View style={{ gap: hp(1.5) }}>
                                <Text 
                                    className="text-telegram-textLight"
                                    style={{ fontSize: isSmallScreen ? hp(1.4) : hp(1.6) }}
                                >
                                    User ID: {user?.userId || user?.uid || 'Unknown'}
                                </Text>
                                <Text 
                                    className="text-telegram-textLight"
                                    style={{ fontSize: isSmallScreen ? hp(1.4) : hp(1.6) }}
                                >
                                    Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                </Text>
                            </View> */}
                        </View>
                    )}
                </ScrollView>

                {/* Loading Overlay */}
                {loading && (
                    <View 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 999
                        }}
                    >
                        <Loading size={isSmallScreen ? hp(6) : hp(8)} />
                    </View>
                )}
            </View>
        </Modal>
    );
}
