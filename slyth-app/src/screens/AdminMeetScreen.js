import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  Linking
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";


const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};

export default function AdminMeetScreen({ navigation }) {
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
    } catch (err) {
      console.log("COMPANY FETCH ERROR", err);
      setCompany({});
    }
  };



  const handleConnectToMeet = async () => {
    try {
      const url = 'https://meet.google.com/new';
      console.log("Attempting to open Google Meet:", url);

      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        Alert.alert(
          "Opening Google Meet! 🎉",
          "Google Meet is opening. Create your meeting and share the link with your team.",
          [{ text: "OK" }]
        );
      } else {
        await Linking.openURL(url); // Try anyway
      }
    } catch (error) {
      console.error("Error opening Google Meet:", error);
      Alert.alert(
        "Google Meet",
        "Please open Google Meet manually:\n\n1. Open your browser\n2. Go to meet.google.com\n3. Create a new meeting\n4. Share the meeting link with your team",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require("../../assets/images/back-arrow.png")}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Meet</Text>

          <View style={styles.companyLogoContainer}>
            {company?.logo ? (
              <Image source={{ uri: company.logo }} style={styles.companyLogo} />
            ) : (
              <View style={styles.defaultLogo}>
                <Text style={styles.defaultLogoText}>$</Text>
              </View>
            )}
          </View>
        </View>

        {/* Center Content */}
        <View style={styles.centerContent}>
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../../assets/images/google-meet.png")}
              style={styles.meetIllustration}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnectToMeet}
            activeOpacity={0.8}
          >
            <Text style={styles.connectButtonText}>Connect to Meet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    backgroundColor: "#F5F5F5"
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: "#E5E7EB",
    borderRadius: getResponsiveSize(20),
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: "center",
    alignItems: "center"
  },
  backIcon: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    tintColor: "#374151"
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Inter-SemiBold"
  },
  companyLogoContainer: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: "center",
    alignItems: "center"
  },
  companyLogo: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20)
  },
  defaultLogo: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: "#E5F3F0",
    justifyContent: "center",
    alignItems: "center"
  },
  defaultLogoText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "700",
    color: "#00664F",
    fontFamily: "Inter-Bold"
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20)
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  meetIllustration: {
    width: Math.min(width * 0.8, 400),
    height: Math.min(height * 0.4, 300),
    maxWidth: 350,
    maxHeight: 280
  },
  bottomContainer: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
    paddingTop: getResponsiveSize(20)
  },
  connectButton: {
    backgroundColor: "#00664F",
    borderRadius: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(18),
    alignItems: "center",
    minHeight: getResponsiveSize(56)
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  }
});
