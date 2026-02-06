import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Platform
} from "react-native";
import { useState } from "react";
import AsyncStorage from "../utils/storage";

import { API } from "../constants/api";






export default function CreateEmployeeScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔐 Strong password check
  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
  };

  const createEmployee = async () => {
    if (!name || !email || !password) {
      return Alert.alert("All fields are required");
    }

    if (!isStrongPassword(password)) {
      return Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      return Alert.alert("Session expired", "Please login again");
    }

    // Debug: Check token content
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log("Current user from token:", payload);
      console.log("User role:", payload.role);
      console.log("User ID:", payload.id);

      if (payload.role !== 'admin') {
        return Alert.alert(
          "Access Denied",
          "You need admin privileges. Please login as admin.",
          [
            { text: "Create Admin Account", onPress: createTestAdmin },
            { text: "Go to Login", onPress: () => navigation.navigate("Login") },
            { text: "Cancel" }
          ]
        );
      }
    } catch (e) {
      console.log("Invalid token format:", e);
      return Alert.alert("Invalid session", "Please login again");
    }

    try {
      console.log("Making request to create employee...");
      const res = await fetch(`${API}/api/auth/create-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        console.log("BACKEND ERROR:", data);

        if (res.status === 403) {
          return Alert.alert(
            "Access Denied",
            "You need admin privileges to create employees. Please login as admin.",
            [
              { text: "Create Admin Account", onPress: createTestAdmin },
              { text: "Go to Login", onPress: () => navigation.navigate("Login") },
              { text: "Cancel" }
            ]
          );
        }

        return Alert.alert("Error", data.message || "Failed to create employee");
      }


      Alert.alert("Success", "Employee created successfully ✅");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.log("Network error:", error);
      Alert.alert("Network Error", "Please check if the server is running on localhost:5000");
    }
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
        Alert.alert(
          "Admin Created!",
          "Test admin account created:\n\nEmail: admin@test.com\nPassword: Admin123!\n\nPlease login with these credentials.",
          [
            { text: "Go to Login", onPress: () => navigation.navigate("Login") }
          ]
        );
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {/* 🔙 Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/back.png")}
            style={{ width: 24, height: 24, marginBottom: 20 }}
          />
        </TouchableOpacity>

        <Text style={styles.title}>Create Employee</Text>

        <TextInput
          placeholder="Employee Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Employee Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Temporary Password"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={createEmployee}>
          <Text style={styles.buttonText}>Create Employee</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
    flexGrow: 1
  },
  backIcon: {
    width: 24,
    height: 24,
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    marginTop: 10
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  }
});
