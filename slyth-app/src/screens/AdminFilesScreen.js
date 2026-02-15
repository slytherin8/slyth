import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppLayout from "../components/AppLayout";
import PinKeypad from "../components/PinKeypad";
import { vaultService } from "../services/vaultService";
import { useSmartLoader } from "../hooks/useSmartLoader";

export default function AdminFilesScreen({ navigation }) {
  const [hasPin, setHasPin] = useState(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const showInitialLoader = useSmartLoader(hasPin === null);
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
      setHasPin(status.hasPin);
    } catch (err) {
      setHasPin(false);
    }
  };

  const handleKeyPress = (key) => {
    if (pin.length < 6) {
      setPin(prev => prev + key);
      setError("");
    }
  };

  const handleCancel = () => {
    setPin("");
    navigation.goBack();
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
        await vaultService.verifyPin(pin);
        navigation.navigate("AdminVault", { isVerified: true });
      } else {
        await vaultService.setPin(pin);
        setHasPin(true);
        Alert.alert("Success", "Secure PIN Created! Please enter it again to unlock.");
        setPin("");
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Incorrect PIN. Please try again.");
        setPin("");
      } else {
        setError("System Error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasPin === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        {showInitialLoader && <ActivityIndicator size="large" color="#00664F" />}
      </View>
    );
  }

  return (
    <AppLayout
      navigation={navigation}
      role="admin"
      title="Store Employee Details"
      showProfile={false}
      logoPosition="right"
    >
      <ScrollView contentContainerStyle={styles.content} bounces={false}>

        <View style={styles.headerSpacer} />

        <Text style={styles.title}>
          {hasPin ? "Enter Secret Pin" : "Create Secret Pin"}
        </Text>

        <View style={styles.pinInputContainer}>
          <Text style={styles.pinInputText}>{pin}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PinKeypad
          onKeyPress={handleKeyPress}
          onDelete={() => setPin(prev => prev.slice(0, -1))}
          pinLength={pin.length}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSubmit} style={styles.enterButton}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.enterButtonText}>Enter</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20
  },
  headerSpacer: {
    height: 40
  },
  title: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 20,
    fontWeight: '500'
  },
  pinInputContainer: {
    width: '90%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  pinInputText: {
    fontSize: 24,
    color: '#333',
    letterSpacing: 2
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 10,
    fontSize: 14
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 30,
    marginRight: 10,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600'
  },
  enterButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#00664F', // Green
    borderRadius: 30,
    marginLeft: 10,
    alignItems: 'center',
    elevation: 2
  },
  enterButtonText: {
    color: '#FFFFFF', // White
    fontSize: 16,
    fontWeight: '600'
  }
});
