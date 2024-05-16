var express = require("express");
var router = express.Router();
const {Config} = require("../models/Config");
async function getConfig (){
    return Config.findOne().select('-_id');
}

router.get("/config",async (req,res)=>{
    const config= await  getConfig()
    res.json(config ?? {});
})

module.exports.router = router;
module.exports.getConfig = getConfig;
