const mongoose = require("mongoose");

const faucetSchema = new mongoose.Schema({
  address: {
    type: String,
  },
  createdAt: {
    type: Number,
  },
});

const Faucet = mongoose.model("Faucet", faucetSchema);

module.exports.Faucet = Faucet;
