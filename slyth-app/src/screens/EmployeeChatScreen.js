import { View, Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeChatScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} activeTab="chat" role="employee">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Employee Chat Screen</Text>
      </View>
    </AppLayout>
  );
}
