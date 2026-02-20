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
  Pressable,
  PanResponder,
  Animated
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import socketService from '../services/socketService';
import AppLayout from "../components/AppLayout";

import { API } from '../constants/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e2) {
      return null;
    }
  }
};

const getCurrentUserId = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;
  const decoded = decodeJWT(token);
  return decoded ? decoded.id : null;
};

const SwipeableMessage = ({ children, onSwipe, isMyMessage }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Drag limit - Swapped so Sender swipes RIGHT and Receiver swipes LEFT
        const dragValue = isMyMessage ? Math.max(0, gestureState.dx) : Math.min(0, gestureState.dx);
        const limit = 70;
        const clampedDrag = isMyMessage
          ? Math.min(limit, dragValue)
          : Math.max(-limit, dragValue);

        translateX.setValue(clampedDrag);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = 50;
        const swiped = isMyMessage ? gestureState.dx > threshold : gestureState.dx < -threshold;

        if (swiped) {
          onSwipe();
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10
        }).start();
      },
    })
  ).current;

  return (
    <View style={{ position: 'relative', width: '100%' }}>
      <Animated.View style={{
        position: 'absolute',
        top: '50%',
        [isMyMessage ? 'left' : 'right']: 14,
        transform: [
          { translateY: -12 },
          {
            scale: translateX.interpolate({
              inputRange: isMyMessage ? [0, 70] : [-70, 0],
              outputRange: [0.5, 1],
              extrapolate: 'clamp'
            })
          }
        ],
        opacity: translateX.interpolate({
          inputRange: isMyMessage ? [0, 20, 50] : [-50, -20, 0],
          outputRange: [0, 0.5, 1],
          extrapolate: 'clamp'
        })
      }}>
        <Ionicons name="arrow-undo-outline" size={24} color="#00664F" />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
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
  const [hasLeft, setHasLeft] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCaption, setPreviewCaption] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState(null);
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
        const payload = decodeJWT(token);
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

        // Check if current user has left
        const userId = await getCurrentUserId();
        const memberData = data.members?.find(m =>
          (m.userId?._id?.toString() || m.userId?.toString()) === userId?.toString()
        );
        if (memberData?.hasLeft) {
          setHasLeft(true);
        }

        // Simulate online users
        setOnlineUsers(data.members?.filter(m => !m.hasLeft).slice(0, Math.floor(Math.random() * data.members?.length + 1)) || []);
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

      if (!response.ok) {
        throw new Error(data.message || `Server returned ${response.status}`);
      }

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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        if (!asset.base64) {
          Alert.alert("Error", "Failed to get image data");
          return;
        }

        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setPreviewImage(base64Image);
        setShowPreviewModal(true);
        setPreviewCaption("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image: " + error.message);
    }
    setShowAttachmentOptions(false);
  };

  const handleSendPreviewImage = () => {
    if (previewImage) {
      sendMessage(previewCaption || "📷 Photo", "image", previewImage);
      setShowPreviewModal(false);
      setPreviewImage(null);
      setPreviewCaption("");
    }
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
            // Use FileSystem instead of fetch/FileReader for better mobile reliability
            const base64Raw = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const base64Data = `data:${file.mimeType || 'application/octet-stream'};base64,${base64Raw}`;

            sendMessage(`📎 ${file.name}`, "file", {
              name: file.name,
              size: file.size,
              type: file.mimeType || 'application/octet-stream',
              data: base64Data
            });
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
          const fileName = fileData.name || 'document.pdf';
          const base64Data = fileData.data.includes('base64,')
            ? fileData.data.split('base64,')[1]
            : fileData.data;

          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          } else {
            Alert.alert("Error", "Sharing is not available on this device");
          }
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
    if (item.messageType === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessageBadge}>
            <Text style={styles.systemMessageText}>{item.messageText}</Text>
          </View>
        </View>
      );
    }

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
      <SwipeableMessage
        key={item._id}
        onSwipe={() => handleReply(item)}
        isMyMessage={isMyMessage}
      >
        <View style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
        ]}>
          {!isMyMessage && (
            <View style={styles.senderAvatarContainer}>
              <View style={styles.senderAvatar}>
                {(item.senderId.profile?.profileImage || item.senderId.profile?.avatar) ? (
                  <Image
                    source={{ uri: item.senderId.profile.profileImage || item.senderId.profile.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.senderId.profile?.name?.charAt(0)?.toUpperCase() || ""}
                  </Text>
                )}
              </View>
            </View>
          )}

          <Pressable
            style={[
              styles.messageContainer,
              isMyMessage ? styles.myMessage : styles.otherMessage
            ]}
            onLongPress={() => showMessageActionSheet(item)}
          >
            {/* Dropdown Menu Button */}
            <TouchableOpacity
              style={styles.messageDropdown}
              onPress={() => showMessageActionSheet(item)}
            >
              <View style={styles.circularDropdown}>
                <Image
                  source={require("../../assets/images/drop-down.png")}
                  style={styles.dropDownIcon}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.messageHeader}>
              {!isMyMessage && (
                <Text style={styles.senderName}>
                  {item.senderId.profile?.name || item.senderId.name || item.senderId.email || "Unknown"}
                </Text>
              )}
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
                onPress={() => setFullScreenImage(item.fileData)}
              >
                <Image source={{ uri: item.fileData }} style={styles.messageImage} />
                {item.messageText && !["📷 Photo", "📷 Image"].includes(item.messageText) && (
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
                style={styles.fileContainer}
                onPress={() => handleFileDownload(item.fileData)}
              >
                <Image
                  source={require("../../assets/images/pdf.png")}
                  style={styles.fileImage}
                />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.fileData.name || "Document"}
                  </Text>
                  <Text style={styles.fileSize}>
                    {item.fileData.size ? `${(item.fileData.size / 1024).toFixed(1)} KB` : ""}
                    {(item.fileData.type || item.fileData.name?.split('.').pop())?.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleFileDownload(item.fileData)}>
                  <Image
                    source={require("../../assets/images/download.png")}
                    style={styles.downloadIcon}
                  />
                </TouchableOpacity>
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
          </Pressable>
        </View>
      </SwipeableMessage>
    );
  };



  return (
    <AppLayout
      navigation={navigation}
      title={groupName}
      subtitle={groupInfo?.isActive === false ? "Deleted Group" : ""}
      onBack={() => navigation.goBack()}
      onMenu={() => setShowGroupMenu(true)}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >

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
        {groupInfo?.isActive === false ? (
          <View style={styles.leftGroupFooter}>
            <Text style={styles.leftGroupText}>This group has been deleted by an admin. You can't send messages.</Text>
          </View>
        ) : hasLeft ? (
          <View style={styles.leftGroupFooter}>
            <Text style={styles.leftGroupText}>You can't send messages to this group because you're no longer a member.</Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            {/* Upload Options */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImage}
            >
              <Image source={require("../../assets/images/add_photo.png")} style={styles.uploadIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
            >
              <Image source={require("../../assets/images/upload_file.png")} style={styles.uploadIcon} />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
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
        )}

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

        {/* Message Actions Modal */}
        <Modal
          visible={showMessageActions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMessageActions(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMessageActions(false)}
          >
            <View style={styles.messageActionsDropdown}>
              {selectedMessage && selectedMessage.messageText && selectedMessage.messageText.trim() && (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleCopyMessage(selectedMessage)}
                >
                  <Image
                    source={require("../../assets/images/copy.png")}
                    style={styles.dropdownIcon}
                  />
                  <Text style={styles.dropdownText}>Copy</Text>
                </TouchableOpacity>
              )}

              {selectedMessage && (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMessageActions(false);
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
                  <Image
                    source={require("../../assets/images/delete.png")}
                    style={styles.dropdownIcon}
                  />
                  <Text style={[styles.dropdownText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
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

              {isAdmin && groupInfo?.isActive !== false ? (
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
                      navigation.navigate("GroupDelete", {
                        groupId,
                        groupName,
                        groupPhoto: groupInfo?.profilePhoto,
                        groupDescription: groupInfo?.description
                      });
                    }}
                  >
                    <View style={styles.bottomSheetIconContainer}>
                      <Ionicons name="trash-outline" size={24} color="#DC2626" />
                    </View>
                    <Text style={[styles.bottomSheetOptionText, { color: "#DC2626" }]}>Delete Group</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </>
              ) : !isAdmin && !hasLeft && groupInfo?.isActive !== false ? (
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
                      navigation.navigate("GroupExit", {
                        groupId,
                        groupName,
                        groupPhoto: groupInfo?.profilePhoto,
                        groupDescription: groupInfo?.description
                      });
                    }}
                  >
                    <View style={styles.bottomSheetIconContainer}>
                      <Ionicons name="log-out-outline" size={24} color="#DC2626" />
                    </View>
                    <Text style={[styles.bottomSheetOptionText, { color: "#DC2626" }]}>Leave Group</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={showPreviewModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={{ width: 28 }} />
              </View>

              <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />

              <View style={styles.previewFooter}>
                <View style={styles.previewInputWrapper}>
                  <TextInput
                    style={styles.previewTextInput}
                    placeholder="Add a caption..."
                    placeholderTextColor="#94A3B8"
                    value={previewCaption}
                    onChangeText={setPreviewCaption}
                  />
                </View>
                <TouchableOpacity style={styles.previewSendButton} onPress={handleSendPreviewImage}>
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Full Screen Image Modal */}
        <Modal
          visible={!!fullScreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullScreenImage(null)}
        >
          <View style={styles.fullScreenOverlay}>
            <TouchableOpacity
              style={styles.fullScreenCloseButton}
              onPress={() => setFullScreenImage(null)}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
              <Text style={styles.fullScreenCloseText}>Back</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </AppLayout>
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
    justifyContent: "flex-end",
    paddingRight: 0,
    marginRight: 0
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
    position: "relative",
    marginHorizontal: 0
  },
  myMessage: {
    backgroundColor: "#DCF8C6", // WhatsApp green bubble
    borderTopRightRadius: 4,
    marginRight: 0
  },
  otherMessage: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4
  },
  imageMessageContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0
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
  uploadButton: {
    padding: 8,
    marginRight: 4
  },
  uploadIcon: {
    width: 24,
    height: 24,
    tintColor: "#00664F"
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
  messageDropdown: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  circularDropdown: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropDownIcon: {
    width: 12,
    height: 12,
    tintColor: "#64748B"
  },
  threeDotIcon: {
    width: 14,
    height: 14,
    tintColor: "#64748B"
  },
  messageActionsDropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: "auto",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 150
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  dropdownIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: "#374151"
  },
  dropdownText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500"
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
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%'
  },
  systemMessageBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '85%'
  },
  systemMessageText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center'
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    maxWidth: '100%',
    minWidth: 200,
  },
  fileImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10,
  },
  downloadIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginLeft: 10,
    tintColor: '#6B7280',
  },
  imageContainer: {
    marginTop: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  messageImage: {
    width: 280,
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  imageCaption: {
    fontSize: 14,
    color: '#111827',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 20,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cropText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewInputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginRight: 15,
  },
  previewTextInput: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  previewSendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00664F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftGroupFooter: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  leftGroupText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  }
});
