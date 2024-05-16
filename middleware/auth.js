const fs = require("fs");

const key = require("../key.js");

module.exports = function auth(req, res, next) {
  const token = req.header("auth-token");
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    if (token != key) {
      return res.status(401).send("Invalid Token.");
    }
    next();
  } catch (ex) {
    res.status(400).send(ex);
  }
};
