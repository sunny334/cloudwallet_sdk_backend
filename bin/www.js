#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("../app");
var debug = require("debug")("todos:server");
var https = require("http");
const cors = require("cors");
const {User} = require("../models/User");
const jwt = require("jsonwebtoken");
const socketIOs = require("socket.io");
// const socketIO = require("socket.io")(http, {
//   cert: fs.readFileSync('/home/ubuntu/wallet/wallet.crt'),
//   key: fs.readFileSync('/home/ubuntu/wallet/wallet.key'),
//   cors: {
//     origin: process.env.FRONTEND_URL,
//     methods: ["GET", "POST"],
//     credentials: true
//   }
// });
/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "3001");
console.log("port " + port)
app.options("*", cors());
// app.use(
//   cors({
//     origin: '*',
//   })
// );

/**
 * Create HTTP server.
 */
const options = {
    // key: fs.readFileSync('/home/ubuntu/wallet/wallet.key'),
    // cert: fs.readFileSync('/home/ubuntu/wallet/wallet.crt')
};
var server = https.createServer(options, app);

/**
 * Listen on provided port, on all network interfaces.
 */

// server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

const socketIO = socketIOs(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});
// socketIO.listen(process.env.SOCKET_PORT);
// console.log('socket running on port:', process.env.SOCKET_PORT)
global.io = socketIO;

socketIO.on("connection", (socket) => {
    console.log("connected")
    // listen for message from user
    socket.on("getToken", async (msg) => {
        let res = {};
        try {
            const decoded = jwt.verify(msg.cookie, process.env.JWT_SECRET);
            if (decoded.profileId && msg.id) {
                let exist = await User.findOne({phone: decoded.profileId, provider: 'sms'});
                if (exist) {
                    // const privateKey = toUtf8(msg.profileId + exist.salt);
                    const privateKey = decoded.profileId + exist.salt;
                    res = {token: privateKey, success: true, id: msg.id};
                }
            }
        } catch (e) {
            const res = {success: false};
        }
        socket.emit("getTokenRes", res);
    });

    // when server disconnects from user
    socket.on("disconnect", () => {
        console.log("disconnected from user");
    });
});

socketIO.on('connect_error', err => console.error("socket failed:", err))
socketIO.on('connect_failed', err => console.error("socket failed:", err))

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== "listen") {
        throw error;
    }

    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debug("Listening on " + bind);
}

server.listen(port, () => {
    console.log('Server listening on port ', port);
})

// if (server instanceof https.Server) {
//   console.log('SSL is enabled');
// } else {
//   console.log('SSL is not enabled');
// }

module.exports = server;
