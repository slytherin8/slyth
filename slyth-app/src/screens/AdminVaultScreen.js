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
import { useSmartLoader } from "../hooks/useSmartLoader";

const AdminVaultScreen = ({ navigation, route }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const showLoader = useSmartLoader(loading);
    const [uploading, setUploading] = useState(false);
    const { isVerified, folderId, folderName } = route.params || {};

    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [showActionModal, setShowActionModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (!isVerified) {
                navigation.replace("AdminFiles");
            }
        }, [isVerified])
    );

    useEffect(() => {
        if (isVerified) {
            loadContent();
        }
    }, [isVerified, folderId]);

    const loadContent = async () => {
        setLoading(true);
        try {
            const folders = await vaultService.getFolders(folderId);
            const files = await vaultService.getFiles(folderId);
            const content = [
                ...folders.map(f => ({ ...f, type: 'folder' })),
                ...files.map(f => ({ ...f, type: 'file' }))
            ];
            setItems(content);
        } catch (err) {
            console.log("Error loading content", err);
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
                copyToCacheDirectory: true
            });
            console.log("DocumentPicker result:", JSON.stringify(result));

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUploading(true);
                const asset = result.assets[0];
                console.log("Uploading asset:", asset.name, asset.mimeType, asset.uri);
                await vaultService.uploadFile(asset, folderId);
                Alert.alert("Success", "File encrypted and uploaded securely");
                loadContent();
            }
        } catch (err) {
            console.log("Upload error:", err);
            Alert.alert("Upload Failed", err?.message || "Could not upload file.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddPress = () => {
        if (folderId) {
            // Inside a folder — show choice: Upload File or Create Subfolder
            setShowActionModal(true);
        } else {
            // Root level — create folder
            setShowFolderModal(true);
        }
    };

    /* 🔹 DELETE MODAL STATE */
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const handleDeletePress = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (itemToDelete.type === 'folder') {
                await vaultService.deleteFolder(itemToDelete._id);
            } else {
                await vaultService.deleteFile(itemToDelete._id);
            }
            loadContent();
        } catch (e) {
            Alert.alert("Error", "Failed to delete");
        } finally {
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <TouchableOpacity
                style={styles.cardContent}
                onPress={() => item.type === 'folder'
                    ? navigation.push("AdminVault", { isVerified: true, folderId: item._id, folderName: item.name })
                    : vaultService.downloadFile(item._id, item.originalName, item.mimeType)
                }
            >
                <View style={[styles.iconBox, item.type === 'folder' ? styles.folderIconBox : styles.fileIconBox]}>
                    <Ionicons
                        name={item.type === 'folder' ? "folder-outline" : "document-text-outline"}
                        size={24}
                        color={item.type === 'folder' ? "#00664F" : "#00664F"}
                    />
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                    {item.name || item.originalName}
                </Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                {item.type === 'file' && (
                    <TouchableOpacity
                        onPress={() => vaultService.downloadFile(item._id, item.originalName, item.mimeType)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="download-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={() => handleDeletePress(item)}
                    style={styles.actionBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <AppLayout
            navigation={navigation}
            role="admin"
            title={folderName || "Store Employee Details"}
            showProfile={false}
            logoPosition="right"
        >
            <View style={styles.container}>
                {showLoader && items.length === 0 ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#00664F" style={{ marginTop: 20 }} />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No items found</Text>
                            </View>
                        }
                    />
                )}

                {/* Floating Add Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleAddPress}
                    disabled={uploading}
                >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                </TouchableOpacity>

                {/* ACTION CHOICE MODAL (inside folder) */}
                <Modal visible={showActionModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={[styles.modalLabel, { fontSize: 18, fontWeight: '700', color: '#111827', alignSelf: 'center', marginBottom: 20 }]}>
                                What would you like to do?
                            </Text>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.createBtn, { marginBottom: 12 }]}
                                onPress={() => {
                                    setShowActionModal(false);
                                    setTimeout(() => handleUpload(), 300);
                                }}
                            >
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.createBtnText}>Upload File</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.createBtn, { marginBottom: 12, backgroundColor: '#1D4ED8' }]}
                                onPress={() => {
                                    setShowActionModal(false);
                                    setTimeout(() => setShowFolderModal(true), 300);
                                }}
                            >
                                <Ionicons name="folder-open-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.createBtnText}>Create Subfolder</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setShowActionModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* CREATE FOLDER MODAL */}
                <Modal visible={showFolderModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalIconBox}>
                                <Ionicons name="folder-outline" size={32} color="#FFFFFF" />
                            </View>

                            <Text style={styles.modalLabel}>Enter Folder Name</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                autoFocus
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.createBtn]}
                                    onPress={handleCreateFolder}
                                >
                                    <Text style={styles.createBtnText}>Create</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setShowFolderModal(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* DELETE CONFIRMATION MODAL */}
                <Modal visible={showDeleteModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="trash-outline" size={32} color="#EF4444" />
                            </View>

                            <Text style={[styles.modalLabel, { color: '#000', fontSize: 18, fontWeight: '600', alignSelf: 'center', marginBottom: 5 }]}>
                                Delete Item?
                            </Text>

                            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
                                Are you sure you want to delete "{itemToDelete?.name || itemToDelete?.originalName}"?
                            </Text>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                                    onPress={confirmDelete}
                                >
                                    <Text style={styles.createBtnText}>Delete</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {uploading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#FFFFFF" size="large" />
                        <Text style={styles.loadingText}>Encrypting...</Text>
                    </View>
                )}
            </View>
        </AppLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: 20 },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12
    },
    folderIconBox: { backgroundColor: "#E5F3F0" }, // Light green
    fileIconBox: { backgroundColor: "#E5F3F0" },
    itemName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1F2937",
        flex: 1
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    actionBtn: { padding: 4 },
    emptyState: { alignItems: "center", marginTop: 50 },
    emptyText: { color: "#9CA3AF" },

    fab: {
        position: "absolute",
        right: 20,
        bottom: 130, // Moved higher as requested
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 999
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.8)", // Blurred effect simulation
        justifyContent: "center",
        alignItems: "center",
        padding: 20
    },
    modalCard: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    modalIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20
    },
    modalLabel: {
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 8,
        alignSelf: "flex-start",
        width: "100%"
    },
    modalInput: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        fontSize: 16
    },
    modalButtons: {
        flexDirection: "row",
        width: "100%",
        gap: 12
    },
    modalBtn: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    createBtn: { backgroundColor: "#00664F" },
    cancelBtn: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
    createBtnText: { color: "#FFFFFF", fontWeight: "600" },
    cancelBtnText: { color: "#4B5563", fontWeight: "600" },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    },
    loadingText: { color: "#FFFFFF", marginTop: 12 }
});

export default AdminVaultScreen;
