const mongoose = require("mongoose");

// schema Exercice de la DB
// La collection s'appelle Exercice mais représente plutôt chaque muscle
const exerciceSchema = mongoose.Schema({
  // Lien uri de l'exercice
  imageUri: String,
  // chaque exercice travaille un seul muscle
  muscle: String,

  // chaque muscle possède plusieurs portions (ex : le biceps a comme portion long/court/brachialis)
  portions: [
    {
      portionName: String,
      exercices: [
        {
          // la portion a des exercices spécifiques
          exerciceName: String,
          // temps de repos entre les séries
          restTime: Number,
          // nombre de répétitions d'une série (ex : 5 x 10)
          routineNumber: String,

          // chaque portion se matérialise via un média
          media: {
            // le média peut être une image, un gif ou une vidéo
            mediaType: String,
            // lien uri du média
            mediaUri: String,
            // lien uri du média
            videoUri: String,
          },
          // brève description de l'exercice
          description: String,
        },
      ],
    },
  ],
});

const exerciceModel = mongoose.model("Exercices", exerciceSchema);

module.exports = exerciceModel;
