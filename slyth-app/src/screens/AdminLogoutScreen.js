import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    StatusBar,
    Dimensions
} from "react-native";
import AsyncStorage from "../utils/storage";
import { API } from "../constants/api";

const { width } = Dimensions.get('window');

// Responsive helper function
const getResponsiveSize = (size) => {
    const scale = width / 375;
    return Math.round(size * scale);
};

export default function AdminLogoutScreen({ navigation }) {
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API}/api/auth/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setCompany(data);
            }
        } catch (error) {
            console.error("Failed to load company", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("role");
        navigation.replace("Welcome");
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00664F" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <View style={styles.backCircle}>
                        <Image source={require("../../assets/images/back-arrow.png")} style={styles.backIcon} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Company Overview */}
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    {company?.logo ? (
                        <Image source={{ uri: company.logo }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarPlaceholderText}>
                                {company?.name?.charAt(0).toUpperCase() || "$"}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.profileName}>{company?.name || "Slytherin"}</Text>
                {/* role excluded as per requirements */}
            </View>

            {/* Confirmation Card */}
            <View style={styles.confirmCard}>
                <View style={styles.trashCircle}>
                    <Image source={require("../../assets/images/delete.png")} style={styles.trashIcon} />
                </View>
                <Text style={styles.confirmText}>Are you sure you want to Logout?</Text>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        height: 100,
        paddingTop: 30,
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
    profileSection: {
        alignItems: "center",
        marginTop: 20,
        marginBottom: 50,
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden'
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
    profileName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: 20
    },
    confirmCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 30,
        padding: 40,
        borderRadius: 25,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    trashCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 25,
    },
    trashIcon: {
        width: 40,
        height: 40,
        tintColor: "#9CA3AF"
    },
    confirmText: {
        fontSize: 18,
        color: "#374151",
        textAlign: "center",
        marginBottom: 35,
        fontWeight: "500",
        lineHeight: 26,
    },
    logoutButton: {
        width: "100%",
        height: 56,
        backgroundColor: "#F87171",
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#F87171",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    }
});
