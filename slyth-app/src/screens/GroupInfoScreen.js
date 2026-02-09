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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Group Header */}
      <View style={styles.header}>
        <View style={styles.groupAvatarContainer}>
          {groupInfo.profilePhoto ? (
            <Image 
              source={{ uri: groupInfo.profilePhoto }} 
              style={styles.groupAvatar}
            />
          ) : (
            <View style={styles.groupAvatarPlaceholder}>
              <Text style={styles.groupAvatarText}>
                {groupInfo.name?.charAt(0)?.toUpperCase() || "G"}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.groupName}>{groupInfo.name}</Text>
        
        {groupInfo.description && (
          <Text style={styles.groupDescription}>{groupInfo.description}</Text>
        )}
        
        <Text style={styles.memberCount}>
          {groupInfo.members?.length || 0} members
        </Text>
      </View>

      {/* Group Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Details</Text>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>
            {formatDate(groupInfo.createdAt)}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Created by</Text>
          <Text style={styles.detailValue}>
            {groupInfo.createdBy?.profile?.name || "Unknown"}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Messages</Text>
          <Text style={styles.detailValue}>
            {groupInfo.totalMessages || 0}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Last Activity</Text>
          <Text style={styles.detailValue}>
            {formatDate(groupInfo.lastActivity)}
          </Text>
        </View>
      </View>

      {/* Members List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Members ({groupInfo.members?.length || 0})
        </Text>
        
        {groupInfo.members?.map((member, index) => (
          <View key={member.userId._id} style={styles.memberItem}>
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
                {member.userId._id === groupInfo.createdBy?._id && ' • Creator'}
              </Text>
              <Text style={styles.memberJoined}>
                Joined {formatDate(member.joinedAt)}
              </Text>
            </View>
            
            <View style={styles.memberStatus}>
              {member.userId.isOnline ? (
                <View style={styles.onlineIndicator} />
              ) : (
                <View style={styles.offlineIndicator} />
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      {isAdmin && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate("EditGroup", {
              groupId: groupInfo._id,
              groupName: groupInfo.name,
              groupDescription: groupInfo.description,
              groupPhoto: groupInfo.profilePhoto
            })}
          >
            <Text style={styles.editButtonText}>Edit Group</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.bottomSpacing} />
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  header: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20
  },
  groupAvatarContainer: {
    marginBottom: 15
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  groupAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  groupAvatarText: {
    fontSize: 28,
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
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8
  },
  memberCount: {
    fontSize: 14,
    color: "#9CA3AF"
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 15
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  detailLabel: {
    fontSize: 16,
    color: "#6B7280"
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827"
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  memberAvatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5
  },
  memberAvatarText: {
    fontSize: 16,
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
    color: "#2563EB",
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  memberStatus: {
    alignItems: "center"
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981"
  },
  offlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#9CA3AF"
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  editButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  bottomSpacing: {
    height: 40
  }
});