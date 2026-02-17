const express = require("express");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");
const { auth } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../utils/notificationHelper");

const router = express.Router();

/* =====================
   GET DIRECT MESSAGE CONVERSATIONS
===================== */
router.get("/conversations", auth, async (req, res) => {
  try {
    console.log("=== GET CONVERSATIONS DEBUG ===");
    console.log("Current user role:", req.user.role);
    console.log("Current user ID:", req.user.id);

    // Role-based filtering for Direct Messages
    let userFilter = {
      companyId: req.user.companyId,
      _id: { $ne: req.user.id }
    };

    // If current user is admin, only show employees
    if (req.user.role === 'admin') {
      userFilter.role = 'employee';
      console.log("Admin user - filtering to show only employees");
    } else {
      console.log("Employee user - showing all users (admin + employees)");
    }
    // If current user is employee, show both admin and other employees
    // (no additional filter needed - will show all users except self)

    console.log("User filter:", userFilter);

    const users = await User.find(userFilter)
      .select("profile.name profile.avatar role email isOnline lastSeen");

    console.log("Found users count:", users.length);
    console.log("Users roles:", users.map(u => ({ name: u.profile?.name, role: u.role })));

    // Get last message for each conversation
    const conversations = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await DirectMessage.findOne({
          $or: [
            { senderId: req.user.id, receiverId: user._id },
            { senderId: user._id, receiverId: req.user.id }
          ],
          isDeleted: false
        })
          .populate("senderId", "profile.name email") // Populate email for fallback
          .sort({ createdAt: -1 });

        // Count unread messages from this user to current user
        const unreadCount = await DirectMessage.countDocuments({
          senderId: user._id,
          receiverId: req.user.id,
          readAt: null,
          isDeleted: false
        });

        // Use email as fallback for name if profile.name is missing
        const displayName = user.profile?.name || user.email.split('@')[0];
        console.log(`User ${user._id} (email: ${user.email}) displayName: ${displayName}`);


        return {
          user: {
            ...user.toObject(),
            displayName // Helper field
          },
          lastMessage: lastMessage ? {
            messageText: lastMessage.messageText,
            senderName: lastMessage.senderId.profile?.name || lastMessage.senderId.email.split('@')[0] || "Unknown",
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.senderId._id.toString() === req.user.id
          } : null,
          unreadCount
        };
      })
    );

    // Sort by unread count first (unread chats at top), then by last message time
    conversations.sort((a, b) => {
      // First priority: unread messages (higher unread count first)
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }

      // Second priority: last message time (most recent first)
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

/* =====================
   GET MESSAGES WITH A USER
===================== */
router.get("/messages/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify the other user exists and is in the same company
    const otherUser = await User.findOne({
      _id: userId,
      companyId: req.user.companyId
    });

    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const messages = await DirectMessage.find({
      $or: [
        { senderId: req.user.id, receiverId: userId },
        { senderId: userId, receiverId: req.user.id }
      ],
      isDeleted: false
    })
      .populate("senderId", "profile.name profile.avatar role")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await DirectMessage.updateMany(
      {
        senderId: userId,
        receiverId: req.user.id,
        readAt: null,
        isDeleted: false
      },
      { readAt: new Date() }
    );

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/* =====================
   SEND DIRECT MESSAGE
===================== */
router.post("/messages/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { messageText, messageType = "text", fileData, repliedMessage } = req.body;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ message: "Message text is required" });
    }

    if (messageText.trim().length > 1000) {
      return res.status(400).json({ message: "Message too long (max 1000 characters)" });
    }

    // Verify the receiver exists and is in the same company
    const receiver = await User.findOne({
      _id: userId,
      companyId: req.user.companyId
    });

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const message = await DirectMessage.create({
      senderId: req.user.id,
      receiverId: userId,
      messageText: messageText.trim(),
      messageType,
      fileData,
      repliedMessage,
      companyId: req.user.companyId
    });

    const populatedMessage = await DirectMessage.findById(message._id)
      .populate("senderId", "profile.name profile.avatar role");

    // Emit real-time notification to receiver
    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("direct_message", populatedMessage);

      // Also emit unread count update to receiver
      const unreadCount = await DirectMessage.countDocuments({
        senderId: req.user.id,
        receiverId: userId,
        readAt: null,
        isDeleted: false
      });

      io.to(userId.toString()).emit("unread_count_update", {
        type: "direct",
        userId: req.user.id,
        count: unreadCount
      });
    }

    // Send Push Notification
    sendPushNotification(
      userId,
      populatedMessage.senderId.profile?.name || "New Message",
      messageText,
      {
        type: "direct_chat",
        senderId: req.user.id,
        senderName: populatedMessage.senderId.profile?.name || "Someone",
        senderAvatar: populatedMessage.senderId.profile?.avatar,
        senderRole: populatedMessage.senderId.role
      }
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send direct message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* =====================
   DELETE DIRECT MESSAGE
===================== */
router.delete("/messages/:messageId", auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await DirectMessage.findOne({
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check permissions: users can only delete their own messages
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    // Actually delete the message from database
    await DirectMessage.findByIdAndDelete(messageId);

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete direct message error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

module.exports = router;