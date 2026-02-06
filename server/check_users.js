const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        const count = await User.countDocuments();
        console.log(`User count: ${count}`);
        const users = await User.find().select("email role");
        console.log("Users:", users);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
