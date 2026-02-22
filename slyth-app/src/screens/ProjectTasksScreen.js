import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    StatusBar,
    TextInput,
    Platform,
    Modal
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
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

export default function ProjectTasksScreen({ navigation, route }) {
    const params = route.params || {};
    const { project, employee } = params;
    const role = (params.role || "").toLowerCase();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const showLoader = useSmartLoader(loading);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [targetTask, setTargetTask] = useState(null);
    const [targetStatus, setTargetStatus] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchTasks();

        // Socket listener for real-time updates
        const cleanup = role === "admin"
            ? workService.onAdminWorkUpdate(({ type, data }) => {
                if (type === "TASK_UPDATED" && data.projectId === project._id) {
                    setTasks(prev => prev.map(t => t._id === data._id ? data : t));
                } else if (type === "TASK_DELETED") {
                    setTasks(prev => prev.filter(t => t._id !== data.taskId));
                } else if (type === "TASK_CREATED" && data.projectId === project._id) {
                    fetchTasks(); // Fetch fresh to get current list
                }
            })
            : workService.onWorkUpdate(({ type, data }) => {
                if (type === "TASK_CREATED" && data.projectId === project._id) {
                    setTasks(prev => [data, ...prev]);
                } else if (type === "TASK_UPDATED" && data.projectId === project._id) {
                    setTasks(prev => prev.map(t => t._id === data._id ? data : t));
                } else if (type === "TASK_DELETED") {
                    setTasks(prev => prev.filter(t => t._id !== data.taskId));
                }
            });

        return cleanup;
    }, [project._id, role]);

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [project._id])
    );

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await workService.getProjectTasks(project._id);
            setTasks(data || []);
        } catch (error) {
            console.error("Fetch tasks error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) {
            Alert.alert("Error", "Please enter a task title");
            return;
        }

        if (!project?._id || !employee?._id) {
            Alert.alert("Error", "Missing project or employee context");
            return;
        }

        setLoading(true);
        try {
            const taskData = {
                title: newTaskTitle.trim(),
                projectId: project._id,
                employeeId: employee._id,
                attachment: attachment // attachment is already null or base64 string
            };

            await workService.createTask(taskData);

            // Success cleanup
            setNewTaskTitle("");
            setAttachment(null);

            // Fetch updated list to ensure state is perfectly synced
            fetchTasks();
        } catch (error) {
            console.error("Create task error details:", error.response?.data || error.message);
            Alert.alert("Error", "Failed to create task: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant camera roll permissions');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5, // Reduced quality for smaller payload
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];

                // Check size (approx 10MB limit for base64)
                if (asset.base64 && asset.base64.length > 10 * 1024 * 1024) {
                    Alert.alert("Error", "Image is too large. Please choose a smaller one.");
                    return;
                }

                if (asset.base64) {
                    setAttachment(`data:image/jpeg;base64,${asset.base64}`);
                }
            }
        } catch (error) {
            console.log("Pick image error:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };
    const handleStatusPress = (task, status) => {
        if (role === "admin" || task.status === status) return;
        setTargetTask(task);
        setTargetStatus(status);
        setUpdateModalVisible(true);
    };

    const confirmStatusUpdate = async () => {
        if (!targetTask || !targetStatus) return;

        try {
            const updatedTask = await workService.updateTask(targetTask._id, {
                status: targetStatus
            });
            setTasks(prev => prev.map(t => t._id === targetTask._id ? updatedTask : t));
            setUpdateModalVisible(false);
            setTargetTask(null);
            setTargetStatus("");
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const handleDeleteTask = async (taskId) => {
        const task = tasks.find(t => t._id === taskId);
        if (!task) return;

        // Backend also enforces this, but UI check for immediate feedback
        const isAdmin = role === "admin";
        const isCompleted = task.status === "Completed";

        if (!isAdmin && !isCompleted) {
            Alert.alert("Action Not Allowed", "You can only delete completed tasks assigned to you.");
            return;
        }

        Alert.alert(
            "Delete Task",
            "Are you sure you want to delete this task?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistic UI update
                        const previousTasks = [...tasks];
                        setTasks(prev => prev.filter(t => t._id !== taskId));

                        try {
                            await workService.deleteTask(taskId);
                        } catch (error) {
                            // Revert if API fails
                            setTasks(previousTasks);
                            const msg = error.response?.data?.message || error.message;
                            Alert.alert("Error", "Failed to delete task: " + msg);
                        }
                    }
                }
            ]
        );
    };

    const categorizedTasks = useMemo(() => ({
        pending: tasks.filter(t => t.status === "Pending"),
        updating: tasks.filter(t => t.status === "Updating"),
        completed: tasks.filter(t => t.status === "Completed")
    }), [tasks]);

    if (!project || (!employee && role === "admin")) {
        return (
            <AppLayout navigation={navigation} title="Error">
                <View style={styles.container}>
                    <Text style={{ textAlign: 'center', marginTop: 50 }}>Invalid project or employee data</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', marginTop: 20 }}>
                        <Text style={{ color: '#00664F' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            navigation={navigation}
            role={role}
            title={project.name}
            logoPosition="right"
        >
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Add Work Bar (Admin Only) */}
                    {role === "admin" && (
                        <View style={styles.addWorkContainer}>
                            <View style={styles.inputWrapper}>
                                <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage}>
                                    <Image
                                        source={require("../../assets/images/pin.png")}
                                        style={[styles.clipIcon, attachment && { tintColor: '#00664F' }]}
                                    />
                                </TouchableOpacity>

                                <View style={styles.inputMain}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Add your work"
                                        placeholderTextColor="#9CA3AF"
                                        value={newTaskTitle}
                                        onChangeText={setNewTaskTitle}
                                    />
                                    {attachment && (
                                        <View style={styles.previewContainer}>
                                            <Image source={{ uri: attachment }} style={styles.previewThumb} />
                                            <TouchableOpacity
                                                style={styles.removeBtn}
                                                onPress={() => setAttachment(null)}
                                            >
                                                <Text style={styles.removeX}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.sendBtn}
                                onPress={handleCreateTask}
                                activeOpacity={0.7}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Image
                                    source={require("../../assets/images/send.png")}
                                    style={styles.sendIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {showLoader && tasks.length === 0 ? (
                        <ActivityIndicator size="large" color="#00664F" style={{ marginTop: 20 }} />
                    ) : (
                        <>
                            <TaskSection
                                title="Pending"
                                tasks={categorizedTasks.pending}
                                bg="#FFF1F2"
                                activeColor="#Fecdd3"
                                onStatusPress={handleStatusPress}
                                onDelete={handleDeleteTask}
                                role={role}
                                onViewImage={(img) => {
                                    setSelectedImage(img);
                                    setShowImageModal(true);
                                }}
                            />
                            <TaskSection
                                title="Updating"
                                tasks={categorizedTasks.updating}
                                bg="#FEFCE8"
                                activeColor="#Fef08a"
                                onStatusPress={handleStatusPress}
                                onDelete={handleDeleteTask}
                                role={role}
                                onViewImage={(img) => {
                                    setSelectedImage(img);
                                    setShowImageModal(true);
                                }}
                            />
                            <TaskSection
                                title="Completed"
                                tasks={categorizedTasks.completed}
                                bg="#F0FDF4"
                                activeColor="#bbf7d0"
                                onStatusPress={handleStatusPress}
                                onDelete={handleDeleteTask}
                                role={role}
                                onViewImage={(img) => {
                                    setSelectedImage(img);
                                    setShowImageModal(true);
                                }}
                            />
                        </>
                    )}
                </ScrollView>

                {/* Status Update Confirmation Modal */}
                <Modal
                    visible={updateModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setUpdateModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitleText}>Are you sure want to update?</Text>
                            <TouchableOpacity
                                style={styles.modalUpdateBtn}
                                onPress={confirmStatusUpdate}
                            >
                                <Text style={styles.modalUpdateBtnText}>Update</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setUpdateModalVisible(false);
                                    setTargetTask(null);
                                    setTargetStatus("");
                                }}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 🖼️ Full Screen Image Viewer Modal */}
                <Modal
                    visible={showImageModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowImageModal(false)}
                >
                    <TouchableOpacity
                        style={styles.imageViewerOverlay}
                        activeOpacity={1}
                        onPress={() => setShowImageModal(false)}
                    >
                        <TouchableOpacity
                            style={styles.closeImageBtn}
                            onPress={() => setShowImageModal(false)}
                        >
                            <Text style={styles.closeImageText}>✕ Close</Text>
                        </TouchableOpacity>

                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.fullScreenImage}
                                resizeMode="contain"
                            />
                        )}
                    </TouchableOpacity>
                </Modal>
            </View>
        </AppLayout>
    );
}

