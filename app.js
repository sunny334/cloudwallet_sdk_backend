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

// pass the session to the connect sqlite3 module
// allowing it to inherit from session.Store
// var SQLiteStore = require('connect-sqlite3')(session);

var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth");
var twitterRouter = require("./routes/twitter_auth");
// var fbRouter = require("./routes/fb_auth");
// var smsRouter = require("./routes/sms_auth");
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
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: "keyboard cat",
        resave: false, // don't save session if unmodified
        cookie: {maxAge: 20000, httpOnly: true, signed: true},
        saveUninitialized: false, // don't create session until something stored
        store: sessionStore,
    })
);
/**
 * Setup Logger
 * @type {WriteStream}
 */
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(logger('combined', {stream: accessLogStream}))

// app.use(csrf());
app.use(passport.authenticate("session"));
// app.use(function (req, res, next) {
//   var msgs = req.session.messages || [];
//   res.locals.messages = msgs;
//   res.locals.hasMessages = !!msgs.length;
//   req.session.messages = [];
//     res.send(false)
//   next();
// });
// app.use(function (req, res, next) {
//   // res.locals.csrfToken = req.csrfToken();
//   next();
// });

app.use("/", indexRouter);
app.use("/", authRouter);
app.use("/", twitterRouter);
// app.use("/", fbRouter);
// app.use("/", smsRouter);

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

module.exports = app;
