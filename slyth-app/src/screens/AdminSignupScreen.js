import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import { useState } from "react";

const API = "http://10.249.80.219:5000";

export default function AdminSignupScreen({ navigation }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
  };

  const signup = async () => {
    if (!companyName || !email || !password) {
      return Alert.alert("All fields required");
    }

    // 🔐 STRONG PASSWORD CHECK
    if (!isStrongPassword(password)) {
      return Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
    }

    try {
      const res = await fetch(`${API}/api/auth/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return Alert.alert("Signup Failed", data.message || "Signup failed");
      }

      Alert.alert("Success", "Company created successfully");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Server not reachable");
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

      <Text style={styles.title}>Create Company Account</Text>

      <TextInput
        placeholder="Company Name"
        style={styles.input}
        onChangeText={setCompanyName}
      />
      <TextInput
        placeholder="Admin Email"
        style={styles.input}
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={signup}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24,
    justifyContent: "center"
  },
  backIcon: {
    width: 24,
    height: 24,
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
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
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  }
});
