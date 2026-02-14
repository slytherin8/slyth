import React, { useState, useEffect, useRef } from "react";
// Force rebuild date: 2026-02-14
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ActionSheetIOS,
  Linking,
  Pressable
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import socketService from '../services/socketService';

import { API } from '../constants/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

const getCurrentUserId = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  try {
    // Decode JWT to get user ID
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch {
    return null;
  }
};

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, [groupId, groupName]);

  useEffect(() => {
    // Connect to socket service
    socketService.connect();

    // Listen for real-time group messages
    const handleGroupMessage = (message) => {
      // Only add message if it's from the current group
      if (message.groupId === groupId) {
        setMessages(prev => [...prev, message]);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socketService.on('group_message', handleGroupMessage);

    return () => {
      socketService.off('group_message', handleGroupMessage);
    };
  }, [groupId]);

  const initializeChat = async () => {
    const userId = await getCurrentUserId();
    setCurrentUserId(userId);

    // Check if current user is admin
    const token = await AsyncStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      } catch (e) {
        console.log("Token decode error:", e);
      }
    }

    // Fetch group info
    await fetchGroupInfo();
    fetchMessages();
  };

  const fetchGroupInfo = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (response.ok) {
        setGroupInfo(data);
        // Simulate online users (you can implement real-time status later)
        setOnlineUsers(data.members?.slice(0, Math.floor(Math.random() * data.members?.length + 1)) || []);
      }
    } catch (error) {
      console.log("Failed to fetch group info:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}/messages`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessages(data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageText, messageType = "text", fileData = null) => {
    if ((!messageText?.trim() && !fileData) || sending) return;

    const textToSend = messageText?.trim() || "";
    setNewMessage("");
    setSending(true);

    console.log("=== SENDING MESSAGE ===");
    console.log("Message text:", textToSend);
    console.log("Message type:", messageType);
    console.log("File data:", fileData);

    try {
      const headers = await getAuthHeaders();
      const payload = {
        messageText: textToSend || (messageType === "image" ? "📷 Image" : "📎 File"),
        messageType,
        fileData,
        repliedMessage: replyingTo
      };

      console.log("Sending payload:", payload);

      const response = await fetch(`${API}/api/chat/groups/${groupId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (!response.ok) throw new Error(data.message);

      setMessages(prev => [...prev, data]);
      setReplyingTo(null);

      // Show success message for uploads
      if (messageType === "file") {
        Alert.alert("Success! 📎", "File sent successfully");
      } else if (messageType === "image") {
        Alert.alert("Success! 📷", "Photo sent successfully");
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Send message error:", error);
      Alert.alert("Error", "Failed to send message: " + error.message);
      if (messageText) setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    sendMessage(newMessage);
  };

  const handleReply = (message) => {
    console.log("=== REPLY MESSAGE DEBUG ===");
    console.log("Replying to message:", message._id);
    console.log("Sender:", message.senderId.profile?.name);
    console.log("Message text:", message.messageText);

    setReplyingTo({
      messageId: message._id,
      senderName: message.senderId.profile?.name || "Unknown",
      messageText: message.messageText
    });
    setShowMessageActions(false);

    console.log("Reply state set, replyingTo should now be visible");
  };

  const handleDeleteMessage = async (messageId) => {
    console.log("=== DELETE MESSAGE DEBUG ===");
    console.log("Message ID:", messageId);
    console.log("Group ID:", groupId);
    console.log("Current User ID:", currentUserId);

    try {
      const token = await AsyncStorage.getItem("token");
      console.log("Token exists:", !!token);
      console.log("Token preview:", token ? token.substring(0, 20) + "..." : "null");

      const headers = await getAuthHeaders();
      console.log("Headers:", headers);

      const url = `${API}/api/chat/groups/${groupId}/messages/${messageId}`;
      console.log("Delete URL:", url);

      const response = await fetch(url, {
        method: "DELETE",
        headers
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const responseText = await response.text();
      console.log("Response text:", responseText);

      if (response.ok) {
        console.log("Delete successful, refreshing messages...");
        await fetchMessages();
        Alert.alert("Success! 🗑️", "Message deleted successfully");
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        console.log("Delete error:", errorData);
        Alert.alert("Error", errorData.message || "Failed to delete message");
      }
    } catch (error) {
      console.error("Delete message error:", error);
      Alert.alert("Error", "Failed to delete message: " + error.message);
    }
    setShowMessageActions(false);
  };

  const handleCopyMessage = (message) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(message.messageText);
      Alert.alert("Copied! 📋", "Message copied to clipboard");
    } else {
      // For mobile, you'd use expo-clipboard
      Alert.alert("Copied! 📋", "Message copied to clipboard");
    }
    setShowMessageActions(false);
  };

  const handleLinkPress = async (url) => {
    try {
      // Ensure URL has protocol
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }

      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Cannot open this link");
    }
  };

  const renderMessageText = (text, isMyMessage) => {
    // Simple URL detection regex
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}[^\s]*)/gi;
    const parts = text.split(urlRegex);

    return (
      <Text style={[
        styles.messageText,
        isMyMessage ? styles.myMessageText : styles.otherMessageText
      ]}>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => handleLinkPress(part)}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const handleViewInfo = (message) => {
    setSelectedMessage(message);
    setShowInfoModal(true);
  };

  const showMessageActionSheet = (message) => {
    console.log("Showing action sheet for message:", message._id);
    const isMyMessage = message.senderId._id === currentUserId;
    const options = [];

    // Copy option for all messages with text
    if (message.messageText && message.messageText.trim()) {
      options.push("Copy");
    }

    // Reply option for all messages (except your own)
    if (!isMyMessage) {
      options.push("Reply");
    }

    options.push("Info");
    options.push("Cancel");

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf("Delete")
        },
        (buttonIndex) => {
          console.log("Selected option:", options[buttonIndex]);
          if (options[buttonIndex] === "Copy") {
            handleCopyMessage(message);
          } else if (options[buttonIndex] === "Reply") {
            handleReply(message);
          } else if (options[buttonIndex] === "Delete") {
            Alert.alert(
              "Delete Message",
              "Are you sure you want to delete this message?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(message._id) }
              ]
            );
          } else if (options[buttonIndex] === "Info") {
            handleViewInfo(message);
          }
        }
      );
    } else {
      setSelectedMessage(message);
      setShowMessageActions(true);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      console.log("Opening image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6, // Reduced quality for smaller file size
        base64: true,
        maxWidth: 1024, // Limit image width
        maxHeight: 1024, // Limit image height
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Selected image:", asset.uri, "Size:", asset.fileSize);

        if (!asset.base64) {
          Alert.alert("Error", "Failed to convert image to base64. Please try a different image.");
          return;
        }

        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        console.log("Base64 image length:", base64Image.length);

        // Check if image is too large (limit to ~5MB base64)
        if (base64Image.length > 5 * 1024 * 1024) {
          Alert.alert("Error", "Image is too large. Please select a smaller image or try taking a new photo.");
          return;
        }

        // For web compatibility, use a simple confirm instead of Alert.prompt
        if (Platform.OS === 'web') {
          const caption = prompt("Add a caption (optional):");
          sendMessage(caption || "📷 Photo", "image", base64Image);
        } else {
          // For mobile, use Alert with text input alternative
          Alert.alert(
            "Send Photo",
            "Do you want to send this photo?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Send",
                onPress: () => sendMessage("📷 Photo", "image", base64Image)
              }
            ]
          );
        }
      } else {
        console.log("Image picker was canceled or no image selected");
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image: " + error.message);
    }
    setShowAttachmentOptions(false);
  };



  const pickDocument = async () => {
    try {
      // For web, use HTML file input
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx,.zip,.rar';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            console.log("Web file selected:", file.name, file.size, file.type);
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64Data = e.target.result;
              console.log("Web file read as base64, length:", base64Data.length);
              sendMessage(`📎 ${file.name}`, "file", {
                name: file.name,
                size: file.size,
                type: file.type,
                data: base64Data
              });
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        // For mobile, use expo-document-picker
        console.log("Opening document picker for mobile...");
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        console.log("Document picker result:", result);

        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];
          console.log("Mobile file selected:", file.name, file.size, file.mimeType);

          try {
            // For mobile, read the file as base64 using fetch and FileReader
            const response = await fetch(file.uri);
            const blob = await response.blob();

            // Convert blob to base64
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result;
              console.log("Mobile file converted to base64, length:", base64Data.length);

              sendMessage(`📎 ${file.name}`, "file", {
                name: file.name,
                size: file.size,
                type: file.mimeType || 'application/octet-stream',
                data: base64Data
              });
            };

            reader.onerror = (error) => {
              console.error("FileReader error:", error);
              Alert.alert("Error", "Failed to read file");
            };

            reader.readAsDataURL(blob);

          } catch (fileError) {
            console.error("File reading error:", fileError);
            Alert.alert("Error", "Failed to read file: " + fileError.message);
          }
        }
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document: " + error.message);
    }
    setShowAttachmentOptions(false);
  };

  const handleFileDownload = async (fileData) => {
    try {
      console.log("File download requested:", fileData);

      if (Platform.OS === 'web') {
        // For web, create download link
        if (fileData.data) {
          const link = document.createElement('a');
          link.href = fileData.data;
          link.download = fileData.name || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert("Success! 📥", "File download started");
        } else {
          Alert.alert("Error", "File data not available for download");
        }
      } else {
        // For mobile
        if (fileData.data) {
          // If we have base64 data, show file info and offer to save
          Alert.alert(
            "📎 " + (fileData.name || "File"),
            `Size: ${fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : "Unknown"}\nType: ${fileData.type || "Unknown"}\n\nFile contains data and can be processed.`,
            [
              { text: "OK", style: "default" }
            ]
          );
        } else if (fileData.uri) {
          // If we have a local URI, try to open it
          try {
            const supported = await Linking.canOpenURL(fileData.uri);
            if (supported) {
              await Linking.openURL(fileData.uri);
            } else {
              Alert.alert(
                "📎 " + (fileData.name || "File"),
                `Size: ${fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : "Unknown"}\nType: ${fileData.type || "Unknown"}\n\nLocal file URI: ${fileData.uri}`,
                [
                  { text: "OK", style: "default" }
                ]
              );
            }
          } catch (linkError) {
            console.error("Link opening error:", linkError);
            Alert.alert(
              "📎 " + (fileData.name || "File"),
              `Size: ${fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : "Unknown"}\nType: ${fileData.type || "Unknown"}`,
              [
                { text: "OK", style: "default" }
              ]
            );
          }
        } else {
          Alert.alert("Error", "File data not available");
        }
      }
    } catch (error) {
      console.error("File download error:", error);
      Alert.alert("Error", "Failed to process file: " + error.message);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === currentUserId;

    // Read receipts logic (simulated for UI)
    const renderTicks = () => {
      if (!isMyMessage) return null;

      let iconName = "checkmark-outline";
      let color = "#667781"; // Gray for sent

      if (item.read) {
        iconName = "checkmark-done-outline";
        color = "#34B7F1"; // Blue for seen
      } else if (item.delivered) {
        iconName = "checkmark-done-outline";
        color = "#667781"; // Gray for delivered
      }

      return <Ionicons name={iconName} size={16} color={color} style={styles.tickIcon} />;
    };

    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
      ]}>
        {!isMyMessage && (
          <View style={styles.senderAvatarContainer}>
            <View style={styles.senderAvatar}>
              {item.senderId.profile?.avatar ? (
                <Image
                  source={{ uri: item.senderId.profile.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {item.senderId.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage
          ]}
        >
          <View style={styles.messageHeader}>
            {!isMyMessage && (
              <Text style={styles.senderName}>
                {item.senderId.profile?.name || "Unknown"}
              </Text>
            )}

            <TouchableOpacity
              style={styles.messageDropdownInside}
              onPress={() => showMessageActionSheet(item)}
            >
              <Text style={styles.dropdownArrowInside}>⌄</Text>
            </TouchableOpacity>
          </View>

          {item.repliedMessage && (
            <View style={styles.repliedMessage}>
              <Text style={styles.repliedSender}>{item.repliedMessage.senderName}</Text>
              <Text style={styles.repliedText} numberOfLines={2}>
                {item.repliedMessage.messageText}
              </Text>
            </View>
          )}

          {item.messageType === "image" && item.fileData ? (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => handleLinkPress(item.fileData)}
            >
              <Image source={{ uri: item.fileData }} style={styles.messageImage} />
              {item.messageText && item.messageText !== "📷 Image" && (
                <Text style={[
                  styles.imageCaption,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.messageText}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {item.messageType === "file" && item.fileData ? (
            <TouchableOpacity
              style={styles.fileMessage}
              onPress={() => handleFileDownload(item.fileData)}
            >
              <Text style={styles.fileIcon}>📄</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.fileData.name || "Document"}
                </Text>
                <Text style={styles.fileSize}>
                  {item.fileData.size ? `${(item.fileData.size / 1024).toFixed(1)} KB` : ""}
                  {(item.fileData.type || item.fileData.name?.split('.').pop())?.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {(item.messageType === "text" || !item.fileData) && (
            renderMessageText(item.messageText, isMyMessage)
          )}

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {renderTicks()}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.groupDetails}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.memberCount}>
              {groupInfo?.members?.length || 0} members
              {onlineUsers.length > 0 && `, ${onlineUsers.length} online`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => navigation.navigate("GroupInfo", { groupId, groupName })}
        >
          <View style={styles.groupAvatar}>
            {groupInfo?.profilePhoto ? (
              <Image
                source={{ uri: groupInfo.profilePhoto }}
                style={styles.groupAvatarImage}
              />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Text style={styles.groupAvatarText}>
                  {groupName?.charAt(0)?.toUpperCase() || "G"}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowGroupMenu(true)}
            style={styles.menuButton}
          >
            <Text style={styles.menuButtonText}>⋮</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        style={styles.messagesListContainer}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>Replying to {replyingTo.senderName}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyingTo.messageText}
            </Text>
          </View>
          <TouchableOpacity onPress={cancelReply}>
            <Text style={styles.cancelReply}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowAttachmentOptions(true)}
          >
            <Image source={require("../../assets/images/pin.png")} style={styles.pinIcon} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            placeholderTextColor="#888"
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() && !sending) && styles.sendButtonDisabled]}
          onPress={handleSendText}
          disabled={!newMessage.trim() && !sending}
        >
          <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* Attachment Options Modal */}
      <Modal
        visible={showAttachmentOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attachmentModal}>
            <Text style={styles.modalTitle}>Send</Text>

            <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
              <View style={styles.attachmentIconContainer}>
                <Text style={styles.attachmentIcon}>📷</Text>
              </View>
              <View style={styles.attachmentTextContainer}>
                <Text style={styles.attachmentText}>Photo</Text>
                <Text style={styles.attachmentSubtext}>Share photos from your gallery</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachmentOption} onPress={pickDocument}>
              <View style={styles.attachmentIconContainer}>
                <Text style={styles.attachmentIcon}>📎</Text>
              </View>
              <View style={styles.attachmentTextContainer}>
                <Text style={styles.attachmentText}>Document</Text>
                <Text style={styles.attachmentSubtext}>Share PDFs, docs, and other files</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAttachmentOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Actions Modal (Android) */}
      <Modal
        visible={showMessageActions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMessageActions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.messageActionsModal}>
            <Text style={styles.modalTitle}>Message Options</Text>

            {selectedMessage && selectedMessage.messageText && selectedMessage.messageText.trim() && (
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleCopyMessage(selectedMessage)}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
            )}

            {selectedMessage && selectedMessage.senderId._id !== currentUserId && (
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleReply(selectedMessage)}
              >
                <Text style={styles.actionIcon}>↩️</Text>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}

            {/* Always show delete option - backend handles permissions */}
            {selectedMessage && (
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  Alert.alert(
                    "Delete Message",
                    "Are you sure you want to delete this message?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(selectedMessage._id) }
                    ]
                  );
                }}
              >
                <Text style={styles.actionIcon}>🗑️</Text>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            )}

            {selectedMessage && (
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setShowMessageActions(false);
                  handleViewInfo(selectedMessage);
                }}
              >
                <Text style={styles.actionIcon}>ℹ️</Text>
                <Text style={styles.actionText}>Info</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMessageActions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.messageInfoModal}>
            <Text style={styles.modalTitle}>Message Info</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Delivered</Text>
              <Text style={styles.infoValue}>
                {selectedMessage ? new Date(selectedMessage.createdAt).toLocaleString() : ""}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Seen by</Text>
              <View style={styles.seenList}>
                {groupInfo?.members?.slice(0, 3).map((member, index) => (
                  <View key={index} style={styles.seenItem}>
                    <Text style={styles.seenName}>{member.user?.profile?.name || "Member"}</Text>
                    <Text style={styles.seenTime}>Seen</Text>
                  </View>
                ))}
                {groupInfo?.members?.length > 3 && (
                  <Text style={styles.moreSeen}>+ {groupInfo.members.length - 3} more</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeInfoButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.closeInfoButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Group Menu Bottom Sheet */}
      <Modal
        visible={showGroupMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupMenu(false)}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setShowGroupMenu(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            {/* Menu Options */}
            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => {
                setShowGroupMenu(false);
                navigation.navigate("GroupInfo", { groupId, groupName });
              }}
            >
              <View style={styles.bottomSheetIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
              </View>
              <Text style={styles.bottomSheetOptionText}>Group Info</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {isAdmin ? (
              <>
                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    navigation.navigate("EditGroup", {
                      groupId,
                      groupName,
                      groupDescription: groupInfo?.description,
                      groupPhoto: groupInfo?.profilePhoto
                    });
                  }}
                >
                  <View style={styles.bottomSheetIconContainer}>
                    <Ionicons name="pencil-outline" size={24} color="#6B7280" />
                  </View>
                  <Text style={styles.bottomSheetOptionText}>Edit Group</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    Alert.alert(
                      "Delete Group",
                      "Are you sure you want to delete this group? This action cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const headers = await getAuthHeaders();
                              const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
                                method: "DELETE",
                                headers
                              });

                              if (response.ok) {
                                Alert.alert("Success! 🗑️", "Group has been deleted successfully!", [
                                  { text: "OK", onPress: () => navigation.goBack() }
                                ]);
                              } else {
                                Alert.alert("Error", "Failed to delete group");
                              }
                            } catch (error) {
                              Alert.alert("Error", "Failed to delete group");
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <View style={styles.bottomSheetIconContainer}>
                    <Ionicons name="trash-outline" size={24} color="#DC2626" />
                  </View>
                  <Text style={[styles.bottomSheetOptionText, { color: "#DC2626" }]}>Delete Group</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    Alert.alert("Feature Coming Soon", "Mute notifications feature will be available soon!");
                  }}
                >
                  <View style={styles.bottomSheetIconContainer}>
                    <Ionicons name="notifications-off-outline" size={24} color="#6B7280" />
                  </View>
                  <Text style={styles.bottomSheetOptionText}>Mute Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    Alert.alert(
                      "Leave Group",
                      "Are you sure you want to leave this group?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Leave",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const headers = await getAuthHeaders();
                              const response = await fetch(`${API}/api/chat/groups/${groupId}/leave`, {
                                method: "POST",
                                headers
                              });

                              if (response.ok) {
                                Alert.alert("Success! 👋", "You have left the group successfully!", [
                                  { text: "OK", onPress: () => navigation.goBack() }
                                ]);
                              } else {
                                Alert.alert("Error", "Failed to leave group");
                              }
                            } catch (error) {
                              Alert.alert("Error", "Failed to leave group");
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <View style={styles.bottomSheetIconContainer}>
                    <Ionicons name="log-out-outline" size={24} color="#DC2626" />
                  </View>
                  <Text style={[styles.bottomSheetOptionText, { color: "#DC2626" }]}>Leave Group</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 16
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  backButtonText: {
    fontSize: 24,
    color: "#374151",
    fontWeight: "600"
  },
  groupDetails: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827"
  },
  memberCount: {
    fontSize: 12,
    color: "#64748B"
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  groupAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  groupAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  groupAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  menuButton: {
    padding: 8
  },
  menuButtonText: {
    fontSize: 24,
    color: "#64748B"
  },
  messagesListContainer: {
    flex: 1
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end"
  },
  myMessageWrapper: {
    justifyContent: "flex-end"
  },
  otherMessageWrapper: {
    justifyContent: "flex-start"
  },
  senderAvatarContainer: {
    marginRight: 8,
    position: "relative"
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B"
  },
  onlineStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#F0F2F5"
  },
  messageContainer: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 16,
    position: "relative"
  },
  myMessage: {
    backgroundColor: "#DCF8C6", // WhatsApp green bubble
    borderTopRightRadius: 4
  },
  otherMessage: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00664F",
    marginRight: 16
  },
  messageDropdownInside: {
    padding: 2
  },
  dropdownArrowInside: {
    fontSize: 14,
    color: "#64748B"
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#111827"
  },
  myMessageText: {
    color: "#111827"
  },
  otherMessageText: {
    color: "#111827"
  },
  linkText: {
    color: "#00664F",
    textDecorationLine: "underline"
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4
  },
  messageTime: {
    fontSize: 10,
    color: "#64748B"
  },
  tickIcon: {
    marginLeft: 4
  },
  messageStatus: {
    fontSize: 12,
    color: "#10B981"
  },
  // ... Keep emptyContainer and replyPreview ...
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 5
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8"
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB"
  },
  replyContent: {
    flex: 1
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 2
  },
  replyText: {
    fontSize: 14,
    color: "#4B5563"
  },
  cancelReply: {
    fontSize: 18,
    color: "#6B7280",
    paddingLeft: 10
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 25,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 44
  },
  attachButton: {
    padding: 8
  },
  pinIcon: {
    width: 20,
    height: 20,
    tintColor: "#64748B"
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 120
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF"
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  fileMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)"
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  fileSize: {
    fontSize: 11,
    color: "#64748B"
  },
  downloadIcon: {
    fontSize: 18,
    marginLeft: 10,
    color: "#00664F"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  attachmentModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40
  },
  messageActionsModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    margin: 20,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#0F172A"
  },
  attachmentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  attachmentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15
  },
  attachmentIcon: {
    fontSize: 24
  },
  attachmentTextContainer: {
    flex: 1
  },
  attachmentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2
  },
  attachmentSubtext: {
    fontSize: 14,
    color: "#6B7280"
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: "center"
  },
  actionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1
  },
  deleteText: {
    color: "#DC2626"
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600"
  },
  groupMenuModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  bottomSheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  bottomSheetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  bottomSheetOptionText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
    fontWeight: "500"
  },
  messageInfoModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    margin: 20,
    padding: 24,
    width: "85%",
    alignSelf: "center"
  },
  infoSection: {
    marginBottom: 20
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00664F",
    marginBottom: 8,
    textTransform: "uppercase"
  },
  infoValue: {
    fontSize: 16,
    color: "#111827"
  },
  seenList: {
    marginTop: 8
  },
  seenItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  seenName: {
    fontSize: 16,
    color: "#111827"
  },
  seenTime: {
    fontSize: 14,
    color: "#64748B"
  },
  moreSeen: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    fontStyle: "italic"
  },
  closeInfoButton: {
    backgroundColor: "#00664F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8
  },
  closeInfoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});
