const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function checkCompanyUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Get all companies and their users
        const companies = await User.aggregate([
            {
                $group: {
                    _id: "$companyId",
                    users: {
                        $push: {
                            email: "$email",
                            role: "$role",
                            name: "$profile.name",
                            id: "$_id"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        console.log("\n=== COMPANIES AND THEIR USERS ===");
        companies.forEach((company, index) => {
            console.log(`\nCompany ${index + 1} (ID: ${company._id}):`);
            console.log(`Total users: ${company.count}`);
            
            const admins = company.users.filter(u => u.role === 'admin');
            const employees = company.users.filter(u => u.role === 'employee');
            
            console.log(`Admins: ${admins.length}`);
            admins.forEach(admin => {
                console.log(`  - ${admin.name || admin.email} (${admin.role})`);
            });
            
            console.log(`Employees: ${employees.length}`);
            employees.forEach(emp => {
                console.log(`  - ${emp.name || emp.email} (${emp.role})`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCompanyUsers();