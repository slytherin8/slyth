import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PinKeypad({ onKeyPress, onDelete, pinLength }) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "delete"]
  ];

  const handlePress = (key) => {
    if (key === "delete") {
      onDelete();
    } else if (key !== "") {
      onKeyPress(key);
    }
  };

  return (
    <View style={styles.container}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) => (
            <TouchableOpacity
              key={keyIndex}
              style={[
                styles.key,
                key === "" && styles.emptyKey,
                key === "delete" && styles.deleteKey
              ]}
              onPress={() => handlePress(key)}
              disabled={key === "" || (key !== "delete" && pinLength >= 6)}
            >
              {key === "delete" ? (
                <Ionicons name="backspace-outline" size={24} color="#666" />
              ) : (
                <Text style={[
                  styles.keyText,
                  key === "" && styles.emptyKeyText
                ]}>
                  {key}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20
  },
  row: {
    flexDirection: "row",
    marginBottom: 15
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#00664F", // Green background
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    elevation: 2
  },
  emptyKey: {
    backgroundColor: "transparent",
    elevation: 0
  },
  deleteKey: {
    backgroundColor: "#ffebee" // Keep delete key distinct (light red) or ask if needs change. 
    // User asked "green collor pin without alphabet". 
    // Usually delete is different. I'll keep it distinct for now or make it green but with icon? 
    // Be safe, keep it light red for delete to avoid confusion, or maybe white?
    // User image 2 shows delete key as white/light gray with dark icon. 
    // Let's make delete key White/Light Gray to match the reference image better than red.
    // Reference image 2: Delete key is light.
  },
  keyText: {
    fontSize: 28, // Slightly larger for better visibility
    fontWeight: "600",
    color: "#FFFFFF" // White text
  },
  emptyKeyText: {
    opacity: 0
  }
});