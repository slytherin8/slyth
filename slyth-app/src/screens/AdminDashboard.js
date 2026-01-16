import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "http://10.249.80.219:5000";

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/employees`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.log("Failed to fetch employees");
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image
          source={require("../../assets/images/back.png")} // replace if needed
          style={styles.backIcon}
        />
      </TouchableOpacity>

      <Text style={styles.title}>Admin Dashboard</Text>

      {/* ➕ Create Employee */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => navigation.navigate("CreateEmployee")}
      >
        <Text style={styles.createBtnText}>+ Create Employee</Text>
      </TouchableOpacity>

      {/* 👥 Employee List */}
      <Text style={styles.sectionTitle}>Employees</Text>

      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No employees yet</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.employeeCard}>
            <Text style={styles.employeeName}>{item.name}</Text>
            <Text style={styles.employeeEmail}>{item.email}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24
  },
  backIcon: {
    width: 24,
    height: 24,
    marginBottom: 15
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20
  },
  createBtn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    marginBottom: 25
  },
  createBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10
  },
  employeeCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600"
  },
  employeeEmail: {
    fontSize: 13,
    color: "#64748B"
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 30
  }
});
