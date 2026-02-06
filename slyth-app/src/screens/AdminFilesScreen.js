import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppLayout from "../components/AppLayout";
import PinKeypad from "../components/PinKeypad";
import { vaultService } from "../services/vaultService";

export default function AdminFilesScreen({ navigation }) {
  const [hasPin, setHasPin] = useState(null); // null = loading, true/false
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      checkPinStatus();
      setPin("");
      setError("");
    }, [])
  );

  const checkPinStatus = async () => {
    try {
      const status = await vaultService.checkHasPin();
      console.log("PIN Status:", status);
      setHasPin(status.hasPin);
    } catch (err) {
      console.error("Error checking PIN:", err);
      // If 401, it means token expired - but we will handle that globally or show alert
      setHasPin(false); // Default to setup mode or retry
    }
  };

  const handleKeyPress = (key) => {
    if (pin.length < 6) {
      setPin(prev => prev + key);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("PIN must be 4-6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (hasPin) {
        // UNLOCK
        console.log("Verifying PIN...");
        await vaultService.verifyPin(pin);
        navigation.navigate("AdminVault", { isVerified: true });
      } else {
        // SET PIN
        console.log("Setting PIN...");
        await vaultService.setPin(pin);
        setHasPin(true);
        Alert.alert("Success", "Secure PIN Created! Please enter it again to unlock.");
        setPin("");
      }
    } catch (err) {
      console.error("Submit Error:", err.response?.status, err.response?.data);

      if (err.response?.status === 403) {
        setError("Incorrect PIN. Please try again.");
        setPin("");
      } else if (err.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.navigate("Login");
      } else if (err.response?.status === 400 && err.response?.data?.message === "PIN already set") {
        // Rare sync issue
        setHasPin(true);
        setError("PIN was already set. Enter it to unlock.");
        setPin("");
      } else {
        setError("System Error. Please restart app.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasPin === null) {
    return (
      <AppLayout navigation={navigation} role="admin" title="Store Employee Details">
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#006400" />
          <Text style={{ marginTop: 10, color: '#666' }}>Securing Vault...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout navigation={navigation} role="admin" title="Store Employee Details">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.statusIcon}>
          <Ionicons
            name={hasPin ? "lock-closed" : "lock-open"}
            size={50}
            color={hasPin ? "#006400" : "#E2AC00"}
          />
        </View>

        <Text style={styles.label}>
          {hasPin ? "Enter Secret Pin to Unlock" : "Create New Secure PIN"}
        </Text>

        <View style={[styles.pinDisplay, error ? styles.pinError : null]}>
          <Text style={[styles.pinText, error ? styles.errorText : null]}>
            {pin ? '*'.repeat(pin.length) : ''}
          </Text>
        </View>

        {error ? (
          <Text style={styles.errorMessage}>{error}</Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#006400" style={{ marginVertical: 20 }} />
        ) : (
          <View style={{ height: 20 }} />
        )}

        <PinKeypad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          pinLength={pin.length}
        />

        {pin.length >= 4 && !loading && (
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <Text style={styles.submitText}>{hasPin ? "UNLOCK VAULT" : "SET SECURE PIN"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 100,
    minHeight: '100%'
  },
  statusIcon: {
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 50
  },
  label: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    fontWeight: '500'
  },
  pinDisplay: {
    width: '60%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  pinError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF0F0'
  },
  pinText: {
    fontSize: 32,
    letterSpacing: 5,
    color: '#333'
  },
  errorText: {
    color: '#FF3B30'
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10
  },
  submitBtn: {
    marginTop: 10,
    backgroundColor: '#006400',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 3
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
