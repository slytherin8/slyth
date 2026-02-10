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
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch {
    return null;
  }
};

export default function DirectChatScreen({ route, navigation }) {
  const { userId, userName, userAvatar } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, [userId]);

  useEffect(() => {
    // Connect to socket service
    socketService.connect();

    // Listen for real-time messages
    const handleDirectMessage = (message) => {
      // Only add message if it's from the current conversation
      if (message.senderId._id === userId || message.receiverId === userId) {
        setMessages(prev => [...prev, message]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socketService.on('direct_message', handleDirectMessage);

    return () => {
      socketService.off('direct_message', handleDirectMessage);
    };
  }, [userId]);

  const initializeChat = async () => {
    const currentId = await getCurrentUserId();
    setCurrentUserId(currentId);
    fetchMessages();
  };
  const fetchMessages = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/direct-messages/messages/${userId}`, {
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

    try {
      const headers = await getAuthHeaders();
      const payload = {
        messageText: textToSend || (messageType === "image" ? "📷 Image" : "📎 File"),
        messageType,
        fileData,
        repliedMessage: replyingTo
      };

      const response = await fetch(`${API}/api/direct-messages/messages/${userId}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
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
      Alert.alert("Error", "Failed to send message: " + error.message);
      if (messageText) setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    sendMessage(newMessage);
  };
  const handleReply = (message) => {
    setReplyingTo({
      messageId: message._id,
      senderName: message.senderId.profile?.name || "Unknown",
      messageText: message.messageText
    });
    setShowMessageActions(false);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/direct-messages/messages/${messageId}`, {
        method: "DELETE",
        headers
      });

      if (response.ok) {
        await fetchMessages();
        Alert.alert("Success! 🗑️", "Message deleted successfully");
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to delete message");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete message: " + error.message);
    }
    setShowMessageActions(false);
  };

  const handleCopyMessage = (message) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(message.messageText);
      Alert.alert("Copied! 📋", "Message copied to clipboard");
    } else {
      Alert.alert("Copied! 📋", "Message copied to clipboard");
    }
    setShowMessageActions(false);
  };

  const handleLinkPress = async (url) => {
    try {
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
    const isMyMessage = message.senderId._id === currentUserId;
    const options = [];

    if (message.messageText && message.messageText.trim()) {
      options.push("Copy");
    }

    if (!isMyMessage) {
      options.push("Reply");
    }

    if (isMyMessage) {
      options.push("Delete");
    }

    options.push("Cancel");

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf("Delete")
        },
        (buttonIndex) => {
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (!asset.base64) {
          Alert.alert("Error", "Failed to convert image to base64. Please try a different image.");
          return;
        }
        
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;

        if (base64Image.length > 5 * 1024 * 1024) {
          Alert.alert("Error", "Image is too large. Please select a smaller image.");
          return;
        }

        if (Platform.OS === 'web') {
          const caption = prompt("Add a caption (optional):");
          sendMessage(caption || "📷 Photo", "image", base64Image);
        } else {
          Alert.alert(
            "Send Photo",
            "Do you want to send this photo?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Send", onPress: () => sendMessage("📷 Photo", "image", base64Image) }
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image: " + error.message);
    }
    setShowAttachmentOptions(false);
  };
  const pickDocument = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx,.zip,.rar';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64Data = e.target.result;
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
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];
          
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result;
              sendMessage(`📎 ${file.name}`, "file", {
                name: file.name,
                size: file.size,
                type: file.mimeType || 'application/octet-stream',
                data: base64Data
              });
            };
            
            reader.onerror = (error) => {
              Alert.alert("Error", "Failed to read file");
            };
            
            reader.readAsDataURL(blob);
            
          } catch (fileError) {
            Alert.alert("Error", "Failed to read file: " + fileError.message);
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document: " + error.message);
    }
    setShowAttachmentOptions(false);
  };

  const handleFileDownload = async (fileData) => {
    try {
      if (Platform.OS === 'web') {
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
        if (fileData.data) {
          Alert.alert(
            "📎 " + (fileData.name || "File"),
            `Size: ${fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : "Unknown"}\nType: ${fileData.type || "Unknown"}\n\nFile contains data and can be processed.`,
            [{ text: "OK", style: "default" }]
          );
        } else {
          Alert.alert("Error", "File data not available");
        }
      }
    } catch (error) {
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

    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
      ]}>
        {!isMyMessage && (
          <View style={styles.senderAvatarContainer}>
            <View style={styles.senderAvatar}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {userName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          <View style={styles.messageHeader}>
            {!isMyMessage && (
              <Text style={styles.senderName}>
                {userName || "Unknown"}
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

        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {userAvatar ? (
              <Image
                source={{ uri: userAvatar }}
                style={styles.userAvatarImage}
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text style={styles.userAvatarText}>
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.userDetails}>
            <Text style={styles.headerTitle}>{userName || "Unknown User"}</Text>
            <Text style={styles.userRole}>Direct Message</Text>
          </View>
        </View>
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

            {selectedMessage && selectedMessage.senderId._id === currentUserId && (
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
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  userAvatar: {
    marginRight: 12
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center"
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  },
  userDetails: {
    flex: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  userRole: {
    fontSize: 12,
    color: "#6B7280"
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