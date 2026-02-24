import React, { useEffect, useState, useCallback } from "react";
// Force reload: 2026-02-16T13:48
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Modal,
  Alert,
  Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from "../components/AppLayout";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";
import { useSmartLoader } from "../hooks/useSmartLoader";
import socketService from "../services/socketService";

const { width } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export default function EmployeeHome({ navigation }) {
  const [company, setCompany] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const showLoader = useSmartLoader(loading);
  const [showMenu, setShowMenu] = useState(false);
  const [totalUnreadGroups, setTotalUnreadGroups] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchCompany();
    fetchGroups();

    // Socket listeners for real-time unread updates
    socketService.connect();

    const handleGroupUpdate = () => {
      fetchGroups();
    };

    socketService.on('group_message', handleGroupUpdate);
    socketService.on('unread_count_update', handleGroupUpdate);

    return () => {
      socketService.off('group_message', handleGroupUpdate);
      socketService.off('unread_count_update', handleGroupUpdate);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      fetchCompany();
    }, [])
  );

  const handleLogout = async () => {
    setShowMenu(false);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("role");
          navigation.replace("Welcome");
        }
      }
    ]);
  };

  const fetchCompany = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCompany(data);
    } catch (err) {
      console.log("COMPANY FETCH ERROR", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/chat/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroups(data.slice(0, 5));

        // Calculate total unread count for all groups
        const total = data.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
        setTotalUnreadGroups(total);
      }
    } catch (err) {
      console.log("GROUPS FETCH ERROR", err);
    }
  };

  const actionCards = [
    {
      id: 1,
      title: "My Workspace",
      image: require("../../assets/images/pencil-hand.png"),
      backgroundColor: "#E8B4CB", // Soft Pink
      onPress: () => navigation.navigate("EmployeeWork"),
      fullWidth: false
    },
    {
      id: 2,
      title: "Group Chats",
      image: require("../../assets/images/group.png"),
      backgroundColor: "#FF6B47", // Soft Orange/Red
      onPress: () => navigation.navigate("EmployeeChat"),
      fullWidth: false
    },
    {
      id: 3,
      title: "Digital Meeting",
      image: require("../../assets/images/google-meet.png"),
      backgroundColor: "#6CB28E", // Soft Green
      onPress: () => navigation.navigate("EmployeeMeet"),
      fullWidth: true
    }
  ];

  const renderActionCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.actionCard,
        {
          backgroundColor: item.backgroundColor,
          width: item.fullWidth ? "100%" : getResponsiveSize(162),
          height: item.fullWidth ? getResponsiveSize(160) : getResponsiveSize(200),
          marginBottom: getResponsiveSize(16)
        }
      ]}
      onPress={item.onPress}
      activeOpacity={0.9}
    >
      <View style={item.fullWidth ? styles.fullWidthCardContent : styles.cardContent}>
        <Image
          source={item.image}
          style={[
            styles.cardImage,
            item.fullWidth ? styles.fullWidthCardImage : styles.squareCardImage
          ]}
          resizeMode="contain"
        />
        <Text style={[styles.cardTitle, item.fullWidth && styles.fullWidthCardTitle]}>
          {item.title}
        </Text>
        {item.id === 2 && totalUnreadGroups > 0 && (
          <View style={styles.cardUnreadBadge}>
            <Text style={styles.cardUnreadText}>
              {totalUnreadGroups > 99 ? '99+' : totalUnreadGroups}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <AppLayout
      navigation={navigation}
      role="employee"
      hideHeader={true}
    >
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

        {/* Custom Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, getResponsiveSize(15)) }]}>
          <View style={styles.companyInfo}>
            {company?.logo ? (
              <Image source={{ uri: company.logo }} style={styles.companyLogo} />
            ) : (
              <View style={styles.defaultLogo}>
                <Text style={styles.defaultLogoText}>$</Text>
              </View>
            )}
            <View style={styles.companyTextContainer}>
              <Text style={styles.companyName} numberOfLines={1}>{company?.name || "Slytherin"}</Text>

            </View>
          </View>
          <TouchableOpacity
            style={styles.headerMenu}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require("../../assets/images/three-dot.png")}
              style={styles.menuIconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Action Cards Grid */}
          <View style={styles.cardsGrid}>
            <View style={styles.row}>
              {renderActionCard(actionCards[0])}
              {renderActionCard(actionCards[1])}
            </View>
            {renderActionCard(actionCards[2])}
          </View>

          {/* Recent Groups Section */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Groups</Text>
            {showLoader && groups.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#00664F" />
              </View>
            ) : groups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent groups</Text>
              </View>
            ) : (
              groups.map((group) => (
                <TouchableOpacity
                  key={group._id}
                  style={styles.groupItem}
                  onPress={() => navigation.navigate("GroupChat", { groupId: group._id, groupName: group.name })}
                >
                  <View style={styles.groupInfo}>
                    <View style={styles.groupImageContainer}>
                      {group.profileImage ? (
                        <Image
                          source={{ uri: group.profileImage }}
                          style={styles.groupAvatarImage}
                        />
                      ) : (
                        <Text style={styles.groupInitials}>
                          {group.name?.substring(0, 2).toUpperCase() || "GR"}
                        </Text>
                      )}
                      {group.unreadCount > 0 && (
                        <View style={styles.groupUnreadBadge}>
                          <Text style={styles.groupUnreadText}>
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.groupText}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupDesc} numberOfLines={1}>
                        {group.description || "No description available"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.groupMenu} activeOpacity={0.7}>
                    <Image
                      source={require("../../assets/images/three-dot.png")}
                      style={styles.groupMenuIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* 📋 BOTTOM MENU MODAL */}
        <Modal
          visible={showMenu}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate("EmployeeProfile");
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Image source={require("../../assets/images/person.png")} style={styles.menuIcon} />
                </View>
                <Text style={styles.menuItemText}>Profile</Text>
                <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate("EmployeeProfileEdit");
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Image source={require("../../assets/images/edit.png")} style={styles.menuIcon} />
                </View>
                <Text style={styles.menuItemText}>Profile edit</Text>
                <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleLogout(); // Call handleLogout directly
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Image source={require("../../assets/images/delete.png")} style={styles.menuIcon} />
                </View>
                <Text style={styles.menuItemText}>Logout</Text>
                <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMenu(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(15),
    backgroundColor: "#FFFFFF"
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  companyLogo: {
    width: getResponsiveSize(54),
    height: getResponsiveSize(54),
    borderRadius: getResponsiveSize(27),
    backgroundColor: "#E5F3F0"
  },
  defaultLogo: {
    width: getResponsiveSize(54),
    height: getResponsiveSize(54),
    borderRadius: getResponsiveSize(27),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center"
  },
  defaultLogoText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: "700",
    color: "#00664F"
  },
  companyTextContainer: {
    marginLeft: getResponsiveSize(12),
    flex: 1
  },
  companyName: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "700",
    color: "#1F2937"
  },
  companySubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: "#6B7280",
    marginTop: -2
  },
  headerMenu: {
    padding: getResponsiveSize(10),
    marginRight: -getResponsiveSize(10)
  },
  menuIconImage: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    tintColor: "#9CA3AF"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(130)
  },
  cardsGrid: {
    marginTop: getResponsiveSize(10)
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },
  actionCard: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(16),
    overflow: "hidden"
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center"
  },
  fullWidthCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSize(10)
  },
  cardImage: {
    width: "100%",
    height: "100%"
  },
  squareCardImage: {
    width: getResponsiveSize(110),
    height: getResponsiveSize(110),
    marginTop: getResponsiveSize(10)
  },
  fullWidthCardImage: {
    width: getResponsiveSize(170),
    height: getResponsiveSize(110)
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: "600",
    color: "#FFFFFF",
    alignSelf: "flex-start",
    marginBottom: getResponsiveSize(5)
  },
  fullWidthCardTitle: {
    flex: 1,
    fontSize: getResponsiveFontSize(18),
    marginLeft: getResponsiveSize(15),
    marginTop: 0,
    alignSelf: "center"
  },
  recentSection: {
    marginTop: getResponsiveSize(20)
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: getResponsiveSize(15)
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: getResponsiveSize(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  groupImageContainer: {
    width: getResponsiveSize(54),
    height: getResponsiveSize(54),
    borderRadius: getResponsiveSize(27),
    backgroundColor: "#F3F4F6", // Light gray for avatar background
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  groupAvatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  groupInitials: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "700",
    color: "#6B7280"
  },
  groupImage: {
    width: getResponsiveSize(34),
    height: getResponsiveSize(34),
    resizeMode: "contain"
  },
  groupText: {
    marginLeft: getResponsiveSize(15),
    flex: 1
  },
  groupName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "700",
    color: "#1F2937"
  },
  groupDesc: {
    fontSize: getResponsiveFontSize(12),
    color: "#9CA3AF",
    marginTop: 2
  },
  groupMenu: {
    padding: getResponsiveSize(10),
    marginRight: -getResponsiveSize(10)
  },
  groupMenuIconImage: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    tintColor: "#9CA3AF"
  },
  cardUnreadBadge: {
    position: 'absolute',
    top: getResponsiveSize(10),
    right: getResponsiveSize(10),
    backgroundColor: '#00664F',
    minWidth: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(4),
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4
  },
  cardUnreadText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(11),
    fontWeight: '700'
  },
  groupUnreadBadge: {
    position: 'absolute',
    top: -getResponsiveSize(5),
    right: -getResponsiveSize(5),
    backgroundColor: '#00664F',
    minWidth: getResponsiveSize(18),
    height: getResponsiveSize(18),
    borderRadius: getResponsiveSize(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(4),
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  groupUnreadText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(10),
    fontWeight: '700'
  },
  emptyState: {
    padding: getResponsiveSize(20),
    alignItems: "center"
  },
  emptyText: {
    color: "#9CA3AF"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: getResponsiveSize(25),
    borderTopRightRadius: getResponsiveSize(25),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
    paddingTop: getResponsiveSize(10)
  },
  sheetHandle: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(5),
    backgroundColor: "#E5E7EB",
    borderRadius: getResponsiveSize(3),
    alignSelf: "center",
    marginBottom: getResponsiveSize(20)
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: getResponsiveSize(15),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: getResponsiveSize(15)
  },
  menuIcon: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    tintColor: "#6B7280"
  },
  menuItemText: {
    flex: 1,
    fontSize: getResponsiveSize(16),
    color: "#111827",
    fontWeight: "500"
  },
  chevronIcon: {
    width: getResponsiveSize(16),
    height: getResponsiveSize(16),
    tintColor: "#9CA3AF"
  },
  cancelButton: {
    marginTop: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(15),
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: getResponsiveSize(16),
    color: "#6B7280",
    fontWeight: "600"
  }
});
