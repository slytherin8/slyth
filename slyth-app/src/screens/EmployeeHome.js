import {
  View,
  Text,
  StyleSheet
} from "react-native";
import AppLayout from "../components/AppLayout";

export default function EmployeeHome({ navigation }) {
  return (
    <AppLayout
      navigation={navigation}
      role="employee"
      activeTab="home"
    >
      {/* PAGE CONTENT */}
      <View style={styles.content}>
        <Text style={styles.title}>Employee Home</Text>
        <Text style={styles.subtitle}>
          Welcome! Your dashboard is ready 🚀
        </Text>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B"
  }
});
