var express = require("express");
var router = express.Router();
require("dotenv").config();
var mongoose = require("mongoose");
// moment
const moment = require("moment");
require("moment/locale/fr");
moment.locale("fr");

// import des models de la base de données
var exerciceModel = require("../models/exercices");
var roomModel = require("../models/rooms");
var sessionModel = require("../models/sessions");
var userModel = require("../models/users");

// lists all sessions with startDate = date and range in days = range in all locations sorted by start time ascending
router.get("/filter/", async function (req, res) {
  const dateParam = req.query["date"];
  let rangeParam = req.query["range"]; // optional

  if (rangeParam === undefined) {
    rangeParam = 1; // 1 day span by default
  }
  let endDate = dateParam;
  if (dateParam === undefined) {
    res.status(400).send({ error: "date must be specified" });
  } else if (dateParam !== undefined) {
    endDate = moment(dateParam, "YYYY-MM-DD")
      .add(Number(rangeParam), "d")
      .format("YYYYMMDD");
    try {
      // fetch articles for this source from DB
      let sessionsDbA = sessionModel.aggregate([
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
            status: "not started",
            startDate: {
              $gte: new Date(
                Number(dateParam.slice(0, 4)),
                Number(dateParam.slice(4, 6)) - 1, // months count from 0
                Number(dateParam.slice(6, 8))
              ),
              $lt: new Date(
                Number(endDate.slice(0, 4)),
                Number(endDate.slice(4, 6)) - 1, // months count from 0
                Number(endDate.slice(6, 8))
              ),
            },
          },
        },
        {
          $sort: {
            startDate: 1,
          },
        },
      ]);
      let sessionsDbList = await sessionsDbA.exec();
      // console.log("sessionsDbList.length:", sessionsDbList.length);
      // populate muscle name
      await sessionModel.populate(sessionsDbList, {
        path: "muscle",
        select: "muscle",
      });
      // populate creator data
      await sessionModel.populate(sessionsDbList, {
        path: "attendeeData.creator",
        select: ["firstName", "lastName", "avatarUri"],
      });
      // populate members data
      await sessionModel.populate(sessionsDbList, {
        path: "attendeeData.member",
        select: ["firstName", "lastName", "avatarUri"],
      });

      // remove unused properties
      sessionsDbList.forEach((session) => {
        delete session.status;
        delete session.messaging;
        delete session.ratings;
        session.roomData.forEach((room) => {
          delete room.logo;
          // console.log("session.room:", session.room._id.toString());
          room.rooms = room.rooms.filter(
            (el) => el._id.toString() === session.room._id.toString()
          );
        });
        delete session.room;
      });

      res.status(200).send({
        result: true,
        sessions: sessionsDbList,
      });
    } catch (error) {
      res.status(500).send(error);
    }
  }
});

router.get("/join-session", async function (req, res, next) {
  const sessionIdParam = req.query["sessionId"];
  const tokenParam = req.query["token"];

  let errors = [];
  if (sessionIdParam === undefined || tokenParam === undefined) {
    res
      .status(400)
      .send({ result: false, errors: ["not enough data provided"] });
  } else if (sessionIdParam.length !== 24) {
    res
      .status(400)
      .send({ result: false, errors: ["incorrect parameter length"] });
  } else {
    const session = await sessionModel.findById(sessionIdParam);
    const user = await userModel.findOne({ token: tokenParam });
    let sessionIdRet = null;
    let wasUpdated = false;
    if (session !== null && user !== null) {
      sessionIdRet = session._id.toString();
      // console.log("session found:", sessionIdRet);
      if (session.attendeeData.member.length === 0) {
        // can join
        let newAttendeeData = session.attendeeData;
        newAttendeeData.member.push(user._id.toString());
        try {
          await sessionModel.updateOne(
            { _id: sessionIdParam },
            { attendeeData: newAttendeeData }
          );
          wasUpdated = true;
        } catch (error) {
          errors.push(error.toString());
        }
      } else {
        console.log(
          `(/sessions/join-session) tried updating ${sessionIdRet}, no more room`
        );
      }
    }

    res.status(200).send({
      result: true,
      session: sessionIdRet,
      updated: wasUpdated,
      errors: errors,
    });
  }
});

