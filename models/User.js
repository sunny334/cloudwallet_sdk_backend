const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    unique: false,
  },
  salt: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
  },
  countryCode: {
    type: String
  },
  phone: {
    type: String
  },
  provider: {
    type: String,
  },
  walletAddress: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

module.exports.User = User;
