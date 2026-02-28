import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
    Alert,
    ScrollView,
    SafeAreaView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";
import { useSmartLoader } from "../hooks/useSmartLoader";

export default function EmployeeProfileEditScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const showLoader = useSmartLoader(loading);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [avatar, setAvatar] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setProfile(data);
                setName(data.profile?.name || "");
                setRole(data.profile?.jobRole || (data.role === 'admin' ? 'Admin' : 'Employee'));
                setAvatar(data.profile?.avatar || "");
            }
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setAvatar(`data:image/png;base64,${result.assets[0].base64}`);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "User name is required");
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API}/api/auth/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    jobRole: role.trim(),
                    avatar
                })
            });

            if (res.ok) {
                Alert.alert("Success", "Profile updated successfully", [
                    { text: "OK", onPress: () => navigation.navigate("EmployeeHome") }
                ]);
            } else {
                const error = await res.json();
                Alert.alert("Error", error.message || "Failed to update profile");
            }
        } catch (error) {
            Alert.alert("Error", "An error occurred while saving profile");
        } finally {
            setSaving(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <View style={styles.backCircle}>
                            <Image source={require("../../assets/images/back-arrow.png")} style={styles.backIcon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Avatar Edit Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                        <View style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {name?.charAt(0).toUpperCase() || "U"}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.editIconOverlay}>
                            <Image source={require("../../assets/images/add_photo.png")} style={styles.cameraIcon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Form Section */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>User Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter user name"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Role</Text>
                        <TextInput
                            style={styles.input}
                            value={role}
                            onChangeText={setRole}
                            placeholder="Enter role"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
                {showLoader && !profile && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#00664F" />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(255,255,255,0.7)'
    },
    header: {
        height: 80,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    backButton: {
        padding: 8,
    },
    backCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    backIcon: {
        width: 20,
        height: 20,
        tintColor: "#374151"
    },
    avatarSection: {
        alignItems: "center",
        marginTop: 20,
        marginBottom: 50,
    },
    avatarWrapper: {
        position: "relative",
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center"
    },
    avatarPlaceholderText: {
        fontSize: 50,
        fontWeight: "bold",
        color: "#9CA3AF"
    },
    editIconOverlay: {
        position: "absolute",
        bottom: 5,
        right: 5,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F3F4F6"
    },
    cameraIcon: {
        width: 20,
        height: 20,
        tintColor: "#374151"
    },
    form: {
        paddingHorizontal: 25,
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        height: 56,
        backgroundColor: "#FFFFFF",
        borderRadius: 28,
        paddingHorizontal: 20,
        fontSize: 16,
        color: "#111827",
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    saveButton: {
        backgroundColor: "#00664F",
        marginHorizontal: 25,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#00664F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
    saveButtonDisabled: {
        opacity: 0.7,
    }
});
