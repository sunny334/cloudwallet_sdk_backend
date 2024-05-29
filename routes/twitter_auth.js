var express = require("express");
var passport = require("passport");
var TwitterStrategy = require("passport-twitter");
require("../db")();
const {generateKey} = require("./utils");
const {signToken} = require("../auth/utils");

passport.use(
    new TwitterStrategy({
            clientID: process.env["TWITTER_CLIENT_ID"],
            clientSecret: process.env["TWITTER_APP_SECRET"],
            callbackURL: process.env.SOCKET_URL + "/auth/twitter/callback",
            profileFields: ['id', 'displayName', 'email', 'profileUrl'],
        },
        async function (accessToken, refreshToken, profile, cb) {
            // console.log("twitter profile", profile);
            var row = await generateKey(profile, 'twitter');
            if (!row) {
                return cb(null, false);
            } else {
                return cb(null, {
                    id: row.id,
                    email: profile?.email,
                    profileId: profile.id,
                    displayName: row.displayName,
                    wallet: row.wallet,
                    salt: row.salt,
                    privateKey: row.privateKey,
                });
            }
        }
    )
);

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, user);
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

var router = express.Router();

router.get("/login", function (req, res, next) {
    res.render("login");
});

router.get("/login/federated/twitter", passport.authenticate("twitter", {scope: ['email']}));

router.get(
    "/auth/twitter/callback",
    passport.authenticate("twitter", {
        failureRedirect: "/login",
        scope: ['email']
    }),
    async (req, res) => {
        const token = await signToken(req.profile?.id ?? req.user?.profileId);
        return res
            .cookie("jwt", token, {
                httpOnly: true,
            })
            .redirect("/");
    }
);

/* POST /logout
 *
 * This route logs the user out.
 */
router.post("/logout", function (req, res, next) {
    req.logOut(
        {
            keepSessionInfo: false,
        },
        function (err) {
            if (err) {
                return next(err);
            }
            res.redirect(process.env.FRONTEND_URL);
        }
    );
});

module.exports = router;
