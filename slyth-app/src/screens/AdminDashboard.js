import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "../utils/storage";
import AppLayout from "../components/AppLayout";
import api from "../services/api"; // ✅ Fixed named to default

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/employees");
      setEmployees(res.data);
    } catch (e) {
      console.log("EMPLOYEE FETCH ERROR", e);
      if (e.response?.status === 403) {
        Alert.alert("Access Denied", "You do not have admin privileges.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout navigation={navigation} role="admin" activeTab="home">
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("CreateEmployee")}
        >
          <Text style={styles.createBtnText}>+ Create Employee</Text>
        </TouchableOpacity>

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
          scrollEnabled={false} // Disable FlatList scroll since we're using ScrollView
          nestedScrollEnabled={true} // Enable nested scrolling
        />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    margin: 16
  },
  createBtn: {
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginTop: 10
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
  employeeName: {
    fontSize: 16,
    fontWeight: "600"
  },
  employeeEmail: {
    fontSize: 13,
    color: "#64748B"
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748B"
  }
});
