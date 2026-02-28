import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  ActivityIndicator
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "../utils/storage";
import api from "../services/api";
import { API } from "../constants/api";
import { useSmartLoader } from "../hooks/useSmartLoader";
import AppLayout from "../components/AppLayout";
import { wp, hp, fp, rs } from "../utils/responsive";

const { width, height } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);
  const showLoader = useSmartLoader(loading);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    setShowMenu(false);
    navigation.navigate("AdminLogout");
  };

  useEffect(() => {
    fetchCompany();
    fetchEmployees();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
      fetchCompany();
    }, [])
  );

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
      setCompany({});
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("EMPLOYEES DATA:", JSON.stringify(data, null, 2)); // Better debug log
      setEmployees(data);
    } catch (e) {
      console.log("EMPLOYEE FETCH ERROR", e);
      if (e.message.includes("403")) {
        Alert.alert("Access Denied", "You do not have admin privileges.");
      } else {
        Alert.alert("Error", "Failed to fetch employees. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employeeId, employeeName) => {
    console.log("Delete employee called:", employeeId, employeeName);
    Alert.alert(
      "Delete Employee",
      `Do you want to delete ${employeeName}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "OK",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Deleting employee:", employeeId);
              const token = await AsyncStorage.getItem("token");
              const res = await fetch(`${API}/api/auth/employees/${employeeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
              });

              console.log("Delete response status:", res.status);

              if (!res.ok) {
                const data = await res.json();
                console.log("Delete error:", data);
                return Alert.alert("Error", data.message || "Failed to delete employee");
              }

              // Remove employee from list instantly
              setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
              Alert.alert("Success", "Employee deleted successfully");
            } catch (error) {
              console.log("Delete employee error:", error);
              Alert.alert("Error", "Failed to delete employee. Please try again.");
            }
          }
        }
      ]
    );
  };

  const featureCards = [
    {
      id: 1,
      title: "Assign Work",
      image: require("../../assets/images/pencil-hand.png"),
      backgroundColor: "#E8B4CB",
      onPress: () => navigation.navigate("AdminWork"),
      height: 210 // Taller card
    },
    {
      id: 2,
      title: "Group Chats",
      image: require("../../assets/images/group.png"),
      backgroundColor: "#FF6B47",
      onPress: () => navigation.navigate("AdminChat"),
      height: 173 // Shorter card
    },
    {
      id: 3,
      title: "Unlock Company Privacy",
      image: require("../../assets/images/lock.png"),
      backgroundColor: "#F4C430",
      onPress: () => navigation.navigate("AdminFiles"),
      height: 173 // Shorter card
    },
    {
      id: 4,
      title: "Digital Meeting",
      image: require("../../assets/images/google-meet.png"),
      backgroundColor: "#6CB28E", // Updated to the requested color
      onPress: () => navigation.navigate("AdminMeet"),
      height: 210 // Taller card
    }
  ];

  const renderFeatureCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.featureCard,
        {
          backgroundColor: item.backgroundColor,
          height: rs(item.height),
          width: rs(168), // Slightly reduced width to accommodate gaps
          marginTop: item.id === 2 ? rs(35) : 0 // Move red card (Group Chats) down more
        }
      ]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeItem}>
      <View style={styles.employeeLeft}>
        <View style={styles.employeeAvatar}>
          {item.profile?.avatar ? (
            <Image source={{ uri: item.profile.avatar }} style={styles.avatarImage} />
          ) : item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {(item.profile?.name || item.name || item.email)?.charAt(0).toUpperCase() || "U"}
            </Text>
          )}
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.profile?.name || item.name || "Unknown"}</Text>
          <Text style={styles.employeeEmail}>{item.role === 'admin' ? 'Admin' : 'Employee'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteEmployee(item._id, item.profile?.name || item.name || "Unknown")}
        activeOpacity={0.7}
      >
        <Image
          source={require("../../assets/images/delete.png")}
          style={styles.deleteIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <AppLayout
      role="admin"
      title={company?.name || "Company"}
      logoPosition="right"
      onMenu={() => setShowMenu(true)}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
                  navigation.navigate("AdminSetPin");
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: "#F3F4F6" }]}>
                  <Image source={require("../../assets/images/pin.png")} style={styles.menuIconImage} />
                </View>
                <Text style={styles.menuItemText}>Set New pin</Text>
                <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate("AdminEditCompany");
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: "#F3F4F6" }]}>
                  <Image source={require("../../assets/images/edit.png")} style={styles.menuIconImage} />
                </View>
                <Text style={styles.menuItemText}>Company details edit</Text>
                <Image source={require("../../assets/images/right-arrow.png")} style={styles.chevronIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: "#F3F4F6" }]}>
                  <Image source={require("../../assets/images/delete.png")} style={styles.menuIconImage} />
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Feature Cards Grid */}
          <View style={styles.cardsContainer}>
            <View style={styles.cardsGrid}>
              <View style={styles.cardRow}>
                {renderFeatureCard({ item: featureCards[0] })}
                {renderFeatureCard({ item: featureCards[1] })}
              </View>
              <View style={styles.cardRow}>
                {renderFeatureCard({ item: featureCards[2] })}
                {renderFeatureCard({ item: featureCards[3] })}
              </View>
            </View>
          </View>

          {/* Employee Section */}
          <View style={styles.employeeSection}>
            <View style={styles.employeeHeader}>
              <Text style={styles.sectionTitle}>Employee</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("CreateEmployee")}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {showLoader && employees.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#00664F" />
              </View>
            ) : employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No employees yet</Text>
                <Text style={styles.emptySubtext}>Add your first employee to get started</Text>
              </View>
            ) : (
              <View style={styles.employeeList}>
                {employees.map((item, index) => (
                  <View key={item._id}>
                    {renderEmployee({ item })}
                    {index < employees.length - 1 && <View style={styles.employeeUnderline} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: rs(20),
    paddingVertical: rs(16),
    backgroundColor: "#FFFFFF"
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  companyLogo: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    marginRight: rs(12)
  },
  defaultLogo: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: rs(12)
  },
  defaultLogoText: {
    fontSize: fp(20),
    fontWeight: "700",
    color: "#00664F",
    fontFamily: "Inter-Bold"
  },
  companyDetails: {
    flex: 1
  },
  companyName: {
    fontSize: fp(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: rs(2),
    fontFamily: "Inter-Bold"
  },
  companySubtitle: {
    fontSize: fp(14),
    color: "#6B7280",
    fontFamily: "Inter-Regular"
  },
  menuButton: {
    padding: rs(8)
  },
  menuIcon: {
    width: rs(20),
    height: rs(20),
    tintColor: "#6B7280"
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  cardsContainer: {
    paddingHorizontal: rs(20),
    paddingTop: rs(20)
  },
  cardsGrid: {
    paddingBottom: rs(10)
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rs(20), // Increased gap between rows
    alignItems: "flex-start" // Align cards to top when heights differ
  },
  featureCard: {
    borderRadius: rs(16),
    padding: rs(16),
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginHorizontal: rs(4) // Add horizontal gap between cards
    // width and height now set dynamically in renderFeatureCard
  },
  cardImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%"
  },
  cardImage: {
    width: rs(100), // Increased from 80 to 100
    height: rs(100) // Increased from 80 to 100
  },
  cardTitle: {
    fontSize: fp(18), // Changed to 18px as specified
    fontWeight: "500", // Changed to 500 (Medium) as specified
    color: "#FFFFFF",
    textAlign: "left",
    marginTop: rs(8),
    fontFamily: "Inter-Medium" // Changed to Inter-Medium for weight 500
  },
  employeeSection: {
    paddingHorizontal: rs(20),
    paddingTop: rs(20),
    paddingBottom: rs(140)
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rs(16)
  },
  sectionTitle: {
    fontSize: fp(20),
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: "Inter-Bold"
  },
  addButton: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  addButtonText: {
    fontSize: fp(20),
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  },
  employeeList: {
    backgroundColor: "#FFFFFF",
    borderRadius: rs(12),
    paddingVertical: rs(8)
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(16),
    backgroundColor: "transparent"
  },
  employeeUnderline: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: rs(16)
  },
  employeeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  employeeAvatar: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: rs(12)
  },
  avatarImage: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    resizeMode: 'cover'
  },
  avatarText: {
    fontSize: fp(18),
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: "Inter-SemiBold"
  },
  employeeInfo: {
    flex: 1
  },
  employeeName: {
    fontSize: fp(16),
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: rs(2),
    fontFamily: "Inter-SemiBold"
  },
  employeeEmail: {
    fontSize: fp(14),
    color: "#6B7280",
    fontFamily: "Inter-Regular"
  },
  arrowIcon: {
    width: rs(16),
    height: rs(16),
    tintColor: "#9CA3AF"
  },
  deleteButton: {
    padding: rs(12),
    backgroundColor: "#FEF2F2",
    borderRadius: rs(8)
  },
  deleteIcon: {
    width: rs(24),
    height: rs(24),
    tintColor: "#EF4444"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: rs(40)
  },
  emptyText: {
    fontSize: fp(16),
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: rs(4),
    fontFamily: "Inter-SemiBold"
  },
  emptySubtext: {
    fontSize: fp(14),
    color: "#9CA3AF",
    textAlign: "center",
    fontFamily: "Inter-Regular"
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: rs(15)
  },
  menuIconImage: {
    width: rs(20),
    height: rs(20),
    tintColor: "#6B7280"
  },
  menuItemText: {
    flex: 1,
    fontSize: rs(16),
    color: "#111827",
    fontWeight: "500",
    fontFamily: "Inter-Medium"
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
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  }
});
