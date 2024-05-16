var express = require("express");
require("../db")();
const { generateKey, userTests } = require("./utils");
const { signToken } = require("../auth/utils");
const { logger } = require("../bin/winstonLogger");
const { toUtf8 } = require("@cosmjs/encoding");
const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const {
  faucet,
  premint,
  mintByOwner,
  userPacks,
  openPack,
} = require("./utils");

const auth = require("../middleware/auth");

const { User } = require("../models/User");

const { TWILIO_SERVICE_SID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } =
  process.env;

const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
  lazyLoading: true,
});

var router = express.Router();

/**
 * Faucet nfts
 */
router.get("/faucet", auth, async function (req, res) {
  const { address } = req.query;
  if (!address) {
    return res.json({ error: "Provide the address!" });
  }
  const user = await User.findOne({ walletAddress: address, provider: "sms" });
  if (!user) {
    return res.json({ error: "User Not Found!" });
  }
  if (user.faucet) {
    return res.json({ error: "Already Faucet!" });
  }
  const privateKey = toUtf8(user.phone + user.salt);
  const wallet = await DirectSecp256k1Wallet.fromKey(
    privateKey,
    process.env.CHAIN_PREFIX ?? "juno"
  );
  let account = await wallet.getAccounts().then((res) => {
    return res[0]?.address;
  });
  // await faucet(account);
  // console.log("faucet", account)
  await premint();
  console.log("premint");
  await mintByOwner(account);
  console.log("mintByOwner");
  const pack_id = await userPacks(account);
  console.log("userPacks", pack_id);
  await openPack(wallet, account, pack_id ?? "");
  console.log("open back");
  const tests = await userTests(account);
  console.log("done", tests);

  user.faucet = true;
  await user.save();
  return res.json({ success: "Successfully faucet" });
});
router.get("/sms-otp", auth, async function (req, res) {
  try {
    const { countryCode, phoneNumber, channel } = req.query;

    if (!countryCode || !phoneNumber || !channel) {
      return res.json({ error: "All fields are Required " });
    }

    await client.verify.v2.services(TWILIO_SERVICE_SID).verifications.create({
      to: `+${countryCode}${phoneNumber}`,
      channel: channel ?? "sms",
    });
    res.json({
      message: "OTP sent!",
      statusCode: 200,
    });
    return true;
  } catch (e) {
    res.json({
      message: "Something went wrong!",
      statusCode: 403,
    });
    return true;
  }
});

router.get("/verify-otp", auth, async function (req, res, next) {
  const { countryCode, phoneNumber, otp, channel } = req.query;

  if (!countryCode || !phoneNumber || !otp || !channel) {
    return res.json({ error: "All fields are Required " });
  }
  try {
    const phone = `${countryCode}${phoneNumber}`;
    const verify = await client.verify.v2
      .services(TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: `+${phone}`,
        code: otp,
      });

    if (!verify.valid) {
      res.json({
        message: "Invalid OTP",
        statusCode: 403,
      });
      return;
      // return res.render("sms/otp", {countryCode, phoneNumber,error: "Invalid OTP", channel, action: `/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`});
      // return res.redirect(`/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`);
    }
    const profile = {
      id: phone,
      phone,
      countryCode,
    };
    const row = await generateKey(profile, "sms");

    if (!row) {
      res.json({
        message: "Something went wrong!",
        statusCode: 403,
      });
    } else {
      const user = {
        id: row.id,
        email: "",
        profileId: row.phone,
        displayName: row.displayName,
        wallet: row.wallet,
        salt: row.salt,
        privateKey: row.privateKey,
      };
      const token = await signToken(user);
      res.cookie("jwt", token, {
        httpOnly: true,
      });
      const privateKey = toUtf8(row.privateKey);
      const wallet = await DirectSecp256k1Wallet.fromKey(
        privateKey,
        process.env.CHAIN_PREFIX ?? "juno"
      );
      let account = await wallet.getAccounts().then((res) => {
        return res[0]?.address;
      });
      res.json({
        message: "Success",
        statusCode: 200,
        data: {
          address: account,
        },
      });
      // return res.render("index", {user: user, account, cookie});
    }
  } catch (error) {
    logger(error.message);
    res.json({
      message: error.message,
      statusCode: 403,
    });
    // return res.render("sms/otp", { error: error.message});
  }
});

router.post("/verify-otp", auth, async function (req, res, next) {
  const { countryCode, phoneNumber, otp, channel } = req.body;

  if (!countryCode || !phoneNumber || otp || !channel) {
    return res.json({ error: "All fields are Required " });
  }

  try {
    const phone = `${countryCode}${phoneNumber}`;
    const verify = await client.verify.v2
      .services(TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: `+${phone}`,
        code: otp,
      });

    if (!verify.valid) {
      return res.json({
        countryCode,
        phoneNumber,
        error: "Invalid OTP",
        channel,
        action: `/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`,
      });
      // return res.render("sms/otp", {countryCode, phoneNumber,error: "Invalid OTP", channel, action: `/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`});
      // return res.redirect(`/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`);
    }
    const profile = {
      id: phone,
      phone,
      countryCode,
    };
    const row = await generateKey(profile, "sms");

    if (!row) {
      return res.json({ error: "Something went wrong!" });
    } else {
      const user = {
        id: row.id,
        email: "",
        profileId: row.phone,
        displayName: row.displayName,
        wallet: row.wallet,
        salt: row.salt,
        privateKey: row.privateKey,
      };
      const token = await signToken(user);
      res.cookie("jwt", token, {
        httpOnly: true,
      });
      const privateKey = toUtf8(row.privateKey);
      const wallet = await DirectSecp256k1Wallet.fromKey(
        privateKey,
        process.env.CHAIN_PREFIX ?? "juno"
      );
      let account = await wallet.getAccounts().then((res) => {
        return res[0]?.address;
      });
      const cookie = token;
      return res.json({ address: account, cookie });
    }
  } catch (error) {
    logger(error.message);
    return res.json({
      error: error.message,
      action: `/sms-otp?channel=${channel}&countryCode=${countryCode}&phoneNumber=${phoneNumber}`,
    });
    // return res.render("sms/otp", { error: error.message});
  }
});

module.exports = router;
