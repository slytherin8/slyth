const mongoose = require("mongoose");
require("dotenv").config();
const Group = require("./models/Group");

async function checkGroup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const groupId = "6991bc370017816837ce3a1b";
        const group = await Group.findById(groupId);

        if (group) {
            console.log("GROUP FOUND:");
            console.log(JSON.stringify(group, null, 2));
        } else {
            console.log("GROUP NOT FOUND in DB");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkGroup();
