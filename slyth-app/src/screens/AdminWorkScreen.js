import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Modal,
  Platform
} from "react-native";
import AppLayout from "../components/AppLayout";
import { workService } from "../services/workService";
import AsyncStorage from "../utils/storage";
import api from "../services/api"; // Changed from import { API } from "../constants/api";

export default function AdminWorkScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]); // Selected project's tasks
  const [employeeTaskStats, setEmployeeTaskStats] = useState({}); // { employeeId: { total, completed } }

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Form States
  const [newProject, setNewProject] = useState({ name: "" });
  const [newTask, setNewTask] = useState({ title: "" });

  useEffect(() => {
    fetchEmployees();

    // Socket listener for real-time updates
    const cleanup = workService.onAdminWorkUpdate(({ employeeId, type, data }) => {
      if (type === "TASK_UPDATED") {
        if (selectedEmployee && selectedEmployee._id === employeeId && selectedProject && selectedProject._id === data.projectId) {
          setTasks(prev => prev.map(t => t._id === data._id ? data : t));
        }
        // Update stats
        fetchEmployeeStats(employeeId);
      }
    });
    return cleanup;
  }, [selectedEmployee, selectedProject]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await workService.getEmployees();
      setEmployees(data);
      setFilteredEmployees(data);

      // Fetch stats for all visible employees
      data.forEach(emp => fetchEmployeeStats(emp._id));
    } catch (error) {
      console.error("Fetch employees error:", error);
      Alert.alert("Error", "Failed to fetch employees. Check if you are Admin.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeStats = async (employeeId) => {
    try {
      const empProjects = await workService.getEmployeeProjects(employeeId);
      let total = 0;
      let completed = 0;

      for (const proj of empProjects) {
        const projTasks = await workService.getProjectTasks(proj._id);
        total += projTasks.length;
        completed += projTasks.filter(t => t.status === "Completed").length;
      }

      setEmployeeTaskStats(prev => ({
        ...prev,
        [employeeId]: { total, completed }
      }));
    } catch (err) {
      console.log("Stats error for", employeeId, err);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = employees.filter(emp =>
      emp.name?.toLowerCase().includes(text.toLowerCase()) ||
      emp.email?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  const openEmployeeWorkspace = async (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    try {
      const empProjects = await workService.getEmployeeProjects(employee._id);
      setProjects(empProjects);
    } catch (error) {
      Alert.alert("Error", "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const openProjectDetails = async (project) => {
    setSelectedProject(project);
    setLoading(true);
    try {
      const projectTasks = await workService.getProjectTasks(project._id);
      setTasks(projectTasks);
    } catch (error) {
      Alert.alert("Error", "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    try {
      const project = await workService.createProject({
        name: newProject.name,
        employeeId: selectedEmployee._id
      });
      setProjects([project, ...projects]);
      setNewProject({ name: "" });
      setShowProjectModal(false);
    } catch (error) {
      console.error("Create project error details:", error);
      Alert.alert("Error", "Failed to create project. Status 403 Forbidden. Check your role.");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title) return;
    try {
      const task = await workService.createTask({
        ...newTask,
        projectId: selectedProject._id,
        employeeId: selectedEmployee._id
      });
      setTasks([task, ...tasks]);
      setNewTask({ title: "" });
      setShowTaskModal(false);
      // Update stats
      fetchEmployeeStats(selectedEmployee._id);
    } catch (error) {
      Alert.alert("Error", "Failed to add task");
    }
  };

  const handleDeleteProject = async (projectId) => {
    console.log("Attempting to delete project:", projectId);

    const confirm = async (message, callback) => {
      if (Platform.OS === 'web') {
        if (window.confirm(message)) await callback();
      } else {
        Alert.alert("Delete Confirmation", message, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: callback }
        ]);
      }
    };

    await confirm("This will delete the project and all its tasks. Are you sure?", async () => {
      console.log("Confirm delete project:", projectId);
      try {
        await workService.deleteProject(projectId);
        console.log("Project deleted successfully:", projectId);
        setProjects(prev => prev.filter(p => p._id !== projectId));
        fetchEmployeeStats(selectedEmployee._id);
      } catch (error) {
        console.error("Delete project error:", error);
        Alert.alert("Error", "Failed to delete project");
      }
    });
  };

  const handleDeleteTask = async (taskId) => {
    console.log("Attempting to delete task:", taskId);

    const confirm = async (message, callback) => {
      if (Platform.OS === 'web') {
        if (window.confirm(message)) await callback();
      } else {
        Alert.alert("Delete Confirmation", message, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: callback }
        ]);
      }
    };

    await confirm("Are you sure you want to delete this task?", async () => {
      console.log("Confirm delete task:", taskId);
      try {
        await workService.deleteTask(taskId);
        console.log("Task deleted successfully:", taskId);
        setTasks(prev => prev.filter(t => t._id !== taskId));
        fetchEmployeeStats(selectedEmployee._id);
      } catch (error) {
        console.error("Delete task error:", error);
        Alert.alert("Error", "Failed to delete task");
      }
    });
  };

  const categorizeTasks = useMemo(() => {
    return {
      pending: tasks.filter(t => t.status === "Pending"),
      updating: tasks.filter(t => t.status === "Updating"),
      completed: tasks.filter(t => t.status === "Completed")
    };
  }, [tasks]);

  const handleBack = () => {
    if (selectedProject) {
      setSelectedProject(null);
    } else if (selectedEmployee) {
      setSelectedEmployee(null);
    } else {
      navigation.goBack();
    }
  };

  const renderMemberScreen = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>All Employee Progress</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Image source={require("../../assets/images/home.png")} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for member"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const stats = employeeTaskStats[item._id] || { total: 0, completed: 0 };
          const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

          return (
            <TouchableOpacity
              style={styles.memberCard}
              onPress={() => openEmployeeWorkspace(item)}
            >
              <View style={styles.avatarContainer}>
                {item.profile?.avatar ? (
                  <Image source={{ uri: item.profile.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>{item.name || item.email.split('@')[0]}</Text>
                <Text style={styles.empEmail}>{item.email}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </>
  );

  const renderProjectScreen = () => (
    <View style={styles.flex1}>
      <View style={styles.customSubHeader}>
        <Text style={styles.wsHeaderTitle}>{selectedEmployee.name || "Employee"}'s workspace</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => openEmployeeWorkspace(selectedEmployee)}>
          <Image source={require("../../assets/images/react-logo.png")} style={styles.refreshIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.workspaceContent}>
        {projects.map(project => (
          <View key={project._id} style={styles.folderRow}>
            <TouchableOpacity
              style={styles.folderCard}
              onPress={() => openProjectDetails(project)}
            >
              <View style={styles.folderIconContainer}>
                <Image source={require("../../assets/images/files.png")} style={styles.folderIcon} />
              </View>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName}>{project.name}</Text>
                <Text style={styles.folderDesc} numberOfLines={1}>Click to see tasks</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteProject(project._id)}
              style={styles.folderDeleteBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // Increase tap area
            >
              <Text style={styles.trashIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
        {projects.length === 0 && <Text style={styles.emptyText}>No projects yet</Text>}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowProjectModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTaskScreen = () => {
    return (
      <View style={styles.flex1}>
        <View style={styles.customSubHeader}>
          <View>
            <Text style={styles.wsHeaderTitle}>{selectedProject.name}</Text>
            <Text style={styles.progressSummary}>
              Completed {categorizeTasks.completed.length}/{tasks.length} tasks
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => openProjectDetails(selectedProject)}>
            <Image source={require("../../assets/images/react-logo.png")} style={styles.refreshIcon} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.taskContainer}>
          <View style={styles.addTaskContainer}>
            <TextInput
              style={styles.addTaskInput}
              placeholder="Add your work"
              value={newTask.title}
              onChangeText={(t) => setNewTask({ title: t })}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleCreateTask}
            >
              <Image source={require("../../assets/images/chat.png")} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>

          <TaskSection
            title="Pending"
            tasks={categorizeTasks.pending}
            color="#FFF1F2"
            onDelete={handleDeleteTask}
          />
          <TaskSection
            title="Updating"
            tasks={categorizeTasks.updating}
            color="#FEFCE8"
            onDelete={handleDeleteTask}
          />
          <TaskSection
            title="Completed"
            tasks={categorizeTasks.completed}
            color="#F0FDF4"
            onDelete={handleDeleteTask}
          />
        </ScrollView>
      </View>
    );
  };

  return (
    <AppLayout navigation={navigation} role="admin" onBack={handleBack}>
      <View style={styles.container}>
        {loading && !selectedEmployee && (
          <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
        )}

        {!selectedEmployee ? renderMemberScreen() :
          (!selectedProject ? renderProjectScreen() : renderTaskScreen())
        }
      </View>

      {/* Project Modal */}
      <Modal visible={showProjectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalFolderHeader}>
              <View style={styles.bigFolderIcon}>
                <Image source={require("../../assets/images/files.png")} style={styles.bigFolderImg} />
              </View>
            </View>
            <Text style={styles.modalLabel}>Enter Folder Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project name"
              value={newProject.name}
              onChangeText={(t) => setNewProject({ name: t })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateProject}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelLink} onPress={() => setShowProjectModal(false)}>
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppLayout>

  );
}

const TaskSection = ({ title, tasks, color, onDelete }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <View key={task._id} style={[styles.taskCard, { backgroundColor: color }]}>
        <View style={styles.flex1}>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.taskDeleteBtn}
          onPress={() => onDelete(task._id)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Increase tap area
        >
          <Text style={styles.trashIconSmall}>🗑</Text>
        </TouchableOpacity>
      </View>
    ))}
    {tasks.length === 0 && <Text style={styles.emptyTextSmall}>No tasks</Text>}
  </View>
);



const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 10, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  searchIcon: { width: 16, height: 16, marginRight: 10, tintColor: "#9CA3AF" },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  listContent: { paddingHorizontal: 20 },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: { fontSize: 16, fontWeight: "600", color: "#EF4444" },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  empEmail: { fontSize: 13, color: "#6B7280" },
  arrowIcon: { fontSize: 20, color: "#D1D5DB" },

  customSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  wsHeaderTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  progressSummary: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center"
  },
  refreshIcon: { width: 18, height: 18, tintColor: "#166534" },

  workspaceContent: { padding: 20 },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  folderCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#115E59",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  folderIcon: { width: 20, height: 20, tintColor: "#fff" },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 14, fontWeight: "500", color: "#1F2937" },
  folderDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  folderDeleteBtn: {
    padding: 15,
    justifyContent: "center",
    alignItems: "center"
  },

  trashIcon: { fontSize: 18, color: "#EF4444" },
  trashIconSmall: { fontSize: 16, color: "#EF4444" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#115E59",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "300" },

  taskContainer: { padding: 20, paddingBottom: 100 },
  addTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingLeft: 15,
    paddingRight: 5,
    height: 45,
    marginBottom: 20
  },
  addTaskInput: { flex: 1, fontSize: 14 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#115E59",
    justifyContent: "center",
    alignItems: "center"
  },
  sendIcon: { width: 18, height: 18, tintColor: "#fff", transform: [{ rotate: "45deg" }] },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 12 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 8
  },
  taskTitle: { fontSize: 13, color: "#1F2937", fontWeight: "500", flex: 1 },
  taskDeleteBtn: {
    padding: 10
  },

  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  emptyTextSmall: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginLeft: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 25,
    alignItems: "center"
  },
  modalFolderHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#115E59",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15
  },
  bigFolderImg: { width: 24, height: 24, tintColor: "#fff" },
  modalLabel: { fontSize: 13, color: "#4B5563", marginBottom: 8 },
  modalInput: {
    width: "100%",
    height: 45,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 14,
    marginBottom: 15
  },
  modalButtons: { width: "100%", alignItems: "center" },
  createBtn: {
    width: "100%",
    height: 45,
    backgroundColor: "#115E59",
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelLinkText: { color: "#6B7280", fontSize: 14 }
});
