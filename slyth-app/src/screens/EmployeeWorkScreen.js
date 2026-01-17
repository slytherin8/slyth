import { Text } from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeWorkScreen({ navigation }) {
  return (
    <AppLayout navigation={navigation} role="employee">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Employee Work Screen
      </Text>
    </AppLayout>
  );
}