const TaskSection = ({ title, tasks, bg, activeColor, onStatusPress, onDelete, role, onViewImage }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {tasks.map(task => (
            <View key={task._id} style={styles.taskItemRow}>
                <View style={[styles.taskTextCard, { backgroundColor: bg }]}>
                    <View style={styles.taskCardContent}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.taskText}>{task.title}</Text>
                            {task.attachment && (
                                <TouchableOpacity
                                    style={styles.attachmentLink}
                                    onPress={() => onViewImage(task.attachment)}
                                >
                                    <View style={styles.attachmentTag}>
                                        <Image source={{ uri: task.attachment }} style={styles.tinyThumb} />
                                        <Text style={styles.attachmentText}>View Photo</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    {(role === "admin" || (role === "employee" && task.status === "Completed")) && (
                        <TouchableOpacity
                            onPress={() => onDelete(task._id)}
                            style={styles.deleteTaskBtn}
                            activeOpacity={0.6}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Image source={require("../../assets/images/delete.png")} style={styles.smallDeleteIcon} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.statusButtons}>
                    <StatusButton
                        label="P"
                        active={task.status === "Pending"}
                        activeColor="#Fecdd3"
                        onPress={() => onStatusPress(task, "Pending")}
                        disabled={role === "admin"}
                    />
                    <StatusButton
                        label="U"
                        active={task.status === "Updating"}
                        activeColor="#Fef08a"
                        onPress={() => onStatusPress(task, "Updating")}
                        disabled={role === "admin"}
                    />
                    <StatusButton
                        label="C"
                        active={task.status === "Completed"}
                        activeColor="#bbf7d0"
                        onPress={() => onStatusPress(task, "Completed")}
                        disabled={role === "admin"}
                    />
                </View>
            </View>
        ))}
        {tasks.length === 0 && <Text style={styles.emptyTasks}>No tasks in this section</Text>}
    </View>
);

const StatusButton = ({ label, active, activeColor, onPress, disabled }) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[
            styles.statusCircle,
            active && { backgroundColor: activeColor, borderColor: activeColor }
        ]}
    >
        <Text style={[styles.statusLabel, active && { color: "#1F2937" }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    scrollContent: { paddingHorizontal: getResponsiveSize(25), paddingTop: getResponsiveSize(10), paddingBottom: getResponsiveSize(100) },

    addWorkContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: getResponsiveSize(30),
        marginTop: getResponsiveSize(10),
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: getResponsiveSize(25),
        paddingHorizontal: getResponsiveSize(20),
        height: getResponsiveSize(50),
        marginRight: getResponsiveSize(15),
    },
    inputMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: getResponsiveFontSize(15),
        color: "#1F2937",
        fontFamily: "Inter-Regular",
    },
    previewContainer: {
        paddingRight: getResponsiveSize(10),
    },
    previewThumb: {
        width: getResponsiveSize(36),
        height: getResponsiveSize(36),
        borderRadius: getResponsiveSize(8),
        backgroundColor: '#E5E7EB',
    },
    removeBtn: {
        position: 'absolute',
        top: -10,
        right: 0,
        backgroundColor: '#EF4444',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    removeX: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
    },
    clipIcon: {
        width: getResponsiveSize(18),
        height: getResponsiveSize(18),
        tintColor: "#9CA3AF",
        resizeMode: 'contain',
    },
    sendBtn: {
        width: getResponsiveSize(50),
        height: getResponsiveSize(50),
        borderRadius: getResponsiveSize(25),
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center",
    },
    sendIcon: {
        width: getResponsiveSize(22),
        height: getResponsiveSize(22),
        tintColor: "#FFFFFF",
        resizeMode: 'contain',
    },

    section: { marginBottom: getResponsiveSize(30) },
    sectionTitle: {
        fontSize: getResponsiveFontSize(16),
        fontFamily: "Inter-SemiBold",
        color: "#4B5563",
        marginBottom: getResponsiveSize(20),
        marginLeft: getResponsiveSize(10),
    },
    taskItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: getResponsiveSize(15),
    },
    taskTextCard: {
        flex: 1,
        padding: getResponsiveSize(16),
        borderRadius: getResponsiveSize(18),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: getResponsiveSize(10),
        minHeight: getResponsiveSize(50),
    },
    taskText: {
        fontSize: getResponsiveFontSize(13),
        color: "#1F2937",
        fontFamily: "Inter-Medium",
        flex: 1,
    },
    statusButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusCircle: {
        width: getResponsiveSize(30),
        height: getResponsiveSize(30),
        borderRadius: getResponsiveSize(15),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: getResponsiveSize(5),
    },
    statusLabel: {
        fontSize: getResponsiveFontSize(11),
        fontFamily: "Inter-Bold",
        color: "#1F2937",
    },
    deleteTaskBtn: {
        padding: getResponsiveSize(10),
        marginLeft: getResponsiveSize(5),
    },
    smallDeleteIcon: {
        width: getResponsiveSize(20),
        height: getResponsiveSize(20),
        tintColor: "#EF4444", // Red for visibility
        resizeMode: 'contain',
    },
    emptyTasks: {
        fontSize: getResponsiveFontSize(13),
        color: "#D1D5DB",
        fontFamily: "Inter-Medium",
        marginLeft: getResponsiveSize(20),
    },
    attachmentBtn: {
        padding: getResponsiveSize(5),
        marginRight: getResponsiveSize(5),
    },
    removeText: {
        fontSize: getResponsiveFontSize(16),
        color: "#EF4444",
        paddingHorizontal: getResponsiveSize(10),
    },
    taskCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    attachmentLink: {
        marginTop: getResponsiveSize(8),
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: getResponsiveSize(10),
        padding: getResponsiveSize(8),
        alignSelf: 'flex-start',
    },
    attachmentTag: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tinyThumb: {
        width: getResponsiveSize(24),
        height: getResponsiveSize(24),
        borderRadius: getResponsiveSize(4),
        marginRight: getResponsiveSize(8),
        backgroundColor: '#E5E7EB',
    },
    attachmentText: {
        fontSize: getResponsiveFontSize(12),
        color: "#00664F",
        fontWeight: "600",
    },

    // Image Viewer Modal
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenImage: {
        width: width * 0.95,
        height: height * 0.8,
    },
    closeImageBtn: {
        position: "absolute",
        top: 50,
        right: 25,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 10,
    },
    closeImageText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: width * 0.8,
        backgroundColor: "#FFFFFF",
        borderRadius: getResponsiveSize(24),
        padding: getResponsiveSize(30),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    modalTitleText: {
        fontSize: getResponsiveFontSize(16),
        color: "#6B7280",
        fontFamily: "Inter-Medium",
        textAlign: "center",
        marginBottom: getResponsiveSize(30),
    },
    modalUpdateBtn: {
        width: "100%",
        height: getResponsiveSize(50),
        backgroundColor: "#00664F",
        borderRadius: getResponsiveSize(25),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: getResponsiveSize(12),
    },
    modalUpdateBtnText: {
        color: "#FFFFFF",
        fontSize: getResponsiveFontSize(16),
        fontWeight: "600",
        fontFamily: "Inter-SemiBold",
    },
    modalCancelBtn: {
        width: "100%",
        height: getResponsiveSize(44),
        justifyContent: "center",
        alignItems: "center",
    },
    modalCancelBtnText: {
        color: "#9CA3AF",
        fontSize: getResponsiveFontSize(14),
        fontFamily: "Inter-Medium",
    },
});
