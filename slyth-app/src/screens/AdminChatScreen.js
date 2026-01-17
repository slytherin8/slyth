import { View, Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function AdminChatScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} activeTab="chat" role="admin">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Admin Chat Screen</Text>
      </View>
    </AppLayout>
  );
}
