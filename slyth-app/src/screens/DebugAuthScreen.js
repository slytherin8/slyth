import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";

export default function DebugAuthScreen({ navigation }) {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    const info = {};

    try {
      // Get token
      const token = await AsyncStorage.getItem("token");
      info.hasToken = !!token;
      
      if (token) {
        try {
          // Decode token
          const payload = JSON.parse(atob(token.split('.')[1]));
          info.tokenPayload = payload;
          info.userRole = payload.role;
          info.userId = payload.id;
          info.companyId = payload.companyId;
        } catch (e) {
          info.tokenError = "Invalid token format";
        }

        // Test /me endpoint
        try {
          const meRes = await fetch(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          info.meStatus = meRes.status;
          info.meResponse = await meRes.json();
        } catch (e) {
          info.meError = e.message;
        }

        // Test admin endpoint
        try {
          const adminRes = await fetch(`${API}/api/auth/test-admin`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          info.adminStatus = adminRes.status;
          info.adminResponse = await adminRes.json();
        } catch (e) {
          info.adminError = e.message;
        }

        // Test employees endpoint
        try {
          const empRes = await fetch(`${API}/api/auth/employees`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          info.employeesStatus = empRes.status;
          info.employeesResponse = await empRes.json();
        } catch (e) {
          info.employeesError = e.message;
        }
      }
    } catch (error) {
      info.generalError = error.message;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const clearToken = async () => {
    await AsyncStorage.removeItem("token");
    Alert.alert("Token cleared", "Please login again");
    navigation.navigate("Login");
  };

  const createTestAdmin = async () => {
    try {
      const response = await fetch(`${API}/api/auth/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Test Company",
          email: "admin@test.com",
          password: "Admin123!",
          logo: null
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Test admin created. Email: admin@test.com, Password: Admin123");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔧 Auth Debug</Text>
        <TouchableOpacity onPress={checkAuthStatus}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : (
          <View>
            <Text style={styles.json}>{JSON.stringify(debugInfo, null, 2)}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={createTestAdmin}>
            <Text style={styles.buttonText}>Create Test Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearToken}>
            <Text style={styles.buttonText}>Clear Token & Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  backButton: {
    color: "#2563EB",
    fontSize: 16
  },
  title: {
    fontSize: 18,
    fontWeight: "600"
  },
  refreshButton: {
    fontSize: 20
  },
  content: {
    flex: 1,
    padding: 20
  },
  loading: {
    textAlign: "center",
    fontSize: 16,
    color: "#64748B"
  },
  json: {
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "#1F2937",
    color: "#F9FAFB",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  actions: {
    gap: 10
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 8,
    alignItems: "center"
  },
  dangerButton: {
    backgroundColor: "#DC2626"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});