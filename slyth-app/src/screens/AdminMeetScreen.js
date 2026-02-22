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
  Linking,
  Platform,
  ScrollView
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";
import AppLayout from "../components/AppLayout";
import * as WebBrowser from 'expo-web-browser';


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
    console.log("Connecting to Google Meet...");

    if (Platform.OS === 'android') {
      // Try opening Google Meet app directly by package (avoids CALL_PHONE issue)
      const meetAppUrl = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.google.android.apps.meetings;end';
      try {
        await Linking.openURL(meetAppUrl);
        return;
      } catch (e) {
        console.log('Meet app launch failed, trying browser fallback:', e.message);
      }
    }

    // iOS or Android fallback: open in browser
    try {
      await Linking.openURL('https://meet.google.com');
    } catch (error) {
      console.error("Error opening Google Meet:", error);
      Alert.alert(
        "Google Meet",
        "Could not open Google Meet. Please make sure the Google Meet app is installed.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <AppLayout role="admin" title="Meet" onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Center Content */}
          <View style={styles.content}>
            <View style={styles.illustrationContainer}>
              <Image
                source={require("../../assets/images/google-meet.png")}
                style={styles.meetIllustration}
                resizeMode="contain"
              />
            </View>

            {/* Connect Button - Right below image */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnectToMeet}
                activeOpacity={0.8}
              >
                <Text style={styles.connectButtonText}>Connect to Meet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F5F5F5",
    paddingBottom: getResponsiveSize(100),
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(40),
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveSize(40),
  },
  meetIllustration: {
    width: Math.min(width * 0.8, 400),
    height: Math.min(height * 0.35, 250),
    maxWidth: 350,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(20),
  },
  connectButton: {
    backgroundColor: "#00664F",
    borderRadius: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(18),
    alignItems: "center",
    minHeight: getResponsiveSize(56),
    shadowColor: "#00664F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveFontSize(18),
    fontWeight: "600",
    fontFamily: "Inter-SemiBold"
  }
});
