import { Platform } from "react-native";
import AsyncStorage from '../utils/storage';
import { API } from '../constants/api';

class ChatService {
  async getAuthHeaders() {
    const token = await AsyncStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  }

  // Create group (Admin only)
  async createGroup(groupData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups`, {
        method: "POST",
        headers,
        body: JSON.stringify(groupData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get user's groups
  async getUserGroups() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get group messages
  async getGroupMessages(groupId, page = 1) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}/messages?page=${page}`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Send message
  async sendMessage(groupId, messageData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(messageData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get employees for group creation
  async getEmployees() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/employees`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get group details
  async getGroupDetails(groupId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API}/api/chat/groups/${groupId}`, {
        method: "GET",
        headers
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      throw error;
    }
  }
}

export default new ChatService();