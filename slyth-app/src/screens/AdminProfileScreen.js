import { Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function AdminProfileScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} role="admin">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Admin Profile Screen
      </Text>
    </AppLayout>
  );
}
