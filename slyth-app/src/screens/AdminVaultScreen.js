import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    TouchableHighlight,
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import AppLayout from "../components/AppLayout";
import { vaultService } from "../services/vaultService";

export default function AdminVaultScreen({ navigation, route }) {
    const [items, setItems] = useState([]); // Folders + Files
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const { isVerified, folderId, folderName } = route.params || {};

    // Folder Modal state
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    // Security: Auto-lock if not verified
    useFocusEffect(
        useCallback(() => {
            if (!isVerified) {
                navigation.replace("AdminFiles"); // Go back to gatekeeper
            }
        }, [isVerified])
    );

    useEffect(() => {
        if (isVerified) {
            loadContent();
        }
    }, [isVerified, folderId]); // Reload when folder changes

    const loadContent = async () => {
        setLoading(true);
        try {
            // 1. Get Folders
            const folders = await vaultService.getFolders(folderId);
            // 2. Get Files
            const files = await vaultService.getFiles(folderId);

            const content = [
                ...folders.map(f => ({ ...f, type: 'folder' })),
                ...files.map(f => ({ ...f, type: 'file' }))
            ];
            setItems(content);
        } catch (err) {
            Alert.alert("Error", "Failed to load vault content");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await vaultService.createFolder(newFolderName, folderId);
            setNewFolderName("");
            setShowFolderModal(false);
            loadContent();
        } catch (err) {
            Alert.alert("Error", "Could not create folder");
        }
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUploading(true);
                const file = result.assets[0];

                await vaultService.uploadFile(file, folderId);

                Alert.alert("Success", "File encrypted and uploaded securely");
                loadContent();
            }
        } catch (err) {
            console.error("Upload error details:", err.response?.data || err.message);
            const errorMessage = err.response?.data?.message || "Could not upload file. Please check your connection and try again.";
            Alert.alert("Upload Failed", errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (item) => {
        const itemType = item.type === 'folder' ? 'Folder' : 'File';
        const message = `Are you sure you want to delete "${item.name || item.originalName}"?`;

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`${itemType}: ${message}`);
            if (confirmed) {
                await performDelete(item);
            }
        } else {
            Alert.alert(`Delete ${itemType}`, message, [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => performDelete(item)
                }
            ]);
        }
    };

    const performDelete = async (item) => {
        try {
            if (item.type === 'folder') {
                await vaultService.deleteFolder(item._id);
            } else {
                await vaultService.deleteFile(item._id);
            }
            loadContent();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Failed to delete";
            if (Platform.OS === 'web') {
                window.alert(errMsg);
            } else {
                Alert.alert("Error", errMsg);
            }
        }
    };

    const handleDownload = async (file) => {
        try {
            await vaultService.downloadFile(file._id, file.originalName, file.mimeType);
        } catch (err) {
            Alert.alert("Error", "Could not download/open file");
        }
    };

    const handleItemPress = (item) => {
        if (item.type === 'folder') {
            navigation.push("AdminVault", {
                isVerified: true,
                folderId: item._id,
                folderName: item.name
            });
        } else {
            handleDownload(item);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.itemContainer}>
            <View style={styles.itemInfo}>
                <Ionicons
                    name={item.type === 'folder' ? "folder" : "document-text"}
                    size={40}
                    color={item.type === 'folder' ? "#FFD700" : "#4A90E2"}
                />
                <View style={{ marginLeft: 15 }}>
                    <Text style={styles.itemName}>{item.name || item.originalName}</Text>
                    {item.type === 'file' && (
                        <Text style={styles.itemMeta}>
                            {(item.size / 1024).toFixed(1)} KB • {new Date(item.uploadDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>

            {item.type === 'file' && (
                <TouchableOpacity onPress={() => handleDownload(item)} style={[styles.actionBtn, { marginRight: 8 }]}>
                    <Ionicons name="cloud-download-outline" size={22} color="#4A90E2" />
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <AppLayout navigation={navigation} role="admin" title={folderName || "Secure Vault"}>
            {loading ? (
                <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={60} color="#ccc" />
                            <Text style={{ marginTop: 10, color: "#999" }}>Folder is empty</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16 }}
                />
            )}

            {/* FABs */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: '#FFD700', marginBottom: 10 }]}
                    onPress={() => setShowFolderModal(true)}
                    disabled={uploading}
                >
                    <Ionicons name="folder-open" size={24} color="#333" />
                </TouchableOpacity>

                {folderId && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={handleUpload}
                        disabled={uploading}
                    >
                        <Ionicons name="add" size={30} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* New Folder Modal */}
            <Modal visible={showFolderModal} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Folder</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowFolderModal(false)}>
                                <Text style={styles.cancelLink}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateFolder}>
                                <Text style={styles.createLink}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {uploading && (
                <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: "#fff", marginTop: 10 }}>Encrypting & Uploading...</Text>
                </View>
            )}

        </AppLayout>
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
        borderRadius: 8,
        elevation: 2,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    itemMeta: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        alignItems: 'center'
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        fontSize: 16
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20
    },
    cancelLink: { color: '#666', fontSize: 16 },
    createLink: { color: '#4A90E2', fontSize: 16, fontWeight: 'bold' },
});
