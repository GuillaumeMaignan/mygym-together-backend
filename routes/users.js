var express = require("express");
var router = express.Router();
// le cryptage et token et photo
var bcrypt = require("bcrypt");
var uid2 = require("uid2");
var fs = require("fs");
var uniqid = require("uniqid");

// Les modeles en import

var userModel = require("../models/users");
const roomModel = require("../models/rooms");
const { token } = require("morgan");
// Cloudinary
var cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "montitnuage",
  api_key: "436478287895226",
  api_secret: "RcWm96VUaFLAGZABOaXourH2z2Q",
});

var userModel = require("../models/users");
var sessionModel = require("../models/sessions");
/* GET users listing. */

// Route pour requêter les séances futures sur la homePage

router.post("/oncoming-sessions", async function (req, res, next) {
  // console.log("userId", req.body.userId);

  // récupère les infos de la collection user sur la base de l'Id
  var user = await userModel.findById(req.body.userId);
  // console.log(user.nextSession);

  // boucle sur la a collection Session pour récupérer les sessions futures (optimisables)
  var session = [];
  for (var i = 0; i < user.nextSession.length; i++) {
    oneSession = await sessionModel.findById(user.nextSession[i]);
    session.push(oneSession);
  }

  // console.log(session);

  res.json({ session });
});

// Ma route pour les room
router.get("/get-room", async function (req, res, next) {
  // var listRooms = await roomModel.aggregate([{ $unwind: { path: "$rooms" } }]);
  var listRooms = await roomModel.aggregate([
    { $group: { _id: "$nameBrand" } },
  ]);
  console.log("list room", listRooms);
  res.json(listRooms);
});
router.post("/sign-Up", async function (req, res, next) {
  var error = [];
  var result = false;
  var saveUser = null;
  var token = null;
  var firstName = "";
  var lastName = "";
  // mon hash
  const hash = bcrypt.hashSync(req.body.passwordFromFront, 10);

  const data = await userModel.find({
    emailAdress: req.body.emailFromFront,
  });

  if (data.length != 0) {
    error.push("utilisateur déjà présent");
  }
  if (req.body.emailFromFront.length < 3) {
    error.push("email trop court");
  }
  if (req.body.usernameFromFront.length < 3) {
    error.push(" Nom trop court");
  }
  if (
    req.body.usernameFromFront == "" ||
    req.body.emailFromFront == "" ||
    req.body.userPrenomFromFront == "" ||
    req.body.userRoomFromFront == "" ||
    req.body.passwordFromFront == ""
  ) {
    error.push("champs vides");
  }
  console.log("(/users/sign-Up) ERROR: ", error);
  if (error.length == 0) {
    var newRoom = await roomModel.find({
      nameBrand: req.body.userRoomFromFront,
    });

    var newUser = new userModel({
      token: uid2(32),
      dateCreation: new Date(),
      avatarUri:
        "https://res.cloudinary.com/montitnuage/image/upload/v1653145318/profile_blank_jfyas4.png",
      lastName: req.body.usernameFromFront,
      firstName: req.body.userPrenomFromFront,
      emailAdress: req.body.emailFromFront,
      birthday: "2022-05-16T20:00:00.000Z",
      rating: { pedagogue: 0, ponctuel: 0, motivant: 0, dynamique: 0, fun: 0 },
      password: hash,
      room: newRoom[0]._id,
    });

    saveUser = await newUser.save();

    if (saveUser) {
      token = saveUser.token;
      result = true;
      firstName = saveUser.firstName;
      lastName = saveUser.lastName;
    }
  }

  res.json({
    result,
    saveUser,
    error,
    token,
    firstName,
    lastName,
  });
});

// Le signin

router.post("/sign-In", async function (req, res, next) {
  var result = false;
  var user = null;
  var error = [];
  var token = null;
  var firstName = "";
  var lastName = "";
  if (req.body.emailFromFront == "" || req.body.passwordFromFront == "") {
    error.push("champs vides");
  }

  if (error.length == 0) {
    user = await userModel.findOne({
      emailAdress: req.body.emailFromFront,
    });

    if (user) {
      if (bcrypt.compareSync(req.body.passwordFromFront, user.password)) {
        result = true;
        token = user.token;
        firstName = user.firstName;
        lastName = user.lastName;
      } else {
        result = false;
        error.push("Mot de passe incorrect");
      }
    } else {
      error.push("email incorrect");
    }
  }
  console.log("(/users/sign-In) ERROR", error);
  res.json({
    result,
    user,
    error,
    token,
    firstName,
    lastName,
  });
});
// Route pour modif le profil :

router.post("/update-user", async function (req, res, next) {
  var error = [];
  const data = await userModel.find({
    emailAdress: req.body.emailFromFront,
  });
  if (data.length != 0) {
    error.push("utilisateur déjà présent");
  }
  if (req.body.emailFromFront.length < 3) {
    error.push("email trop court");
  }
  if (req.body.usernameFromFront.length < 3) {
    error.push("nom trop court");
  }
  if (
    req.body.usernameFromFront == "" ||
    req.body.emailFromFront == "" ||
    req.body.userPrenomFromFront == "" ||
    req.body.userRoomFromFront == "" ||
    req.body.passwordFromFront == ""
  ) {
    error.push("champs vides");
  }
  console.log("(/users/update-user) ERROR: ", error);
  if (error.length == 0) {
    var newRoom = await roomModel.find({
      nameBrand: req.body.userRoomFromFront,
    });
    await userModel.updateOne(
      { token: req.body.tokenFromUP },
      {
        lastName: req.body.usernameFromFront,
        firstName: req.body.userPrenomFromFront,
        emailAdress: req.body.emailFromFront,
        password: req.body.passwordFromFront,
        room: newRoom[0]._id,
      }
    );
  }
  console.log("(/users/update-user) ERROR: ", error);
  res.json(error);
});

// Route pour modif la photo :

router.post("/upload", async function (req, res, next) {
  var pictureName = "./tmp/" + uniqid() + ".jpg";
  var resultCopy = await req.files.avatar.mv(pictureName);
  if (!resultCopy) {
    var resultCloudinary = await cloudinary.uploader.upload(pictureName, {
      transformation: [
        { gravity: "face", height: 1000, width: 1000, crop: "crop" },
        { radius: "max" },
        { width: 200, crop: "scale" },
      ],
    });

    await userModel.updateOne(
      { token: req.body.tokenFromSnap },
      {
        avatarUri: resultCloudinary.url,
      }
    );

    fs.unlinkSync(pictureName);
    res.json(resultCloudinary);
  } else {
    res.json({ error: resultCopy });
  }
});
// Route pour afficher les data sur la modif du profil
router.post("/get-profil", async function (req, res, next) {
  let listRooms = await roomModel.aggregate([
    { $group: { _id: "$nameBrand" } },
  ]);

  var user = await userModel.findOne({ token: req.body.tokenFromUP });
  // console.log("son id", user._id);
  // let raw = await userModel.findById(user._id).populate("room");
  // let result = raw.room;

  let Marino = userModel.aggregate([
    {
      $lookup: {
        from: "rooms",
        localField: "room",
        foreignField: "rooms._id",
        as: "roomData",
      },
    },
    {
      $match: {
        token: req.body.tokenFromUP,
      },
    },
  ]);
  let result = await Marino.exec();
  // console.log("le res", result);
  await roomModel.populate(result, {
    path: "room",
    select: "nameBrand",
  });

  res.json({ result, listRooms, user });
});

module.exports = router;
