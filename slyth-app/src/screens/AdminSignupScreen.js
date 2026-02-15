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
import * as ImagePicker from "expo-image-picker";
import { API } from "../constants/api";

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

export default function AdminSignupScreen({ navigation }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Error states
  const [companyNameError, setCompanyNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isStrongPassword = (password) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  };

  const clearErrors = () => {
    setCompanyNameError("");
    setEmailError("");
    setPasswordError("");
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5
    });

    if (!result.canceled) {
      setLogo(`data:image/png;base64,${result.assets[0].base64}`);
    }
  };

  const signup = async () => {
    clearErrors();

    if (!companyName.trim()) {
      setCompanyNameError("Please enter your company name");
      return;
    }

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

    if (!isStrongPassword(password)) {
      setPasswordError("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          logo
        })
      });

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      if (!res.ok) {
        // Handle specific error messages
        if (res.status === 409 || text.includes("already exists") || text.includes("already registered")) {
          setEmailError("Email already registered. Please login");
        } else {
          Alert.alert("Server Error", text);
        }
        return;
      }

      Alert.alert("Success", "Company created successfully", [
        { text: "OK", onPress: () => navigation.replace("Login") }
      ]);
    } catch (error) {
      console.log("SIGNUP ERROR:", error);
      Alert.alert("Network Error", `Server not reachable at ${API}. Please check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#00664F" />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Background Section with Hand Image */}
          <View style={styles.backgroundSection}>
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
              <View style={styles.card}>
                {/* Title */}
                <Text style={styles.cardTitle}>
                  Create Your <Text style={styles.titleAccent}>Company</Text>.
                </Text>

                {/* Logo Selection */}
                <TouchableOpacity style={styles.logoContainer} onPress={pickLogo}>
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.logoPreview} />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderText}>$</Text>
                    </View>
                  )}
                  <Text style={styles.logoSelectText}>Select logo</Text>
                </TouchableOpacity>

                {/* Company Name Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Company name"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.input, companyNameError && styles.inputError]}
                    value={companyName}
                    onChangeText={(text) => {
                      setCompanyName(text);
                      if (companyNameError) setCompanyNameError("");
                    }}
                    autoCapitalize="words"
                  />
                  {companyNameError ? <Text style={styles.errorText}>{companyNameError}</Text> : null}
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

                {/* Create Company Button */}
                <TouchableOpacity
                  style={[styles.createButton, loading && styles.createButtonDisabled]}
                  onPress={signup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Company</Text>
                  )}
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?{" "}
                    <Text
                      style={styles.loginLink}
                      onPress={() => navigation.navigate("Login")}
                    >
                      LOGIN
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
  backgroundSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1
  },
  illustrationContainer: {
    position: "absolute",
    top: height * 0.05,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2
  },
  handImage: {
    width: Math.min(width * 0.85, 700),
    height: Math.min(height * 0.35, 550),
    maxWidth: 600,
    maxHeight: 450
  },
  cardContainer: {
    flex: 1,
    marginTop: height * 0.25,
    zIndex: 3
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: getResponsiveSize(32),
    borderTopRightRadius: getResponsiveSize(32),
    paddingHorizontal: Math.max(width * 0.06, 20),
    paddingTop: getResponsiveSize(32),
    paddingBottom: getResponsiveSize(40),
    flex: 1
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(26),
    fontWeight: "600",
    textAlign: "center",
    color: "#1F2937",
    marginBottom: getResponsiveSize(32),
    fontFamily: "System",
    lineHeight: getResponsiveFontSize(32)
  },

  titleAccent: {
    color: "#00664F",
    fontWeight: "700"
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: getResponsiveSize(32)
  },
  logoPlaceholder: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(40),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: getResponsiveSize(8)
  },
  logoPlaceholderText: {
    fontSize: getResponsiveFontSize(32),
    fontWeight: "700",
    color: "#00664F"
  },
  logoPreview: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(40),
    marginBottom: getResponsiveSize(8)
  },
  logoSelectText: {
    fontSize: getResponsiveFontSize(14),
    color: "#6B7280",
    fontFamily: "System"
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
  createButton: {
    backgroundColor: "#00664F",
    borderRadius: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(18),
    alignItems: "center",
    marginTop: getResponsiveSize(12),
    marginBottom: getResponsiveSize(24),
    minHeight: getResponsiveSize(56)
  },
  createButtonDisabled: {
    backgroundColor: "#9CA3AF"
  },
  createButtonText: {
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
  loginLink: {
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
