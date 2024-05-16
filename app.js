require("dotenv").config();
var MongoStore = require("connect-mongo");
var fs = require('fs')

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var session = require("express-session");
// var csrf = require("csurf");
var passport = require("passport");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var smsRouter = require("./routes/sms_auth");
var apiSMSRouter = require("./routes/api_sms_auth");
var configRouter = require("./routes/config");
const cors = require("cors");
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URL,
  ttl: 20000,
});
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.locals.pluralize = require("pluralize");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "keyboard cat",
    resave: false, // don't save session if unmodified
    cookie: { maxAge: 20000, httpOnly: true, signed: true },
    saveUninitialized: false, // don't create session until something stored
    store: sessionStore,
  })
);
/**
 * Setup Logger
 * @type {WriteStream}
 */
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(logger('combined', { stream: accessLogStream }))

// app.use(csrf());
app.use(passport.authenticate("session"));
var port = normalizePort(process.env.PORT || "3001");

app.set("port", port);
app.use(cors());
app.use("/", indexRouter);
app.use("/", smsRouter);
app.use("/api/", apiSMSRouter);
app.use("/", configRouter.router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

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

module.exports = app;
