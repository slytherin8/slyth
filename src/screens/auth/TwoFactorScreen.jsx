import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

const TwoFactorScreen = ({ route, navigation }) => {
    const { userId } = route.params;
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const { verify2FA } = useAuth();

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Error', 'Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await verify2FA(userId, code);
        } catch (error) {
            Alert.alert('Verification Failed', 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0066FF', '#6C63FF']}
            className="flex-1"
        >
            <View className="flex-1 justify-center items-center px-8">
                <View className="bg-white/20 p-6 rounded-[32px] mb-8 border border-white/30 shadow-2xl">
                    <Icon name="shield-lock" size={64} color="white" />
                </View>

                <Text className="text-white text-3xl font-black text-center">Verify Identity</Text>
                <Text className="text-white/80 text-center mt-3 mb-10 text-base font-medium">
                    Please enter the 6-digit code from your{"\n"}authenticator application.
                </Text>

                <View className="w-full bg-white rounded-[40px] p-10 shadow-2xl">
                    <TextInput
                        className="h-16 border-2 border-blue-500 rounded-2xl text-4xl text-center font-black text-gray-900 mb-8"
                        style={{ letterSpacing: 10 }}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="000000"
                        placeholderTextColor="#E5E7EB"
                    />

                    <TouchableOpacity
                        className="bg-blue-600 h-14 rounded-2xl shadow-lg shadow-blue-500/50 justify-center items-center mb-6"
                        onPress={handleVerify}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-black text-lg uppercase tracking-widest">Verify PIN</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="items-center"
                    >
                        <Text className="text-blue-600 font-bold text-sm">Back to Secure Login</Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-12 items-center">
                    <Text className="text-white/40 text-[10px] uppercase font-black tracking-[4px]">
                        Military-Grade Protection
                    </Text>
                </View>
            </View>
        </LinearGradient>
    );
};


export default TwoFactorScreen;
