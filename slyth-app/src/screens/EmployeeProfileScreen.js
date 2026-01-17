import { Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeProfileScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} role="employee">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Employee Profile Screen
      </Text>
    </AppLayout>
  );
}
