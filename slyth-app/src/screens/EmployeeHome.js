import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from "react-native";

export default function EmployeeHome({ navigation }) {
  return (
    <View style={styles.container}>
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image
          source={require("../../assets/images/back.png")} // replace image if needed
          style={styles.backIcon}
        />
      </TouchableOpacity>

      <Text style={styles.title}>Employee Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24
  },
  backIcon: {
    width: 24,
    height: 24,
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  }
});
