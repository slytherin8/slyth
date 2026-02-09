import api from "./api";
import { io } from "socket.io-client";
import { Platform } from "react-native";
import { API } from "../constants/api";

const socket = io(API); // Use centralized API configuration

export const workService = {
    // Auth/Users
    getEmployees: async () => {
        const res = await api.get("/auth/employees");
        return res.data;
    },

    // Connect to user room
    joinRoom: (userId) => {
        socket.emit("join_room", userId);
    },

    // Projects
    createProject: async (projectData) => {
        const res = await api.post("/work/projects", projectData);
        return res.data;
    },

    getEmployeeProjects: async (employeeId) => {
        const res = await api.get(`/work/projects/${employeeId}`);
        return res.data;
    },

    deleteProject: async (projectId) => {
        const res = await api.delete(`/work/projects/${projectId}`);
        return res.data;
    },

    // Tasks
    createTask: async (taskData) => {
        const res = await api.post("/work/tasks", taskData);
        return res.data;
    },

    getProjectTasks: async (projectId) => {
        const res = await api.get(`/work/tasks/${projectId}`);
        return res.data;
    },

    updateTask: async (taskId, updateData) => {
        const res = await api.put(`/work/tasks/${taskId}`, updateData);
        return res.data;
    },

    deleteTask: async (taskId) => {
        const res = await api.delete(`/work/tasks/${taskId}`);
        return res.data;
    },

    deleteEmployee: async (employeeId) => {
        const res = await api.delete(`/auth/employees/${employeeId}`);
        return res.data;
    },

    // Socket listeners
    onWorkUpdate: (callback) => {
        socket.on("work_update", callback);
        return () => socket.off("work_update", callback);
    },

    onAdminWorkUpdate: (callback) => {
        socket.on("admin_work_update", callback);
        return () => socket.off("admin_work_update", callback);
    }
};
