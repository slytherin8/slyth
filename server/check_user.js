const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const userId = "698d724720ed86f93786f650"; // Creator of the group
        const user = await User.findById(userId);

        if (user) {
            console.log("USER FOUND:");
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log("USER NOT FOUND in DB");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
