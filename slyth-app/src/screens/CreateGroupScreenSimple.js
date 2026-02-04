import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function CreateGroupScreenSimple({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Group Screen</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 20
  },
  button: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});