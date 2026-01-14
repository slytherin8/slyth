import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../utils/constants';

const CallsScreen = () => {
    const [callType, setCallType] = useState(null);

    const startCall = (type) => {
        setCallType(type);
        Alert.alert(
            'Secure Session',
            `Initializing ${type} session with end-to-end encryption. In production, this uses WebRTC with DTLS/SRTP.`,
            [{ text: 'Start', onPress: () => setCallType(null) }, { text: 'Cancel', style: 'cancel' }]
        );
    };

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <LinearGradient
                colors={['#0066FF', '#6C63FF']}
                className="p-8 pb-12 rounded-b-[40px]"
            >
                <Text className="text-white text-3xl font-bold">Secure Meetings</Text>
                <Text className="text-white/80 text-base mt-2">
                    Enterprise-grade encrypted collaboration
                </Text>
            </LinearGradient>

            <View className="px-6 -mt-8">
                <View className="flex-row flex-wrap justify-between">
                    <TouchableOpacity
                        className="w-[48%] bg-white p-6 rounded-3xl shadow-xl mb-4 items-center"
                        onPress={() => startCall('Video')}
                    >
                        <View className="bg-blue-100 p-4 rounded-2xl mb-3">
                            <Icon name="video" size={32} color="#0066FF" />
                        </View>
                        <Text className="text-gray-800 font-bold text-lg">Video</Text>
                        <Text className="text-gray-400 text-xs text-center mt-1">HD Meeting</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-[48%] bg-white p-6 rounded-3xl shadow-xl mb-4 items-center"
                        onPress={() => startCall('Audio')}
                    >
                        <View className="bg-green-100 p-4 rounded-2xl mb-3">
                            <Icon name="phone" size={32} color="#28A745" />
                        </View>
                        <Text className="text-gray-800 font-bold text-lg">Voice</Text>
                        <Text className="text-gray-400 text-xs text-center mt-1">Crystal Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-full bg-white p-6 rounded-3xl shadow-xl mb-6 flex-row items-center"
                        onPress={() => startCall('Screen Share')}
                    >
                        <View className="bg-purple-100 p-4 rounded-2xl mr-4">
                            <Icon name="monitor-share" size={32} color="#6C63FF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-800 font-bold text-lg">Share Screen</Text>
                            <Text className="text-gray-400 text-sm">With Live Drawing & Privacy Mode</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>

                <View className="bg-white rounded-3xl p-6 shadow-lg mb-6">
                    <Text className="text-gray-800 font-bold text-xl mb-4">Security Features</Text>

                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-50 p-2 rounded-lg mr-4">
                            <Icon name="shield-check" size={20} color="#0066FF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-800 font-semibold">End-to-End Encrypted</Text>
                            <Text className="text-gray-400 text-xs">DTLS/SRTP Security Protocol</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center mb-4">
                        <View className="bg-orange-50 p-2 rounded-lg mr-4">
                            <Icon name="draw" size={20} color="#FF9F43" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-800 font-semibold">Live Annotation</Text>
                            <Text className="text-gray-400 text-xs">Draw during screen sharing</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center">
                        <View className="bg-red-50 p-2 rounded-lg mr-4">
                            <Icon name="eye-off" size={20} color="#EA5455" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-800 font-semibold">Privacy Masking</Text>
                            <Text className="text-gray-400 text-xs">Auto-hide sensitive data</Text>
                        </View>
                    </View>
                </View>

                <View className="mb-10">
                    <Text className="text-gray-800 font-bold text-xl mb-4">Recent History</Text>
                    <View className="bg-white rounded-3xl p-10 items-center justify-center border border-dashed border-gray-200">
                        <Icon name="history" size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 text-base">No recent meetings</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};


export default CallsScreen;
