const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { toUtf8 } = require("@cosmjs/encoding");
const { User } = require("../models/User");
const { Faucet } = require("../models/Faucet");
const { logger } = require("../bin/winstonLogger");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { calculateFee, GasPrice, coin } = require("@cosmjs/stargate");
const { Config } = require("../models/Config");
const { getConfig } = require("../routes/config");
const { cli } = require("winston/lib/winston/config");

const generateKey = async (profile, provider = "google") => {
  try {
    let email = "";
    let exist = false;
    let obj = {};
    if (provider === "sms") {
      exist = await User.findOne({ phone: profile.phone, provider });
      obj = { countryCode: profile.countryCode, phone: profile.phone };
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
      await faucet(account);
      console.log("faucet");
      // await premint();
      // console.log("premint")
      // await mintByOwner(account);
      // console.log("mintByOwner")
      // const pack_id = await userPacks(account);
      // console.log("userPacks", pack_id)
      // await openPack(wallet, account, pack_id ?? "");
      // console.log("done")
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
    return undefined;
  }
};

/**
 * Step 1
 * @param wallet
 * @return {Promise<DeliverTxResponse>}
 */
const faucet = async function (wallet = "") {
  const { client, sender } = await initClient();
  const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
  const txFee = calculateFee(2000000, gasPrice);

  const tx = await client.sendTokens(
    sender,
    wallet,
    [coin("100000000", process.env.DENOM)],
    txFee,
    "faucet"
  );
  return tx;
};

/**
 * Step 2
 * @return {Promise<ExecuteResult>}
 */
const premint = async function () {
  const { client, sender } = await initClient();
  const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
  const txFee = calculateFee(2000000, gasPrice);

  let msg = {
    pre_mint_packs: {
      pack_name: "PACK",
      pack_level: 1,
    },
  };
  const config = await getConfig();
  const tx = await client.execute(
    sender,
    config.minter,
    msg,
    txFee,
    "Pre Mint Pack"
  );
  return tx;
};

/**
 * Step 3
 * @param string wallet
 * @return {Promise<ExecuteResult>}
 */

const mintByOwner = async function (wallet) {
  const { client, sender } = await initClient();
  const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
  const txFee = calculateFee(2000000, gasPrice);

  let msg = {
    mint_by_owner: {
      destination_addr: wallet,
      token_type: "PACK 1",
    },
  };
  const config = await getConfig();

  const tx = await client.execute(
    sender,
    config.minter,
    msg,
    txFee,
    "Mint By Owner"
  );
  return tx;
};
const userPacks = async function (wallet) {
  const { client } = await initClient();
  const config = await getConfig();

  const tx = await client.queryContractSmart(config.minter, {
    user_packs: { user: wallet },
  });

  return tx[0];
};

const userTests = async function (addr) {
  const { client } = await initClient();
  const config = await getConfig();

  const tx = await client.queryContractSmart(config.minter, {
    user_tests: { user: addr },
  });
  return tx;
};
/**
 * Step 4
 * @param client
 * @param sender
 * @param tokenId
 * @return {Promise<*>}
 */
const openPack = async function (client, sender, tokenId) {
  const { client: admin } = await initClient();
  const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
  const txFee = calculateFee(2000000, gasPrice);

  const walletClient = await SigningCosmWasmClient.connectWithSigner(
    process.env.RPC_URL,
    client
  );
  const configEnv = await getConfig();

  let msg = {
    send_nft: {
      contract: configEnv.minter,
      token_id: tokenId, //String
      msg: "eyJvcGVuX3BhY2siOnt9fQ==", //{"open_pack":{}}
    },
  };

  const config = await walletClient.queryContractSmart(configEnv.minter, {
    config: {},
  });

  const tx = await walletClient.execute(
    sender,
    config.nft_addr,
    msg,
    txFee,
    "Open Pack"
  );

  return tx;
};
const initClient = async function () {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    process.env.MNEMONIC,
    {
      prefix: process.env.CHAIN_PREFIX,
    }
  );
  let sender = await wallet.getAccounts().then((res) => {
    return res[0]?.address;
  });

  const client = await SigningCosmWasmClient.connectWithSigner(
    process.env.RPC_URL,
    wallet
  );

  return { client, sender };
};

const faucetTokens = async (address) => {
  const { client, sender } = await initClient();
  exist = await Faucet.findOne({ address });
  if (!exist) {
    let faucet = new Faucet({
      address: address,
      createdAt: Date.now(),
    });
    const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
    const txFee = calculateFee(2000000, gasPrice);
    const tx = await client.sendTokens(
      sender,
      address,
      [coin("20000000", process.env.DENOM)],
      txFee,
      "faucet"
    );
    await faucet.save();
    return {
      status: 200,
      msg: "Token Faucet 👍",
    };
  } else {
    if (Date.now() - exist.createdAt >= 21600000) {
      const gasPrice = GasPrice.fromString(`0.03${process.env.DENOM}`);
      const txFee = calculateFee(2000000, gasPrice);
      const tx = await client.sendTokens(
        sender,
        address,
        [coin("20000000", process.env.DENOM)],
        txFee,
        "faucet"
      );
      exist.createdAt = Date.now();
      await exist.save();
      return {
        status: 200,
        msg: "Token Faucet 👍",
      };
    } else {
      remainingSec = Math.floor(
        (exist.createdAt + 21600000 - Date.now()) / 1000
      );
      const hours = Math.floor((remainingSec % 86400) / 3600);
      const minutes = Math.floor(((remainingSec % 86400) % 3600) / 60);
      const secs = Math.floor(((remainingSec % 86400) % 3600) % 60);
      return {
        status: 401,
        msg: `Wait For ${hours}H ${minutes}m ${secs}s 🕒`,
      };
    }
  }
};

module.exports.generateKey = generateKey;
module.exports.faucet = faucet;
module.exports.premint = premint;
module.exports.mintByOwner = mintByOwner;
module.exports.userPacks = userPacks;
module.exports.openPack = openPack;
module.exports.userTests = userTests;
module.exports.faucetTokens = faucetTokens;
