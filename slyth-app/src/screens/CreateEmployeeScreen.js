import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "http://localhost:5000";




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

    try {
      const res = await fetch(`${API}/api/auth/create-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

     if (!res.ok) {
  console.log("BACKEND ERROR:", data);
  return Alert.alert("Error", JSON.stringify(data));
}


      Alert.alert("Success", "Employee created successfully ✅");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      Alert.alert("Server Error", "Please try again later");
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24
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
