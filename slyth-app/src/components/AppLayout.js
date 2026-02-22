import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity
} from "react-native";
import { useEffect, useState } from "react";
import { useIsFocused, useNavigation, useNavigationState } from "@react-navigation/native";
import AsyncStorage from "../utils/storage";

import { API } from "../constants/api";

export default function AppLayout({
  navigation: propNavigation,
  children,
  role = "admin", // admin | employee
  onBack,
  showProfile = true,
  logoPosition, // left | right
  title, // New prop
  subtitle, // New prop
  hideHeader = false, // New prop
  onMenu, // New prop for three-dot menu
  menuIcon // 'add' shows a + button, default shows three-dot
}) {
  const navigation = propNavigation || useNavigation();

  // For admins, default logo to right if not explicitly set
  const effectiveLogoPosition = logoPosition || (role === "admin" ? "right" : "left");

  // Automatically detect active tab from current route
  const currentRouteName = useNavigationState(state => {
    if (!state) return "";
    return state.routes[state.index].name;
  });

  const activeTab = (() => {
    const name = currentRouteName;
    if (name === "AdminDashboard" || name === "EmployeeHome") return "home";
    if (name === "AdminWork" || name === "EmployeeWork") return "work";
    if (name === "AdminChat" || name === "EmployeeChat" || name === "GroupChat" || name === "DirectChat") return "chat";
    if (name === "AdminVault" || name === "AdminFiles") return "vault";
    if (name === "AdminMeet" || name === "EmployeeMeet") return "meet";
    return "home";
  })();

  const showBottomNavScreens = [
    "EmployeeHome",
    "AdminWork", "EmployeeWork",
    "AdminChat", "EmployeeChat",
    "AdminVault", "AdminFiles",
    "AdminMeet", "EmployeeMeet"
  ];
  const hideBottomNav = !showBottomNavScreens.includes(currentRouteName);
  const [company, setCompany] = useState({});
  const [profile, setProfile] = useState(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchCompany();
      fetchProfile();
    }
  }, [isFocused]);

  /* 🔹 FETCH COMPANY */
  const fetchCompany = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCompany(data);
    } catch (err) {
      console.log("COMPANY FETCH ERROR", err);
      setCompany({});
    }
  };

  /* 🔹 FETCH LOGGED-IN USER PROFILE */
  const fetchProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      console.log("PROFILE FETCH ERROR", err);
      setProfile(null);
    }
  };

  const go = (screen) => {
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔝 TOP BAR */}
      {!hideHeader && (
        <View style={styles.topBar}>
          {/* 🔙 BACK (Hidden on AdminDashboard) */}
          {currentRouteName !== "AdminDashboard" ? (
            <TouchableOpacity
              onPress={onBack || (() => navigation.goBack())}
              style={styles.backButton}
            >
              <Image
                source={require("../../assets/images/back-arrow.png")}
                style={styles.backIcon}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 12 }} /> // Reduced spacer to shift logo+name further left
          )}

          <View style={[
            styles.companyRow,
            currentRouteName === "AdminDashboard" && { justifyContent: 'flex-start' },
            currentRouteName === "EmployeeHome" && { marginTop: 15 }
          ]}>
            {role === "employee" ? (
              currentRouteName === "EmployeeHome" ? (
                <>
                  {company?.logo ? <Image source={{ uri: company.logo }} style={styles.companyLogo} /> : null}
                  <Text style={styles.companyName}>{company?.name || "Company"}</Text>
                </>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.companyName}>{title || ""}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
              )
            ) : (
              currentRouteName === "AdminDashboard" ? (
                // Admin Dashboard Special: Logo + Name on the LEFT
                <View style={[styles.adminHeaderContent, { justifyContent: 'flex-start' }]}>
                  {company?.logo ? (
                    <Image source={{ uri: company.logo }} style={styles.companyLogo} />
                  ) : (
                    <View style={styles.companyLogoPlaceholder}>
                      <Text style={styles.companyLogoPlaceholderText}>
                        {(company?.name || "C").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.companyName}>{company?.name || "Company"}</Text>
                </View>
              ) : (
                // Other Admin Screens: Title centered, Logo handled by logoPosition or right slot
                <View style={styles.adminHeaderContent}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.companyName}>{title || company?.name || "Company"}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                  </View>
                </View>
              )
            )}
          </View>

          {/* 👤 RIGHT SLOT (LOGO OR MENU) */}
          <View style={styles.rightSlot}>
            {onMenu ? (
              <TouchableOpacity onPress={onMenu} style={styles.menuButton}>
                <Image
                  source={require("../../assets/images/three-dot.png")}
                  style={styles.menuIcon}
                />
              </TouchableOpacity>
            ) : (
              // If not on Dashboard, and it's an Admin screen, show logo on right
              role === "admin" && currentRouteName !== "AdminDashboard" && company?.logo ? (
                <View style={styles.rightLogoContainer}>
                  <Image source={{ uri: company.logo }} style={styles.companyLogoRight} />
                </View>
              ) : (
                <View style={{ width: 44 }} />
              )
            )}
          </View>
        </View>
      )
      }

      {/* 🧩 PAGE CONTENT */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* 🔽 BOTTOM NAV */}
      {
        !hideBottomNav && (
          <View style={styles.navWrapper}>
            <View style={styles.bottomNav}>
              <Nav
                label="Home"
                iconGray={require("../../assets/images/home-gray.png")}
                iconWhite={require("../../assets/images/home-white.png")}
                active={activeTab === "home"}
                onPress={() => go(role === "admin" ? "AdminDashboard" : "EmployeeHome")}
              />
              <Nav
                label="Work"
                iconGray={require("../../assets/images/work-gray.png")}
                iconWhite={require("../../assets/images/work-white.png")}
                active={activeTab === "work"}
                onPress={() => go(role === "admin" ? "AdminWork" : "EmployeeWork")}
              />
              <Nav
                label="Chat"
                iconGray={require("../../assets/images/chat-gray.png")}
                iconWhite={require("../../assets/images/chat-white.png")}
                active={activeTab === "chat"}
                onPress={() => go(role === "admin" ? "AdminChat" : "EmployeeChat")}
              />
              {role === "admin" && (
                <Nav
                  label="Vault"
                  iconGray={require("../../assets/images/valut-gray.png")}
                  iconWhite={require("../../assets/images/valut-white.png")}
                  active={activeTab === "files" || activeTab === "vault"}
                  onPress={() => go("AdminVault")}
                />
              )}
              <Nav
                label="Meet"
                iconGray={require("../../assets/images/meet-gray.png")}
                iconWhite={require("../../assets/images/meet-white.png")}
                active={activeTab === "meet"}
                onPress={() => go(role === "admin" ? "AdminMeet" : "EmployeeMeet")}
              />
            </View>
          </View>
        )
      }
    </View >
  );
}

/* 🔹 NAV ITEM */
function Nav({ iconGray, iconWhite, label, onPress, active }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={active ? iconWhite : iconGray}
        style={styles.navIcon}
      />
      <Text style={[styles.navText, active && styles.navTextActive]}>
        {label}
      </Text>
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
    paddingHorizontal: 16,
    paddingTop: 40, // Safe area top spacing
    paddingBottom: 16,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center"
  },

  backIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain'
  },

  companyRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  adminHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  rightSlot: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  rightLogoContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },

  companyLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
    resizeMode: 'cover',
  },

  companyLogoPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  companyLogoPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00664F',
  },

  companyLogoRight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    resizeMode: 'contain',
  },

  companyName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: -2,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  menuButton: {
    padding: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00664F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  menuIcon: {
    width: 20,
    height: 20,
    tintColor: "#6B7280",
    resizeMode: 'contain',
  },

  navWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 40,
  },

  navItemActive: {
    backgroundColor: "#00664F",
    // Round pill/circle shape
    minWidth: 70,
    height: 70,
    borderRadius: 35,
  },

  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    resizeMode: 'contain'
  },

  navText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500"
  },

  navTextActive: {
    color: "#FFFFFF"
  }
});