router.get("/create-session", async function (req, res, next) {
  const dateParam = req.query["date"];
  const hourParam = req.query["hour"];
  const roomParam = req.query["room"];
  const msgParam = req.query["msg"];
  const tokenParam = req.query["token"];

  let errors = [];
  let result = false;
  if (
    dateParam === undefined ||
    hourParam === undefined ||
    roomParam === undefined ||
    msgParam === undefined ||
    tokenParam === undefined
  ) {
    res
      .status(400)
      .send({ result: false, errors: ["not enough data provided"] });
  } else if (roomParam.length !== 24) {
    res.status(400).send({ result: false, errors: ["incorrect room id"] });
  } else {
    const user = await userModel.findOne({ token: tokenParam });
    console.log(user._id);
    let sessionId = null;
    // TODO start
    if (user !== null) {
      try {
        let newSession = new sessionModel({
          startDate: new Date(
            Number(dateParam.slice(6, 10)),
            Number(dateParam.slice(3, 5)) - 1, // months count from 0
            Number(dateParam.slice(0, 2)),
            Number(hourParam.slice(0, 2)),
            Number(hourParam.slice(3, 5))
          ),
          timing: 1, // h
          status: "not started",
          attendeeNumber: 1,
          attendeeData: {
            creator: user._id,
            member: [],
          },
          muscle: "6283694b0ce12057f045f5db", // hardcode "Bras"
          room: roomParam,
          messaging: [
            {
              sender: user._id,
              sendingDate: new Date(),
              bodyMessage: msgParam,
              image: null,
              system: false,
              sent: true,
              received: true,
              pending: false,
              visible: true,
            },
          ],
          ratings: [],
        });

        let saveSession = await newSession.save();
        if (saveSession) {
          sessionId = saveSession._id;
          result = true;
        }
      } catch (error) {
        errors.push(error.toString());
        result = false;
      }
    }

    res.status(200).send({
      result: result,
      session: sessionId,
      errors: errors,
    });
  }
});

// la route suivante va récupérer l'ensemble des documents qui ont comme membre ou createur l'id en request
//on renvoie au front que les infos nécessaires à l'affichage des groupes de discussion
router.get("/get-messages-groupes/:idToken", async function (req, res, next) {
  const user = await userModel.findOne({ token: req.params.idToken });

  let messagerieDbA = sessionModel.aggregate([
    {
      $match: {
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
      $sort: {
        startDate: 1,
      },
    },
  ]);

  let messagerieDbList = await messagerieDbA.exec();

  await sessionModel.populate(messagerieDbList, {
    path: "muscle",
    select: "muscle",
  });

  await sessionModel.populate(messagerieDbList, {
    path: "attendeeData.creator",
    select: ["firstName", "lastName", "avatarUri"],
  });

  await sessionModel.populate(messagerieDbList, {
    path: "attendeeData.member",
    select: ["firstName", "lastName", "avatarUri"],
  });

  // on supprime les informations non nécessaires
  messagerieDbList.forEach((session) => {
    delete session.timing;
    delete session.status;
    delete session.ratings;
    delete session.attendeeNumber;
    delete session.room;
    session.messaging = session.messaging[session.messaging.length - 1];
  });

  res.json(messagerieDbList);
});

// la route suivante va récupérer l'ensemble des messages de la session
//on renvoie au front que les infos nécessaires à l'affichage de la discussion
router.get(
  "/get-messages-session/:idToken/:idSession",

  async function (req, res, next) {
    const user = await userModel.findOne({ token: req.params.idToken });
    let buddy = {};

    let messagerieDbA = sessionModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.idSession),
        },
      },
      {
        $sort: {
          startDate: 1,
        },
      },
    ]);

    let messagerieDbList = await messagerieDbA.exec();

    await sessionModel.populate(messagerieDbList, {
      path: "attendeeData.creator",
      select: ["firstName", "lastName", "avatarUri"],
    });

    await sessionModel.populate(messagerieDbList, {
      path: "attendeeData.member",
      select: ["firstName", "lastName", "avatarUri"],
    });

    if (messagerieDbList[0].attendeeData.creator._id == user.id) {
      buddy.firstName = messagerieDbList[0].attendeeData.member[0].firstName;
      buddy.lastName = messagerieDbList[0].attendeeData.member[0].lastName;
      buddy.id = messagerieDbList[0].attendeeData.member[0]._id;
      buddy.uri = messagerieDbList[0].attendeeData.member[0].avatarUri;
    } else {
      buddy.firstName = messagerieDbList[0].attendeeData.creator.firstName;
      buddy.lastName = messagerieDbList[0].attendeeData.creator.lastName;
      buddy.id = messagerieDbList[0].attendeeData.creator._id;
      buddy.uri = messagerieDbList[0].attendeeData.creator.avatarUri;
    }

    console.log(buddy);
    // on supprime les informations non nécessaires
    messagerieDbList.forEach((session) => {
      delete session.startDate;
      delete session.timing;
      delete session.status;
      delete session.ratings;
      delete session.attendeeNumber;
      delete session.room;
      delete session.muscle;
      delete session.gymChain;
      delete session.attendeeData;
    });

    messagerieDbList[0].messaging.forEach((message) => {
      if (message.sender == user.id) {
        message.sent = true;
      } else {
        message.sent = false;
      }
    });

    res.status(200).send({
      result: true,
      me: {
        firstName: user.firstName,
        lastName: user.lastName,
        id: user.id,
        uri: user.avatarUri,
      },
      buddy,

      messagerieDbList,
    });
  }
);

