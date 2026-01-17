import { Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeMeetScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} role="employee">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Employee Meet Screen
      </Text>
    </AppLayout>
  );
}
