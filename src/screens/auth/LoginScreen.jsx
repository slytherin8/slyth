import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState('employee'); // 'admin' or 'employee'

    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const result = await login({
                email: email.toLowerCase().trim(),
                password,
                role, // Add explicit role
                deviceInfo: {
                    deviceType: Platform.OS,
                    browser: 'expo',
                    os: Platform.OS,
                },
            });

            if (result.requires2FA) {
                navigation.navigate('TwoFactor', { userId: result.userId });
            }
        } catch (error) {
            Alert.alert(
                'Login Failed',
                error.response?.data?.message || 'Invalid credentials'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View
            style={{ flex: 1, backgroundColor: '#1E1B4B' }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6">
                    <View className="items-center mb-10 animate-premium-fade">
                        <View className="glass-panel p-6 mb-4">
                            <Icon name="shield-lock" size={60} color="white" />
                        </View>
                        <Text className="text-white text-title-xl tracking-tighter">SecureCollab</Text>
                        <Text className="text-subtitle-sm mt-1">Enterprise Defense Core</Text>
                    </View>

                    <View className="bg-white/95 rounded-[48px] p-10 shadow-2xl animate-premium-fade">
                        <Text className="text-gray-900 text-3xl font-black mb-2">Welcome Back</Text>
                        <Text className="text-gray-400 text-sm mb-8">Identify yourself to continue</Text>

                        {/* Role Selector Segmented Control */}
                        <View className="flex-row bg-gray-100 rounded-2xl p-1.5 mb-8">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl items-center ${role === 'employee' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setRole('employee')}
                            >
                                <Text className={`text-xs font-black uppercase tracking-widest ${role === 'employee' ? 'text-indigo-600' : 'text-gray-400'}`}>Employee</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl items-center ${role === 'admin' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setRole('admin')}
                            >
                                <Text className={`text-xs font-black uppercase tracking-widest ${role === 'admin' ? 'text-indigo-600' : 'text-gray-400'}`}>Admin</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-4 mb-4">
                            <Icon name="email-outline" size={20} color="#6366F1" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900 text-base font-medium"
                                placeholder="Corporate Email"
                                placeholderTextColor="#94A3B8"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-4 mb-4">
                            <Icon name="lock-outline" size={20} color="#6366F1" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900 text-base font-medium"
                                placeholder="Access Key"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6366F1" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity className="self-end mb-8">
                            <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Recover Credentials</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-indigo-600 h-16 rounded-2xl justify-center items-center shadow-xl animate-glow-pulse"
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-lg font-black uppercase tracking-widest">Authorize Session</Text>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row items-center my-8">
                            <View className="flex-1 h-[1px] bg-gray-100" />
                            <Text className="mx-4 text-gray-300 text-[10px] font-black tracking-widest uppercase">Encryption Node 07</Text>
                            <View className="flex-1 h-[1px] bg-gray-100" />
                        </View>

                        <TouchableOpacity
                            className="border-2 border-indigo-100 h-14 rounded-2xl justify-center items-center"
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text className="text-indigo-600 text-base font-black uppercase tracking-widest">Provision Account</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center items-center mt-12 mb-8">
                        <Icon name="shield-check" size={16} color="#818CF8" />
                        <Text className="text-white/40 text-[9px] ml-2 font-black uppercase tracking-[3px]">
                            Quantum-Resistant Layer-2
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;
