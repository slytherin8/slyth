import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert
} from "react-native";
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

export default function GroupInfoScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;

  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchGroupInfo();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      }
    } catch (error) {
      console.log("Token decode error:", error);
    }
  };

  const fetchGroupInfo = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (response.ok) {
        setGroupInfo(data);
      } else {
        Alert.alert("Error", "Failed to fetch group information");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch group information");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading group info...</Text>
      </View>
    );
  }

  if (!groupInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load group information</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchGroupInfo}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Group Avatar and Name */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {groupInfo.profilePhoto ? (
              <Image
                source={{ uri: groupInfo.profilePhoto }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {groupInfo.name?.charAt(0)?.toUpperCase() || "G"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.groupName}>{groupInfo.name}</Text>

          {groupInfo.description && (
            <Text style={styles.groupDescription}>{groupInfo.description}</Text>
          )}
        </View>

        {/* Group Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {formatDate(groupInfo.createdAt)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created By</Text>
            <Text style={styles.infoValue}>
              {groupInfo.createdBy?.profile?.name || "Unknown"}
            </Text>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>

          {groupInfo.members?.map((member, index) => (
            <View key={member.userId._id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                {member.userId.profile?.avatar ? (
                  <Image
                    source={{ uri: member.userId.profile.avatar }}
                    style={styles.memberAvatarImage}
                  />
                ) : (
                  <Text style={styles.memberAvatarText}>
                    {member.userId.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                )}
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.userId.profile?.name || "No Name"}
                </Text>
                <Text style={styles.memberRole}>
                  {member.userId.role === 'admin' ? 'Admin' : 'Employee'}
                </Text>
                <Text style={styles.memberJoined}>
                  Joined {formatDate(member.joinedAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: "#25D366",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  scrollView: {
    flex: 1
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20
  },
  avatarContainer: {
    marginBottom: 16
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
    backgroundColor: "#FCD34D",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "600",
    color: "#fff"
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8
  },
  groupDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20
  },
  section: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 8,
    borderTopColor: "#F3F4F6"
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12
  },
  infoLabel: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500"
  },
  infoValue: {
    fontSize: 16,
    color: "#6B7280"
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12
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
  memberInfo: {
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
  }
});