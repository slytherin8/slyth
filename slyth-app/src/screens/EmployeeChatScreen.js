import React, { useState, useEffect, useRef, useCallback } from "react";
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
  TextInput,
  TouchableWithoutFeedback
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";
import AppLayout from "../components/AppLayout";
import AsyncStorage from '../utils/storage';
import socketService from '../services/socketService';
import { useSmartLoader } from "../hooks/useSmartLoader";

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
  const [mergedConversations, setMergedConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const showLoader = useSmartLoader(loading);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupActions, setShowGroupActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

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

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

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
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      }
    } catch (e) {
      console.log("Token decode error:", e);
    }
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



  useEffect(() => {
    // Merged conversations already contains all users (from the directMessage endpoint)
    if (!conversations.length) {
      setMergedConversations([]);
      return;
    }

    const merged = [...conversations];

    // Sort: Latest message first
    merged.sort((a, b) => {
      // 1. Last message time
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      // 2. Unread count
      const unreadA = a.unreadCount || 0;
      const unreadB = b.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;

      // 3. Alphabetical
      const nameA = a.user?.profile?.name || "";
      const nameB = b.user?.profile?.name || "";
      return nameA.localeCompare(nameB);
    });

    setMergedConversations(merged);

  }, [conversations]);

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

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.lastMessage && group.lastMessage.messageText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredConversations = mergedConversations.filter(conv =>
    (conv.user?.profile?.name || conv.user?.displayName || conv.user?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.lastMessage && conv.lastMessage.messageText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              {item.lastMessage.messageType === 'system' ? '' : `${item.lastMessage.senderName}: `}{item.lastMessage.messageText}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.menuButton}
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
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
        onPress={() => navigation.navigate("DirectChat", {
          userId: item.user._id,
          userName: item.user.profile?.name || item.user.name || "Employee",
          userAvatar: item.user.profile?.avatar,
          userRole: item.user.role,
          userEmail: item.user.email
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
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
              {item.user.profile?.name || item.user.name || item.user.displayName || item.user.email?.split('@')[0] || "Employee"}
            </Text>
            <View style={styles.rightContent}>
              <Text style={styles.roleTag}>{item.user.role === 'admin' ? 'Admin' : 'Employee'}</Text>
              {item.lastMessage && (
                <Text style={styles.messageTime}>
                  {formatTime(item.lastMessage.createdAt)}
                </Text>
              )}
            </View>
          </View>

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

  const handleDeleteGroup = (group) => {
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete this group?`,
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
                const data = await response.json();
                Alert.alert("Delete Failed", data.message || "Failed to delete group");
              }
            } catch (error) {
              Alert.alert("Delete Failed", "An error occurred while deleting the group");
            }
          }
        }
      ]
    );
  };



  return (
    <AppLayout navigation={navigation} role="employee" title="Chats">
      <View style={styles.container}>

        {/* Search Bar & Plus Button */}
        <View style={styles.searchRow}>
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
          <View style={{ width: 10 }} />
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
              {showLoader && groups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#00664F" />
                </View>
              ) : filteredGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  {searchQuery ? (
                    <Text style={styles.emptyTitle}>No results found</Text>
                  ) : (
                    <>
                      <Text style={styles.emptyTitle}>No Groups Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        You haven't been added to any groups yet. Ask your admin to add you to a group.
                      </Text>
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
                      <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Start a conversation with your admin or colleagues
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
          <TouchableWithoutFeedback onPress={() => setShowGroupActions(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.bottomSheet}>
                  <View style={styles.sheetHandle} />

                  {/* Group Info */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowGroupActions(false);
                      navigation.navigate("GroupInfo", {
                        groupId: selectedGroup?._id,
                        groupName: selectedGroup?.name
                      });
                    }}
                  >
                    <View style={styles.menuIconContainer}>
                      <Image source={require("../../assets/images/info.png")} style={styles.menuIconImageManual} />
                    </View>
                    <Text style={styles.menuItemText}>Group Info</Text>
                    <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
                  </TouchableOpacity>

                  {/* Mute Notifications */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowGroupActions(false);
                      Alert.alert("Success", "Notifications muted");
                    }}
                  >
                    <View style={styles.menuIconContainer}>
                      <Ionicons name="notifications-outline" size={24} color="#6B7280" />
                    </View>
                    <Text style={styles.menuItemText}>Mute Notifications</Text>
                    <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
                  </TouchableOpacity>

                  {/* Leave Group */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowGroupActions(false);
                      navigation.navigate("GroupExit", {
                        groupId: selectedGroup?._id,
                        groupName: selectedGroup?.name,
                        groupPhoto: selectedGroup?.profilePhoto,
                        groupDescription: selectedGroup?.description
                      });
                    }}
                  >
                    <View style={styles.menuIconContainer}>
                      <Image source={require("../../assets/images/delete.png")} style={[styles.menuIconImageManual, { tintColor: '#DC2626' }]} />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Leave Group</Text>
                    <Image source={require("../../assets/images/right-arrow.png")} style={[styles.chevronIcon, { tintColor: '#EF4444' }]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowGroupActions(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
  },
  createGroupButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  createGroupButtonText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff"
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
    fontWeight: "600", // Increased weight
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
    backgroundColor: "#F8FAFC" // Slight grey background
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
  chatItemUnread: {
    // backgroundColor: "#F0FDF4" // Removed colored background for unread, kept white card
    backgroundColor: "#FFFFFF"
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16
  },
  avatar: {
    width: 56, // Increased size
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarImage: {
    width: 56, // Increased size
    height: 56,
    borderRadius: 28
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#6B7280"
  },
  unreadBadge: {
    position: "absolute",
    top: 0, // Adjusted position
    right: 0,
    backgroundColor: "#00664F",
    borderRadius: 12, // Circular/Pill
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    paddingHorizontal: 4
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center'
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
    fontFamily: "Inter-Bold",
    color: "#111827",
    flex: 1,
    marginRight: 8
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
    color: "#111827",
    fontWeight: "500"
  },
  noMessages: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic"
  },
  menuButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  menuIconImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    tintColor: "#6B7280"
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
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuIconImageManual: {
    width: 24,
    height: 24,
    resizeMode: "contain"
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    textAlign: "left",
  },
  chevronIcon: {
    width: 16,
    height: 16,
    tintColor: "#9CA3AF",
    resizeMode: 'contain'
  },
  cancelButton: {
    marginTop: 15,
    paddingVertical: 15,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  roleTag: {
    fontSize: 11,
    color: "#00664F",
    fontWeight: "600",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden'
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  }
});
