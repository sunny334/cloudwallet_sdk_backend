const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { toUtf8 } = require("@cosmjs/encoding");
const { User } = require("../models/User");
const { logger } = require("../bin/winstonLogger");

const generateKey = async (profile, provider = "google") => {
  try {
    let email = "";
    let exist = false;
    let obj = {};
    if (provider === "sms") {
      const profileId = profile.id;
      exist = await User.findOne({ profileId, provider });
      obj = { countryCode: profile.countryCode, phone: profile.phone };
    }
    if (provider === "basic-auth") {
      const profileId = profile.email;
      exist = await User.findOne({ profileId, provider });
      email = profile.email;
    } else {
      email = profile.emails[0].value;
      exist = await User.findOne({ email, provider });
    }
    if (!exist) {
      let randLength = (33 - profile.id.length).toString();
      let rand = Math.floor(Math.random() * "1".padEnd(randLength, "0"));
      if (`${profile.id + rand}`.length < 32) {
        randLength = (33 - profile.id.length).toString();
        rand = Math.floor(Math.random() * "1".padEnd(randLength, "0"));
      }
      const privateKey = toUtf8(profile.id + rand);
      const wallet = await DirectSecp256k1Wallet.fromKey(
        privateKey,
        process.env.CHAIN_PREFIX ?? "juno"
      );
      let account = await wallet.getAccounts().then((res) => {
        return res[0]?.address;
      });
      let user = new User({
        ...obj,
        email: email,
        salt: rand,
        displayName: profile?.displayName,
        walletAddress: account,
        provider,
      });
      user = await user.save();
      user["wallet"] = wallet;
      user["privateKey"] = profile.id + rand;
      /**
       * Faucet tokens
       */
      // await axios
      //     .post(process.env.FAUCET_URL + "/api/faucet", {
      //         receipent: account,
      //     })
      //     .catch((e) => console.error(e));

      return user;
    } else {
      const privateKey = toUtf8(profile.id + exist.salt);
      const wallet = await DirectSecp256k1Wallet.fromKey(
        privateKey,
        process.env.CHAIN_PREFIX ?? "juno"
      );
      exist["wallet"] = wallet;
      exist["privateKey"] = profile.id + exist.salt;
      exist["profileId"] = profile.id;
      exist["email"] = email;
      return exist;
    }
  } catch (e) {
    logger(e.message);
    console.error("error while generating token", e.message);
    return undefined;
  }
};

module.exports.generateKey = generateKey;
