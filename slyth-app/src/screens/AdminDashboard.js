import React, { useEffect, useState } from "react";
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
  StatusBar
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "../utils/storage";
import api from "../services/api";
import { API } from "../constants/api";

const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompany();
    fetchEmployees();
  }, []);

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
          height: getResponsiveSize(item.height),
          width: getResponsiveSize(168), // Slightly reduced width to accommodate gaps
          marginTop: item.id === 2 ? getResponsiveSize(35) : 0 // Move red card (Group Chats) down more
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
    <TouchableOpacity
      style={styles.employeeItem}
      onPress={() => navigation.navigate("EmployeeWork", { employeeId: item._id })}
      activeOpacity={0.7}
    >
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
          <Text style={styles.employeeEmail}>{item.email}</Text>
        </View>
      </View>
      <Image
        source={require("../../assets/images/right-arrow.png")}
        style={styles.arrowIcon}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {company?.logo ? (
              <Image source={{ uri: company.logo }} style={styles.companyLogo} />
            ) : (
              <View style={styles.defaultLogo}>
                <Text style={styles.defaultLogoText}>$</Text>
              </View>
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{company?.name || "Company"}</Text>
              
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Image
              source={require("../../assets/images/three-dot.png")}
              style={styles.menuIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

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

            {employees.length === 0 ? (
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
      </SafeAreaView>
    </SafeAreaProvider>
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
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    backgroundColor: "#FFFFFF"
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  companyLogo: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    marginRight: getResponsiveSize(12)
  },
  defaultLogo: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: getResponsiveSize(12)
  },
  defaultLogoText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: "700",
    color: "#00664F",
    fontFamily: "Inter-Bold"
  },
  companyDetails: {
    flex: 1
  },
  companyName: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: getResponsiveSize(2),
    fontFamily: "Inter-Bold"
  },
  companySubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: "#6B7280",
    fontFamily: "Inter-Regular"
  },
  menuButton: {
    padding: getResponsiveSize(8)
  },
  menuIcon: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    tintColor: "#6B7280"
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  cardsContainer: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(20)
  },
  cardsGrid: {
    paddingBottom: getResponsiveSize(10)
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: getResponsiveSize(20), // Increased gap between rows
    alignItems: "flex-start" // Align cards to top when heights differ
  },
  featureCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginHorizontal: getResponsiveSize(4) // Add horizontal gap between cards
    // width and height now set dynamically in renderFeatureCard
  },
  cardImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%"
  },
  cardImage: {
    width: getResponsiveSize(100), // Increased from 80 to 100
    height: getResponsiveSize(100) // Increased from 80 to 100
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(18), // Changed to 18px as specified
    fontWeight: "500", // Changed to 500 (Medium) as specified
    color: "#FFFFFF",
    textAlign: "left",
    marginTop: getResponsiveSize(8),
    fontFamily: "Inter-Medium" // Changed to Inter-Medium for weight 500
  },
  employeeSection: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(100)
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getResponsiveSize(16)
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: "Inter-Bold"
  },
  addButton: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  addButtonText: {
    fontSize: getResponsiveFontSize(20),
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  },
  employeeList: {
    backgroundColor: "#FFFFFF",
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8)
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(16),
    backgroundColor: "transparent"
  },
  employeeUnderline: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: getResponsiveSize(16)
  },
  employeeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  employeeAvatar: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: getResponsiveSize(12)
  },
  avatarImage: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25)
  },
  avatarText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: "Inter-SemiBold"
  },
  employeeInfo: {
    flex: 1
  },
  employeeName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: getResponsiveSize(2),
    fontFamily: "Inter-SemiBold"
  },
  employeeEmail: {
    fontSize: getResponsiveFontSize(14),
    color: "#6B7280",
    fontFamily: "Inter-Regular"
  },
  arrowIcon: {
    width: getResponsiveSize(16),
    height: getResponsiveSize(16),
    tintColor: "#9CA3AF"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: getResponsiveSize(40)
  },
  emptyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: getResponsiveSize(4),
    fontFamily: "Inter-SemiBold"
  },
  emptySubtext: {
    fontSize: getResponsiveFontSize(14),
    color: "#9CA3AF",
    textAlign: "center",
    fontFamily: "Inter-Regular"
  }
});
