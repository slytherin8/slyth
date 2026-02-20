const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Company = require("./models/Company");
const Group = require("./models/Group");

async function diagnostic() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({}).select("email companyId role");
        console.log("USERS:");
        users.forEach(u => console.log(`${u.email} (${u.role}): Company ${u.companyId}`));

        const groups = await Group.find({}).select("name companyId");
        console.log("\nGROUPS:");
        groups.forEach(g => console.log(`${g.name}: Company ${g.companyId} (ID: ${g._id})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diagnostic();
