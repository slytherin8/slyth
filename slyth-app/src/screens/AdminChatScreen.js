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
  PanResponder,
  TextInput
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

export default function AdminChatScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Groups, 1 = Direct Messages
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [mergedConversations, setMergedConversations] = useState([]);
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
    await Promise.all([fetchGroups(), fetchConversations(), fetchEmployees()]);
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

  const fetchEmployees = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/employees`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch employees");

      // Filter out current user if needed, but normally admin is not in employees list or we handle it
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    // Merge conversations and employees
    if (!employees.length && !conversations.length) {
      setMergedConversations([]);
      return;
    }

    // Create a map of all unique users from both sources
    const allUsersMap = new Map();

    // 1. Add all employees first
    employees.forEach(emp => {
      allUsersMap.set(emp._id, {
        _id: `temp_${emp._id}`,
        user: emp,
        lastMessage: null,
        unreadCount: 0
      });
    });

    // 2. Merge existing conversations
    conversations.forEach(conv => {
      if (conv.user && conv.user._id) {
        if (allUsersMap.has(conv.user._id)) {
          // Update existing employee entry with conversation data
          allUsersMap.set(conv.user._id, {
            ...conv,
            _id: conv._id || `temp_${conv.user._id}`
          });
        } else {
          // Add conversation user even if not in employee list (e.g. deleted or external)
          allUsersMap.set(conv.user._id, conv);
        }
      }
    });

    const merged = Array.from(allUsersMap.values());

    // Sort: Unread first, then by last message time, then alphabetical
    merged.sort((a, b) => {
      // 1. Unread count
      const unreadA = a.unreadCount || 0;
      const unreadB = b.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;

      // 2. Last message time
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      // 3. Alphabetical
      const nameA = a.user?.profile?.name || "";
      const nameB = b.user?.profile?.name || "";
      return nameA.localeCompare(nameB);
    });

    setMergedConversations(merged);

  }, [employees, conversations]);

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

  const [searchQuery, setSearchQuery] = useState("");

  // Filtered data based on search
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.lastMessage && group.lastMessage.messageText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredConversations = mergedConversations.filter(conv =>
    (conv.user?.profile?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.lastMessage && conv.lastMessage.messageText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderGroupItem = ({ item }) => {
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => navigation.navigate("GroupChat", { groupId: item._id, groupName: item.name })}
      >
        <View style={styles.avatarContainer}>
          {item.profilePhoto ? (
            <Image
              source={{ uri: item.profilePhoto }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#FCD34D' }]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={[styles.messageTime, hasUnread && styles.messageTimeUnread]}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.messagePreviewContainer}>
            {item.lastMessage ? (
              <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                {item.lastMessage.senderName}: {item.lastMessage.messageText}
              </Text>
            ) : (
              <Text style={styles.noMessages}>No messages yet</Text>
            )}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuIconButton}
          onPress={() => handleGroupMenu(item)}
        >
          <Image
            source={require("../../assets/images/three-dot.png")}
            style={styles.menuIconImage}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }) => {
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate("DirectChat", {
          userId: item.user._id,
          userName: item.user.profile?.name || "Unknown",
          userAvatar: item.user.profile?.avatar
        })}
      >
        <View style={styles.avatarContainer}>
          {item.user.profile?.avatar ? (
            <Image
              source={{ uri: item.user.profile.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#E5E7EB' }]}>
              <Text style={styles.avatarText}>
                {item.user.profile?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.user.profile?.name || "Unknown User"}
            </Text>
            {item.lastMessage && (
              <Text style={[styles.messageTime, hasUnread && styles.messageTimeUnread]}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.messagePreviewContainer}>
            {item.lastMessage ? (
              <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                {item.lastMessage.isFromMe ? "You: " : ""}{item.lastMessage.messageText}
              </Text>
            ) : (
              <Text style={styles.noMessages}>No messages yet</Text>
            )}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuIconButton}
          onPress={() => {
            // Placeholder for future menu
            console.log("Menu clicked");
          }}
        >
          <Image
            source={require("../../assets/images/three-dot.png")}
            style={styles.menuIconImage}
          />
        </TouchableOpacity>
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
        { text: "Cancel", style: "cancel" },
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
                updateGroups();
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
      <AppLayout navigation={navigation} activeTab="chat" role="admin" showProfile={false} logoPosition="right">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout navigation={navigation} activeTab="chat" role="admin" showProfile={false} logoPosition="right">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          {activeTab === 0 && (
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={() => navigation.navigate("CreateGroup")}
            >
              <Text style={styles.createGroupButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Image source={require("../../assets/images/search.png")} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for chats & messages"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => switchToTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              Group Chats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => switchToTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              Chats
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
              {filteredGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  {searchQuery ? (
                    <Text style={styles.emptyTitle}>No results found</Text>
                  ) : (
                    <>
                      <Text style={styles.emptyTitle}>No Groups Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Create your first group to start collaborating
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => navigation.navigate("CreateGroup")}
                      >
                        <Text style={styles.emptyButtonText}>Create Group</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredGroups}
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
              {filteredConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  {searchQuery ? (
                    <Text style={styles.emptyTitle}>No results found</Text>
                  ) : (
                    <>
                      <Text style={styles.emptyTitle}>No Employees Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Add employees to start a conversation
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredConversations}
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
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000"
  },
  createGroupButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  createGroupButtonText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff"
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24, // More rounded as requested
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#9CA3AF',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
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
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280"
  },
  activeTabText: {
    color: "#00664F",
    fontWeight: "700"
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: screenWidth / 2,
    backgroundColor: "#00664F",
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
    flex: 1,
    backgroundColor: "#F8FAFC" // Slight grey for background contrast with cards
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20, // Taller card
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80
  },
  avatarContainer: {
    marginRight: 16
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center"
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff"
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  chatName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 10
  },
  messageTime: {
    fontSize: 12,
    color: "#6B7280"
  },
  messageTimeUnread: {
    color: "#00664F",
    fontWeight: "600"
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lastMessage: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
    marginRight: 10
  },
  lastMessageUnread: {
    color: "#111827",
    fontWeight: "500"
  },
  unreadBadge: {
    backgroundColor: "#00664F",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  noMessages: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic"
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
    marginBottom: 30,
    lineHeight: 22
  },
  emptyButton: {
    backgroundColor: "#25D366",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"
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
  deleteText: {
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
  },
  menuIconImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    tintColor: "#6B7280"
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80
  }
});
