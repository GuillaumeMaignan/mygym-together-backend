const mongoose = require("mongoose");

// schéma des données des salles de sport
// il ne devrait pas en avoir beaucoup puisqu'on les save par marque (fitness Park, Basic Fit...)
// En revanche, dans l'objet room, on aura autant de salles que de locaux existants

const individualRoomSchema = mongoose.Schema({
  // ville où se trouve la salle
  city: String,
  // nom de la salle de sport (ex: Basic Fit du Vieux port)
  nameRoom: String,
  // long et lat en mémoire pour les markers dans la map
  longitude: Number,
  latitude: Number,
});

const roomSchema = mongoose.Schema({
  // uri du logo de la marque
  logo: String,
  // nom de la marque (ex : basic fit)
  nameBrand: String,
  // il existe autant d'objets que de locaux/salles de sport
  rooms: [individualRoomSchema],
});

const roomModel = mongoose.model("rooms", roomSchema);

module.exports = roomModel;
