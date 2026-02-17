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
        <ActivityIndicator size="large" color="#00664F" />
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
          <Ionicons name="chevron-back" size={24} color="#111827" />
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
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Group Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {formatDate(groupInfo.createdAt)}
            </Text>
          </View>

          <View style={[styles.infoRow, { paddingBottom: 0 }]}>
            <Text style={styles.infoLabel}>Created By</Text>
            <Text style={styles.infoValue}>
              {groupInfo.createdBy?.profile?.name || "Unknown"}
            </Text>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.membersTitle}>Members</Text>

          {groupInfo.members?.map((member, index) => (
            <View key={member.userId._id} style={styles.memberItemContainer}>
              <View style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  {member.userId.profile?.avatar ? (
                    <Image
                      source={{ uri: member.userId.profile.avatar }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarText}>
                        {member.userId.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    </View>
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
              {index < groupInfo.members.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        {!isAdmin && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={() => navigation.navigate("GroupExit", {
                groupId,
                groupName,
                groupPhoto: groupInfo.profilePhoto,
                groupDescription: groupInfo.description
              })}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.exitButtonText}>Exit Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 30
  },
  avatarContainer: {
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: "#fff"
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff"
  },
  avatarText: {
    fontSize: 56,
    fontWeight: "700",
    color: "#D97706"
  },
  groupName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8
  },
  groupDescription: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 30
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12
  },
  infoLabel: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500"
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700"
  },
  membersSection: {
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20
  },
  memberItemContainer: {
    marginBottom: 16
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FDE68A",
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  memberAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  memberAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center"
  },
  memberAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#D97706"
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2
  },
  memberRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
    fontWeight: "500"
  },
  memberJoined: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 76
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff"
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
    backgroundColor: "#ffffff",
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: "#00664F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    marginTop: 10
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },
  exitButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8
  }
});
