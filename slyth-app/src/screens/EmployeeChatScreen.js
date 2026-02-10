import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  Dimensions,
  Animated,
  PanResponder
} from "react-native";
import AppLayout from "../components/AppLayout";
import AsyncStorage from '../utils/storage';
import socketService from '../services/socketService';

import { API } from '../constants/api';

const { width: screenWidth } = Dimensions.get('window');

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export default function EmployeeChatScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Groups, 1 = Direct Messages
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupActions, setShowGroupActions] = useState(false);
  
  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newTranslateX = activeTab === 0 ? gestureState.dx : gestureState.dx - screenWidth;
        translateX.setValue(Math.max(-screenWidth, Math.min(0, newTranslateX)));
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = screenWidth * 0.3;
        
        if (gestureState.dx > threshold && activeTab === 1) {
          // Swipe right to Groups
          switchToTab(0);
        } else if (gestureState.dx < -threshold && activeTab === 0) {
          // Swipe left to Direct Messages
          switchToTab(1);
        } else {
          // Snap back to current tab
          switchToTab(activeTab);
        }
      },
    })
  ).current;

  useEffect(() => {
    // Load both tabs data on mount
    loadAllData();
  }, []);

  useEffect(() => {
    // Connect to socket service
    socketService.connect();

    // Listen for real-time updates
    const handleDirectMessage = (message) => {
      updateConversations();
    };

    const handleGroupMessage = (message) => {
      updateGroups();
    };

    const handleUnreadCountUpdate = (data) => {
      if (data.type === "direct") {
        updateConversations();
      } else if (data.type === "group") {
        updateGroups();
      }
    };

    socketService.on('direct_message', handleDirectMessage);
    socketService.on('group_message', handleGroupMessage);
    socketService.on('unread_count_update', handleUnreadCountUpdate);

    return () => {
      socketService.off('direct_message', handleDirectMessage);
      socketService.off('group_message', handleGroupMessage);
      socketService.off('unread_count_update', handleUnreadCountUpdate);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchGroups(), fetchConversations()]);
    setLoading(false);
  };

  const fetchGroups = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      // Sort groups by unread count first, then by last activity
      const sortedGroups = data.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
        
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      });
      
      setGroups(sortedGroups);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/direct-messages/conversations`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const updateGroups = () => {
    fetchGroups();
  };

  const updateConversations = () => {
    fetchConversations();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const switchToTab = (tabIndex) => {
    setActiveTab(tabIndex);
    
    // Animate content
    Animated.spring(translateX, {
      toValue: -tabIndex * screenWidth,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Animate tab indicator
    Animated.spring(tabIndicatorX, {
      toValue: tabIndex * (screenWidth / 2),
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
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
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
        onPress={() => navigation.navigate("GroupChat", { groupId: item._id, groupName: item.name })}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {item.profilePhoto ? (
              <Image 
                source={{ uri: item.profilePhoto }} 
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={styles.messageTime}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          
          <Text style={styles.memberCount} numberOfLines={1}>
            {item.members.length} members
          </Text>
          
          {item.lastMessage ? (
            <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {item.lastMessage.senderName}: {item.lastMessage.messageText}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => handleGroupMenu(item)}
        >
          <Text style={styles.menuDots}>⋮</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }) => {
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
        onPress={() => navigation.navigate("DirectChat", { 
          userId: item.user._id, 
          userName: item.user.profile?.name || "Unknown",
          userAvatar: item.user.profile?.avatar
        })}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {item.user.profile?.avatar ? (
              <Image 
                source={{ uri: item.user.profile.avatar }} 
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.user.profile?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </View>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>
              {item.user.profile?.name || "Unknown User"}
            </Text>
            {item.lastMessage && (
              <Text style={styles.messageTime}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          
          <Text style={styles.userRole} numberOfLines={1}>
            {item.user.role === 'admin' ? 'Admin' : 'Employee'}
          </Text>
          
          {item.lastMessage ? (
            <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {item.lastMessage.isFromMe ? "You: " : ""}{item.lastMessage.messageText}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleGroupMenu = (group) => {
    setSelectedGroup(group);
    setShowGroupActions(true);
  };

  const handleMuteGroup = (group) => {
    Alert.alert("Feature Coming Soon", "Mute notifications feature will be available soon!");
  };

  const handleLeaveGroup = (group) => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API}/api/chat/groups/${group._id}/leave`, {
                method: "POST",
                headers
              });

              if (response.ok) {
                Alert.alert("Success! 🚪", `You have left "${group.name}" successfully`);
                updateGroups();
              } else {
                Alert.alert("Leave Group Failed", "Failed to leave group");
              }
            } catch (error) {
              Alert.alert("Leave Group Failed", "Failed to leave group");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <AppLayout navigation={navigation} activeTab="chat" role="employee">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout navigation={navigation} activeTab="chat" role="employee">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => switchToTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => switchToTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              Direct Messages
            </Text>
          </TouchableOpacity>
          
          {/* Tab Indicator */}
          <Animated.View 
            style={[
              styles.tabIndicator,
              { transform: [{ translateX: tabIndicatorX }] }
            ]} 
          />
        </View>

        {/* Content with Swipe */}
        <View style={styles.contentContainer} {...panResponder.panHandlers}>
          <Animated.View 
            style={[
              styles.swipeContainer,
              { transform: [{ translateX }] }
            ]}
          >
            {/* Groups Tab */}
            <View style={styles.tabContent}>
              {groups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Groups Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    You haven't been added to any groups yet. Ask your admin to add you to a group.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={groups}
                  keyExtractor={(item) => item._id}
                  renderItem={renderGroupItem}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Direct Messages Tab */}
            <View style={styles.tabContent}>
              {conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Start a conversation with your admin or colleagues
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={conversations}
                  keyExtractor={(item) => item.user._id}
                  renderItem={renderConversationItem}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </Animated.View>
        </View>

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
                  handleMuteGroup(selectedGroup);
                }}
              >
                <Text style={styles.actionIcon}>🔇</Text>
                <Text style={styles.actionText}>Mute Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionOption}
                onPress={() => {
                  setShowGroupActions(false);
                  handleLeaveGroup(selectedGroup);
                }}
              >
                <Text style={[styles.actionIcon, styles.leaveText]}>🚪</Text>
                <Text style={[styles.actionText, styles.leaveText]}>Leave Group</Text>
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
      </View>
    </AppLayout>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF"
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827"
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    position: "relative"
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center"
  },
  activeTab: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280"
  },
  activeTabText: {
    color: "#25D366",
    fontWeight: "600"
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: screenWidth / 2,
    backgroundColor: "#25D366",
    borderRadius: 2
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden"
  },
  swipeContainer: {
    flexDirection: "row",
    width: screenWidth * 2,
    flex: 1
  },
  tabContent: {
    width: screenWidth,
    flex: 1
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  chatItemUnread: {
    backgroundColor: "#F0FDF4"
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280"
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#25D366",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  chatInfo: {
    flex: 1,
    marginRight: 8
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  chatName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    flex: 1
  },
  chatNameUnread: {
    fontWeight: "700"
  },
  messageTime: {
    fontSize: 12,
    color: "#6B7280"
  },
  memberCount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2
  },
  userRole: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2
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
  menuButton: {
    padding: 8
  },
  menuDots: {
    fontSize: 16,
    color: "#9CA3AF"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  groupActionsModal: {
    backgroundColor: "#FFFFFF",
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
    color: "#111827"
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
  leaveText: {
    color: "#DC2626"
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
