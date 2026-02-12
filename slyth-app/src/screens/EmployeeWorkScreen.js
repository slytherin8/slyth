/* global atob */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput
} from "react-native";
import AppLayout from "../components/AppLayout";
import { workService } from "../services/workService";
import AsyncStorage from "../utils/storage";

export default function EmployeeWorkScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({}); // { projectId: [tasks] }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Navigation State
  const [selectedProject, setSelectedProject] = useState(null);

  // Status Update Modal State
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [tempStatus, setTempStatus] = useState("");

  useEffect(() => {
    initializeScreen();

    // Socket listener for real-time updates from admin
    const cleanup = workService.onWorkUpdate(({ type, data }) => {
      if (type === "PROJECT_CREATED") {
        setProjects(prev => [data, ...prev]);
        setTasks(prev => ({ ...prev, [data._id]: [] }));
      } else if (type === "TASK_CREATED") {
        setTasks(prev => ({
          ...prev,
          [data.projectId]: [data, ...(prev[data.projectId] || [])]
        }));
      } else if (type === "TASK_UPDATED") {
        updateTaskInState(data);
      } else if (type === "TASK_DELETED") {
        removeTaskFromState(data.taskId);
      }
    });

    return cleanup;
  }, []);

  const updateTaskInState = (updatedTask) => {
    setTasks(prev => {
      const projectTasks = prev[updatedTask.projectId] || [];
      const index = projectTasks.findIndex(t => t._id === updatedTask._id);
      if (index !== -1) {
        const newProjectTasks = [...projectTasks];
        newProjectTasks[index] = updatedTask;
        return { ...prev, [updatedTask.projectId]: newProjectTasks };
      }
      return prev;
    });
  };

  const removeTaskFromState = (taskId) => {
    setTasks(prev => {
      const newTasks = { ...prev };
      Object.keys(newTasks).forEach(projId => {
        newTasks[projId] = newTasks[projId].filter(t => t._id !== taskId);
      });
      return newTasks;
    });
  };

  const initializeScreen = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.id);
      workService.joinRoom(payload.id);
      await fetchData(payload.id);
    } catch (e) {
      console.error("Auth error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (uId) => {
    try {
      const empProjects = await workService.getEmployeeProjects(uId);
      setProjects(empProjects);

      const allTasks = {};
      for (const project of empProjects) {
        const projectTasks = await workService.getProjectTasks(project._id);
        allTasks[project._id] = projectTasks;
      }
      setTasks(allTasks);
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(userId);
    setRefreshing(false);
  };

  const openStatusModal = (task, newStatus) => {
    setEditingTask(task);
    setTempStatus(newStatus);
    setStatusModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    try {
      const updatedTask = await workService.updateTask(editingTask._id, {
        status: tempStatus
      });
      updateTaskInState(updatedTask);
      setStatusModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const categorizeTasks = (projId) => {
    const projectTasks = tasks[projId] || [];
    return {
      pending: projectTasks.filter(t => t.status === "Pending"),
      updating: projectTasks.filter(t => t.status === "Updating"),
      completed: projectTasks.filter(t => t.status === "Completed")
    };
  };

  const renderProjectList = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Workspace</Text>
      </View>

      {projects.map(project => (
        <TouchableOpacity
          key={project._id}
          style={styles.folderCard}
          onPress={() => setSelectedProject(project)}
        >
          <View style={styles.folderIconContainer}>
            <Image source={require("../../assets/images/files.png")} style={styles.folderIcon} />
          </View>
          <View style={styles.folderInfo}>
            <Text style={styles.folderName}>{project.name}</Text>
            <Text style={styles.folderDesc} numberOfLines={1}>{project.description || "Project details"}</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>
      ))}
      {projects.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects assigned yet</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderProjectDetails = () => {
    const categorized = categorizeTasks(selectedProject._id);
    return (
      <View style={styles.flex1}>
        <View style={styles.wsHeaderStrip}>
          <TouchableOpacity onPress={() => setSelectedProject(null)}>
            <Image source={require("../../assets/images/back-arrow.png")} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.wsHeaderTitle}>{selectedProject.name}</Text>
          <View style={styles.placeholderIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.taskScrollContent}>
          <TaskSection
            title="Pending"
            tasks={categorized.pending}
            color="#FFF1F2"
            onStatusClick={openStatusModal}
          />
          <TaskSection
            title="Updating"
            tasks={categorized.updating}
            color="#FEFCE8"
            onStatusClick={openStatusModal}
          />
          <TaskSection
            title="Completed"
            tasks={categorized.completed}
            color="#F0FDF4"
            onStatusClick={openStatusModal}
          />
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <AppLayout navigation={navigation} role="employee">
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      </AppLayout>
    );
  }

  return (
    <AppLayout navigation={navigation} role="employee">
      <View style={styles.container}>
        {!selectedProject ? renderProjectList() : renderProjectDetails()}
      </View>

      {/* Status Update Modal */}
      <Modal visible={statusModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Task Status</Text>
            <Text style={styles.modalSub}>Updating to: <Text style={{ fontWeight: '700' }}>{tempStatus}</Text></Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleUpdateStatus}>
                <Text style={styles.confirmBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const TaskSection = ({ title, tasks, color, onStatusClick }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <View key={task._id} style={[styles.taskCard, { backgroundColor: color }]}>
        <View style={styles.flex1}>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>
        <View style={styles.statusControls}>
          {["Pending", "Updating", "Completed"].map(st => (
            <TouchableOpacity
              key={st}
              onPress={() => onStatusClick(task, st)}
              style={[styles.statusMiniBtn, task.status === st && styles.activeStatusBtn]}
            >
              <Text style={[styles.statusMiniBtnText, task.status === st && styles.activeStatusBtnText]}>
                {st.charAt(0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ))}
    {tasks.length === 0 && <Text style={styles.noTasks}>No tasks in this category</Text>}
  </View>
);

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 30, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "600", color: "#1F2937" },

  folderCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#115E59",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15
  },
  folderIcon: { width: 24, height: 24, tintColor: "#fff" },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  folderDesc: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  arrowIcon: { fontSize: 24, color: "#D1D5DB" },

  wsHeaderStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20
  },
  backIcon: { width: 32, height: 32, tintColor: "#1F2937" },
  wsHeaderTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  placeholderIcon: { width: 32 },

  taskScrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 15 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 15,
    marginBottom: 10
  },
  taskTitle: { fontSize: 14, color: "#1F2937", fontWeight: "500" },
  taskDesc: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  noTasks: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginLeft: 5 },

  statusControls: { flexDirection: "row", gap: 5 },
  statusMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center"
  },
  activeStatusBtn: { backgroundColor: "#115E59", borderColor: "#115E59" },
  statusMiniBtnText: { fontSize: 11, color: "#9CA3AF", fontWeight: "700" },
  activeStatusBtnText: { color: "#fff" },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  modalSub: { fontSize: 14, color: "#6B7280", marginBottom: 20 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: "#6B7280", fontWeight: "600" },
  confirmBtn: { backgroundColor: "#115E59", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginLeft: 10 },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
  adminReplyBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#166534"
  },
  adminReplyLabel: {
    fontSize: 10,
    color: "#166534",
    fontWeight: "700",
    marginBottom: 2
  },
  adminReplyText: {
    fontSize: 12,
    color: "#1F2937"
  }
});
