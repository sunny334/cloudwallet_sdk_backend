var express = require("express");
require("../db")();
const { generateKey } = require("./utils");
const { signToken } = require("../auth/utils");
const { logger } = require("../bin/winstonLogger");
const { toUtf8 } = require("@cosmjs/encoding");
const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { default: axios } = require("axios");

var router = express.Router();
router.get("/register", async function (req, res) {
  try {
    res.render("basic-auth/register");
  } catch (e) {
    logger(e.message);
  }
});

router.get("/auth", async function (req, res) {
  try {
    res.render("basic-auth/login");
  } catch (e) {
    logger(e.message);
  }
});

router.get("/forget", async function (req, res) {
  try {
    res.render(`basic-auth/forget`);
  } catch (e) {
    logger(e.message);
  }
});

router.get("/reset/:id", async function (req, res) {
  try {
    const id = req.params.id;
    res.render(`basic-auth/reset-password`, { id });
  } catch (e) {
    logger(e.message);
  }
});

router.get("/verify-user/:id", async function (req, res, next) {
  try {
    let profile = await axios.get(
      `https://cloud-wallet-basic-auth.cosmichub.store/user/get-user/${req.params.id}`
    );

    console.log("Profile", profile.data);

    profile = {
      email: profile.data.email,
      id: profile.data.hash,
    };

    const row = await generateKey(profile, "basic-auth");

    if (!row) {
      res
        .status(error?.status || 400)
        .send(error?.message || "Something went wrong!");
    } else {
      const user = {
        id: row.id,
        email: row.email,
        profileId: row.phone,
        displayName: row.displayName,
        wallet: row.wallet,
        salt: row.salt,
        privateKey: row.privateKey,
        provider: row.provider,
      };
      const token = await signToken(user);
      res.cookie("jwt", token, {
        httpOnly: true,
      });
      const privateKey = toUtf8(row.privateKey);
      const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, "loop");
      let account = await wallet.getAccounts().then((res) => {
        return res[0]?.address;
      });
      const cookie = token;
      return res.render("index", { user: user, account, cookie });
    }
  } catch (error) {
    logger(error.message);
    res
      .status(error?.status || 400)
      .send(error?.message || "Something went wrong!");
  }
});

module.exports = router;
