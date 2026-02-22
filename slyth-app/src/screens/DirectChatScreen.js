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
  Animated,
  ScrollView
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
    // Fallback if Buffer is not available (though it usually is in modern Expo/node)
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
        // Only trigger if swipe is horizontal and prominent
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
      {/* Reply Icon Background */}
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
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({ name: "", logo: "" });
  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCaption, setPreviewCaption] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState(null);
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
        setMessages(prev => {
          if (prev.find(m => m._id === message._id)) return prev;
          return [...prev, message];
        });

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
    fetchUserInfo(); // Fetch the real name/avatar
    markAsRead();
    if (route.params.userRole === 'admin') {
      fetchCompanyInfo();
    }
  };

  const fetchUserInfo = async () => {
    try {
      setLoadingUser(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/auth/user/${userId}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setFetchedUser(data);
      }
    } catch (err) {
      console.log("User fetch error:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/auth/company`, { headers });
      const data = await res.json();
      if (res.ok) setCompanyInfo(data);
    } catch (err) {
      console.log("Company fetch error:", err);
    }
  };

  const markAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API}/api/direct-messages/read/${userId}`, {
        method: "POST",
        headers
      });
      // Also notify socket if needed, but usually server handles this
      socketService.emit('mark_direct_read', { senderId: userId });
    } catch (error) {
      console.log("Mark as read error:", error);
    }
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

      // Ensure unique messages
      const uniqueMessages = [];
      const seen = new Set();
      data.forEach(m => {
        if (m._id && !seen.has(m._id)) {
          seen.add(m._id);
          uniqueMessages.push(m);
        }
      });
      setMessages(uniqueMessages);
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
      const AsyncStorage = (await import("../utils/storage")).default;
      const token = await AsyncStorage.getItem("token");

      // fileData can be a base64 string (image picker) or an object with uri (document picker)
      const isBase64File = typeof fileData === 'string' || (fileData && !fileData.uri);
      if (!fileData || Platform.OS === 'web' || isBase64File) {
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
        if (!response.ok) throw new Error(data.message || `Server returned ${response.status}`);
        setMessages(prev => {
          if (prev.find(m => m._id === data._id)) return prev;
          return [...prev, data];
        });
      } else {
        // Mobile Attachment: Use FileSystem.uploadAsync for stability
        console.log(`[DirectChat] Using uploadAsync for ${messageType}`);

        const uploadResult = await FileSystem.uploadAsync(`${API}/api/direct-messages/messages/${userId}`, fileData.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          parameters: {
            messageText: textToSend || (messageType === "image" ? "📷 Image" : "📎 File"),
            messageType,
            repliedMessage: replyingTo ? JSON.stringify(replyingTo) : ''
          }
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        const data = JSON.parse(uploadResult.body);
        setMessages(prev => {
          if (prev.find(m => m._id === data._id)) return prev;
          return [...prev, data];
        });
      }
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
      console.error("Direct send error:", error);
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
      options.push("View Profile");
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
          } else if (options[buttonIndex] === "View Profile") {
            setShowProfileModal(true);
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
            sendMessage(`📎 ${file.name}`, "file", {
              uri: file.uri,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType || 'application/octet-stream'
            });
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

  const fetchFileData = async (messageId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API}/api/direct-messages/messages/data/${messageId}`, {
        headers
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      return result.data;
    } catch (err) {
      console.error("Fetch file data error:", err);
      return null;
    }
  };

  const handleFileDownload = async (message) => {
    try {
      const fileData = message.fileData;
      if (!fileData) return;

      setLoading(true);
      let dataToUse = fileData.data;

      if (!dataToUse) {
        console.log("Lazy loading file data for message:", message._id);
        dataToUse = await fetchFileData(message._id);
      }

      if (!dataToUse) {
        Alert.alert("Error", "Could not retrieve file data");
        return;
      }

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = dataToUse;
        link.download = fileData.name || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert("Success! 📥", "File download started");
      } else {
        // For mobile
        const fileName = fileData.name || 'document.pdf';
        const base64Data = dataToUse.includes('base64,')
          ? dataToUse.split('base64,')[1]
          : dataToUse;

        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: 'base64',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Error", "Sharing is not available on this device");
        }
      }
    } catch (err) {
      console.error("File download error:", err);
      Alert.alert("Error", "Failed to download file");
    } finally {
      setLoading(false);
    }
  };

  const [loadedImages, setLoadedImages] = useState({});

  const handleLoadImage = async (messageId) => {
    if (loadedImages[messageId]) return;

    const data = await fetchFileData(messageId);
    if (data) {
      setLoadedImages(prev => ({ ...prev, [messageId]: data }));
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
      <SwipeableMessage
        onSwipe={() => handleReply(item)}
        isMyMessage={isMyMessage}
      >
        <View style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
        ]}>
          {!isMyMessage && (
            <TouchableOpacity
              style={styles.senderAvatarContainer}
              onPress={() => setShowProfileModal(true)}
            >
              <View style={styles.senderAvatar}>
                {item.senderId?.profile?.profileImage || item.senderId?.profile?.avatar ? (
                  <Image
                    source={{ uri: item.senderId.profile.profileImage || item.senderId.profile.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {(item.senderId?.profile?.name || item.senderId?.name || "?").charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
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
                onPress={() => {
                  const data = loadedImages[item._id] || item.fileData.data;
                  if (data) setFullScreenImage(data);
                  else handleLoadImage(item._id);
                }}
              >
                {(loadedImages[item._id] || item.fileData.data) ? (
                  <Image source={{ uri: loadedImages[item._id] || item.fileData.data }} style={styles.messageImage} />
                ) : (
                  <View style={[styles.messageImage, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={40} color="#94A3B8" />
                    <Text style={styles.placeholderText}>Tap to load image</Text>
                  </View>
                )}
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
                onPress={() => handleFileDownload(item)}
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
                <TouchableOpacity onPress={() => handleFileDownload(item)}>
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


  const getDisplayName = () => {
    if (route.params.userRole === 'admin') return companyInfo.name || "Admin";

    // Prioritize fetched data from full record
    const fullName = fetchedUser?.profile?.name || fetchedUser?.name;
    if (fullName && fullName !== "Unknown" && fullName !== "Employee") return fullName;

    // Fallback to route params if they are valid
    if (userName && userName !== "Unknown" && userName !== "Employee") return userName;

    // Last resort fallbacks
    return fetchedUser?.email?.split('@')[0] || route.params.userEmail?.split('@')[0] || "Member";
  };

  return (
    <AppLayout
      navigation={navigation}
      title={getDisplayName()}
      subtitle={route.params.userRole === 'admin' ? 'Admin' : 'Employee'}
      onBack={() => navigation.goBack()}
      onMenu={() => setShowChatMenu(true)}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
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
              {selectedMessage && selectedMessage.senderId._id !== currentUserId && (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setShowMessageActions(false);
                    setShowProfileModal(true);
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
                  <Text style={styles.dropdownText}>View Profile</Text>
                </TouchableOpacity>
              )}

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

              {selectedMessage && selectedMessage.senderId._id === currentUserId && (
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

        {/* Chat Menu Modal (Three-dot) */}
        <Modal
          visible={showChatMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChatMenu(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowChatMenu(false)}
          >
            <View style={styles.chatMenuCard}>
              <TouchableOpacity
                style={styles.chatMenuOption}
                onPress={() => {
                  setShowChatMenu(false);
                  setShowProfileModal(true);
                }}
              >
                <Ionicons name="person-outline" size={20} color="#374151" />
                <Text style={styles.chatMenuText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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

        {/* View Profile Modal */}
        <Modal
          visible={showProfileModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <View style={[styles.container, { backgroundColor: '#fff' }]}>
            {/* Header for Full Screen Modal */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={styles.backButton}
              >
                <Image
                  source={require("../../assets/images/back-arrow.png")}
                  style={styles.backIcon}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profile Details</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.profileContentScroll}>
              <View style={styles.profileHeaderSection}>
                <View style={styles.profileAvatarContainer}>
                  {route.params.userRole === 'admin' ? (
                    companyInfo.logo ? (
                      <Image source={{ uri: companyInfo.logo }} style={styles.largeProfileAvatar} />
                    ) : (
                      <View style={[styles.largeProfileAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="business" size={60} color="#fff" />
                      </View>
                    )
                  ) : (
                    (fetchedUser?.profile?.avatar || userAvatar) ? (
                      <Image source={{ uri: fetchedUser?.profile?.avatar || userAvatar }} style={styles.largeProfileAvatar} />
                    ) : (
                      <View style={[styles.largeProfileAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.largeAvatarText}>
                          {getDisplayName().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                <Text style={styles.profileName}>
                  {getDisplayName()}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {route.params.userRole === 'admin' ? 'Company Administrator' : 'Project Member'}
                  </Text>
                </View>
              </View>

              <View style={styles.profileDetailsSection}>
                <Text style={styles.sectionTitle}>Information</Text>

                <View style={styles.profileInfoItem}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="person-outline" size={22} color="#00664F" />
                  </View>
                  <View>
                    <Text style={styles.infoLabelText}>Full Name</Text>
                    <Text style={styles.profileInfoText}>{getDisplayName()}</Text>
                  </View>
                </View>

                <View style={styles.profileInfoItem}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="mail-outline" size={22} color="#00664F" />
                  </View>
                  <View>
                    <Text style={styles.infoLabelText}>Email Address</Text>
                    <Text style={styles.profileInfoText}>{fetchedUser?.email || route.params.userEmail || "No email provided"}</Text>
                  </View>
                </View>

                <View style={styles.profileInfoItem}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#00664F" />
                  </View>
                  <View>
                    <Text style={styles.infoLabelText}>Account Status</Text>
                    <Text style={styles.profileInfoText}>Verified & Active</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.fullDoneButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.doneButtonText}>Close Profile</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </AppLayout >
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
    marginRight: 8,
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
    resizeMode: 'contain'
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
  otherMessageWrapper: {
    justifyContent: "flex-start",
    paddingRight: 60,
  },
  myMessageWrapper: {
    justifyContent: "flex-end",
    paddingLeft: 60,
    marginRight: -4, // Pull closer to edge
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
    maxWidth: "100%",
    padding: 12,
    paddingRight: 32, // Space for dropdown icon
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
  imageMessageContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0
  },
  placeholderImage: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: 'dashed'
  },
  placeholderText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8
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
    marginTop: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  messageImage: {
    width: 280,
    height: undefined,
    aspectRatio: 1, // Will be updated to match exact size if possible, or 1 as fallback
    resizeMode: 'cover',
    borderRadius: 12,
  },
  imageCaption: {
    fontSize: 14,
    color: '#111827',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
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
  threeDotIcon: {
    width: 14,
    height: 14,
    tintColor: "#64748B"
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
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent"
  },
  chatMenuCard: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  chatMenuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8
  },
  chatMenuText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500"
  },
  profileModal: {
    backgroundColor: "#fff",
    flex: 1,
    width: "100%",
  },
  profileContentScroll: {
    paddingBottom: 120,
  },
  profileHeaderSection: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  profileAvatarContainer: {
    marginBottom: 20
  },
  largeProfileAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarPlaceholder: {
    backgroundColor: "#00664F",
    justifyContent: "center",
    alignItems: "center"
  },
  largeAvatarText: {
    color: "#fff",
    fontSize: 60,
    fontWeight: "bold"
  },
  profileName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center"
  },
  roleBadge: {
    backgroundColor: '#E5F3F0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#00664F',
    fontWeight: '700',
    fontSize: 14
  },
  profileDetailsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    marginTop: 10
  },
  profileInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  infoLabelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2
  },
  profileInfoText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: '600'
  },
  fullDoneButton: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
    backgroundColor: "#00664F",
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#00664F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
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
    width: 240,
    height: 180,
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
  },
  fullScreenCloseButton: {
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  fullScreenCloseText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
    fontWeight: '600',
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
  }
});