import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    StatusBar,
    Modal,
    TextInput
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppLayout from "../components/AppLayout";
import { workService } from "../services/workService";
import { useSmartLoader } from "../hooks/useSmartLoader";

const { width, height } = Dimensions.get('window');

const getResponsiveSize = (size) => {
    const scale = width / 375;
    return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
    const scale = width / 375;
    const newSize = size * scale;
    return Math.max(newSize, size * 0.85);
};

export default function EmployeeWorkspaceScreen({ navigation, route }) {
    const { employee } = route.params || { employee: { name: "Employee", _id: "" } };
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const showLoader = useSmartLoader(loading);
    const [showModal, setShowModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    useEffect(() => {
        fetchProjects();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProjects();
        }, [])
    );

    const fetchProjects = async () => {
        if (!employee._id) return;
        setLoading(true);
        try {
            const data = await workService.getEmployeeProjects(employee._id);
            setProjects(data || []);
        } catch (error) {
            console.error("Fetch projects error:", error);
            Alert.alert("Error", "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await workService.createProject({
                name: newFolderName,
                employeeId: employee._id
            });
            setNewFolderName("");
            setShowModal(false);
            fetchProjects();
        } catch (error) {
            Alert.alert("Error", "Failed to create folder");
        }
    };

    const handleDeleteFolder = (projectId) => {
        Alert.alert(
            "Delete Folder",
            "Are you sure you want to delete this folder?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistic update
                        const previousProjects = [...projects];
                        setProjects(prev => prev.filter(p => p._id !== projectId));

                        try {
                            await workService.deleteProject(projectId);
                        } catch (error) {
                            // Revert on failure
                            setProjects(previousProjects);
                            Alert.alert("Error", "Failed to delete folder: " + (error.response?.data?.message || error.message));
                        }
                    }
                }
            ]
        );
    };

    const renderFolderItem = ({ item }) => (
        <View style={styles.folderRowContainer}>
            <TouchableOpacity
                style={styles.folderRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ProjectTasks", {
                    project: item,
                    employee: employee,
                    role: "admin"
                })}
            >
                <View style={styles.folderIconBg}>
                    <Image
                        source={require("../../assets/images/folder.png")}
                        style={styles.folderIcon}
                    />
                </View>
                <View style={styles.folderInfo}>
                    <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleDeleteFolder(item._id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Image
                    source={require("../../assets/images/delete.png")}
                    style={styles.deleteIcon}
                />
            </TouchableOpacity>
        </View>
    );

    return (
        <AppLayout
            navigation={navigation}
            role="admin"
            title={`${employee.name}\nworkspace`}
            logoPosition="right"
        >
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                {showLoader && projects.length === 0 ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#00664F" />
                    </View>
                ) : (
                    <FlatList
                        data={projects}
                        keyExtractor={(item) => item._id}
                        renderItem={renderFolderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No folders existing</Text>
                            </View>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Floating Add Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setShowModal(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>

                {/* Create Folder Modal */}
                <Modal
                    visible={showModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalIconBg}>
                                <Image
                                    source={require("../../assets/images/folder.png")}
                                    style={styles.modalFolderIcon}
                                />
                            </View>

                            <Text style={styles.modalTitle}>Enter Folder Name</Text>

                            <TextInput
                                style={styles.modalInput}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                autoFocus={true}
                                placeholder="Folder Name"
                                placeholderTextColor="#9CA3AF"
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.createBtn}
                                    onPress={handleCreateFolder}
                                >
                                    <Text style={styles.createBtnText}>Create</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => {
                                        setShowModal(false);
                                        setNewFolderName("");
                                    }}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </AppLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        paddingHorizontal: getResponsiveSize(25),
        paddingTop: getResponsiveSize(20),
        paddingBottom: getResponsiveSize(100),
    },
    folderRowContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: getResponsiveSize(15),
        paddingBottom: getResponsiveSize(15),
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        justifyContent: 'space-between',
    },
    folderRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    folderMain: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    folderIconBg: {
        width: getResponsiveSize(44),
        height: getResponsiveSize(44),
        borderRadius: getResponsiveSize(22), // Circular as per reference
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        marginRight: getResponsiveSize(20),
    },
    folderIcon: {
        width: getResponsiveSize(20),
        height: getResponsiveSize(20),
        tintColor: "#FFFFFF",
        resizeMode: 'contain',
    },
    folderInfo: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
    },
    folderName: {
        fontSize: getResponsiveFontSize(13),
        fontWeight: "600",
        color: "#1F2937",
        fontFamily: "Inter-SemiBold",
    },
    deleteBtn: {
        padding: getResponsiveSize(10),
        marginLeft: getResponsiveSize(10),
    },
    deleteIcon: {
        width: getResponsiveSize(22),
        height: getResponsiveSize(22),
        tintColor: "#EF4444",
        resizeMode: 'contain',
    },
    fab: {
        position: "absolute",
        right: getResponsiveSize(25),
        bottom: getResponsiveSize(110), // Moved higher to avoid overlap
        width: getResponsiveSize(56),
        height: getResponsiveSize(56),
        borderRadius: getResponsiveSize(28),
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        elevation: 0, // No shadows
        zIndex: 999,
    },
    fabText: {
        color: "#FFFFFF",
        fontSize: getResponsiveFontSize(30),
        fontWeight: "300",
    },
    emptyContainer: {
        marginTop: getResponsiveSize(100),
        alignItems: "center",
    },
    emptyText: {
        fontSize: getResponsiveFontSize(16),
        color: "#9CA3AF",
        fontFamily: "Inter-Medium",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(31, 41, 55, 0.7)", // Semi-transparent overlay as per blur requirement
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: getResponsiveSize(40),
    },
    modalContainer: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: getResponsiveSize(25),
        padding: getResponsiveSize(25),
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    modalIconBg: {
        width: getResponsiveSize(54),
        height: getResponsiveSize(54),
        borderRadius: getResponsiveSize(15),
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: getResponsiveSize(15),
    },
    modalFolderIcon: {
        width: getResponsiveSize(26),
        height: getResponsiveSize(26),
        tintColor: "#FFFFFF",
        resizeMode: 'contain',
    },
    modalTitle: {
        fontSize: getResponsiveFontSize(14),
        color: "#6B7280",
        fontFamily: "Inter-Medium",
        marginBottom: getResponsiveSize(10),
    },
    modalInput: {
        width: "100%",
        height: getResponsiveSize(48),
        borderRadius: getResponsiveSize(24),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: getResponsiveSize(20),
        fontSize: getResponsiveFontSize(15),
        color: "#1F2937",
        fontFamily: "Inter-Regular",
        marginBottom: getResponsiveSize(20),
    },
    modalButtons: {
        width: "100%",
        alignItems: "center",
    },
    createBtn: {
        width: "100%",
        height: getResponsiveSize(44),
        backgroundColor: "#00664F",
        borderRadius: getResponsiveSize(22),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: getResponsiveSize(10),
    },
    createBtnText: {
        color: "#FFFFFF",
        fontSize: getResponsiveFontSize(15),
        fontWeight: "600",
        fontFamily: "Inter-SemiBold",
    },
    cancelBtn: {
        width: "100%",
        height: getResponsiveSize(44),
        borderRadius: getResponsiveSize(22),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    cancelBtnText: {
        color: "#6B7280",
        fontSize: getResponsiveFontSize(15),
        fontWeight: "500",
        fontFamily: "Inter-Medium",
    },
});
