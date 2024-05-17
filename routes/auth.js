var express = require("express");
var passport = require("passport");
var GoogleStrategy = require("passport-google-oidc");
require("../db")();
const {generateKey} = require("./utils");
const {signToken} = require("../auth/utils");

// Configure the Google strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
            callbackURL: process.env.SOCKET_URL + "/oauth2/redirect/google",
            scope: ["profile", "email", "openid"],
        },
        async function verify(issuer, profile, cb) {
            var row = await generateKey(profile);
            if (!row) {
                return cb(null, false);
            } else {
                return cb(null, {
                    id: row.id,
                    email: profile?.emails[0].value,
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

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
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

/* GET /login
 *
 * This route prompts the user to log in.
 *
 * The 'login' view renders an HTML page, which contain a button prompting the
 * user to sign in with Google.  When the user clicks this button, a request
 * will be sent to the `GET /login/federated/accounts.google.com` route.
 */
router.get("/login", function (req, res, next) {
    res.render("login");
});

/* GET /login/federated/accounts.google.com
 *
 * This route redirects the user to Google, where they will authenticate.
 *
 * Signing in with Google is implemented using OAuth 2.0.  This route initiates
 * an OAuth 2.0 flow by redirecting the user to Google's identity server at
 * 'https://accounts.google.com'.  Once there, Google will authenticate the user
 * and obtain their consent to release identity information to this app.
 *
 * Once Google has completed their interaction with the user, the user will be
 * redirected back to the app at `GET /oauth2/redirect/accounts.google.com`.
 */
router.get("/login/federated/google", passport.authenticate("google"));

/*
    This route completes the authentication sequence when Google redirects the
    user back to the application.  When a new user signs in, a user account is
    automatically created and their Google account is linked.  When an existing
    user returns, they are signed in to their linked account.
*/
router.get(
    "/oauth2/redirect/google",
    (req, res, next) => {
        passport.authenticate("google", (err, user, info) => {
            if (err) {
                // Handle error condition
                console.error("redirect error",err);
                logger(err);
                // throw err;
                return next(err); // Forward the error to the error handler
            }
            if (!user) {
                // Authentication failed
                return res.redirect("/login/federated/google");
            }
            // Authentication succeeded
            req.logIn(user, async (err) => {
                if (err) {
                    console.error("error-", err);
                    return next(err);
                }
                res.clearCookie("jwt");
                const token = await signToken(req.user);
                return res
                    .cookie("jwt", token, {
                        httpOnly: true,
                    })
                    .redirect("/");
            });
        })(req, res, next);
    },
    async (req, res) => {
        res.clearCookie("jwt");
        const token = await signToken(req.user);
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
