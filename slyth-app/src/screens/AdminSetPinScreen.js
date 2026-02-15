import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Dimensions,
    Alert,
    ActivityIndicator
} from "react-native";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";

const { width } = Dimensions.get("window");

const getResponsiveSize = (size) => {
    const scale = width / 375;
    return Math.round(size * scale);
};

export default function AdminSetPinScreen({ navigation }) {
    const [oldPin, setOldPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [activeField, setActiveField] = useState("old"); // "old" or "new"
    const [loading, setLoading] = useState(false);

    const handleKeyPress = (val) => {
        if (activeField === "old") {
            if (oldPin.length < 4) setOldPin(prev => prev + val);
        } else {
            if (newPin.length < 4) setNewPin(prev => prev + val);
        }
    };

    const handleBackspace = () => {
        if (activeField === "old") {
            setOldPin(prev => prev.slice(0, -1));
        } else {
            setNewPin(prev => prev.slice(0, -1));
        }
    };

    const handleSave = async () => {
        if (oldPin.length !== 4 || newPin.length !== 4) {
            Alert.alert("Error", "Pins must be 4 digits long");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            // Note: Reusing vault PIN update logic if exists, or just a placeholder for UI demo
            // Assuming endpoint: POST /api/vault/update-pin
            const res = await fetch(`${API}/api/vault/update-pin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ oldPin, newPin })
            });

            if (res.ok) {
                Alert.alert("Success! 🎉", "PIN updated successfully", [
                    { text: "OK", onPress: () => navigation.navigate("AdminDashboard") }
                ]);
            } else {
                const error = await res.json();
                Alert.alert("Error", error.message || "Failed to update PIN");
            }
        } catch (error) {
            Alert.alert("Error", "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const KeypadButton = ({ val, subText }) => (
        <TouchableOpacity
            style={styles.keypadButton}
            onPress={() => handleKeyPress(val)}
            activeOpacity={0.7}
        >
            <Text style={styles.keypadText}>{val}</Text>
            {subText && <Text style={styles.keypadSubtext}>{subText}</Text>}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <View style={styles.backCircle}>
                        <Image source={require("../../assets/images/back-arrow.png")} style={styles.backIcon} />
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Set New Pin</Text>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>$</Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Input Fields */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Enter Old Secret Pin</Text>
                    <TouchableOpacity
                        style={[styles.pinInput, activeField === "old" && styles.activePinInput]}
                        onPress={() => setActiveField("old")}
                        activeOpacity={1}
                    >
                        <Text style={styles.pinValue}>{"*".repeat(oldPin.length)}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { marginTop: 20 }]}>Enter New Secret Pin</Text>
                    <TouchableOpacity
                        style={[styles.pinInput, activeField === "new" && styles.activePinInput]}
                        onPress={() => setActiveField("new")}
                        activeOpacity={1}
                    >
                        <Text style={styles.pinValue}>{"*".repeat(newPin.length)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Keypad */}
                <View style={styles.keypadContainer}>
                    <View style={styles.keypadRow}>
                        <KeypadButton val="1" />
                        <KeypadButton val="2" subText="ABC" />
                        <KeypadButton val="3" subText="DEF" />
                    </View>
                    <View style={styles.keypadRow}>
                        <KeypadButton val="4" subText="GHI" />
                        <KeypadButton val="5" subText="JKL" />
                        <KeypadButton val="6" subText="MNO" />
                    </View>
                    <View style={styles.keypadRow}>
                        <KeypadButton val="7" subText="PQRS" />
                        <KeypadButton val="8" subText="TUV" />
                        <KeypadButton val="9" subText="WXYZ" />
                    </View>
                    <View style={styles.keypadRow}>
                        <KeypadButton val="*" />
                        <KeypadButton val="0" subText="+" />
                        <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
                            <Text style={styles.keypadText}>#</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 10,
        height: 70
    },
    backButton: {
        padding: 5
    },
    backCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center"
    },
    backIcon: {
        width: 20,
        height: 20,
        tintColor: "#374151"
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937"
    },
    logoCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#D1E7E0",
        justifyContent: "center",
        alignItems: "center"
    },
    logoText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00664F"
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
        paddingTop: 20
    },
    inputSection: {
        marginBottom: 30
    },
    label: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
        marginBottom: 8
    },
    pinInput: {
        height: 56,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 28,
        justifyContent: "center",
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF"
    },
    activePinInput: {
        borderColor: "#00664F",
        borderWidth: 2
    },
    pinValue: {
        fontSize: 24,
        letterSpacing: 5,
        color: "#111827"
    },
    keypadContainer: {
        width: "100%",
        alignItems: "center"
    },
    keypadRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 15
    },
    keypadButton: {
        width: getResponsiveSize(70),
        height: getResponsiveSize(70),
        borderRadius: getResponsiveSize(35),
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center"
    },
    keypadText: {
        fontSize: 24,
        fontWeight: "600",
        color: "#FFFFFF"
    },
    keypadSubtext: {
        fontSize: 9,
        color: "#FFFFFF",
        fontWeight: "600",
        marginTop: -2
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 30,
        marginBottom: 20
    },
    cancelButton: {
        width: "48%",
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center"
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280"
    },
    saveButton: {
        width: "48%",
        height: 56,
        borderRadius: 28,
        backgroundColor: "#00664F",
        justifyContent: "center",
        alignItems: "center"
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF"
    },
    saveButtonDisabled: {
        opacity: 0.7
    }
});
