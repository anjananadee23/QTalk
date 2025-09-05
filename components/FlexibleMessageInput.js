import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Keyboard,
    Platform,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const android = Platform.OS === 'android';
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function FlexibleMessageInput({ 
    onSendMessage, 
    placeholder = "Type a message...",
    disabled = false 
}) {
    const inputRef = useRef(null);
    const textRef = useRef('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [inputHeight, setInputHeight] = useState(0);

    // Adaptive sizing based on device
    const getAdaptiveSizes = () => {
        const isTablet = screenWidth > 768;
        const isSmallDevice = screenHeight < 650;
        const isLargeDevice = screenHeight > 800;

        return {
            containerPadding: {
                horizontal: isTablet ? wp(4) : Math.max(12, wp(3)),
                vertical: isSmallDevice ? hp(0.8) : Math.max(8, hp(1.2)),
            },
            inputContainer: {
                borderRadius: isTablet ? 28 : Math.min(24, hp(3)),
                padding: {
                    horizontal: isTablet ? wp(2.5) : Math.max(12, wp(3)),
                    vertical: isSmallDevice ? hp(0.6) : Math.max(6, hp(0.8)),
                },
                minHeight: Math.max(44, isTablet ? hp(6) : hp(5.5)),
                maxHeight: isLargeDevice ? hp(15) : Math.min(120, hp(12)),
            },
            text: {
                fontSize: isTablet ? hp(2.2) : Math.max(14, hp(1.8)),
                lineHeight: isTablet ? hp(2.8) : Math.max(18, hp(2.2)),
            },
            button: {
                size: isTablet ? hp(5.5) : Math.max(40, hp(4.5)),
                iconSize: isTablet ? hp(2.5) : Math.max(16, hp(2)),
            }
        };
    };

    const sizes = getAdaptiveSizes();

    useEffect(() => {
        let keyboardDidShowListener, keyboardDidHideListener;
        
        if (android) {
            keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            });
            keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardHeight(0);
            });
        }

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, []);

    const handleSend = () => {
        const message = textRef.current.trim();
        if (message && onSendMessage) {
            onSendMessage(message);
            // Clear input
            textRef.current = '';
            if (inputRef.current) {
                inputRef.current.clear();
            }
        }
    };

    const handleContentSizeChange = (event) => {
        const { height } = event.nativeEvent.contentSize;
        setInputHeight(Math.min(height, sizes.inputContainer.maxHeight));
    };

    return (
        <View 
            style={{
                backgroundColor: '#ffffff',
                borderTopWidth: 1,
                borderTopColor: 'rgba(0, 0, 0, 0.05)',
                paddingHorizontal: sizes.containerPadding.horizontal,
                paddingVertical: sizes.containerPadding.vertical,
                paddingBottom: Math.max(
                    sizes.containerPadding.vertical,
                    android ? keyboardHeight > 0 ? hp(1) : hp(1.5) : hp(1.5)
                ),
                // Safe area handling
                paddingBottom: Platform.select({
                    ios: Math.max(sizes.containerPadding.vertical, hp(2)),
                    android: sizes.containerPadding.vertical + (keyboardHeight > 0 ? hp(0.5) : 0)
                }),
            }}
        >
            <View 
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    backgroundColor: '#f8f9fa',
                    borderRadius: sizes.inputContainer.borderRadius,
                    paddingHorizontal: sizes.inputContainer.padding.horizontal,
                    paddingVertical: sizes.inputContainer.padding.vertical,
                    borderWidth: 1.5,
                    borderColor: disabled ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 136, 204, 0.1)',
                    minHeight: sizes.inputContainer.minHeight,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <TextInput
                    ref={inputRef}
                    onChangeText={value => textRef.current = value}
                    onContentSizeChange={handleContentSizeChange}
                    placeholder={placeholder}
                    placeholderTextColor="#7f8c8d"
                    multiline
                    scrollEnabled={true}
                    editable={!disabled}
                    style={{
                        fontSize: sizes.text.fontSize,
                        flex: 1,
                        paddingVertical: Platform.select({
                            ios: Math.max(8, hp(0.8)),
                            android: Math.max(4, hp(0.4)),
                        }),
                        paddingRight: Math.max(8, wp(2)),
                        maxHeight: sizes.inputContainer.maxHeight,
                        minHeight: Math.max(20, hp(2.5)),
                        color: '#2c3e50',
                        lineHeight: sizes.text.lineHeight,
                        textAlignVertical: Platform.select({
                            ios: 'center',
                            android: 'top',
                        }),
                        // Dynamic height for better UX
                        height: inputHeight > 0 ? Math.max(
                            Math.max(20, hp(2.5)), 
                            Math.min(inputHeight + (Platform.OS === 'android' ? 8 : 16), sizes.inputContainer.maxHeight)
                        ) : undefined,
                    }}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically={true}
                    textBreakStrategy="simple"
                    keyboardType="default"
                    autoCapitalize="sentences"
                    autoCorrect={true}
                    spellCheck={true}
                />
                <TouchableOpacity 
                    onPress={handleSend} 
                    disabled={disabled}
                    style={{
                        width: sizes.button.size,
                        height: sizes.button.size,
                        borderRadius: sizes.button.size / 2,
                        backgroundColor: disabled ? '#cccccc' : '#0088CC',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: Math.max(6, wp(1.5)),
                        shadowColor: disabled ? '#cccccc' : '#0088CC',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: disabled ? 0.1 : 0.3,
                        shadowRadius: 4,
                        elevation: disabled ? 2 : 4,
                        // Ensure minimum touch target
                        minWidth: 44,
                        minHeight: 44,
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Feather 
                        name="send" 
                        size={sizes.button.iconSize} 
                        color="white" 
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}
