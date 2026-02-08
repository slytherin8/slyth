import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import AppLayout from "../components/AppLayout";

export default function AdminMeetScreen({ navigation }) {
  const createGoogleMeet = async () => {
    try {
      // Always use HTTPS URL for web compatibility
      await Linking.openURL('https://meet.google.com/new');
      
      Alert.alert(
        "Google Meet Opened! 🎉",
        "Create your meeting in Google Meet, then share the meeting link in your group chats.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error opening Google Meet:", error);
      Alert.alert(
        "Error",
        "Could not open Google Meet. Please try again or open Google Meet manually."
      );
    }
  };

  return (
    <AppLayout navigation={navigation} role="admin">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 10 }}>
            📹 Google Meet
          </Text>
          
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 30, lineHeight: 20 }}>
            Create meetings in Google Meet and share the links with your team.
          </Text>

          {/* Create New Meeting - Main Button */}
          <TouchableOpacity
            onPress={createGoogleMeet}
            style={{
              backgroundColor: "#4285F4",
              padding: 20,
              borderRadius: 12,
              marginBottom: 30,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 6 }}>
              🚀 Create New Meeting
            </Text>
            <Text style={{ color: "#fff", fontSize: 14, opacity: 0.9, textAlign: "center" }}>
              Opens Google Meet to create a new meeting
            </Text>
          </TouchableOpacity>

          {/* Simple Instructions */}
          <View
            style={{
              backgroundColor: "#e8f0fe",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
           
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
}
