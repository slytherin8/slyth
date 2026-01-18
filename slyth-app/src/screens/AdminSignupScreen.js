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
import * as ImagePicker from "expo-image-picker";


import { API } from "../constants/api";


export default function AdminSignupScreen({ navigation }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logo, setLogo] = useState(null);

  const isStrongPassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);

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
    if (!companyName || !email || !password) {
      Alert.alert("All fields required");
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        "Weak Password",
        "Password must contain uppercase, lowercase, number & special character"
      );
      return;
    }

    try {
      const res = await fetch(`${API}/api/auth/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          email,
          password,
          logo
        })
      });

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      if (!res.ok) {
        Alert.alert("Server Error", text);
        return;
      }

      Alert.alert("Success", "Company created successfully");
      navigation.replace("Login");
    } catch (error) {
      console.log("SIGNUP ERROR:", error);
      Alert.alert("Network Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔙 Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Image
          source={require("../../assets/images/back.png")}
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

      <TouchableOpacity style={styles.logoBtn} onPress={pickLogo}>
        <Text>Select Company Logo</Text>
      </TouchableOpacity>

      {logo && <Image source={{ uri: logo }} style={styles.logoPreview} />}

      <TouchableOpacity style={styles.button} onPress={signup}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ✅ STYLES (THIS WAS MISSING) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24,
    justifyContent: "center"
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10
  },
  backIcon: {
    width: 24,
    height: 24
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 25
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15
  },
  logoBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10
  },
  logoPreview: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 15,
    borderRadius: 10
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
