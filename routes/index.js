var express = require("express");
const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { toUtf8 } = require("@cosmjs/encoding");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { faucetTokens } = require("./utils");

// const socket = require('../bin/socketio')

function fetchTodos(req, res, next) {
  res.user = req.user;
  next();
}

var router = express.Router();

/* GET home page. */
router.get(
  "/",
  function (req, res, next) {
    if (!req.user) {
      return res.render("home");
    }
    next();
  },
  fetchTodos,
  async function (req, res, next) {
    const privateKey = toUtf8(req.user.privateKey);
    const wallet = await DirectSecp256k1Wallet.fromKey(
      privateKey,
      process.env.CHAIN_PREFIX ?? "juno"
    );
    let account = await wallet.getAccounts().then((res) => {
      return res[0]?.address;
    });
    const cookie = req.cookies["jwt"];
    res.render("index", { user: req.user, account, cookie });
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.post("/verify-token", async function (req, res, next) {
  if (!req.body.cookie) {
    res.send("Cookie param not found");
    return;
  }
  try {
    const decoded = jwt.verify(req.body.cookie, process.env.JWT_SECRET);
    if (decoded.email && decoded.profileId) {
      let exist = await User.findOne({ email: decoded.email });
      if (exist) {
        res.setHeader("form-response", "");
        res.send(true);
        return;
      }
    }
  } catch (e) {
    res.send(false);
  }
});

router.get("/authenticated", (req, res) => {
  return res.send(req.isAuthenticated());
});

router.get("/get-faucet", async (req, res) => {
  const { address } = req.query;
  const user = await User.findOne({ walletAddress: address, channel: "sms" });
  if (!user) {
    return res.status("200").send("1");
  }
  return res.status("200").send(`${Number(user.faucet) ?? 1}`);
});

router.post("/faucet-tokens", async (req, res) => {
  let result = await faucetTokens(req.body.address);
  res.send(result);
});

module.exports = router;
