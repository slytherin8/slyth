import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from "react-native";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";
import { useSmartLoader } from "../hooks/useSmartLoader";

const { width } = Dimensions.get("window");

export default function EmployeeProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useSmartLoader(loading);

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
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <View style={styles.backCircle}>
            <Image source={require("../../assets/images/back-arrow.png")} style={styles.backIcon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("EmployeeProfileEdit")} style={styles.iconButton}>
          <Image source={require("../../assets/images/edit.png")} style={styles.editIconHeader} />
        </TouchableOpacity>
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {profile?.profile?.avatar ? (
            <Image source={{ uri: profile.profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile?.profile?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Info Card - WhatsApp Style */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} numberOfLines={1}>{profile?.email || "N/A"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>User Name</Text>
          <Text style={styles.value}>{profile?.profile?.name || "N/A"}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{profile?.profile?.jobRole || (profile?.role === 'admin' ? 'Admin' : 'Employee')}</Text>
        </View>
      </View>
      {showLoader && !profile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00664F" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    height: 80,
  },
  iconButton: {
    padding: 8,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: "#374151"
  },
  editIconHeader: {
    width: 24,
    height: 24,
    tintColor: "#374151"
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarPlaceholderText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#9CA3AF"
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 25,
    borderRadius: 25,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center"
  },
  label: {
    width: 100,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500"
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
    textAlign: "right"
  }
});
