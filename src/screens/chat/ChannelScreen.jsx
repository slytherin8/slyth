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

const ChannelScreen = ({ route }) => {
    const { channel } = route.params;
    const { user } = useAuth();
    const { joinChannel, leaveChannel, sendMessage, emitTyping, messages: socketMessages } = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef();

    useEffect(() => {
        loadMessages();
        joinChannel(channel._id);

        return () => {
            leaveChannel(channel._id);
        };
    }, [channel._id]);

    useEffect(() => {
        const newMessages = socketMessages.filter(
            (msg) => msg.channelId === channel._id
        );
        if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
        }
    }, [socketMessages]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const response = await chatService.getChannelMessages(channel._id, {
                limit: 50,
            });
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const messageData = {
            channelId: channel._id,
            content: inputText.trim(),
        };

        try {
            sendMessage(messageData);
            setInputText('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleTyping = (isTyping) => {
        emitTyping(channel._id, isTyping);
    };

    const renderMessage = ({ item }) => {
        const isOwn = item.senderId === user?._id;

        return (
            <View className={`mb-4 flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                    <View className="bg-blue-100 w-10 h-10 rounded-2xl items-center justify-center mr-3 self-end">
                        <Text className="text-blue-600 font-bold text-sm">
                            {item.sender?.username?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                )}
                <View className={`max-w-[75%] px-4 py-3 rounded-[24px] ${isOwn ? 'bg-blue-600 rounded-br-none' : 'bg-gray-100 rounded-bl-none'}`}>
                    {!isOwn && (
                        <Text className="text-gray-500 font-bold text-[10px] uppercase mb-1">{item.sender?.username}</Text>
                    )}
                    <Text className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                        {item.content}
                    </Text>
                    <Text className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
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
                <View className="bg-blue-100 w-10 h-10 rounded-2xl items-center justify-center mr-4">
                    <Icon name="pound" size={24} color="#0066FF" />
                </View>
                <View>
                    <Text className="text-gray-900 font-black text-lg">#{channel.name}</Text>
                    <Text className="text-green-500 text-xs font-bold">● Active Session</Text>
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
                onLayout={() => flatListRef.current?.scrollToEnd()}
            />

            <View className="px-6 py-4 bg-white border-t border-gray-100 flex-row items-center space-x-3">
                <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl">
                    <Icon name="plus" size={24} color="#9CA3AF" />
                </TouchableOpacity>
                <TextInput
                    className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-gray-800 text-sm"
                    placeholder={`Message #${channel.name}`}
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    onFocus={() => handleTyping(true)}
                    onBlur={() => handleTyping(false)}
                    multiline
                />
                <TouchableOpacity
                    className={`p-3 rounded-2xl ${inputText.trim() ? 'bg-blue-600' : 'bg-gray-50'}`}
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


export default ChannelScreen;
