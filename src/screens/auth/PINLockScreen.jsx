import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';
import { COLORS, APP_CONSTANTS } from '../../utils/constants';

const PINLockScreen = ({ navigation }) => {
    const [pin, setPin] = useState('');
    const { verifyPIN } = useAuth();

    const handlePinPress = (digit) => {
        if (pin.length < APP_CONSTANTS.PIN_LENGTH) {
            const newPin = pin + digit;
            setPin(newPin);

            if (newPin.length === APP_CONSTANTS.PIN_LENGTH) {
                verifyPin(newPin);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const verifyPin = async (enteredPin) => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 300));
            console.log('PIN verified:', enteredPin);
        } catch (error) {
            Vibration.vibrate(500);
            Alert.alert('Error', 'Invalid PIN');
            setPin('');
        }
    };

    const handleBiometric = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                Alert.alert('Error', 'Biometric authentication not available');
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock SecureCollab',
                fallbackLabel: 'Use PIN',
            });

            if (result.success) {
                console.log('Biometric authentication successful');
            }
        } catch (error) {
            console.error('Biometric auth error:', error);
        }
    };

    const renderPinDots = () => {
        return (
            <View className="flex-row justify-center my-12">
                {[...Array(APP_CONSTANTS.PIN_LENGTH)].map((_, index) => (
                    <View
                        key={index}
                        className={`w-4 h-4 rounded-full border-2 border-white mx-3 ${index < pin.length ? 'bg-white' : 'bg-transparent'}`}
                    />
                ))}
            </View>
        );
    };

    const numberPad = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['bio', '0', 'delete'],
    ];

    return (
        <LinearGradient
            colors={['#1E1B4B', '#312E81']}
            className="flex-1 pt-24 pb-12"
        >
            <View className="items-center mb-8">
                <View className="bg-white/10 p-6 rounded-[32px] border border-white/20 shadow-2xl mb-6">
                    <Icon name="shield-key" size={48} color="white" />
                </View>
                <Text className="text-white text-3xl font-black uppercase tracking-widest">Verify PIN</Text>
                <Text className="text-white/60 mt-2 font-medium">Unlock your secure workspace</Text>
            </View>

            {renderPinDots()}

            <View className="flex-1 justify-center px-12">
                {numberPad.map((row, rowIndex) => (
                    <View key={rowIndex} className="flex-row justify-around my-3">
                        {row.map((item) => (
                            <TouchableOpacity
                                key={item}
                                className="w-20 h-20 rounded-full bg-white/10 items-center justify-center border border-white/5 shadow-xl"
                                onPress={() => {
                                    if (item === 'delete') handleDelete();
                                    else if (item === 'bio') handleBiometric();
                                    else handlePinPress(item);
                                }}
                            >
                                {item === 'delete' ? (
                                    <Icon name="backspace-outline" size={28} color="white" />
                                ) : item === 'bio' ? (
                                    <Icon name="fingerprint" size={32} color="white" />
                                ) : (
                                    <Text className="text-white text-3xl font-black">{item}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>

            <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="mt-8 items-center"
            >
                <Text className="text-white/40 font-bold text-xs uppercase tracking-[2px]">Forgot PIN?</Text>
            </TouchableOpacity>
        </LinearGradient>
    );
};


export default PINLockScreen;
