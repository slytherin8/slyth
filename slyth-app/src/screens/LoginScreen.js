import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";

// Fetch with timeout helper
const fetchWithTimeout = (url, options, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375; // Base width (iPhone X)
  return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85); // Minimum 85% of original size
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Logging in...");

  // Error states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
  };

  const login = async () => {
    clearErrors();

    // Input validation
    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your password");
      return;
    }

    setLoading(true);
    setLoadingMessage("Connecting to server...");
    try {
      // Wake up server first (Render free tier sleeps after 15 min)
      try {
        await fetchWithTimeout(`${API}/`, {}, 10000);
      } catch (_) {
        // Server is waking up, continue anyway
      }
      setLoadingMessage("Logging in...");
      console.log(`🔍 Attempting login to: ${API}/api/auth/login`);
      const res = await fetchWithTimeout(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role
        })
      }, 30000);

      const contentType = res.headers.get("content-type");
      let data = {};

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok) {
        // Handle specific error messages
        if (res.status === 404) {
          setEmailError("Account not found. Please sign up");
        } else if (res.status === 401) {
          setPasswordError("Invalid email or password");
        } else if (res.status === 429) {
          Alert.alert("Locked Out", "Too many login attempts. Please wait 15 minutes before trying again or contact your admin.");
        } else {
          Alert.alert("Login Failed", data.message || "Login failed. Please try again");
        }
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      console.log("TOKEN SAVED:", data.token);

      // Role-based redirect
      if (role === "admin") {
        navigation.replace("AdminDashboard");
      } else {
        if (data.profileCompleted) {
          navigation.replace("EmployeeHome");
        } else {
          navigation.replace("ProfileSetup");
        }
      }

    } catch (error) {
      console.error("Login error:", error);
      if (error.name === 'AbortError') {
        Alert.alert(
          "Request Timed Out",
          "The server is taking too long to respond. It may be waking up from sleep. Please try again in 30 seconds."
        );
      } else {
        Alert.alert("Connection Error", `Could not reach server. Please check your internet connection and try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#00664F" />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Background Section with Hand Image */}
          <View style={styles.topSection}>
            <View style={styles.illustrationContainer}>
              <Image
                source={require("../../assets/images/hand.png")}
                style={styles.handImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Bottom White Card */}
          <View style={styles.cardContainer}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.cardContent}>
                {/* Title */}
                <Text style={styles.cardTitle}>
                  Login with Your <Text style={styles.roleHighlight}>Role</Text>
                </Text>

                {/* Role Toggle */}
                <View style={styles.roleToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === "admin" ? styles.roleButtonActive : styles.roleButtonInactive
                    ]}
                    onPress={() => setRole("admin")}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      role === "admin" ? styles.roleButtonTextActive : styles.roleButtonTextInactive
                    ]}>
                      Admin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === "employee" ? styles.roleButtonActive : styles.roleButtonInactive
                    ]}
                    onPress={() => setRole("employee")}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      role === "employee" ? styles.roleButtonTextActive : styles.roleButtonTextInactive
                    ]}>
                      Employee
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Email"
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

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
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
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={login}
                  disabled={loading}
                >
                  {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={[styles.loginButtonText, { fontSize: 13 }]}>{loadingMessage}</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Want to create a company?{" "}
                    <Text
                      style={styles.signupLink}
                      onPress={() => navigation.navigate("AdminSignup")}
                    >
                      SIGNUP
                    </Text>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00664F"
  },
  keyboardAvoidingView: {
    flex: 1
  },
  topSection: {
    height: height * 0.35,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#00664F"
  },
  illustrationContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20
  },
  handImage: {
    width: width * 0.8,
    height: "90%",
  },
  cardContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: getResponsiveSize(32),
    borderTopRightRadius: getResponsiveSize(32),
    overflow: "hidden"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.max(width * 0.06, 20),
    paddingTop: getResponsiveSize(32),
    paddingBottom: getResponsiveSize(40)
  },
  cardContent: {
    // Wrapper for content inside scrollview if needed
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(26),
    fontWeight: "600",
    textAlign: "center",
    color: "#1F2937",
    marginBottom: getResponsiveSize(28),
    fontFamily: "System",
    lineHeight: getResponsiveFontSize(32)
  },
  roleHighlight: {
    color: "#00664F",
    fontWeight: "700"
  },
  roleToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: getResponsiveSize(28),
    padding: getResponsiveSize(6),
    marginBottom: getResponsiveSize(28)
  },
  roleButton: {
    flex: 1,
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(22),
    alignItems: "center"
  },
  roleButtonActive: {
    backgroundColor: "#00664F"
  },
  roleButtonInactive: {
    backgroundColor: "transparent"
  },
  roleButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "600",
    fontFamily: "System"
  },
  roleButtonTextActive: {
    color: "#FFFFFF"
  },
  roleButtonTextInactive: {
    color: "#6B7280"
  },
  inputContainer: {
    position: "relative",
    marginBottom: getResponsiveSize(18)
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: getResponsiveSize(18),
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    fontSize: getResponsiveFontSize(16),
    color: "#1F2937",
    fontFamily: "System",
    minHeight: getResponsiveSize(50)
  },
  passwordInput: {
    paddingRight: getResponsiveSize(55)
  },
  eyeButton: {
    position: "absolute",
    right: getResponsiveSize(16),
    top: getResponsiveSize(15),
    padding: getResponsiveSize(6)
  },
  eyeIcon: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    tintColor: "#6B7280"
  },
  loginButton: {
    backgroundColor: "#00664F",
    borderRadius: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(18),
    alignItems: "center",
    marginTop: getResponsiveSize(12),
    marginBottom: getResponsiveSize(24),
    minHeight: getResponsiveSize(56)
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF"
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveFontSize(18),
    fontWeight: "700",
    fontFamily: "System"
  },
  footer: {
    alignItems: "center",
    paddingTop: getResponsiveSize(8)
  },
  footerText: {
    fontSize: getResponsiveFontSize(14),
    color: "#6B7280",
    fontFamily: "System",
    textAlign: "center",
    lineHeight: getResponsiveFontSize(20)
  },
  signupLink: {
    color: "#00664F",
    fontWeight: "700"
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 2
  },
  errorText: {
    color: "#EF4444",
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveSize(4),
    marginLeft: getResponsiveSize(4),
    fontFamily: "System"
  }
});
