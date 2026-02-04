import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "../utils/storage";
import * as ImagePicker from "expo-image-picker";

const API = "http://localhost:5000";

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.profile) {
      setName(data.profile.name);
      setJobRole(data.profile.jobRole);
      setAvatar(data.profile.avatar);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5
    });

    if (!result.canceled) {
      setAvatar(`data:image/png;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    const token = await AsyncStorage.getItem("token");

    await fetch(`${API}/api/auth/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, jobRole, avatar })
    });

    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={
              avatar
                ? { uri: avatar }
                : require("../../assets/images/profile.png")
            }
            style={styles.avatar}
          />
        </TouchableOpacity>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your Name"
          style={styles.input}
        />

        <TextInput
          value={jobRole}
          onChangeText={setJobRole}
          placeholder="Job Role"
          style={styles.input}
        />

        <TouchableOpacity style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>Save</Text>
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
    padding: 24
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8
  },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" }
});
