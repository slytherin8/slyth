import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import { COLORS } from '../../utils/constants';

const DashboardScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { onlineUsers } = useSocket();
    const [channels, setChannels] = useState([]);
    const [directMessages, setDirectMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [channelsRes, dmsRes] = await Promise.all([
                chatService.getChannels(),
                chatService.getDirectMessages(),
            ]);
            setChannels(channelsRes.data || []);
            setDirectMessages(dmsRes.data || []);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user?.role === 'admin';

    const renderChannelItem = ({ item }) => (
        <TouchableOpacity
            className="flex-row items-center py-5 border-b border-gray-50/50"
            onPress={() => navigation.navigate('Channel', { channel: item })}
        >
            <View className="bg-blue-50/80 w-14 h-14 rounded-2xl items-center justify-center mr-4">
                <Icon name="pound" size={26} color="#0066FF" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-black text-base">{item.name}</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">{item.memberCount || 0} Operatives</Text>
            </View>
            {item.unreadCount > 0 && (
                <View className="bg-blue-600 w-6 h-6 rounded-full items-center justify-center shadow-lg shadow-blue-500/50">
                    <Text className="text-white text-[10px] font-black">{item.unreadCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderDMItem = ({ item }) => {
        const isOnline = onlineUsers[item.participant?._id] === 'online';
        return (
            <TouchableOpacity
                className="flex-row items-center py-5 border-b border-gray-50/50"
                onPress={() => navigation.navigate('DirectMessage', { conversation: item })}
            >
                <View className="relative">
                    <View className="bg-indigo-50 w-14 h-14 rounded-full items-center justify-center mr-4">
                        <Text className="text-indigo-600 font-black text-xl">
                            {item.participant?.username?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                    {isOnline && (
                        <View className="absolute bottom-0 right-4 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 font-black text-base">{item.participant?.username}</Text>
                    <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
                        {item.lastMessage?.content || 'Encrypted connection live'}
                    </Text>
                </View>
                {item.unreadCount > 0 && (
                    <View className="bg-indigo-600 w-6 h-6 rounded-full items-center justify-center shadow-lg shadow-indigo-500/50">
                        <Text className="text-white text-[10px] font-black">{item.unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView
            className="flex-1 bg-white"
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} color="#6366F1" />}
        >
            <View className="px-8 pt-16 pb-8 flex-row justify-between items-end animate-premium-fade">
                <View>
                    <Text className="text-indigo-600 text-[10px] font-black uppercase tracking-[3px] mb-1">Defense Network</Text>
                    <Text className="text-gray-900 text-title-xl">Welcome, {user?.username?.split(' ')[0]}</Text>
                </View>
                <TouchableOpacity className="bg-gray-100/50 p-4 rounded-3xl">
                    <Icon name="bell-badge-outline" size={24} color="#312E81" />
                </TouchableOpacity>
            </View>

            <View className="px-8 flex-row gap-6 mb-10 animate-premium-fade">
                {isAdmin && (
                    <TouchableOpacity
                        className="flex-1 bg-white border border-gray-100 p-6 rounded-[32px] items-center shadow-sm"
                        onPress={() => navigation.navigate('Vault')}
                    >
                        <View className="bg-indigo-50 w-12 h-12 rounded-2xl items-center justify-center mb-3">
                            <Icon name="shield-lock" size={24} color="#6366F1" />
                        </View>
                        <Text className="text-gray-900 font-black text-[10px] uppercase tracking-widest">Vault</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    className="flex-1 bg-white border border-gray-100 p-6 rounded-[32px] items-center shadow-sm"
                    onPress={() => navigation.navigate('Calls')}
                >
                    <View className="bg-rose-50 w-12 h-12 rounded-2xl items-center justify-center mb-3">
                        <Icon name="video-plus" size={24} color="#E11D48" />
                    </View>
                    <Text className="text-gray-900 font-black text-[10px] uppercase tracking-widest">Meeting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 bg-white border border-gray-100 p-6 rounded-[32px] items-center shadow-sm"
                    onPress={() => navigation.navigate('Games')}
                >
                    <View className="bg-emerald-50 w-12 h-12 rounded-2xl items-center justify-center mb-3">
                        <Icon name="gamepad-variant" size={24} color="#059669" />
                    </View>
                    <Text className="text-gray-900 font-black text-[10px] uppercase tracking-widest">Games</Text>
                </TouchableOpacity>
            </View>

            {isAdmin && (
                <View className="mx-8 mb-10 animate-premium-fade">
                    <LinearGradient
                        colors={['#1E1B4B', '#312E81']}
                        className="p-8 rounded-[48px] shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative Glass Circle */}
                        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-white text-2xl font-black italic tracking-tighter">Admin Portal</Text>
                            <View className="glass-panel px-4 py-1.5 border-white/10">
                                <Text className="text-white text-[9px] font-black uppercase tracking-[2px]">System Live</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between">
                            {[
                                { icon: 'shield-account', label: 'Security' },
                                { icon: 'chart-box-outline', label: 'Logs' },
                                { icon: 'database-settings', label: 'Data' },
                                { icon: 'key-chain-variant', label: 'Access' }
                            ].map((item, idx) => (
                                <TouchableOpacity key={idx} className="items-center">
                                    <View className="glass-panel w-14 h-14 items-center justify-center mb-3 border-white/5">
                                        <Icon name={item.icon} size={24} color="white" />
                                    </View>
                                    <Text className="text-white/60 text-[9px] font-black uppercase tracking-widest">{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </LinearGradient>
                </View>
            )}

            <View className="px-8 mb-10 animate-premium-fade">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-gray-900 font-black text-2xl tracking-tighter">Secure Channels</Text>
                    <TouchableOpacity className="bg-gray-50 p-2 rounded-xl">
                        <Icon name="plus" size={20} color="#6366F1" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={channels}
                    renderItem={renderChannelItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                />
            </View>

            <View className="px-8 mb-12 animate-premium-fade">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-gray-900 font-black text-2xl tracking-tighter">Direct COMMS</Text>
                    <TouchableOpacity className="bg-gray-50 p-2 rounded-xl">
                        <Icon name="comment-plus-outline" size={20} color="#6366F1" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={directMessages}
                    renderItem={renderDMItem}
                    keyExtractor={(item) => item.conversationId || item._id}
                    scrollEnabled={false}
                />
            </View>
        </ScrollView>
    );
};


export default DashboardScreen;
