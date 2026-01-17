import { Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function AdminMeetScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} role="admin">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Admin Meet Screen
      </Text>
    </AppLayout>
  );
}
