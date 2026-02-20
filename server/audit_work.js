const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");

async function auditWork() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const projects = await Project.find({}).populate("employeeId", "email").populate("createdBy", "email");
        console.log(`\nTOTAL PROJECTS: ${projects.length}`);
        projects.forEach(p => {
            console.log(`Project: "${p.name}" (ID: ${p._id})`);
            console.log(`  - Employee: ${p.employeeId?.email || 'MISSING'} (${p.employeeId?._id})`);
            console.log(`  - Creator: ${p.createdBy?.email || 'MISSING'}`);
            console.log(`  - Company: ${p.companyId}`);
            console.log(`  - Active: ${p.isActive}`);
        });

        const tasks = await Task.find({});
        console.log(`\nTOTAL TASKS: ${tasks.length}`);
        tasks.forEach(t => {
            console.log(`Task: "${t.title}" (ID: ${t._id})`);
            console.log(`  - ProjectID: ${t.projectId}`);
            console.log(`  - EmployeeID: ${t.employeeId}`);
            console.log(`  - CompanyID: ${t.companyId}`);
            console.log(`  - Status: ${t.status}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditWork();
