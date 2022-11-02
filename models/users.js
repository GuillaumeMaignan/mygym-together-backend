const mongoose = require("mongoose");

//schéma des données des users
const userSchema = mongoose.Schema({
  //chaque user possède une ID générée automatiquement par la base de données
  //chaque user possède un token à générer selon les besoins.
  token: String,

  //date de création de l'utilisateur
  dateCreation: Date,

  //Uri de l'avatar
  avatarUri: String,

  //age et gender de l'utilisateur. Cette info est détectée automatiquement via une API (facultative)
  age: Number,
  gender: String,

  //données générales de l'user
  lastName: String,
  firstName: String,
  emailAdress: String,
  birthday: Date,
  description: String,
  city: String,

  //MDP crypté de l'user
  password: String,

  //clés secondaires de toutes les id des séances passées ET des futures séances
  pastSession: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sessions" }],
  nextSession: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sessions" }],

  //clés secondaires de toutes les salles de sport.
  //attention, cette clé donne la clé secondaire de la marque et non de la salle
  // room: String,
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Rooms" },

  //après chaque séance, l'user est noté sur 5 adjectifs
  rating: {
    pedagogue: Number,
    ponctuel: Number,
    motivant: Number,
    dynamique: Number,
    fun: Number,
  },
});

const userModel = mongoose.model("Users", userSchema);

module.exports = userModel;
