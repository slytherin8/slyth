import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView
} from "react-native";
import { useState } from "react";
import AsyncStorage from "../utils/storage";
import * as ImagePicker from "expo-image-picker";
import { API } from "../constants/api";
// ⚠️ PC IP, NOT localhost

export default function ProfileSetupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [avatar, setAvatar] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5
    });

    if (!result.canceled) {
      setAvatar(`data:image/png;base64,${result.assets[0].base64}`);
    }
  };

  const saveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API}/api/auth/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          jobRole,
          avatar
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Profile save failed");
        return;
      }

      // 🔀 ROLE-BASED REDIRECT (FROM BACKEND)
      if (data.role === "admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("EmployeeHome");
      }
    } catch (err) {
      Alert.alert("Profile save failed");
    }
  };

  const skipProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    const payload = JSON.parse(atob(token.split(".")[1]));

    payload.role === "admin"
      ? navigation.replace("AdminDashboard")
      : navigation.replace("EmployeeHome");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Set up your profile</Text>

        <TouchableOpacity onPress={pickImage} style={styles.avatarBox}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <Text>Select Photo</Text>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder="Your Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Job Role (Frontend Developer)"
          style={styles.input}
          value={jobRole}
          onChangeText={setJobRole}
        />

        <TouchableOpacity style={styles.btn} onPress={saveProfile}>
          <Text style={styles.btnText}>Save & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={skipProfile}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
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
    minHeight: "100%"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center"
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  avatarBox: {
    alignSelf: "center",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  },
  skip: {
    textAlign: "center",
    marginTop: 14,
    color: "#64748B"
  }
});
