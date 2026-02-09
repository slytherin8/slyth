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

export default function EditGroupScreen({ route, navigation }) {
  const { groupId, groupName, groupDescription, groupPhoto } = route.params;

  const [name, setName] = useState(groupName || "");
  const [description, setDescription] = useState(groupDescription || "");
  const [profilePhoto, setProfilePhoto] = useState(groupPhoto || null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchGroupDetails();
  }, []);

  const fetchEmployees = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/employees`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (response.ok) {
        setEmployees(data);
      }
    } catch (error) {
      console.log("Failed to fetch employees:", error);
    }
  };

  const fetchGroupDetails = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (response.ok) {
        setGroupMembers(data.members || []);
        setSelectedMembers(data.members?.map(member => member.userId._id) || []);
      }
    } catch (error) {
      console.log("Failed to fetch group details:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      setProfilePhoto(base64Image);
    }
  };

  const toggleMember = (employeeId) => {
    setSelectedMembers(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const updateGroup = async () => {
    if (!name.trim()) {
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
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          profilePhoto,
          memberIds: selectedMembers
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success! 🎉", `Group "${name}" has been updated successfully!`, [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to update group");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async () => {
    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
                method: "DELETE",
                headers
              });

              if (response.ok) {
                Alert.alert("Success! 🗑️", "Group has been deleted successfully!", [
                  { text: "OK", onPress: () => navigation.navigate("AdminChat") }
                ]);
              } else {
                Alert.alert("Error", "Failed to delete group");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete group");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {/* Group Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Group Photo</Text>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.groupPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {name.charAt(0).toUpperCase() || "G"}
                </Text>
              </View>
            )}
            <View style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>📷</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Group Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter group description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members ({selectedMembers.length} selected)
          </Text>

          {employees.map((employee) => (
            <TouchableOpacity
              key={employee._id}
              style={styles.memberItem}
              onPress={() => toggleMember(employee._id)}
            >
              <View style={styles.memberInfo}>
                <View style={styles.memberAvatar}>
                  {employee.profile?.avatar ? (
                    <Image
                      source={{ uri: employee.profile.avatar }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <Text style={styles.memberAvatarText}>
                      {employee.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>
                    {employee.profile?.name || "No Name"}
                  </Text>
                  <Text style={styles.memberEmail}>{employee.email}</Text>
                </View>
              </View>

              <View style={[
                styles.checkbox,
                selectedMembers.includes(employee._id) && styles.checkboxSelected
              ]}>
                {selectedMembers.includes(employee._id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={updateGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Update Group</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={deleteGroup}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Group</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 15
  },
  photoContainer: {
    position: "relative"
  },
  groupPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  photoPlaceholderText: {
    fontSize: 36,
    fontWeight: "600",
    color: "#fff"
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563EB",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff"
  },
  photoOverlayText: {
    fontSize: 16
  },
  section: {
    marginBottom: 30
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff"
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280"
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  memberEmail: {
    fontSize: 14,
    color: "#6B7280"
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center"
  },
  checkboxSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  buttonSection: {
    marginTop: 20,
    marginBottom: 40
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12
  },
  updateButton: {
    backgroundColor: "#2563EB"
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DC2626"
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600"
  }
});
