var express = require("express");
var router = express.Router();
require("dotenv").config();

//import des models de la base de données
var exerciceModel = require("../models/exercices");
var roomModel = require("../models/rooms");
var sessionModel = require("../models/sessions");
var userModel = require("../models/users");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

module.exports = router;
