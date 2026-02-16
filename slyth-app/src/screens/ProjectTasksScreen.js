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
    Platform
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppLayout from "../components/AppLayout";
import { workService } from "../services/workService";
import { useSmartLoader } from "../hooks/useSmartLoader";

const { width } = Dimensions.get('window');

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
    const { project, employee, role } = route.params;
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const showLoader = useSmartLoader(loading);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [targetTask, setTargetTask] = useState(null);
    const [targetStatus, setTargetStatus] = useState("");

    useEffect(() => {
        fetchTasks();

        // Socket listener for real-time updates
        const cleanup = role === "admin"
            ? workService.onAdminWorkUpdate(({ type, data }) => {
                if (type === "TASK_UPDATED" && data.projectId === project._id) {
                    setTasks(prev => prev.map(t => t._id === data._id ? data : t));
                }
            })
            : workService.onWorkUpdate(({ type, data }) => {
                if (type === "TASK_CREATED" && data.projectId === project._id) {
                    setTasks(prev => [data, ...prev]);
                } else if (type === "TASK_UPDATED" && data.projectId === project._id) {
                    setTasks(prev => prev.map(t => t._id === data._id ? data : t));
                } else if (type === "TASK_DELETED" && tasks.some(t => t._id === data.taskId)) {
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
        if (!newTaskTitle.trim()) return;
        try {
            const task = await workService.createTask({
                title: newTaskTitle,
                projectId: project._id,
                employeeId: employee?._id || project.employeeId // Fallback if employee obj not passed
            });
            setTasks(prev => [task, ...prev]);
            setNewTaskTitle("");
        } catch (error) {
            Alert.alert("Error", "Failed to assign work");
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
        if (role !== "admin") return;

        Alert.alert(
            "Delete Task",
            "Are you sure you want to delete this task?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await workService.deleteTask(taskId);
                            setTasks(prev => prev.filter(t => t._id !== taskId));
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete task");
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
                                <TextInput
                                    style={styles.input}
                                    placeholder="Add your work"
                                    placeholderTextColor="#9CA3AF"
                                    value={newTaskTitle}
                                    onChangeText={setNewTaskTitle}
                                />
                                <Image
                                    source={require("../../assets/images/copy.png")} // Using copy as placeholder for clip if needed
                                    style={styles.clipIcon}
                                />
                            </View>
                            <TouchableOpacity style={styles.sendBtn} onPress={handleCreateTask}>
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
                            />
                            <TaskSection
                                title="Updating"
                                tasks={categorizedTasks.updating}
                                bg="#FEFCE8"
                                activeColor="#Fef08a"
                                onStatusPress={handleStatusPress}
                                onDelete={handleDeleteTask}
                                role={role}
                            />
                            <TaskSection
                                title="Completed"
                                tasks={categorizedTasks.completed}
                                bg="#F0FDF4"
                                activeColor="#bbf7d0"
                                onStatusPress={handleStatusPress}
                                onDelete={handleDeleteTask}
                                role={role}
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
            </View>
        </AppLayout>
    );
}

const TaskSection = ({ title, tasks, bg, activeColor, onStatusPress, onDelete, role }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {tasks.map(task => (
            <View key={task._id} style={styles.taskItemRow}>
                <View style={[styles.taskTextCard, { backgroundColor: bg }]}>
                    <Text style={styles.taskText}>{task.title}</Text>
                    {role === "admin" && (
                        <TouchableOpacity onPress={() => onDelete(task._id)} style={styles.deleteTaskBtn}>
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
    input: {
        flex: 1,
        fontSize: getResponsiveFontSize(15),
        color: "#1F2937",
        fontFamily: "Inter-Regular",
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
        padding: getResponsiveSize(5),
    },
    smallDeleteIcon: {
        width: getResponsiveSize(16),
        height: getResponsiveSize(16),
        tintColor: "#9CA3AF",
        resizeMode: 'contain',
    },
    emptyTasks: {
        fontSize: getResponsiveFontSize(13),
        color: "#D1D5DB",
        fontFamily: "Inter-Medium",
        marginLeft: getResponsiveSize(20),
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
