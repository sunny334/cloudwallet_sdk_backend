var express = require("express");
require("../db")();
const {generateKey} = require("./utils");
const {signToken} = require("../auth/utils");
const {logger} = require("../bin/winstonLogger");
const {toUtf8} = require("@cosmjs/encoding");
const {DirectSecp256k1Wallet} = require("@cosmjs/proto-signing");

const {TWILIO_SERVICE_SID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN} = process.env;

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    {
        lazyLoading: true
    })

var router = express.Router();
router.get("/sms", async function (req, res) {
    try {
        res.render("sms/sms");
    } catch (e) {
        logger(e.message);
    }
});
router.get("/sms-otp", async function (req, res) {
    try {
        const {countryCode, phoneNumber} = req.query;
        await client.verify.v2.services(TWILIO_SERVICE_SID)
            .verifications.create({
                to: `+${countryCode}${phoneNumber}`, channel: 'sms'
            });
        res.render("sms/otp", {countryCode, phoneNumber});
    } catch (e) {
        res.render("sms/sms");
    }
});
// router.post("/send-otp", async function (req, res, next) {
//     const {countryCode, phoneNumber, otp} = req.query;
//     try {
//         const otpResponse = await client.verify.v2.services(TWILIO_SERVICE_SID)
//             .verifications.create({
//                 to: `+${countryCode}${phoneNumber}`, channel: 'sms'
//             });
//         res.status(200).send(`OTP send successfully!: ${JSON.stringify(otpResponse)}`);
//     } catch (error) {
//         res.status(error?.status || 400).send(error?.message || 'Something went wrong!');
//     }
// });

router.get("/verify-otp", async function (req, res, next) {
    const {countryCode, phoneNumber, otp} = req.query;
    try {
        const phone = `${countryCode}${phoneNumber}`;
        await client.verify.services(TWILIO_SERVICE_SID)
            .verificationChecks.create({
                to: `+${phone}`, code: otp
            });
        const profile = {
            id: phone,
            phone,
            countryCode
        }
        const row = await generateKey(profile, 'sms');

        if (!row) {
            res.status(error?.status || 400).send(error?.message || 'Something went wrong!');
        } else {
            const user = {
                id: row.id,
                email: '',
                profileId: row.phone,
                displayName: row.displayName,
                wallet: row.wallet,
                salt: row.salt,
                privateKey: row.privateKey,
            };
            const token = await signToken(user);
            res
                .cookie("jwt", token, {
                    httpOnly: true,
                });
            const privateKey = toUtf8(row.privateKey);
            const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, "juno");
            let account = await wallet.getAccounts().then((res) => {
                return res[0]?.address;
            });
            const cookie = token;
            return res.render("index", {user: user, account, cookie});
        }
    } catch
        (error) {
        logger(error.message);
        res.status(error?.status || 400).send(error?.message || 'Something went wrong!');
    }
})
;

module.exports = router;
