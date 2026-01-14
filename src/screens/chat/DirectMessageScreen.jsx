import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import { COLORS } from '../../utils/constants';

const DirectMessageScreen = ({ route }) => {
    const { conversation } = route.params;
    const { user } = useAuth();
    const { sendMessage, messages: socketMessages, onlineUsers } = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();

    const participant = conversation.participant;
    const isOnline = onlineUsers[participant._id] === 'online';

    useEffect(() => {
        loadMessages();
    }, []);

    useEffect(() => {
        const newMessages = socketMessages.filter(
            (msg) => msg.conversationId === conversation.conversationId
        );
        if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
        }
    }, [socketMessages]);

    const loadMessages = async () => {
        try {
            const response = await chatService.getDMHistory(conversation.conversationId, {
                limit: 50,
            });
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Failed to load DMs:', error);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        try {
            await chatService.sendDirectMessage(participant._id, {
                content: inputText.trim(),
            });
            setInputText('');
        } catch (error) {
            console.error('Failed to send DM:', error);
        }
    };

    const renderMessage = ({ item }) => {
        const isOwn = item.senderId === user?._id;
        return (
            <View className={`mb-3 flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[80%] px-4 py-3 rounded-[24px] ${isOwn ? 'bg-indigo-600 rounded-br-none' : 'bg-gray-100 rounded-bl-none'}`}>
                    <Text className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                        {item.content}
                    </Text>
                    <Text className={`text-[9px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View className="px-6 py-4 flex-row items-center border-b border-gray-100 mt-8">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Icon name="chevron-left" size={28} color="#1F2937" />
                </TouchableOpacity>
                <View className="relative">
                    <View className="bg-indigo-100 w-12 h-12 rounded-full items-center justify-center mr-4">
                        <Text className="text-indigo-600 font-bold text-lg">
                            {participant.username?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                    {isOnline && (
                        <View className="absolute bottom-0 right-4 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                </View>
                <View>
                    <Text className="text-gray-900 font-black text-lg">{participant.username}</Text>
                    <Text className={`text-xs font-bold ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {isOnline ? 'Active Session' : 'Secured / Offline'}
                    </Text>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item._id}
                className="px-6"
                contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <View className="px-6 py-4 bg-white border-t border-gray-100 flex-row items-center space-x-3">
                <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl">
                    <Icon name="image-outline" size={24} color="#9CA3AF" />
                </TouchableOpacity>
                <TextInput
                    className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-gray-800 text-sm"
                    placeholder={`Direct message ${participant.username}`}
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity
                    className={`p-3 rounded-2xl ${inputText.trim() ? 'bg-indigo-600' : 'bg-gray-50'}`}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Icon
                        name="send"
                        size={20}
                        color={inputText.trim() ? 'white' : '#9CA3AF'}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};


export default DirectMessageScreen;
