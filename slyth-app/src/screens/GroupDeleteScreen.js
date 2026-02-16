import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Alert
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '../utils/storage';
import { API } from '../constants/api';

export default function GroupDeleteScreen({ route, navigation }) {
    const { groupId, groupName, groupPhoto, groupDescription } = route.params;

    const getAuthHeaders = async () => {
        const token = await AsyncStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const handleDelete = async () => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
                method: "DELETE",
                headers
            });

            if (response.ok) {
                Alert.alert("Success! 🗑️", `Group "${groupName}" deleted successfully`);
                // Navigate back to Chat List (AdminChat)
                navigation.navigate("AdminChat");
            } else {
                const data = await response.json();
                Alert.alert("Delete Failed", data.message || "Failed to delete group");
            }
        } catch (error) {
            Alert.alert("Delete Failed", "An error occurred while deleting the group");
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
                ) : null}
            </View>

            {/* Confirmation Card */}
            <View style={styles.confirmCard}>
                <View style={styles.trashCircle}>
                    <Image source={require("../../assets/images/delete.png")} style={styles.trashIcon} />
                </View>
                <Text style={styles.confirmText}>Are you sure you want to delete this group?</Text>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete Group</Text>
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
        backgroundColor: "#FCD34D",
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
        backgroundColor: "#FCD34D",
        justifyContent: "center",
        alignItems: "center"
    },
    avatarPlaceholderText: {
        fontSize: 60,
        fontWeight: "bold",
        color: "#fff"
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
    deleteButton: {
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
    deleteButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    }
});
