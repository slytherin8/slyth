const express = require("express");
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/* =====================
   CREATE GROUP (ADMIN ONLY)
===================== */
router.post("/groups", auth, adminOnly, async (req, res) => {
  try {
    const { name, description, profilePhoto, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: "Group name and members are required" });
    }

    // Verify all members belong to the same company and are active
    const members = await User.find({
      _id: { $in: memberIds },
      companyId: req.user.companyId,
      role: "employee"
    });

    if (members.length !== memberIds.length) {
      return res.status(400).json({ message: "Some selected employees are not valid" });
    }

    // Create member objects with metadata
    const memberObjects = memberIds.map(id => ({
      userId: id,
      joinedAt: new Date(),
      unreadCount: 0,
      lastReadAt: new Date(),
      isMuted: false
    }));

    // Add admin as a member
    memberObjects.push({
      userId: req.user.id,
      joinedAt: new Date(),
      unreadCount: 0,
      lastReadAt: new Date(),
      isMuted: false
    });

    const group = await Group.create({
      name,
      description,
      profilePhoto,
      members: memberObjects,
      createdBy: req.user.id,
      companyId: req.user.companyId,
      lastActivity: new Date(),
      totalMessages: 0
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members.userId", "profile.name profile.avatar email role isOnline lastSeen")
      .populate("createdBy", "profile.name");

    res.status(201).json({
      message: "Group created successfully",
      group: populatedGroup
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
});

/* =====================
   GET USER'S GROUPS
===================== */
router.get("/groups", auth, async (req, res) => {
  try {
    const groups = await Group.find({
      "members.userId": req.user.id,
      companyId: req.user.companyId,
      isActive: true
    })
    .populate("members.userId", "profile.name profile.avatar email role isOnline lastSeen")
    .populate("createdBy", "profile.name")
    .sort({ lastActivity: -1 });

    // Get last message for each group and calculate unread count
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({
          groupId: group._id,
          isDeleted: false
        })
        .populate("senderId", "profile.name")
        .sort({ createdAt: -1 });

        // Find current user's member data
        const currentUserMember = group.members.find(
          member => member.userId._id.toString() === req.user.id
        );

        return {
          ...group.toObject(),
          lastMessage: lastMessage ? {
            messageText: lastMessage.messageText,
            senderName: lastMessage.senderId.profile.name,
            createdAt: lastMessage.createdAt
          } : null,
          unreadCount: currentUserMember ? currentUserMember.unreadCount : 0,
          isMuted: currentUserMember ? currentUserMember.isMuted : false
        };
      })
    );

    res.json(groupsWithLastMessage);
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

/* =====================
   GET GROUP MESSAGES
===================== */
router.get("/groups/:groupId/messages", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": req.user.id,
      companyId: req.user.companyId
    });

    if (!group) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    const messages = await Message.find({
      groupId,
      isDeleted: false
    })
    .populate("senderId", "profile.name profile.avatar role")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Update user's lastReadAt and reset unread count
    await Group.updateOne(
      { 
        _id: groupId, 
        "members.userId": req.user.id 
      },
      { 
        $set: { 
          "members.$.lastReadAt": new Date(),
          "members.$.unreadCount": 0
        }
      }
    );

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/* =====================
   SEND MESSAGE
===================== */
router.post("/groups/:groupId/messages", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageText, messageType = "text", fileData, repliedMessage } = req.body;

    console.log("=== SEND MESSAGE SERVER ===");
    console.log("Group ID:", groupId);
    console.log("Message text:", messageText);
    console.log("Message type:", messageType);
    console.log("File data:", fileData ? "Present" : "None");
    console.log("File data keys:", fileData ? Object.keys(fileData) : "N/A");

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ message: "Message text is required" });
    }

    if (messageText.trim().length > 1000) {
      return res.status(400).json({ message: "Message too long (max 1000 characters)" });
    }

    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": req.user.id,
      companyId: req.user.companyId,
      isActive: true
    });

    if (!group) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    const message = await Message.create({
      groupId,
      senderId: req.user.id,
      messageText: messageText.trim(),
      messageType,
      fileData,
      repliedMessage
    });

    console.log("Message created:", message._id);

    // Update group's last activity and total message count
    await Group.findByIdAndUpdate(groupId, { 
      lastActivity: new Date(),
      $inc: { totalMessages: 1 }
    });

    // Increment unread count for all other members
    await Group.updateMany(
      { 
        _id: groupId,
        "members.userId": { $ne: req.user.id }
      },
      { 
        $inc: { "members.$.unreadCount": 1 }
      }
    );

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "profile.name profile.avatar role");

    console.log("Populated message:", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* =====================
   GET EMPLOYEES FOR GROUP CREATION (ADMIN ONLY)
===================== */
router.get("/employees", auth, adminOnly, async (req, res) => {
  try {
    const employees = await User.find({
      companyId: req.user.companyId,
      role: "employee"
      // Removed isActive and profileCompleted filters to show all employees
    }).select("profile.name profile.avatar email isActive profileCompleted");

    res.json(employees);
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
});

/* =====================
   GET GROUP DETAILS
===================== */
router.get("/groups/:groupId", auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findOne({
      _id: groupId,
      "members.userId": req.user.id,
      companyId: req.user.companyId
    })
    .populate("members.userId", "profile.name profile.avatar email role isOnline lastSeen")
    .populate("createdBy", "profile.name");

    if (!group) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    res.json(group);
  } catch (error) {
    console.error("Get group details error:", error);
    res.status(500).json({ message: "Failed to fetch group details" });
  }
});

