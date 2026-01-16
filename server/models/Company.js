const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: { type: String, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

module.exports = mongoose.model("Company", companySchema);
