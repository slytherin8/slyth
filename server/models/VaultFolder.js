const mongoose = require("mongoose");

const vaultFolderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VaultFolder",
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("VaultFolder", vaultFolderSchema);
