import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import vaultService from '../../services/vaultService';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

const VaultScreen = () => {
    const { user } = useAuth();
    const [vaultItems, setVaultItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vaultKey, setVaultKey] = useState('user-vault-key');

    useEffect(() => {
        loadVaultItems();
    }, []);

    const loadVaultItems = async () => {
        setLoading(true);
        try {
            const response = await vaultService.getVaultItems();
            setVaultItems(response.data || []);
        } catch (error) {
            console.error('Failed to load vault items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.type === 'success') {
                Alert.alert(
                    'Secure Upload',
                    `Encrypt and upload ${result.name}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Encrypt & Upload',
                            onPress: async () => {
                                try {
                                    await vaultService.uploadToVault(
                                        result.uri,
                                        {
                                            fileName: result.name,
                                            mimeType: result.mimeType,
                                            title: result.name,
                                            tags: ['confidential'],
                                        },
                                        vaultKey
                                    );
                                    loadVaultItems();
                                    Alert.alert('Success', 'File encrypted and stored safely');
                                } catch (error) {
                                    Alert.alert('Error', 'Encryption/Upload failed');
                                }
                            },
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Document picker error:', error);
        }
    };

    const handleDownload = async (item) => {
        try {
            const fileUri = await vaultService.downloadVaultFile(item._id, vaultKey);
            Alert.alert('Secure Decryption', `File decrypted and temporarily saved to: ${fileUri}`);
        } catch (error) {
            Alert.alert('Error', 'Decryption failed. Invalid keys or corrupted file.');
        }
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Destroy Document',
            `Permanently erase ${item.fileName} from secure storage?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Erase',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await vaultService.deleteVaultItem(item._id);
                            loadVaultItems();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to erase document');
                        }
                    },
                },
            ]
        );
    };

    const getFileIcon = (mimeType) => {
        if (!mimeType) return 'file';
        if (mimeType.startsWith('image/')) return 'file-image';
        if (mimeType.startsWith('video/')) return 'file-video';
        if (mimeType.includes('pdf')) return 'file-pdf-box';
        return 'file-document';
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const renderVaultItem = ({ item }) => (
        <View className="flex-row items-center bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100">
            <View className="bg-indigo-50 p-3 rounded-2xl mr-4">
                <Icon name={getFileIcon(item.mimeType)} size={32} color="#6366F1" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-800 font-bold text-base" numberOfLines={1}>{item.fileName}</Text>
                <Text className="text-gray-400 text-xs mt-1">
                    {formatFileSize(item.fileSize)} • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
            <TouchableOpacity className="p-2" onPress={() => handleDownload(item)}>
                <Icon name="download-lock" size={24} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2" onPress={() => handleDelete(item)}>
                <Icon name="trash-can-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                className="p-8 pb-12 rounded-b-[40px]"
            >
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-white text-3xl font-black tracking-tighter">Secure Vault</Text>
                        <View className="bg-white/10 self-start px-2 py-0.5 rounded-full mt-1">
                            <Text className="text-blue-300 text-[9px] uppercase tracking-widest font-black">AES-256 Quantum Ready</Text>
                        </View>
                    </View>
                    <Icon name="shield-lock" size={48} color="white" />
                </View>
            </LinearGradient>

            <View className="px-6 -mt-8">
                <View className="bg-white rounded-3xl p-6 shadow-xl flex-row justify-between items-center mb-6">
                    <View className="flex-row gap-6">
                        <View className="items-center">
                            <Text className="text-gray-900 font-black text-xl">{vaultItems.length}</Text>
                            <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Items</Text>
                        </View>
                        <View className="items-center border-l border-gray-100 pl-6">
                            <Text className="text-gray-900 font-black text-xl">
                                {formatFileSize(vaultItems.reduce((sum, item) => sum + (item.fileSize || 0), 0))}
                            </Text>
                            <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Used</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        className="bg-blue-600 px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/50 flex-row items-center"
                        onPress={handleUpload}
                    >
                        <Icon name="plus-circle" size={20} color="white" />
                        <Text className="text-white font-bold ml-2">Secure Add</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={vaultItems}
                    renderItem={renderVaultItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadVaultItems} color="#0066FF" />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Icon name="folder-lock-outline" size={80} color="#CBD5E1" />
                            <Text className="text-gray-500 font-bold text-lg mt-4">Vault is Empty</Text>
                            <Text className="text-gray-400 text-center px-10 mt-2">
                                Your zero-knowledge encrypted documents will appear here once uploaded.
                            </Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
};


export default VaultScreen;
