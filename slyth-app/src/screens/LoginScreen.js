import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView
} from "react-native";
import { useState } from "react";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";



export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  const login = async () => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();
      if (!res.ok) return Alert.alert(data.message);

      await AsyncStorage.setItem("token", data.token);
      console.log("TOKEN SAVED:", data.token);
      
      // Skip profile setup for admins, only employees need profile setup
      if (role === "admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("ProfileSetup");
      }

    } catch {
      Alert.alert("Server not reachable");
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
      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

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

      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Login</Text>
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
