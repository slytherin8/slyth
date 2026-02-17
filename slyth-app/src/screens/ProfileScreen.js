import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";
import { useSmartLoader } from "../hooks/useSmartLoader";

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useSmartLoader(loading);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setProfile(data);
        setName(data.profile?.name || "");
        setJobRole(data.profile?.jobRole || "");
        setAvatar(data.profile?.avatar || "");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5
    });

    if (!result.canceled) {
      setAvatar(`data:image/png;base64,${result.assets[0].base64}`);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          jobRole: jobRole.trim(),
          avatar
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to save profile");
        return;
      }

      const homeRoute = profile?.role === "admin" ? "AdminDashboard" : "EmployeeHome";
      Alert.alert("Success! 🎉", "Profile updated successfully", [
        { text: "OK", onPress: () => navigation.navigate(homeRoute) }
      ]);
      setEditing(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("token");
            navigation.replace("Welcome");
          }
        }
      ]
    );
  };


  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editButton}>
          <Text style={styles.editText}>{editing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={editing ? pickImage : null} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          {editing && (
            <View style={styles.editAvatarOverlay}>
              <Text style={styles.editAvatarText}>Edit</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={styles.value}>{name || "Not set"}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Job Role</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={jobRole}
                onChangeText={setJobRole}
                placeholder="Enter your job role"
              />
            ) : (
              <Text style={styles.value}>{jobRole || "Not set"}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile?.email || "Not available"}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <Text style={[styles.value, styles.roleText]}>
              {profile?.role === "admin" ? "Administrator" : "Employee"}
            </Text>
          </View>
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {showLoader && !profile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00664F" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      )}
    </ScrollView>
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  backButton: {
    padding: 8
  },
  backText: {
    fontSize: 24,
    color: "#374151"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937"
  },
  editButton: {
    padding: 8
  },
  editText: {
    fontSize: 16,
    color: "#00664F",
    fontWeight: "600"
  },
  content: {
    padding: 20
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 30,
    position: "relative"
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "600",
    color: "#6B7280"
  },
  editAvatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00664F",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  editAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  },
  field: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8
  },
  value: {
    fontSize: 16,
    color: "#1F2937"
  },
  roleText: {
    color: "#00664F",
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB"
  },
  saveButton: {
    backgroundColor: "#00664F",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 20
  },
  saveButtonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    padding: 16,
    alignItems: "center"
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});