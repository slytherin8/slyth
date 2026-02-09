import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Image,
  ScrollView,
  Modal
} from "react-native";
import AppLayout from "../components/AppLayout";
import AsyncStorage from '../utils/storage';

import { API } from '../constants/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export default function AdminChatScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupActions, setShowGroupActions] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setGroups(data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderGroupItem = ({ item }) => {
    // Only show unread badge if there are actual unread messages
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={[styles.groupItem, hasUnread && styles.groupItemUnread]}
        onPress={() => navigation.navigate("GroupChat", { groupId: item._id, groupName: item.name })}
      >
        <View style={styles.groupAvatarContainer}>
          <View style={styles.groupAvatar}>
            {item.profilePhoto ? (
              <Image 
                source={{ uri: item.profilePhoto }} 
                style={styles.groupAvatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, hasUnread && styles.groupNameUnread]}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={styles.messageTime}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          
          <Text style={styles.groupDescription} numberOfLines={1}>
            {item.description || `${item.members.length} members`}
          </Text>
          
          {item.lastMessage ? (
            <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {item.lastMessage.senderName}: {item.lastMessage.messageText}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>

        <View style={styles.groupActions}>
          <TouchableOpacity 
            style={styles.menuDots}
            onPress={() => handleGroupMenu(item)}
          >
            <Text style={styles.menuDotsText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleGroupMenu = (group) => {
    setSelectedGroup(group);
    setShowGroupActions(true);
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API}/api/chat/groups/${group._id}`, {
                method: "DELETE",
                headers
              });

              if (response.ok) {
                Alert.alert("Success! 🗑️", `Group "${group.name}" deleted successfully`);
                fetchGroups(); // Refresh the list
              } else {
                Alert.alert("Delete Group Failed", "Failed to delete group");
              }
            } catch (error) {
              Alert.alert("Delete Group Failed", "Failed to delete group");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <AppLayout navigation={navigation} activeTab="chat" role="admin">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout navigation={navigation} activeTab="chat" role="admin">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with Create Group Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("CreateGroup")}
          >
            <Text style={styles.createButtonText}>+ New Group</Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first group to start collaborating with your team
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CreateGroup")}
            >
              <Text style={styles.emptyButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item._id}
            renderItem={renderGroupItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false} // Disable FlatList scroll since we're using ScrollView
            nestedScrollEnabled={true} // Enable nested scrolling
          />
        )}
      </ScrollView>

      {/* Group Actions Modal */}
      <Modal
        visible={showGroupActions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupActions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.groupActionsModal}>
            <Text style={styles.modalTitle}>
              {selectedGroup?.name}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowGroupActions(false);
                navigation.navigate("GroupInfo", { 
                  groupId: selectedGroup?._id, 
                  groupName: selectedGroup?.name 
                });
              }}
            >
              <Text style={styles.actionIcon}>ℹ️</Text>
              <Text style={styles.actionText}>Group Info</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowGroupActions(false);
                navigation.navigate("EditGroup", { 
                  groupId: selectedGroup?._id, 
                  groupName: selectedGroup?.name,
                  groupDescription: selectedGroup?.description,
                  groupPhoto: selectedGroup?.profilePhoto 
                });
              }}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionOption}
              onPress={() => {
                setShowGroupActions(false);
                handleDeleteGroup(selectedGroup);
              }}
            >
              <Text style={[styles.actionIcon, styles.deleteText]}>🗑️</Text>
              <Text style={[styles.actionText, styles.deleteText]}>Delete Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelActionButton}
              onPress={() => setShowGroupActions(false)}
            >
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </AppLayout>
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
    alignItems: "center"
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A"
  },
  createButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  listContainer: {
    padding: 20
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 0
  },
  groupItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981"
  },
  groupAvatarContainer: {
    position: "relative",
    marginRight: 12
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  groupAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff"
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff"
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff"
  },
  groupInfo: {
    flex: 1,
    marginRight: 8
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1
  },
  groupNameUnread: {
    fontWeight: "700"
  },
  messageTime: {
    fontSize: 12,
    color: "#6B7280"
  },
  groupDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4
  },
  lastMessage: {
    fontSize: 14,
    color: "#6B7280"
  },
  lastMessageUnread: {
    color: "#374151",
    fontWeight: "500"
  },
  noMessages: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic"
  },
  groupActions: {
    justifyContent: "center",
    alignItems: "center"
  },
  menuDots: {
    padding: 8
  },
  menuDotsText: {
    fontSize: 16,
    color: "#9CA3AF"
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B"
  },
  groupInfo: {
    flex: 1
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1
  },
  messageTime: {
    fontSize: 12,
    color: "#64748B"
  },
  memberCount: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4
  },
  lastMessage: {
    fontSize: 14,
    color: "#475569"
  },
  noMessages: {
    fontSize: 14,
    color: "#94A3B8",
    fontStyle: "italic"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22
  },
  emptyButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  groupActionsModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#0F172A"
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30
  },
  actionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1
  },
  cancelActionButton: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: "center"
  },
  cancelActionText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600"
  }
});
