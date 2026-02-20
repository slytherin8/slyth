const express = require("express");
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../utils/notificationHelper");

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
      .populate("members.userId", "name profile.name profile.avatar email role isOnline lastSeen")
      .populate("createdBy", "name profile.name");

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
      .populate("members.userId", "name profile.name profile.avatar email role isOnline lastSeen")
      .populate("createdBy", "name profile.name")
      .sort({ lastActivity: -1 });

    // Get last message for each group and calculate unread count
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({
          groupId: group._id,
          isDeleted: false
        })
          .populate("senderId", "profile.name name")
          .sort({ createdAt: -1 });

        // Find current user's member data
        const currentUserMember = group.members.find(
          member => member.userId?._id?.toString() === req.user.id
        );

        return {
          ...group.toObject(),
          lastMessage: lastMessage ? {
            messageText: lastMessage.messageText,
            senderName: lastMessage.senderId?.profile?.name || lastMessage.senderId?.name || "Unknown",
            messageType: lastMessage.messageType,
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

    // Verify user is member of the group OR is an admin in the same company
    const group = await Group.findOne({
      _id: groupId,
      companyId: req.user.companyId
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId.toString() === req.user.id);
    const isAdmin = (req.user.role || "").toLowerCase() === 'admin';

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    const messages = await Message.find({
      groupId,
      isDeleted: false
    })
      .populate("senderId", "name profile.name profile.avatar role")
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

    // Verify user is member of the group OR is an admin in the same company
    const group = await Group.findOne({
      _id: groupId,
      companyId: req.user.companyId,
      isActive: true
    });

    if (!group) {
      return res.status(403).json({ message: "Access denied to this group (inactive or non-existent)" });
    }

    const isMember = group.members.some(m => m.userId.toString() === req.user.id);
    const isAdmin = (req.user.role || "").toLowerCase() === 'admin';

    if (!isMember && !isAdmin) {
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
      .populate("senderId", "name profile.name profile.avatar role");

    console.log("Populated message:", populatedMessage);

    // Emit real-time updates to all group members
    const io = req.app.get("io");
    if (io) {
      // Emit the new message to all group members
      group.members.forEach(member => {
        if (member.userId.toString() !== req.user.id) {
          io.to(member.userId.toString()).emit("group_message", populatedMessage);

          // Emit unread count update for this specific group
          io.to(member.userId.toString()).emit("unread_count_update", {
            type: "group",
            groupId: groupId,
            count: member.unreadCount + 1
          });

          // Send Push Notification
          sendPushNotification(
            member.userId,
            group.name,
            `${populatedMessage.senderId.profile?.name || "Someone"}: ${messageText}`,
            {
              type: "group_chat",
              groupId: groupId,
              groupName: group.name
            }
          );
        }
      });
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* =====================
   GET EMPLOYEES FOR GROUP CREATION
===================== */
router.get("/employees", auth, async (req, res) => {
  try {
    // Return all users in the company so they can chat with each other
    const users = await User.find({
      companyId: req.user.companyId
    }).select("name profile.name profile.avatar email role isActive profileCompleted");

    res.json(users);
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
      companyId: req.user.companyId
    })
      .populate("members.userId", "name profile.name profile.avatar email role isOnline lastSeen")
      .populate("createdBy", "name profile.name");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(m => m.userId && m.userId._id.toString() === req.user.id);
    const isAdmin = (req.user.role || "").toLowerCase() === 'admin';

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: "Access denied to this group" });
    }

    // Filter out members where userId is null (deleted users) and deduplicate
    if (group && group.members) {
      const uniqueMembers = [];
      const seenIds = new Set();
      group.members.forEach((m) => {
        if (m.userId && m.userId._id && !seenIds.has(m.userId._id.toString())) {
          uniqueMembers.push(m);
          seenIds.add(m.userId._id.toString());
        }
      });
      group.members = uniqueMembers;
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

    // Verify all members belong to the same company
    // (We allow both employees and admins in general, but usually employees are selected)
    const validMembers = await User.find({
      _id: { $in: memberIds },
      companyId: req.user.companyId
    });

    if (validMembers.length !== memberIds.length) {
      // Warning: some IDs might be invalid, but we proceed with valid ones or error out?
      // Strict check:
      // return res.status(400).json({ message: "Some selected users are not valid" });
    }

    // Prepare updated members list
    // Algorithm: Rebuild list. If member existed, keep metadata. If new, init metadata.
    const currentMemberMap = new Map();
    group.members.forEach(m => {
      if (m.userId) {
        currentMemberMap.set(m.userId.toString(), m);
      }
    });

    const updatedMembers = [];
    const processedIds = new Set();

    // 1. Add selected members
    memberIds.forEach(id => {
      if (!processedIds.has(id)) {
        if (currentMemberMap.has(id)) {
          // Keep existing
          updatedMembers.push(currentMemberMap.get(id));
        } else {
          // Add new
          updatedMembers.push({
            userId: id,
            joinedAt: new Date(),
            unreadCount: 0,
            lastReadAt: new Date(),
            isMuted: false
          });
        }
        processedIds.add(id);
      }
    });

    // 2. Ensure Admin (Current User) is always in the group
    if (!processedIds.has(req.user.id)) {
      if (currentMemberMap.has(req.user.id)) {
        updatedMembers.push(currentMemberMap.get(req.user.id));
      } else {
        updatedMembers.push({
          userId: req.user.id,
          joinedAt: new Date(),
          unreadCount: 0,
          lastReadAt: new Date(),
          isMuted: false
        });
      }
      processedIds.add(req.user.id);
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        name,
        description,
        profilePhoto,
        members: updatedMembers,
        lastActivity: new Date()
      },
      { new: true }
    ).populate("members.userId", "name profile.name profile.avatar email role isOnline lastSeen")
      .populate("createdBy", "name profile.name");

    // Filter nulls just in case
    if (updatedGroup.members) {
      updatedGroup.members = updatedGroup.members.filter(m => m.userId);
    }

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

    // Create a system message
    const user = await User.findById(req.user.id).select("profile.name");
    const userName = user?.profile?.name || "A member";

    const systemMessage = await Message.create({
      groupId,
      senderId: req.user.id, // Current user is still technically the "trigger"
      messageText: `${userName} has left the group`,
      messageType: "system"
    });

    const populatedMessage = await Message.findById(systemMessage._id)
      .populate("senderId", "name profile.name profile.avatar role");

    // Emit real-time updates and notifications to remaining group members
    const io = req.app.get("io");

    // Find updated group to get current members and send notifications
    const updatedGroup = await Group.findById(groupId);
    if (updatedGroup) {
      // Increment unread counts for remaining members
      await Group.updateMany(
        {
          _id: groupId,
          "members.userId": { $ne: req.user.id }
        },
        {
          $inc: { "members.$.unreadCount": 1 }
        }
      );

      updatedGroup.members.forEach(member => {
        // Skip the person who just left
        if (member.userId.toString() !== req.user.id) {
          if (io) {
            io.to(member.userId.toString()).emit("group_message", populatedMessage);
            io.to(member.userId.toString()).emit("unread_count_update", {
              type: "group",
              groupId: groupId,
              count: (member.unreadCount || 0) + 1
            });
          }

          // Send Push Notification
          sendPushNotification(
            member.userId,
            group.name,
            `${userName} has left the group`,
            {
              type: "group_chat",
              groupId: groupId,
              groupName: group.name
            }
          );
        }
      });
    }

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