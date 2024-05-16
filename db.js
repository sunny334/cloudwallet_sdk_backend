const mongoose = require("mongoose");
module.exports = function () {
  mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error: "));
  db.once("open", function () {
    console.log("######### Connected successfully ###########");
  });
};
