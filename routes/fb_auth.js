var express = require("express");
var passport = require("passport");
var FacebookStrategy = require("passport-facebook");
require("../db")();
const {generateKey} = require("./utils");
const {signToken} = require("../auth/utils");

passport.use(
    new FacebookStrategy({
            clientID: process.env["FB_CLIENT_ID"],
            clientSecret: process.env["FB_APP_SECRET"],
            callbackURL: process.env.SOCKET_URL + "/auth/facebook/callback",
            profileFields: ['id', 'displayName', 'email', 'profileUrl'],
        },
        async function (accessToken, refreshToken, profile, cb) {
            // console.log("fb profile", profile);
            var row = await generateKey(profile, 'fb');
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

router.get("/login/federated/facebook", passport.authenticate("facebook", {scope: ['email']}));

router.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", {
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
