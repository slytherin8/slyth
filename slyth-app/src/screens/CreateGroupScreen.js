import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '../utils/storage';

import { API } from '../constants/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const headers = await getAuthHeaders();
      console.log("Fetching employees from:", `${API}/api/chat/employees`);
      console.log("Headers:", headers);

      // Debug: Check token content
      const token = await AsyncStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log("Current user from token:", payload);
          console.log("User role:", payload.role);
        } catch (e) {
          console.log("Invalid token format:", e);
        }
      }

      const response = await fetch(`${API}/api/chat/employees`, {
        method: "GET",
        headers
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error response:", errorText);

        if (response.status === 403) {
          Alert.alert(
            "Access Denied",
            "You need admin privileges to view employees. Please login as admin.",
            [
              { text: "Go to Login", onPress: () => navigation.navigate("Login") },
              { text: "Cancel", onPress: () => navigation.goBack() }
            ]
          );
          return;
        }

        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Employees data:", data);
      setEmployees(data);
    } catch (error) {
      console.error("Fetch employees error:", error);
      Alert.alert("Error", `Failed to fetch employees: ${error.message}`);
      // Show a retry option
      Alert.alert(
        "Connection Error",
        "Unable to load employees. Make sure the server is running.",
        [
          { text: "Retry", onPress: fetchEmployees },
          { text: "Cancel", onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setFetchingEmployees(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload group photo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64Image);
    }
  };

  const toggleMemberSelection = (employeeId) => {
    setSelectedMembers(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: groupName.trim(),
          description: description.trim(),
          profilePhoto,
          memberIds: selectedMembers
        })
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Group Creation Failed", data.message || "Failed to create group");
        return;
      }

      Alert.alert("Success", "Group created successfully", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("AdminChat");
          }
        }
      ]);
    } catch (error) {
      Alert.alert("Group Creation Failed", error.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingEmployees) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00664F" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <TouchableOpacity onPress={createGroup} disabled={loading}>
          <Text style={[styles.createButton, loading && styles.disabledButton]}>
            {loading ? "Creating..." : "Create"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {/* Group Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Photo</Text>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.groupPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Group Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>

          <TextInput
            style={styles.input}
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Members Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Members ({selectedMembers.length} selected)
          </Text>

          {employees.length === 0 ? (
            <Text style={styles.noEmployeesText}>
              No active employees found
            </Text>
          ) : (
            employees.map((employee) => (
              <TouchableOpacity
                key={employee._id}
                style={[
                  styles.employeeItem,
                  selectedMembers.includes(employee._id) && styles.selectedEmployee
                ]}
                onPress={() => toggleMemberSelection(employee._id)}
              >
                <View style={styles.employeeInfo}>
                  <View style={styles.avatar}>
                    {employee.profile?.avatar ? (
                      <Image
                        source={{ uri: employee.profile.avatar }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {employee.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    )}
                  </View>
                  <View style={styles.employeeDetails}>
                    <Text style={styles.employeeName}>
                      {employee.profile?.name || employee.name || employee.email}
                    </Text>
                    <Text style={styles.employeeEmail}>{employee.role === 'admin' ? 'Admin' : 'Employee'}</Text>
                    {!employee.isActive && (
                      <Text style={styles.inactiveText}>Not logged in yet</Text>
                    )}
                    {!employee.profileCompleted && employee.isActive && (
                      <Text style={styles.incompleteText}>Profile incomplete</Text>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedMembers.includes(employee._id) && styles.checkedBox
                ]}>
                  {selectedMembers.includes(employee._id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  cancelButton: {
    color: "#64748B",
    fontSize: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  createButton: {
    color: "#00664F",
    fontSize: 16,
    fontWeight: "600"
  },
  disabledButton: {
    color: "#94A3B8"
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1
  },
  section: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 15
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 20
  },
  groupPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0"
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed"
  },
  photoPlaceholderText: {
    fontSize: 30,
    marginBottom: 5
  },
  photoText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500"
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  noEmployeesText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 20
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  selectedEmployee: {
    borderColor: "#00664F",
    backgroundColor: "#EFF6FF"
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative"
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B"
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff"
  },
  activeDot: {
    backgroundColor: "#10B981"
  },
  inactiveDot: {
    backgroundColor: "#6B7280"
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  activeText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500"
  },
  employeeDetails: {
    flex: 1
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 2
  },
  employeeEmail: {
    fontSize: 14,
    color: "#64748B"
  },
  inactiveText: {
    fontSize: 12,
    color: "#F59E0B",
    fontStyle: "italic"
  },
  incompleteText: {
    fontSize: 12,
    color: "#EF4444",
    fontStyle: "italic"
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center"
  },
  checkedBox: {
    backgroundColor: "#00664F",
    borderColor: "#00664F"
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold"
  }
});
