const { http } = require("./www");
const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

module.export = socketIO;
