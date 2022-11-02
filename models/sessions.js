const mongoose = require("mongoose");

// schéma des données des séances de sport
// Une séance créée = une nouvelle id
const sessionSchema = mongoose.Schema({
  // date + heure du début de la séance
  startDate: Date,
  // durée de la séance (1,5 == 1h30)
  timing: Number,

  //état de la session (réalisée, non effectuée, pas encore commencée...)
  status: String,

  // nombre de participants à la séance (max 4 et min 1)
  attendeeNumber: Number,

  // liste des clé secondaires des users participants à la séance dans un object pour distinguer le créateur des membres
  // il peut y avoir plusieurs membres, donc array
  attendeeData: {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    member: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  },

  // clé secondaire du muscle
  muscle: { type: mongoose.Schema.Types.ObjectId, ref: "Exercices" },

  // Clé secondaire du rating ID afin de rattacher une séance avec une séance
  rating: { type: mongoose.Schema.Types.ObjectId, ref: "Rates" },

  // clé secondaire de la salle de sport.
  // Attention, ce schéma donne l'ID de la marque et non de la salle.
  // Comment préciser cette clé spéciale ?
  // on teste sans la ref pour tenter d'avoir l'ID maison
  room: { type: mongoose.Schema.Types.ObjectId },

  // il existe un 'groupe' de message par séance.
  // un message est envoyé à l'ensemble du groupe
  messaging: [
    {
      sender: String,
      sendingDate: Date,
      bodyMessage: String,
      image: String,
      system: Boolean,
      sent: Boolean,
      received: Boolean,
      pending: Boolean,
      visible: Boolean,
    },
  ],

  ratings: [
    {
      // les qualités sont des adjectifs
      pedagogue: Boolean,
      ponctuel: Boolean,
      motivant: Boolean,
      dynamique: Boolean,
      fun: Boolean,

      // votingUser est la clé secondaire du votant
      ratingUser: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },

      // votedUser est la clé secondaire du voté
      ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },

      // sentiment d'utilisateur après la session
      // choix possibles : 0, 1, 2 -> 0 = Trop difficile, 1 = Parfait, 2 = Trop facile
      feedbackSession: Number,
    },
  ],
});

const sessionModel = mongoose.model("Sessions", sessionSchema);

module.exports = sessionModel;
