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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
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
  const handleViewInfo = (message) => {
    setSelectedMessage(message);
    setShowInfoModal(true);
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
      options.push("Info");
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

    const renderTicks = () => {
      if (!isMyMessage) return null;

      let iconName = "checkmark-outline";
      let color = "#667781";

      if (item.read) {
        iconName = "checkmark-done-outline";
        color = "#34B7F1";
      } else if (item.delivered) {
        iconName = "checkmark-done-outline";
        color = "#667781";
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

        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage
          ]}
        >
          <View style={styles.messageHeader}>
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

          <View style={styles.userDetails}>
            <Text style={styles.headerTitle}>{userName || "Unknown User"}</Text>
            <Text style={styles.userRole}>Direct Message</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
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
              <Text style={styles.infoLabel}>Read</Text>
              <View style={styles.seenItem}>
                <Text style={styles.seenName}>{userName}</Text>
                <Text style={styles.seenTime}>{selectedMessage?.read ? "Read" : "Delivered"}</Text>
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
  userDetails: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827"
  },
  userRole: {
    fontSize: 12,
    color: "#64748B"
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
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
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
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
    marginRight: 8
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
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600"
  },
  messageContainer: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 16,
    position: "relative"
  },
  myMessage: {
    backgroundColor: "#DCF8C6",
    borderTopRightRadius: 4
  },
  otherMessage: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 4
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
  myMessageTime: {
    color: "#64748B"
  },
  otherMessageTime: {
    color: "#64748B"
  },
  tickIcon: {
    marginLeft: 4
  },
  repliedMessage: {
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#00664F",
    marginBottom: 8
  },
  repliedSender: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00664F"
  },
  repliedText: {
    fontSize: 13,
    color: "#64748B"
  },
  imageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4
  },
  messageImage: {
    width: 250,
    height: 180,
    resizeMode: "cover"
  },
  imageCaption: {
    fontSize: 14,
    marginTop: 4,
    paddingHorizontal: 4
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
    color: "#00664F",
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