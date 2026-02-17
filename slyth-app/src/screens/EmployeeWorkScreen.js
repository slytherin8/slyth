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
import AsyncStorage from "../utils/storage";

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

export default function EmployeeWorkScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const showLoader = useSmartLoader(loading);
  const [userId, setUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) fetchProjects(userId);
    }, [userId])
  );

  const initializeScreen = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.id);
      workService.joinRoom(payload.id);
      await fetchProjects(payload.id);
      await fetchProfile();
    } catch (e) {
      console.error("Auth error:", e);
    }
  };

  const fetchProjects = async (uId) => {
    setLoading(true);
    try {
      const data = await workService.getEmployeeProjects(uId);
      setProjects(data || []);
    } catch (error) {
      console.error("Fetch projects error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserProfile(data.profile);
    } catch (err) {
      console.log("PROFILE FETCH ERROR", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !userId) return;
    try {
      await workService.createProject({
        name: newFolderName,
        employeeId: userId
      });
      setNewFolderName("");
      setShowModal(false);
      fetchProjects(userId);
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
            try {
              await workService.deleteProject(projectId);
              fetchProjects(userId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete folder");
            }
          }
        }
      ]
    );
  };

  const renderFolderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.folderRow}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("ProjectTasks", {
        project: item,
        role: "employee"
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
  );

  return (
    <AppLayout
      navigation={navigation}
      role="employee"
      title={(userProfile?.name || "Employee") + "\nworkspace"}
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
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveSize(15),
    paddingBottom: getResponsiveSize(15),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
    paddingBottom: getResponsiveSize(15),
  },
  folderName: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Inter-SemiBold",
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
    backgroundColor: "rgba(31, 41, 55, 0.7)",
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
