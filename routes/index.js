var express = require("express");
var router = express.Router();
require("dotenv").config();

//import des models de la base de données
var exerciceModel = require("../models/exercices");
var roomModel = require("../models/rooms");
var sessionModel = require("../models/sessions");
var userModel = require("../models/users");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

/* GET Assessment. */
router.post("/assessment", async function (req, res, next) {
  //Reconstitution de l'objet Ratings à pusher dans la collection Session
  var consolidatedRatings = {};
  consolidatedRatings.pedagogue = req.body.qualities[0].selection;
  consolidatedRatings.ponctuel = req.body.qualities[1].selection;
  consolidatedRatings.motivant = req.body.qualities[2].selection;
  consolidatedRatings.dynamique = req.body.qualities[3].selection;
  consolidatedRatings.fun = req.body.qualities[4].selection;
  consolidatedRatings.ratingUser = req.body.infoAttendees.creator._id;
  consolidatedRatings.ratedUser = req.body.infoAttendees.member[0]._id;

  //MAJ du score
  for (var i = 0; i < req.body.feedback.length; i++) {
    if (req.body.feedback[i].selection == true) {
      consolidatedRatings.feedbackSession = req.body.feedback[i].score;
    }
  }

  //Mise à jour de la session avec les informations du rating
  var session = await sessionModel.findById(req.body.idSession);
  session.ratings.push(consolidatedRatings);
  var sessionSaved = await session.save();

  // Mise à jour du statut de la session
  await sessionModel.updateOne(
    { _id: req.body.idSession },
    { status: "finished" }
  );

  //Mise à jour de la collection user avec les qualities
  var user = await userModel.find({ token: req.body.otherBuddyToken });

  var scores = [];
  for (var i = 0; i < req.body.qualities.length; i++) {
    if (req.body.qualities[i].selection == true) {
      scores.push(1);
    } else {
      scores.push(0);
    }
  }

  var ratingCopy = user[0].rating;
  ratingCopy.pedagogue = ratingCopy.pedagogue + scores[0];
  ratingCopy.ponctuel = ratingCopy.ponctuel + scores[1];
  ratingCopy.motivant = ratingCopy.motivant + scores[2];
  ratingCopy.dynamique = ratingCopy.dynamique + scores[3];
  ratingCopy.fun = ratingCopy.fun + scores[4];

  await userModel.updateOne(
    { token: req.body.otherBuddyToken },
    { rating: ratingCopy }
  );

  res.json({ resultat: "ok" });
});

/* cette route permet d'alimenter le screen activity avec les informations nécessaires */
router.get("/activity/:idToken", async function (req, res, next) {
  const user = await userModel.findOne({ token: req.params.idToken });

  let activityDbA = sessionModel.aggregate([
    {
      $match: {
        status: "finished",
        $or: [
          {
            "attendeeData.creator": user._id,
          },
          {
            "attendeeData.member": user._id,
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          sessionYear: { $year: "$startDate" },
          sessionMonth: { $month: "$startDate" },
        },
        sessionCount: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.sessionYear": 1,
        "_id.sessionMonth": 1,
      },
    },
  ]);

  let activityDbList = await activityDbA.exec();

  var numberOfSessions = 0;
  for (var i = 0; i < activityDbList.length; i++) {
    numberOfSessions = numberOfSessions + activityDbList[i].sessionCount;
  }

  console.log(numberOfSessions);

  res.json({
    numberOfSessions: numberOfSessions,
    rating: user.rating,
    activityDbList: activityDbList,
  });
});

module.exports = router;