// on passe en post parce qu'on peut envoyer des messages et des images (en prévoyance)
//la route va récupérer l'ensemble de la discussion et faire un push avant de sauvegarder le nouveau tableau
router.post(
  "/add-messages/:idUser/:idSession",
  async function (req, res, next) {
    const messageToPush = {
      sender: req.params.idUser,
      sendingDate: new Date(),
      bodyMessage: req.body.bodyMessage,
      image: null,
      system: false,
      sent: true,
      received: true,
      pending: false,
      visible: true,
    };

    await sessionModel.updateOne(
      { _id: req.params.idSession },
      { $push: { messaging: messageToPush } }
    );

    res.json("true");
  }
);

// Route pour récupérer les infos de séances et exercices pour la LiveSessionHomeScreen
router.get("/get-exercices/:idSession", async function (req, res, next) {
  let roomDetailsParam = req.query["roomDetails"]; // optional
  if (roomDetailsParam === undefined) {
    roomDetailsParam = false;
  } else {
    roomDetailsParam = true;
  }
  // console.log("roomDetailsParam:", roomDetailsParam);

  let exercicesDbA = sessionModel.aggregate([
    {
      $lookup: {
        from: "exercices",
        localField: "exercices",
        foreignField: "exercices._id",
        as: "exerciceData",
      },
    },
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.params.idSession),
      },
    },
    {
      $sort: {
        startDate: 1,
      },
    },
  ]);

  // populate room details only if asked
  if (roomDetailsParam) {
    exercicesDbA = sessionModel.aggregate([
      {
        $lookup: {
          from: "exercices",
          localField: "exercices",
          foreignField: "exercices._id",
          as: "exerciceData",
        },
      },
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
          _id: new mongoose.Types.ObjectId(req.params.idSession),
        },
      },
      {
        $sort: {
          startDate: 1,
        },
      },
    ]);
  }

  let exercicesDbList = await exercicesDbA.exec();

  await sessionModel.populate(exercicesDbList, {
    path: "attendeeData.creator",
    select: ["firstName", "lastName", "avatarUri", "token"],
  });

  await sessionModel.populate(exercicesDbList, {
    path: "attendeeData.member",
    select: ["firstName", "lastName", "avatarUri", "token"],
  });

  // on supprime les informations non nécessaires
  exercicesDbList.forEach((session) => {
    delete session.status;
    delete session.attendeeNumber;
    delete session.messaging;
    delete session.ratings;
    // on filtre uniquement sur les exercices souhaités
    session.exerciceData = session.exerciceData.filter(
      (el) => el._id.toString() === session.muscle._id.toString()
    );
    if (roomDetailsParam) {
      session.roomData.forEach((room) => {
        // delete room.logo;
        // console.log("session.room:", session.room._id.toString());
        room.rooms = room.rooms.filter(
          (el) => el._id.toString() === session.room._id.toString()
        );
      });
      delete session.room;
    }
  });

  res.json(exercicesDbList);
});

// Route pour récupérer les infos des prochaines séances à venir
router.get(
  "/get-not-started-sessions/:idToken",
  async function (req, res, next) {
    const user = await userModel.findOne({ token: req.params.idToken });

    // fetch articles for this source from DB
    let sessionsDbA = sessionModel.aggregate([
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
          $and: [
            {
              $or: [
                {
                  "attendeeData.creator": user._id,
                },
                {
                  "attendeeData.member": user._id,
                },
              ],
              status: "not started",
            },
          ],
        },
      },
      {
        $sort: {
          startDate: 1,
        },
      },
    ]);
    let sessionsDbList = await sessionsDbA.exec();
    // console.log("sessionsDbList.length:", sessionsDbList.length);
    // populate muscle name
    await sessionModel.populate(sessionsDbList, {
      path: "muscle",
      select: "muscle",
    });
    // populate creator data
    await sessionModel.populate(sessionsDbList, {
      path: "attendeeData.creator",
      select: ["firstName", "lastName", "avatarUri"],
    });
    // populate members data
    await sessionModel.populate(sessionsDbList, {
      path: "attendeeData.member",
      select: ["firstName", "lastName", "avatarUri"],
    });

    // remove unused properties
    sessionsDbList.forEach((session) => {
      delete session.status;
      delete session.messaging;
      delete session.ratings;
      session.roomData.forEach((room) => {
        delete room.logo;
        // console.log("session.room:", session.room._id.toString());
        room.rooms = room.rooms.filter(
          (el) => el._id.toString() === session.room._id.toString()
        );
      });
      delete session.room;
    });

    res.status(200).send({
      result: true,
      me: { firstName: user.firstName, lastName: user.lastName },
      sessions: sessionsDbList,
    });
  }
);

module.exports = router;
