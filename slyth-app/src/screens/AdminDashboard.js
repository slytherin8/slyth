import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "http://localhost:5000";

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState({});

  useEffect(() => {
    fetchEmployees();
    fetchCompany();
  }, []);

  const fetchEmployees = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log("EMPLOYEES:", data);
      setEmployees(data);
    } catch (e) {
      console.log("EMPLOYEE FETCH ERROR", e);
    }
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
    } catch {
      setCompany({});
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔝 TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/back.png")}
            style={{ width: 22, height: 22 }}
          />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {company?.logo && (
            <Image source={{ uri: company.logo }} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>
            {company?.name || "Company"}
          </Text>
        </View>

        <Image
          source={require("../../assets/images/profile.png")}
          style={styles.profileIcon}
        />
      </View>

      {/* ➕ CREATE EMPLOYEE */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => navigation.navigate("CreateEmployee")}
      >
        <Text style={styles.createBtnText}>+ Create Employee</Text>
      </TouchableOpacity>

      {/* 👥 EMPLOYEES */}
      <Text style={styles.sectionTitle}>Employees</Text>

      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <Text style={styles.empty}>No employees yet</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.employeeCard}>
            <Text style={styles.employeeName}>{item.name}</Text>
            <Text style={styles.employeeEmail}>{item.email}</Text>
          </View>
        )}
      />

      {/* 🔽 BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Nav icon={require("../../assets/images/home.png")} label="Home" />
        <Nav icon={require("../../assets/images/chat.png")} label="Chat" />
        <Nav icon={require("../../assets/images/meet.png")} label="Meet" />
        <Nav icon={require("../../assets/images/work.png")} label="Work" />
        <Nav icon={require("../../assets/images/files.png")} label="Files" />
      </View>
    </View>
  );
}

function Nav({ icon, label }) {
  return (
    <TouchableOpacity style={styles.navItem}>
      <Image source={icon} style={styles.navIcon} />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center"
  },
  companyLogo: { width: 34, height: 34, borderRadius: 6, marginRight: 8 },
  companyName: { fontSize: 20, fontWeight: "700" },
  profileIcon: { width: 26, height: 26 },
  sectionTitle: { fontSize: 18, fontWeight: "600", margin: 16 },
  createBtn: {
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8
  },
  createBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  },
  employeeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 8
  },
  employeeName: { fontSize: 16, fontWeight: "600" },
  employeeEmail: { fontSize: 13, color: "#64748B" },
  empty: { textAlign: "center", marginTop: 40, color: "#64748B" },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E2E8F0"
  },
  navItem: { alignItems: "center" },
  navIcon: { width: 22, height: 22 },
  navText: { fontSize: 10 }
});
