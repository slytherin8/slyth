const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const DirectMessage = require("./models/DirectMessage");

async function testConversations() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Test with admin user
        const adminUser = await User.findOne({ role: 'admin' });
        console.log("\n=== TESTING WITH ADMIN USER ===");
        console.log("Admin user:", adminUser.email, "Role:", adminUser.role);
        console.log("Company ID:", adminUser.companyId);

        // Admin filter - should only show employees
        let adminFilter = {
            companyId: adminUser.companyId,
            _id: { $ne: adminUser._id },
            role: 'employee'
        };

        const employeesForAdmin = await User.find(adminFilter)
            .select("profile.name profile.avatar role email");
        
        console.log("Employees visible to admin:", employeesForAdmin.length);
        employeesForAdmin.forEach(emp => {
            console.log(`- ${emp.profile?.name || emp.email} (${emp.role})`);
        });

        // Test with employee user
        const employeeUser = await User.findOne({ role: 'employee' });
        console.log("\n=== TESTING WITH EMPLOYEE USER ===");
        console.log("Employee user:", employeeUser.email, "Role:", employeeUser.role);
        console.log("Company ID:", employeeUser.companyId);

        // Employee filter - should show admin and other employees
        let employeeFilter = {
            companyId: employeeUser.companyId,
            _id: { $ne: employeeUser._id }
        };

        const usersForEmployee = await User.find(employeeFilter)
            .select("profile.name profile.avatar role email");
        
        console.log("Users visible to employee:", usersForEmployee.length);
        usersForEmployee.forEach(user => {
            console.log(`- ${user.profile?.name || user.email} (${user.role})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testConversations();