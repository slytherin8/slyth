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
        const payload = decodeJWT(token);
        setIsAdmin(payload?.role === 'admin');
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
    if (!dateString) return "N/A";
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

  // Determine which list to show
  // Determine which list to show - Only real members
  const realMembers = (groupInfo.members || [])
    .filter(m => m && m.userId && typeof m.userId === 'object')
    .map(m => m.userId);

  const displayList = realMembers;

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
            <Text style={styles.groupDescription}>
              {groupInfo.description}
            </Text>
          )}
        </View>

        {/* Group Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Group Statistics</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {formatDate(groupInfo.createdAt)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Members</Text>
            <Text style={styles.infoValue}>{groupInfo.members?.length || 0}</Text>
          </View>

          <View style={[styles.infoRow, { paddingBottom: 0 }]}>
            <Text style={styles.infoLabel}>Created By</Text>
            <Text style={styles.infoValue}>
              {groupInfo.createdBy?.profile?.name || "Admin"}
            </Text>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>
              Members
            </Text>
          </View>

          {displayList.map((item, index) => {
            const memberId = item._id;

            return (
              <View
                key={memberId}
                style={styles.memberItemContainer}
              >
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatarPlaceholder}>
                    {item.profile?.avatar ? (
                      <Image
                        source={{ uri: item.profile.avatar }}
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <Text style={styles.memberAvatarText}>
                        {item.role === 'admin' ? 'A' : (item.profile?.name || item.name || "?").charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {item.role === 'admin' ? 'Admin' : (item.profile?.name || item.name || "Employee")}
                    </Text>
                    <Text style={styles.memberRole}>
                      {item.role === 'admin' ? 'Admin' : 'Employee'}
                    </Text>
                    <Text style={styles.memberJoined}>
                      Joined {formatDate(item.createdAt || item.updatedAt)}
                    </Text>
                  </View>
                </View>
                {index < displayList.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  disabledButton: {
    opacity: 0.5
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 30
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    resizeMode: 'cover'
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center"
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
  emptyDescription: {
    fontStyle: "italic",
    color: "#9CA3AF"
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
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  memberItemContainer: {
    marginBottom: 16
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12
  },
  memberAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: 'hidden'
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover'
  },
  memberAvatarText: {
    fontSize: 20,
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
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500"
  },
  memberJoined: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 66,
    marginVertical: 4
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

