import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  StatusBar
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";

const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};

export default function CreateEmployeeScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState({});

  // Error states
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetchCompany();
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

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
  };

  const clearErrors = () => {
    setNameError("");
    setEmailError("");
    setPasswordError("");
  };

  const createEmployee = async () => {
    clearErrors();

    // Validation
    if (!name.trim()) {
      setNameError("Employee name is required");
      return;
    }

    if (!email.trim()) {
      setEmailError("Employee email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Employee password is required");
      return;
    }

    if (!isStrongPassword(password)) {
      setPasswordError("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      return Alert.alert("Session expired", "Please login again");
    }

    // Debug: Check token content
    try {
      const payload = decodeJWT(token);
      console.log("Current user from token:", payload);

      if (!payload || payload.role !== 'admin') {
        return Alert.alert("Access Denied", "You need admin privileges to create employees.");
      }
    } catch (e) {
      console.log("Invalid token format:", e);
      return Alert.alert("Invalid session", "Please login again");
    }

    try {
      console.log("Making request to create employee...");
      console.log("Request data:", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: "***hidden***"
      });

      const res = await fetch(`${API}/api/auth/create-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim()
        })
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", res.headers);

      const responseText = await res.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log("Failed to parse response as JSON:", parseError);
        data = { message: responseText };
      }

      console.log("Parsed response data:", data);

      if (!res.ok) {
        console.log("BACKEND ERROR:", data);

        if (res.status === 403) {
          return Alert.alert("Access Denied", "You need admin privileges to create employees.");
        }

        if (res.status === 400) {
          if (data.message?.includes("All fields required")) {
            return Alert.alert("Validation Error", "Please fill in all fields");
          }
          if (data.message?.includes("already exists")) {
            setEmailError("Email already registered");
            return;
          }
        }

        if (res.status === 409 || data.message?.includes("already exists") || data.message?.includes("already registered")) {
          setEmailError("Email already registered");
          return;
        }

        return Alert.alert("Error", data.message || "Failed to create employee");
      }

      Alert.alert("Success", "Employee added successfully", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("AdminDashboard");
          }
        }
      ]);

    } catch (error) {
      console.log("Network error:", error);
      Alert.alert("Network Error", `Server not reachable at ${API}. Please check your connection.`);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require("../../assets/images/back-arrow.png")}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>New Employee</Text>

          <View style={styles.companyLogoContainer}>
            {company?.logo ? (
              <Image source={{ uri: company.logo }} style={styles.companyLogo} />
            ) : (
              <View style={styles.defaultLogo}>
                <Text style={styles.defaultLogoText}>$</Text>
              </View>
            )}
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Employee name</Text>
            <TextInput
              placeholder="Enter employee name"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, nameError && styles.inputError]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError("");
              }}
              autoCapitalize="words"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Employee Email</Text>
            <TextInput
              placeholder="Enter employee email"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, emailError && styles.inputError]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Employee Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                placeholder="Enter employee password"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Image
                  source={showPassword
                    ? require("../../assets/images/eye-open.png")
                    : require("../../assets/images/eye-close.png")
                  }
                  style={styles.eyeIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <TouchableOpacity style={styles.createButton} onPress={createEmployee}>
            <Text style={styles.createButtonText}>Create Employee</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    backgroundColor: "#F5F5F5"
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: "#E5E7EB",
    borderRadius: getResponsiveSize(20),
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: "center",
    alignItems: "center"
  },
  backIcon: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    tintColor: "#374151"
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Inter-SemiBold"
  },
  companyLogoContainer: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: "center",
    alignItems: "center"
  },
  companyLogo: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20)
  },
  defaultLogo: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center"
  },
  defaultLogoText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "700",
    color: "#00664F",
    fontFamily: "Inter-Bold"
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(40)
  },
  inputContainer: {
    marginBottom: getResponsiveSize(24)
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: "500",
    color: "#374151",
    fontFamily: "Inter-Medium",
    marginBottom: getResponsiveSize(16),
    marginLeft: getResponsiveSize(4)
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: getResponsiveSize(28),
    paddingHorizontal: getResponsiveSize(24),
    paddingVertical: getResponsiveSize(18),
    fontSize: getResponsiveFontSize(16),
    color: "#1F2937",
    fontFamily: "Inter-Regular",
    minHeight: getResponsiveSize(56)
  },
  passwordInputContainer: {
    position: "relative"
  },
  passwordInput: {
    paddingRight: getResponsiveSize(55)
  },
  eyeButton: {
    position: "absolute",
    right: getResponsiveSize(16),
    top: getResponsiveSize(18),
    padding: getResponsiveSize(6)
  },
  eyeIcon: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    tintColor: "#6B7280"
  },
  createButton: {
    backgroundColor: "#00664F",
    borderRadius: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(18),
    alignItems: "center",
    marginTop: getResponsiveSize(40),
    minHeight: getResponsiveSize(56)
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 2
  },
  errorText: {
    color: "#EF4444",
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveSize(8),
    marginLeft: getResponsiveSize(4),
    fontFamily: "Inter-Regular"
  }
});
