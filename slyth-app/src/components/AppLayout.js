import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "http://localhost:5000";

export default function AppLayout({
  navigation,
  children,
  activeTab,
  role = "admin" // admin | employee
}) {
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

  const go = (screen) => navigation.navigate(screen);

  return (
    <View style={styles.container}>
      {/* 🔝 TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/back.png")}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        <View style={styles.companyRow}>
          {company?.logo && (
            <Image source={{ uri: company.logo }} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>
            {company?.name || "Company"}
          </Text>
        </View>

        <Image
          source={require("../../assets/images/profile.png")}
          style={styles.profileIcon}
        />
      </View>

      {/* 🧩 PAGE CONTENT */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* 🔽 BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Nav
          label="Home"
          icon={require("../../assets/images/home.png")}
          active={activeTab === "home"}
          onPress={() =>
            go(role === "admin" ? "AdminDashboard" : "EmployeeHome")
          }
        />
        <Nav
          label="Chat"
          icon={require("../../assets/images/chat.png")}
          active={activeTab === "chat"}
          onPress={() =>
            go(role === "admin" ? "AdminChat" : "EmployeeChat")
          }
        />
        <Nav
          label="Meet"
          icon={require("../../assets/images/meet.png")}
          active={activeTab === "meet"}
          onPress={() =>
            go(role === "admin" ? "AdminMeet" : "EmployeeMeet")
          }
        />
        <Nav
          label="Work"
          icon={require("../../assets/images/work.png")}
          active={activeTab === "work"}
          onPress={() =>
            go(role === "admin" ? "AdminWork" : "EmployeeWork")
          }
        />
        {role === "admin" && (
          <Nav
            label="Files"
            icon={require("../../assets/images/files.png")}
            active={activeTab === "files"}
            onPress={() => go("AdminFiles")}
          />
        )}
      </View>
    </View>
  );
}

/* 🔹 NAV ITEM */
function Nav({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Image
        source={icon}
        style={[styles.navIcon, active && { tintColor: "#2563EB" }]}
      />
      <Text style={[styles.navText, active && { color: "#2563EB" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center"
  },

  backIcon: { width: 22, height: 22 },

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

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E2E8F0"
  },

  navItem: { alignItems: "center" },
  navIcon: { width: 22, height: 22 },
  navText: { fontSize: 10 }
});
