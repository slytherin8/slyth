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
  StatusBar
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '../utils/storage';
import { API } from '../constants/api';

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e2) {
      return null;
    }
  }
};

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
        Alert.alert("Success", "Group updated successfully", [
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

  const formatDate = (dateString) => {
    if (!dateString) return "Feb 4, 2025"; // Placeholder date if missing
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo Selection */}
        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.largeAvatar} />
              ) : (
                <View style={[styles.largeAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase() || "G"}</Text>
                </View>
              )}
            </View>
            <View style={styles.cameraIconBadge}>
              <Image
                source={require("../../assets/images/set-profile.png")}
                style={styles.cameraIcon}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Search here"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.inputLabel}>Group Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Team's purpose, scope, focusing on user-centered products"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.membersTitle}>Members</Text>

          {employees.map((item, index) => {
            const isSelected = selectedMembers.includes(item._id);
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.memberItem}
                onPress={() => toggleMember(item._id)}
                activeOpacity={0.7}
              >
                <View style={styles.memberAvatarContainer}>
                  {item.profile?.avatar ? (
                    <Image source={{ uri: item.profile.avatar }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, styles.avatarPlaceholderMini]}>
                      <Text style={styles.avatarInitialMini}>
                        {item.role === 'admin' ? 'A' : (item.profile?.name || item.name || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {item.role === 'admin' ? 'Admin' : (item.profile?.name || item.name || "Employee")}
                  </Text>
                  <Text style={styles.memberRole}>
                    {item.role === 'admin' ? 'Admin' : 'Employee'}
                  </Text>
                  <Text style={styles.memberJoined}>Joined {formatDate(item.createdAt)}</Text>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#4B5563" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={updateGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatarPlaceholder: {
    backgroundColor: '#FFD966',
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 52,
    fontWeight: '800',
    color: '#D97706',
    includeFontPadding: false,
    textAlign: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  inputSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    paddingTop: 15,
    borderRadius: 20,
    textAlignVertical: 'top',
  },
  membersSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    marginLeft: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholderMini: {
    backgroundColor: '#FFD966',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialMini: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D97706',
    includeFontPadding: false,
    textAlign: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedBox: {
    borderColor: '#9CA3AF', // Matches the gray tick look
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#006644', // Dark green matching the image
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: "#006644",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 15,
  },
});

