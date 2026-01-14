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

const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        organizationId: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        const { email, username, password, confirmPassword } = formData;
        if (!email || !username || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }
        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            await register({
                email: formData.email.toLowerCase().trim(),
                username: formData.username.trim(),
                password: formData.password,
                organizationId: formData.organizationId || undefined,
            });
        } catch (error) {
            Alert.alert('Registration Failed', error.response?.data?.message || 'Unable to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0066FF', '#6C63FF']}
            className="flex-1"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    className="flex-grow px-8"
                    contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-row items-center mb-10">
                        <TouchableOpacity
                            className="bg-white/20 p-2 rounded-xl mr-4"
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-left" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-3xl font-black">Register</Text>
                    </View>

                    <View className="bg-white rounded-[40px] p-8 shadow-2xl">
                        <Text className="text-gray-900 text-xl font-bold mb-6">Create Account</Text>

                        <View className="bg-gray-50 flex-row items-center px-5 rounded-2xl mb-4 border border-gray-100">
                            <Icon name="email-outline" size={22} color="#6B7280" />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-gray-800"
                                placeholder="Email Address *"
                                placeholderTextColor="#9CA3AF"
                                value={formData.email}
                                onChangeText={(text) => updateField('email', text)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="bg-gray-50 flex-row items-center px-5 rounded-2xl mb-4 border border-gray-100">
                            <Icon name="account-outline" size={22} color="#6B7280" />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-gray-800"
                                placeholder="Username *"
                                placeholderTextColor="#9CA3AF"
                                value={formData.username}
                                onChangeText={(text) => updateField('username', text)}
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="bg-gray-50 flex-row items-center px-5 rounded-2xl mb-4 border border-gray-100">
                            <Icon name="office-building" size={22} color="#6B7280" />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-gray-800"
                                placeholder="Organization ID (Optional)"
                                placeholderTextColor="#9CA3AF"
                                value={formData.organizationId}
                                onChangeText={(text) => updateField('organizationId', text)}
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="bg-gray-50 flex-row items-center px-5 rounded-2xl mb-4 border border-gray-100">
                            <Icon name="lock-outline" size={22} color="#6B7280" />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-gray-800"
                                placeholder="Password *"
                                placeholderTextColor="#9CA3AF"
                                value={formData.password}
                                onChangeText={(text) => updateField('password', text)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon name={showPassword ? 'eye-off' : 'eye'} size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-gray-50 flex-row items-center px-5 rounded-2xl mb-1 border border-gray-100">
                            <Icon name="lock-check-outline" size={22} color="#6B7280" />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-gray-800"
                                placeholder="Confirm Password *"
                                placeholderTextColor="#9CA3AF"
                                value={formData.confirmPassword}
                                onChangeText={(text) => updateField('confirmPassword', text)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text className="text-gray-400 text-[10px] mb-6 ml-1 italic italic">Min. 8 characters</Text>

                        <TouchableOpacity
                            className="bg-blue-600 h-14 rounded-2xl shadow-lg shadow-blue-500/50 justify-center items-center"
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-black text-lg">Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <View className="mt-8 flex-row flex-wrap justify-center">
                            <Text className="text-gray-400 text-[11px]">By joining, you agree to our </Text>
                            <TouchableOpacity><Text className="text-blue-600 text-[11px] font-bold">Terms</Text></TouchableOpacity>
                            <Text className="text-gray-400 text-[11px]"> & </Text>
                            <TouchableOpacity><Text className="text-blue-600 text-[11px] font-bold">Privacy Policy</Text></TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};


export default RegisterScreen;
