const jwt = require("jsonwebtoken");

const signToken = async (user) => {
  return jwt.sign(
    { email: user.email, profileId: user.profileId, displayName: user.displayName },
    process.env.JWT_SECRET,
    {}
  );
};

module.exports.signToken = signToken;
