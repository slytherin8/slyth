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
import { wp, hp, fp, rs } from "../utils/responsive";

const { width } = Dimensions.get('window');

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
          width: item.fullWidth ? "100%" : rs(162),
          height: item.fullWidth ? rs(160) : rs(200),
          marginBottom: rs(16)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

        {/* Custom Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, rs(15)) }]}>
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
    </SafeAreaView>
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
    paddingHorizontal: rs(20),
    paddingBottom: rs(15),
    backgroundColor: "#FFFFFF"
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  companyLogo: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: "#E5F3F0"
  },
  defaultLogo: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center"
  },
  defaultLogoText: {
    fontSize: fp(20),
    fontWeight: "700",
    color: "#00664F"
  },
  companyTextContainer: {
    marginLeft: rs(12),
    flex: 1
  },
  companyName: {
    fontSize: fp(18),
    fontWeight: "700",
    color: "#1F2937"
  },
  companySubtitle: {
    fontSize: fp(14),
    color: "#6B7280",
    marginTop: -2
  },
  headerMenu: {
    padding: rs(10),
    marginRight: -rs(10)
  },
  menuIconImage: {
    width: rs(24),
    height: rs(24),
    tintColor: "#9CA3AF"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: rs(20),
    paddingBottom: rs(130)
  },
  cardsGrid: {
    marginTop: rs(10)
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },
  actionCard: {
    borderRadius: rs(20),
    padding: rs(16),
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
    paddingHorizontal: rs(10)
  },
  cardImage: {
    width: "100%",
    height: "100%"
  },
  squareCardImage: {
    width: rs(110),
    height: rs(110),
    marginTop: rs(10)
  },
  fullWidthCardImage: {
    width: rs(170),
    height: rs(110)
  },
  cardTitle: {
    fontSize: fp(15),
    fontWeight: "600",
    color: "#FFFFFF",
    alignSelf: "flex-start",
    marginBottom: rs(5)
  },
  fullWidthCardTitle: {
    flex: 1,
    fontSize: fp(18),
    marginLeft: rs(15),
    marginTop: 0,
    alignSelf: "center"
  },
  recentSection: {
    marginTop: rs(20)
  },
  sectionTitle: {
    fontSize: fp(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: rs(15)
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  groupImageContainer: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
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
    fontSize: fp(16),
    fontWeight: "700",
    color: "#6B7280"
  },
  groupImage: {
    width: rs(34),
    height: rs(34),
    resizeMode: "contain"
  },
  groupText: {
    marginLeft: rs(15),
    flex: 1
  },
  groupName: {
    fontSize: fp(16),
    fontWeight: "700",
    color: "#1F2937"
  },
  groupDesc: {
    fontSize: fp(12),
    color: "#9CA3AF",
    marginTop: 2
  },
  groupMenu: {
    padding: rs(10),
    marginRight: -rs(10)
  },
  groupMenuIconImage: {
    width: rs(20),
    height: rs(20),
    tintColor: "#9CA3AF"
  },
  cardUnreadBadge: {
    position: 'absolute',
    top: rs(10),
    right: rs(10),
    backgroundColor: '#00664F',
    minWidth: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs(4),
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
    fontSize: fp(11),
    fontWeight: '700'
  },
  groupUnreadBadge: {
    position: 'absolute',
    top: -rs(5),
    right: -rs(5),
    backgroundColor: '#00664F',
    minWidth: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs(4),
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  groupUnreadText: {
    color: '#FFFFFF',
    fontSize: fp(10),
    fontWeight: '700'
  },
  emptyState: {
    padding: rs(20),
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
    borderTopLeftRadius: rs(25),
    borderTopRightRadius: rs(25),
    paddingHorizontal: rs(20),
    paddingBottom: rs(40),
    paddingTop: rs(10)
  },
  sheetHandle: {
    width: rs(40),
    height: rs(5),
    backgroundColor: "#E5E7EB",
    borderRadius: rs(3),
    alignSelf: "center",
    marginBottom: rs(20)
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rs(15),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: rs(15)
  },
  menuIcon: {
    width: rs(20),
    height: rs(20),
    tintColor: "#6B7280"
  },
  menuItemText: {
    flex: 1,
    fontSize: rs(16),
    color: "#111827",
    fontWeight: "500"
  },
  chevronIcon: {
    width: rs(16),
    height: rs(16),
    tintColor: "#9CA3AF"
  },
  cancelButton: {
    marginTop: rs(15),
    paddingVertical: rs(15),
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: rs(16),
    color: "#6B7280",
    fontWeight: "600"
  }
});
