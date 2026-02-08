import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  TextInput,
} from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeMeetScreen({ navigation }) {
  const [meetingId, setMeetingId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const joinGoogleMeet = async () => {
    try {
      // Always use HTTPS URL for web compatibility
      await Linking.openURL('https://meet.google.com');
    } catch (error) {
      console.error("Error opening Google Meet:", error);
      Alert.alert("Error", "Could not open Google Meet. Please try again.");
    }
  };

  const joinWithMeetingId = async () => {
    if (!meetingId.trim()) {
      Alert.alert("Missing Meeting ID", "Please enter a meeting ID or link");
      return;
    }

    setIsJoining(true);
    try {
      let meetLink = meetingId.trim();
      
      // If it's just a meeting ID (like "abc-defg-hij"), construct the full URL
      if (!meetLink.startsWith('http')) {
        // Remove any spaces or special characters except hyphens
        const cleanId = meetLink.replace(/[^a-zA-Z0-9-]/g, '');
        meetLink = `https://meet.google.com/${cleanId}`;
      }
      
      // Always use HTTPS URL for web compatibility
      await Linking.openURL(meetLink);
      
      Alert.alert(
        "Joining Meeting! 🎉",
        "Google Meet has been opened. You should now be joining the meeting.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error joining meeting:", error);
      Alert.alert(
        "Error",
        "Could not join the meeting. Please check the meeting ID/link and try again."
      );
    } finally {
      setIsJoining(false);
    }
  };

  const openGoogleMeetApp = async () => {
    try {
      // Always use HTTPS URL for web compatibility
      await Linking.openURL('https://meet.google.com');
      Alert.alert(
        "Google Meet Opened! 📱",
        "Google Meet has been opened in your browser. You can now join or start meetings.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error opening Google Meet:", error);
      Alert.alert("Error", "Could not open Google Meet. Please try again.");
    }
  };

  return (
    <AppLayout navigation={navigation} role="employee">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 10 }}>
            📹 Join Meeting
          </Text>
          
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 30, lineHeight: 20 }}>
            Join team meetings on Google Meet. Check your group chats for meeting links 
            shared by your admin, or enter a meeting ID below.
          </Text>

          {/* Quick Access to Group Chats */}
          <TouchableOpacity
            onPress={() => navigation.navigate("EmployeeChat")}
            style={{
              backgroundColor: "#4285F4",
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              💬 Check Group Chats
            </Text>
            <Text style={{ color: "#fff", fontSize: 12, opacity: 0.9 }}>
              Look for meeting links shared by your admin in group chats
            </Text>
          </TouchableOpacity>

          {/* Join with Meeting ID/Link */}
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#e8eaed",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
              🔗 Join with Meeting ID or Link
            </Text>
            
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: "#fff",
                marginBottom: 12,
              }}
              placeholder="Enter meeting ID (e.g., abc-defg-hij) or full link"
              value={meetingId}
              onChangeText={setMeetingId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={joinWithMeetingId}
              disabled={isJoining}
              style={{
                backgroundColor: "#34A853",
                padding: 14,
                borderRadius: 8,
                alignItems: "center",
                opacity: isJoining ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                {isJoining ? "Joining..." : "🚀 Join Meeting"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Browse Meetings */}
          <TouchableOpacity
            onPress={joinGoogleMeet}
            style={{
              backgroundColor: "#EA4335",
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              🔍 Browse Available Meetings
            </Text>
            <Text style={{ color: "#fff", fontSize: 12, opacity: 0.9 }}>
              Open Google Meet to see available meetings or join with a code
            </Text>
          </TouchableOpacity>

          {/* Open Google Meet App */}
          <TouchableOpacity
            onPress={openGoogleMeetApp}
            style={{
              backgroundColor: "#137333",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              📱 Open Google Meet App
            </Text>
            <Text style={{ color: "#fff", fontSize: 12, opacity: 0.9 }}>
              Launch the Google Meet app directly (if installed)
            </Text>
          </TouchableOpacity>

          {/* Instructions */}
          <View
            style={{
              backgroundColor: "#e8f0fe",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
         
          </View>

          {/* Meeting Examples */}
          <View
            style={{
              backgroundColor: "#f1f3f4",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              📝 Meeting ID Examples:
            </Text>
            <Text style={{ fontSize: 12, color: "#5f6368", lineHeight: 18, fontFamily: "monospace" }}>
              • abc-defg-hij{"\n"}
              • https://meet.google.com/abc-defg-hij{"\n"}
              • meet.google.com/abc-defg-hij
            </Text>
          </View>

          {/* Features */}
          <View
            style={{
              backgroundColor: "#f1f3f4",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              ✨ What you can do in meetings:
            </Text>
            <Text style={{ fontSize: 12, color: "#5f6368", lineHeight: 18 }}>
              • 📹 Turn camera on/off{"\n"}
              • 🎤 Mute/unmute microphone{"\n"}
              • 💬 Chat with participants{"\n"}
              • 🖥️ View shared screens{"\n"}
              • 👋 Use reactions and hand raising{"\n"}
              • 📱 Join from any device
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
}
