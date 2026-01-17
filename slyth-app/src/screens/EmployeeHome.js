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



export default function EmployeeHome() {
  const [company, setCompany] = useState({});

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/company`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      console.log("COMPANY (EMPLOYEE):", data);
      setCompany(data);
    } catch (err) {
      console.log("Company fetch failed");
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔝 TOP BAR */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {company.logo && (
            <Image source={{ uri: company.logo }} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>
            {company.name || "Company"}
          </Text>
        </View>

        <Image
          source={require("../../assets/images/profile.png")}
          style={styles.profileIcon}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Employee Home</Text>
      </View>

      {/* 🔽 BOTTOM NAV (NO FILES) */}
      <View style={styles.bottomNav}>
        <NavIcon label="Home" icon={require("../../assets/images/home.png")} />
        <NavIcon label="Chat" icon={require("../../assets/images/chat.png")} />
        <NavIcon label="Meet" icon={require("../../assets/images/meet.png")} />
        <NavIcon label="Work" icon={require("../../assets/images/work.png")} />
      </View>
    </View>
  );
}

function NavIcon({ icon, label }) {
  return (
    <TouchableOpacity style={styles.navItem}>
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