/* =====================
   UPDATE GROUP (ADMIN ONLY)
===================== */
router.put("/groups/:groupId", auth, adminOnly, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, profilePhoto, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: "Group name and members are required" });
    }

    // Verify group exists and user is admin
    const group = await Group.findOne({
      _id: groupId,
      companyId: req.user.companyId
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify all members belong to the same company and are active
    const members = await User.find({
      _id: { $in: memberIds },
      companyId: req.user.companyId,
      role: "employee"
    });

    if (members.length !== memberIds.length) {
      return res.status(400).json({ message: "Some selected employees are not valid" });
    }

    // Create member objects with metadata
    const memberObjects = memberIds.map(id => ({
      userId: id,
      joinedAt: new Date(),
      unreadCount: 0,
      lastReadAt: new Date(),
      isMuted: false
    }));

    // Add admin as a member
    memberObjects.push({
      userId: req.user.id,
      joinedAt: new Date(),
      unreadCount: 0,
      lastReadAt: new Date(),
      isMuted: false
    });

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        name,
        description,
        profilePhoto,
        members: memberObjects,
        lastActivity: new Date()
      },
      { new: true }
    ).populate("members.userId", "profile.name profile.avatar email role isOnline lastSeen")
     .populate("createdBy", "profile.name");

    res.json({
      message: "Group updated successfully",
      group: updatedGroup
    });
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({ message: "Failed to update group" });
  }
});

/* =====================
   DELETE GROUP (ADMIN ONLY)
===================== */
router.delete("/groups/:groupId", auth, adminOnly, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify group exists and user is admin
    const group = await Group.findOne({
      _id: groupId,
      companyId: req.user.companyId
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Mark group as inactive instead of deleting
    await Group.findByIdAndUpdate(groupId, { 
      isActive: false,
      lastActivity: new Date()
    });

    // Also mark all messages in this group as deleted
    await Message.updateMany(
      { groupId },
      { isDeleted: true }
    );

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({ message: "Failed to delete group" });
  }
});

/* =====================
   LEAVE GROUP (EMPLOYEE)
===================== */
router.post("/groups/:groupId/leave", auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify group exists and user is member
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": req.user.id,
      companyId: req.user.companyId,
      isActive: true
    });

    if (!group) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    // Remove user from group members
    await Group.updateOne(
      { _id: groupId },
      { 
        $pull: { members: { userId: req.user.id } },
        $set: { lastActivity: new Date() }
      }
    );

    res.json({ message: "Successfully left the group" });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({ message: "Failed to leave group" });
  }
});

/* =====================
   DELETE MESSAGE
===================== */
router.delete("/groups/:groupId/messages/:messageId", auth, async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    console.log("Delete message request:", { groupId, messageId, userId: req.user.id, role: req.user.role });

    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": req.user.id,
      companyId: req.user.companyId,
      isActive: true
    });

    if (!group) {
      console.log("Group not found or access denied");
      return res.status(403).json({ message: "Access denied to this group" });
    }

    // Find the message
    const message = await Message.findOne({
      _id: messageId,
      groupId,
      isDeleted: false
    });

    if (!message) {
      console.log("Message not found");
      return res.status(404).json({ message: "Message not found" });
    }

    console.log("Message found:", { messageId, senderId: message.senderId, isDeleted: message.isDeleted });

    // Check permissions: admins can delete any message, users can only delete their own
    const isAdmin = req.user.role === 'admin';
    const isMessageOwner = message.senderId.toString() === req.user.id;

    console.log("Permission check:", { isAdmin, isMessageOwner, userRole: req.user.role });

    if (!isAdmin && !isMessageOwner) {
      console.log("Permission denied");
      return res.status(403).json({ message: "You don't have permission to delete this message" });
    }

    // Actually delete the message from database
    await Message.findByIdAndDelete(messageId);

    console.log("Message deleted successfully from database");
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

module.exports = router;