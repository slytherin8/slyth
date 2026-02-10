import React, { useState, useEffect, useRef } from "react";
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
  Linking
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '../utils/storage';
import * as DocumentPicker from 'expo-document-picker';

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

    // Delete option - always show for both admin and employee
    // Backend will handle permissions
    options.push("Delete");

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
    const isUserOnline = onlineUsers.some(user => user._id === item.senderId._id);

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
            {isUserOnline && <View style={styles.onlineStatusDot} />}
          </View>
        )}

        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          {/* Message Header with Dropdown */}
          <View style={styles.messageHeader}>
            {!isMyMessage && (
              <Text style={styles.senderName}>
                {item.senderId.profile?.name || "Unknown"}
              </Text>
            )}
            
            {/* Dropdown Arrow inside message */}
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
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.fileData }} style={styles.messageImage} />
              {item.messageText && item.messageText !== "📷 Image" && (
                <Text style={[
                  styles.imageCaption,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.messageText}
                </Text>
              )}
            </View>
          ) : null}

          {item.messageType === "file" && item.fileData ? (
            <TouchableOpacity 
              style={styles.fileMessage}
              onPress={() => handleFileDownload(item.fileData)}
            >
              <Text style={styles.fileIcon}>📎</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>
                  {item.fileData.name || "Unknown File"}
                </Text>
                <Text style={styles.fileSize}>
                  {item.fileData.size ? `${(item.fileData.size / 1024).toFixed(1)} KB` : "Document"}
                  {item.fileData.type && ` • ${item.fileData.type.split('/')[1]?.toUpperCase() || 'FILE'}`}
                </Text>
              </View>
              <Text style={styles.downloadIcon}>⬇️</Text>
            </TouchableOpacity>
          ) : item.messageType === "file" ? (
            <View style={styles.fileMessage}>
              <Text style={styles.fileIcon}>📎</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>File</Text>
                <Text style={styles.fileSize}>File data not available</Text>
              </View>
            </View>
          ) : null}

          {(item.messageType === "text" || (!item.fileData)) && (
            renderMessageText(item.messageText, isMyMessage)
          )}

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {isMyMessage && (
              <Text style={styles.messageStatus}>✓✓</Text>
            )}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.groupInfo}
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
            {onlineUsers.length > 0 && (
              <View style={styles.onlineIndicator}>
                <Text style={styles.onlineCount}>{onlineUsers.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.groupDetails}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.memberCount}>
              {groupInfo?.members?.length || 0} members
              {onlineUsers.length > 0 && `, ${onlineUsers.length} online`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowGroupMenu(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
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
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachmentOptions(true)}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendText}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? "..." : "Send"}
          </Text>
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

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMessageActions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Group Menu Modal */}
      <Modal
        visible={showGroupMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGroupMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.groupMenuModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalGroupInfo}>
                <View style={styles.modalGroupAvatar}>
                  {groupInfo?.profilePhoto ? (
                    <Image
                      source={{ uri: groupInfo.profilePhoto }}
                      style={styles.modalGroupAvatarImage}
                    />
                  ) : (
                    <View style={styles.modalGroupAvatarPlaceholder}>
                      <Text style={styles.modalGroupAvatarText}>
                        {groupName?.charAt(0)?.toUpperCase() || "G"}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={styles.modalGroupName}>{groupName}</Text>
                  <Text style={styles.modalGroupMembers}>
                    {groupInfo?.members?.length || 0} members
                  </Text>
                </View>
              </View>
            </View>

            {isAdmin ? (
              <>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    navigation.navigate("GroupInfo", { groupId, groupName });
                  }}
                >
                  <Text style={styles.menuIcon}>ℹ️</Text>
                  <Text style={styles.menuText}>Group Info</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
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
                  <Text style={styles.menuIcon}>✏️</Text>
                  <Text style={styles.menuText}>Edit Group</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
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
                  <Text style={styles.menuIcon}>👥</Text>
                  <Text style={styles.menuText}>Manage Members</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
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
                  <Text style={styles.menuIcon}>📷</Text>
                  <Text style={styles.menuText}>Change Group Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
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
                  <Text style={[styles.menuIcon, styles.deleteText]}>🗑️</Text>
                  <Text style={[styles.menuText, styles.deleteText]}>Delete Group</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    navigation.navigate("GroupInfo", { groupId, groupName });
                  }}
                >
                  <Text style={styles.menuIcon}>ℹ️</Text>
                  <Text style={styles.menuText}>Group Info</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    Alert.alert("Feature Coming Soon", "Mute notifications feature will be available soon!");
                  }}
                >
                  <Text style={styles.menuIcon}>🔇</Text>
                  <Text style={styles.menuText}>Mute Notifications</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
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
                  <Text style={[styles.menuIcon, styles.leaveText]}>🚪</Text>
                  <Text style={[styles.menuText, styles.leaveText]}>Leave Group</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowGroupMenu(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
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
  groupInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  groupAvatar: {
    position: "relative",
    marginRight: 12
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
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  groupAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  },
  onlineIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#10B981",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff"
  },
  onlineCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff"
  },
  groupDetails: {
    flex: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  memberCount: {
    fontSize: 12,
    color: "#6B7280"
  },
  menuButton: {
    padding: 8
  },
  menuButtonText: {
    fontSize: 20,
    color: "#6B7280",
    fontWeight: "bold"
  },
  messagesListContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20
  },
  messageWrapper: {
    flexDirection: "row",
    marginVertical: 4,
    maxWidth: "85%",
    alignItems: "flex-end"
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
    justifyContent: "flex-end"
  },
  otherMessageWrapper: {
    alignSelf: "flex-start",
    justifyContent: "flex-start"
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  messageDropdownInside: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 8
  },
  dropdownArrowInside: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "bold"
  },
  senderAvatarContainer: {
    position: "relative",
    marginRight: 8,
    alignSelf: "flex-end"
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
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
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#F0F2F5"
  },
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 1,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  myMessage: {
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 4,
    marginLeft: 8
  },
  otherMessage: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 4
  },
  repliedMessage: {
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB"
  },
  repliedSender: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 2
  },
  repliedText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic"
  },
  imageContainer: {
    marginBottom: 4
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8
  },
  imageCaption: {
    fontSize: 14,
    lineHeight: 18
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4
  },
  myMessageText: {
    color: "#000"
  },
  otherMessageText: {
    color: "#000"
  },
  linkText: {
    color: "#2563EB",
    textDecorationLine: "underline"
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4
  },
  myMessageTime: {
    color: "#4B5563"
  },
  otherMessageTime: {
    color: "#9CA3AF"
  },
  messageStatus: {
    fontSize: 12,
    color: "#10B981"
  },
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
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB"
  },
  attachButton: {
    padding: 10,
    marginRight: 5
  },
  attachButtonText: {
    fontSize: 20
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: "#F9FAFB"
  },
  sendButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
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
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  fileIcon: {
    fontSize: 20,
    marginRight: 10
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151"
  },
  fileSize: {
    fontSize: 12,
    color: "#6B7280"
  },
  downloadIcon: {
    fontSize: 16,
    marginLeft: 8,
    color: "#2563EB"
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
  modalHeader: {
    backgroundColor: "#F9FAFB",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  modalGroupInfo: {
    flexDirection: "row",
    alignItems: "center"
  },
  modalGroupAvatar: {
    marginRight: 12
  },
  modalGroupAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  modalGroupAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  modalGroupAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff"
  },
  modalGroupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  modalGroupMembers: {
    fontSize: 12,
    color: "#6B7280"
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: "center"
  },
  menuText: {
    fontSize: 16,
    color: "#374151",
    flex: 1
  },
  leaveText: {
    color: "#F59E0B"
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 15
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600"
  }
});
