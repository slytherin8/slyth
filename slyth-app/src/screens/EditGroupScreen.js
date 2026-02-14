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
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Photo Section */}
        <View style={styles.photoSection}>
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
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Group Details Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Group Description</Text>
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

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>

          {employees.map((employee) => (
            <TouchableOpacity
              key={employee._id}
              style={styles.memberItem}
              onPress={() => toggleMember(employee._id)}
            >
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
                <Text style={styles.memberRole}>Employee</Text>
                <Text style={styles.memberJoined}>
                  Joined {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              <View style={[
                styles.checkbox,
                selectedMembers.includes(employee._id) && styles.checkboxSelected
              ]}>
                {selectedMembers.includes(employee._id) && (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={updateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff"
  },
  backButton: {
    padding: 4
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20
  },
  photoContainer: {
    position: "relative"
  },
  groupPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FCD34D",
    justifyContent: "center",
    alignItems: "center"
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: "600",
    color: "#fff"
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#25D366",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff"
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#111827"
  },
  textArea: {
    height: 100,
    textAlignVertical: "top"
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  memberAvatarText: {
    fontSize: 18,
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
  memberRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  checkboxSelected: {
    backgroundColor: "#25D366",
    borderColor: "#25D366"
  },
  saveButton: {
    backgroundColor: "#25D366",
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5
  }
});
