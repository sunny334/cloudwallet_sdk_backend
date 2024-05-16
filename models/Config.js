const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  minter: {
    type: String,
    },

});

const Config = mongoose.model("Config", configSchema);

module.exports.Config = Config;
