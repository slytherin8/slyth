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
  const [employees, setEmployees] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGroupInfo();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const adminStatus = payload.role === 'admin';
        setIsAdmin(adminStatus);

        if (adminStatus) {
          fetchEmployees();
        }
      }
    } catch (error) {
      console.log("Token decode error:", error);
    }
  };

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
        setSelectedMembers(data.members?.map(m => m.userId._id) || []);
      } else {
        Alert.alert("Error", "Failed to fetch group information");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch group information");
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (employeeId) => {
    if (!isAdmin) return;

    setSelectedMembers(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleUpdateMembers = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Group must have at least one member");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: groupInfo.name,
          description: groupInfo.description || "",
          profilePhoto: groupInfo.profilePhoto,
          memberIds: selectedMembers
        })
      });

      if (response.ok) {
        Alert.alert("Success", "Group members updated successfully");
        fetchGroupInfo();
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to update members");
      }
    } catch (error) {
      Alert.alert("Error", "Check your connection and try again");
    } finally {
      setIsSubmitting(false);
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
  const displayList = isAdmin ? employees : groupInfo.members.map(m => m.userId);
  const currentMemberIds = groupInfo.members.map(m => m.userId._id);

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

        {isAdmin && (
          <TouchableOpacity
            style={[styles.saveButtonHeader, isSubmitting && styles.disabledButton]}
            onPress={handleUpdateMembers}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#00664F" />
            ) : (
              <Text style={styles.saveButtonHeaderText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
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

          <Text style={[styles.groupDescription, !groupInfo.description && styles.emptyDescription]}>
            {groupInfo.description || "No description provided"}
          </Text>
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
              {isAdmin ? "Manage Members" : "Group Members"}
            </Text>
            {isAdmin && (
              <Text style={styles.selectionCount}>
                {selectedMembers.length} selected
              </Text>
            )}
          </View>

          {displayList.map((item, index) => {
            const memberId = item._id;
            const isSelected = selectedMembers.includes(memberId);
            const isActuallyMember = currentMemberIds.includes(memberId);

            return (
              <TouchableOpacity
                key={memberId}
                style={[
                  styles.memberItemContainer,
                  isAdmin && isSelected && styles.selectedMemberItem
                ]}
                onPress={() => isAdmin && toggleMemberSelection(memberId)}
                disabled={!isAdmin}
              >
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    {item.profile?.avatar ? (
                      <Image
                        source={{ uri: item.profile.avatar }}
                        style={styles.memberAvatarImage}
                      />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarText}>
                          {item.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {item.profile?.name || "No Name"}
                    </Text>
                    <Text style={styles.memberRole}>
                      {item.role === 'admin' ? 'Admin' : 'Employee'}
                    </Text>
                    {isActuallyMember && !isAdmin && (
                      <Text style={styles.memberJoined}>
                        Already in group
                      </Text>
                    )}
                  </View>

                  {isAdmin && (
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkedBox
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  )}
                </View>
                {index < displayList.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
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
  saveButtonHeader: {
    backgroundColor: "#E6F4F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00664F"
  },
  saveButtonHeaderText: {
    color: "#00664F",
    fontWeight: "700",
    fontSize: 14
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
  selectionCount: {
    fontSize: 14,
    color: "#00664F",
    fontWeight: "600"
  },
  memberItemContainer: {
    borderRadius: 12,
    marginBottom: 4
  },
  selectedMemberItem: {
    backgroundColor: "#F0FDF4"
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FDE68A",
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  memberAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  memberAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center"
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
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600"
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
  checkedBox: {
    backgroundColor: "#00664F",
    borderColor: "#00664F"
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

