import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  StatusBar
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppLayout from "../components/AppLayout";
import { workService } from "../services/workService";
import { useSmartLoader } from "../hooks/useSmartLoader";

const { width } = Dimensions.get('window');

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

export default function AdminWorkScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const showLoader = useSmartLoader(loading);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await workService.getEmployees();
      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error("Fetch employees error:", error);
      Alert.alert("Error", "Failed to fetch employees. Check if you are Admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = employees.filter(emp =>
      emp.name?.toLowerCase().includes(text.toLowerCase()) ||
      emp.email?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => navigation.navigate("EmployeeWorkspace", { employee: item })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.profile?.avatar ? (
          <Image source={{ uri: item.profile.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {item.name?.charAt(0).toUpperCase() || item.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.empInfo}>
        <Text style={styles.empName}>{item.profile?.name || item.name || item.email.split('@')[0]}</Text>
        <Text style={styles.empEmail}>{item.role === 'admin' ? 'Admin' : 'Employee'}</Text>
      </View>
      <Image
        source={require("../../assets/images/right-arrow.png")}
        style={styles.arrowIcon}
      />
    </TouchableOpacity>
  );

  return (
    <AppLayout navigation={navigation} role="admin" title="Work">
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Image
              source={require("../../assets/images/search.png")}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for member"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        {showLoader && employees.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00664F" />
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item._id}
            renderItem={renderEmployeeItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(15),
    paddingBottom: getResponsiveSize(10),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6", // Gray-100
    borderRadius: getResponsiveSize(22),
    paddingHorizontal: getResponsiveSize(16),
    height: getResponsiveSize(44),
  },
  searchIcon: {
    width: getResponsiveSize(18),
    height: getResponsiveSize(18),
    marginRight: getResponsiveSize(10),
    tintColor: "#9CA3AF",
  },
  searchInput: {
    flex: 1,
    fontSize: getResponsiveFontSize(15),
    color: "#1F2937",
    fontFamily: "Inter-Regular",
    height: "100%",
  },
  listContent: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(140), // Space for bottom nav
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: getResponsiveSize(14),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    marginRight: getResponsiveSize(12),
  },
  avatar: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: "#FCE7F3", // Pink light
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    color: "#DB2777", // Pink dark
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Inter-SemiBold",
  },
  empEmail: {
    fontSize: getResponsiveFontSize(13),
    color: "#6B7280",
    fontFamily: "Inter-Regular",
    marginTop: getResponsiveSize(2),
  },
  arrowIcon: {
    width: getResponsiveSize(12),
    height: getResponsiveSize(12),
    tintColor: "#9CA3AF",
  },
  emptyContainer: {
    marginTop: getResponsiveSize(40),
    alignItems: "center",
  },
  emptyText: {
    fontSize: getResponsiveFontSize(15),
    color: "#9CA3AF",
    fontFamily: "Inter-Medium",
  },
});
