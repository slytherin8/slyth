import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { useState } from "react";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";



export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    // Input validation
    if (!email.trim()) {
      Alert.alert("Validation Error", "Please enter your email address");
      return;
    }
    
    if (!password.trim()) {
      Alert.alert("Validation Error", "Please enter your password");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password.trim(), 
          role 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Login Failed", data.message || "Invalid username or password");
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      console.log("TOKEN SAVED:", data.token);
      
      // Show success message
      Alert.alert("Success! 🎉", "Login successful");
      
      // Skip profile setup for admins, only employees need profile setup
      if (role === "admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("ProfileSetup");
      }

    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Connection Error", "Server not reachable. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image
          source={require("../../assets/images/back.png")} // replace image if needed
          style={styles.backIcon}
        />
      </TouchableOpacity>

      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeIcon}>
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleBtn, role === "admin" && styles.activeRole]}
          onPress={() => setRole("admin")}
        >
          <Text>Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === "employee" && styles.activeRole]}
          onPress={() => setRole("employee")}
        >
          <Text>Employee</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={login}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      {role === "admin" && (
        <Text
          style={styles.link}
          onPress={() => navigation.navigate("AdminSignup")}
        >
          Create Company Account
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  content: {
    padding: 24,
    justifyContent: "center",
    flexGrow: 1
  },
  backIcon: {
    width: 24,
    height: 24,
    marginBottom: 15
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    marginBottom: 15
  },
  passwordInput: {
    flex: 1,
    padding: 12
  },
  eyeButton: {
    padding: 12
  },
  eyeIcon: {
    fontSize: 18
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  roleBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    marginHorizontal: 5,
    borderRadius: 6
  },
  activeRole: {
    backgroundColor: "#DBEAFE"
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8
  },
  buttonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  },
  link: {
    textAlign: "center",
    marginTop: 15,
    color: "#2563EB"
  }
});
