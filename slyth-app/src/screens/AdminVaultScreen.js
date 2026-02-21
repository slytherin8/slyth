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
                console.log(`[Vault] Uploading asset: ${asset.name}, Size: ${asset.size}, URI: ${asset.uri}`);

                const uploadResult = await vaultService.uploadFile(asset, folderId);
                console.log("[Vault] Upload successful:", uploadResult);

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
                            <View style={[styles.modalIconBox, { backgroundColor: '#00664F' }]}>
                                <Ionicons name="add-circle-outline" size={32} color="#FFFFFF" />
                            </View>

                            <Text style={[styles.modalTitle, { marginBottom: 20 }]}>Choose Action</Text>

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
                                style={[styles.modalBtn, styles.createBtn, { marginBottom: 12, backgroundColor: '#00664F' }]}
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
                                <Ionicons name="folder" size={32} color="#FFFFFF" />
                            </View>

                            <Text style={styles.modalLabel}>Enter Folder Name</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                placeholder="Folder Name"
                                placeholderTextColor="#9CA3AF"
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
                                <Ionicons name="trash" size={32} color="#EF4444" />
                            </View>

                            <Text style={styles.modalTitleText}>Delete Item?</Text>

                            <Text style={styles.modalSubText}>
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
                        <Text style={styles.loadingText}>Encrypting & Uploading...</Text>
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
        borderRadius: 16,
        marginBottom: 12,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12
    },
    folderIconBox: { backgroundColor: "#E5F3F0" },
    fileIconBox: { backgroundColor: "#F3F4F6" },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8
    },
    actionBtn: {
        padding: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 10
    },
    emptyState: { alignItems: "center", marginTop: 100 },
    emptyText: { color: "#9CA3AF", fontSize: 16 },

    fab: {
        position: "absolute",
        right: 25,
        bottom: 130, // Elevated to stay above the AppLayout bottom navigation
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        elevation: 10,
        shadowColor: "#00664F",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        zIndex: 999
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
    },
    modalCard: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: "#FFFFFF",
        borderRadius: 35,
        padding: 30,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 20
    },
    modalIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827"
    },
    modalTitleText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 10
    },
    modalSubText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 25,
        lineHeight: 20
    },
    modalLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 12,
        alignSelf: "flex-start"
    },
    modalInput: {
        width: "100%",
        borderWidth: 1.5,
        borderColor: "#F3F4F6",
        borderRadius: 18,
        padding: 15,
        marginBottom: 30,
        fontSize: 16,
        color: "#111827",
        backgroundColor: "#F9FAFB"
    },
    modalButtons: {
        flexDirection: "row",
        width: "100%",
        gap: 12
    },
    modalBtn: {
        width: '100%',
        flexDirection: "row",
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
        // Removed overflow: 'hidden' to ensure children visibility
    },
    createBtn: {
        backgroundColor: "#00664F",
        elevation: 2, // Added for depth
    },
    cancelBtn: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#E5E7EB"
    },
    createBtnText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 16,
        textAlign: 'center'
    },
    cancelBtnText: {
        color: "#64748B", // Slightly darker gray for better contrast
        fontWeight: "bold",
        fontSize: 16,
        textAlign: 'center'
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000
    },
    loadingText: { color: "#FFFFFF", marginTop: 15, fontSize: 16, fontWeight: '600' }
});

export default AdminVaultScreen;

