const express = require("express");
const router = express.Router();
const { auth, adminOnly } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../utils/notificationHelper");
const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");

// Real-time helper
const emitUpdate = (req, employeeId, type, data) => {
    const io = req.app.get("io");
    if (io) {
        io.to(employeeId.toString()).emit("work_update", { type, data });
        // Also notify admins of changes if needed, but for now focus on employee-admin sync
        io.emit("admin_work_update", { employeeId, type, data });
    }
};

/* =====================
   PROJECT ROUTES
===================== */

// Create Project (Admin Only)
router.post("/projects", auth, adminOnly, async (req, res) => {
    try {
        const { name, description, employeeId } = req.body;

        if (!name || !employeeId) {
            return res.status(400).json({ message: "Name and employee ID are required" });
        }

        const project = await Project.create({
            name,
            employeeId,
            companyId: req.user.companyId,
            createdBy: req.user.id
        });

        emitUpdate(req, employeeId, "PROJECT_CREATED", project);

        // Notify Employee
        sendPushNotification(
            employeeId,
            "New Work Assigned",
            `A new project "${name}" has been assigned to you.`,
            { type: "work_assigned" }
        );

        res.status(201).json(project);
    } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Failed to create project" });
    }
});

// Delete Project (Admin Only)
router.delete("/projects/:projectId", auth, adminOnly, async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        await Project.findByIdAndDelete(projectId);
        // Also delete tasks associated with this project
        await Task.deleteMany({ projectId });

        emitUpdate(req, project.employeeId, "PROJECT_DELETED", { projectId });
        res.json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Delete project error:", error);
        res.status(500).json({ message: "Failed to delete project" });
    }
});

// Get projects for an employee (Used by both admin and employee)
router.get("/projects/:employeeId", auth, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Check if user has access (either the employee themselves or an admin)
        if (req.user.role !== "admin" && req.user.id !== employeeId) {
            return res.status(403).json({ message: "Access denied" });
        }

        const projects = await Project.find({
            employeeId,
            companyId: req.user.companyId,
            isActive: true
        }).sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        console.error("Get projects error:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
    }
});

/* =====================
   TASK ROUTES
===================== */

// Create Task (Admin Only)
router.post("/tasks", auth, adminOnly, async (req, res) => {
    try {
        const { title, projectId, employeeId } = req.body;

        if (!title || !projectId || !employeeId) {
            return res.status(400).json({ message: "Title, project, and employee are required" });
        }

        const task = await Task.create({
            title,
            projectId,
            employeeId,
            companyId: req.user.companyId,
            status: "Pending"
        });

        emitUpdate(req, employeeId, "TASK_CREATED", task);

        // Notify Employee
        sendPushNotification(
            employeeId,
            "New Task Assigned",
            `task: "${title}"`,
            { type: "work_assigned" }
        );

        res.status(201).json(task);
    } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({ message: "Failed to create task" });
    }
});

// Get tasks for a project
router.get("/tasks/:projectId", auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        const tasks = await Task.find({
            projectId,
            companyId: req.user.companyId
        }).sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error("Get tasks error:", error);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
});

// Update Task (Both)
router.put("/tasks/:taskId", auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, title } = req.body;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Validate access
        if (req.user.role !== "admin" && req.user.id !== task.employeeId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (status) task.status = status;
        if (title && (req.user.role || "").toLowerCase() === "admin") task.title = title;

        await task.save();

        emitUpdate(req, task.employeeId, "TASK_UPDATED", task);

        // If employee updated status, notify admin
        if (req.user.role === "employee" && status) {
            // Get the admin who created the project
            const project = await Project.findById(task.projectId);
            if (project && project.createdBy) {
                const employeeName = req.user.name || "Employee";
                sendPushNotification(
                    project.createdBy,
                    "Work Status Updated",
                    `${employeeName} marked "${task.title}" as ${status}`,
                    { type: "work_updated" }
                );
            }
        }

        res.json(task);
    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({ message: "Failed to update task" });
    }
});

// Delete Task (Admin Only)
router.delete("/tasks/:taskId", auth, adminOnly, async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);

        if (!task) return res.status(404).json({ message: "Task not found" });

        await Task.findByIdAndDelete(taskId);

        emitUpdate(req, task.employeeId, "TASK_DELETED", { taskId });
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({ message: "Failed to delete task" });
    }
});

module.exports = router;
