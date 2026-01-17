import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "http://localhost:5000"; // ⚠️ use PC IP, not localhost

export default function EmployeeHome({ navigation }) {
  const [company, setCompany] = useState({});

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
    } catch {
      setCompany({});
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔝 TOP BAR */}
      <View style={styles.topBar}>
        {/* 🔙 BACK BUTTON */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/back.png")}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        {/* 🏢 COMPANY */}
        <View style={styles.companyRow}>
          {company?.logo && (
            <Image source={{ uri: company.logo }} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>
            {company?.name || "Company"}
          </Text>
        </View>

        {/* 👤 PROFILE */}
        <Image
          source={require("../../assets/images/profile.png")}
          style={styles.profileIcon}
        />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.title}>Employee Home</Text>
      </View>

      {/* 🔽 BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Nav
          icon={require("../../assets/images/home.png")}
          label="Home"
          onPress={() => {}}
        />

        <Nav
          icon={require("../../assets/images/chat.png")}
          label="Chat"
          onPress={() => navigation.navigate("EmployeeChat")}
        />

        <Nav
          icon={require("../../assets/images/meet.png")}
          label="Meet"
          onPress={() => navigation.navigate("EmployeeMeet")}
        />

        <Nav
          icon={require("../../assets/images/work.png")}
          label="Work"
          onPress={() => navigation.navigate("EmployeeWork")}
        />
      </View>
    </View>
  );
}

/* 🔹 NAV ICON */
function Nav({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Image source={icon} style={styles.navIcon} />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center"
  },

  backIcon: {
    width: 22,
    height: 22
  },

  companyRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  companyLogo: {
    width: 34,
    height: 34,
    borderRadius: 6,
    marginRight: 8
  },

  companyName: {
    fontSize: 20,
    fontWeight: "700"
  },

  profileIcon: {
    width: 26,
    height: 26
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 22,
    fontWeight: "700"
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E2E8F0"
  },

  navItem: {
    alignItems: "center"
  },

  navIcon: {
    width: 22,
    height: 22
  },

  navText: {
    fontSize: 10
  }
});
