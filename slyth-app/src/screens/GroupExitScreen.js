import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '../utils/storage';
import { API } from '../constants/api';

export default function GroupExitScreen({ route, navigation }) {
    const { groupId, groupName, groupPhoto, groupDescription } = route.params;
    const [loading, setLoading] = useState(false);

    const getAuthHeaders = async () => {
        const token = await AsyncStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const handleExit = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API}/api/chat/groups/${groupId}/leave`, {
                method: "POST",
                headers
            });

            if (response.ok) {
                Alert.alert("Success! 👋", `You have left "${groupName}" successfully`, [
                    { text: "OK", onPress: () => navigation.navigate("EmployeeChat") }
                ]);
            } else {
                const data = await response.json();
                Alert.alert("Exit Failed", data.message || "Failed to leave group");
            }
        } catch (error) {
            Alert.alert("Exit Failed", "An error occurred while leaving the group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <View style={styles.backCircle}>
                        <Ionicons name="chevron-back" size={24} color="#374151" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Group Profile */}
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    {groupPhoto ? (
                        <Image source={{ uri: groupPhoto }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarPlaceholderText}>
                                {groupName?.charAt(0).toUpperCase() || "G"}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.groupName}>{groupName}</Text>
                {groupDescription ? (
                    <Text style={styles.groupDescription}>{groupDescription}</Text>
                ) : (
                    <Text style={styles.groupDescription}>Team's purpose, scope, focusing on user-centered products</Text>
                )}
            </View>

            {/* Confirmation Card */}
            <View style={styles.confirmCard}>
                <View style={styles.trashCircle}>
                    <Ionicons name="trash-outline" size={40} color="#9CA3AF" />
                </View>
                <Text style={styles.confirmText}>Are you sure you want to exit this group?</Text>

                <TouchableOpacity
                    style={[styles.exitButton, loading && styles.disabledButton]}
                    onPress={handleExit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.exitButtonText}>Exit Group</Text>
                    )}
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
    profileSection: {
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    avatarContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "#FDE68A",
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
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    avatarPlaceholder: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "#FDE68A",
        justifyContent: "center",
        alignItems: "center"
    },
    avatarPlaceholderText: {
        fontSize: 60,
        fontWeight: "bold",
        color: "#D97706"
    },
    groupName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
    },
    groupDescription: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20
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
    confirmText: {
        fontSize: 18,
        color: "#374151",
        textAlign: "center",
        marginBottom: 35,
        fontWeight: "500",
        lineHeight: 26,
    },
    exitButton: {
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
    exitButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
    disabledButton: {
        opacity: 0.7
    }
});
