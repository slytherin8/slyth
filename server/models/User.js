const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,                // ✅ NEW
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "employee"] },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }
});

module.exports = mongoose.model("User", userSchema);
